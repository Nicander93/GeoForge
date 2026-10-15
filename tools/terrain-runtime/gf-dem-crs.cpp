// CRS commands of gf-dem-tool. GDAL/OSR reads the definition, PROJ lists the
// operations to EPSG:4326 so the processor can refuse ballpark or missing-grid
// transforms instead of letting gdalwarp pick one silently.
//
//   gf-dem-tool crs <definition> [--bounds minx miny maxx maxy]
//
// <definition> is "raster:<path>" (the CRS stored in a raster), "@<file>"
// (definition text in a file, for long WKT) or the definition itself
// (EPSG:xxxx, WKT, PROJJSON, a PROJ string with an explicit datum/ellipsoid).
// Bounds are in the CRS's GIS-traditional order (east, north), as in a
// GDAL geotransform.
#include "gf-dem-crs.h"

#include <cpl_conv.h>
#include <cpl_string.h>
#include <gdal.h>
#include <ogr_srs_api.h>
#include <proj.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <fstream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

namespace {

std::string json_string(const char* text) {
    if (!text) return "null";
    std::string out = "\"";
    for (const char* p = text; *p; ++p) {
        const unsigned char c = static_cast<unsigned char>(*p);
        if (c == '"' || c == '\\') {
            out.push_back('\\');
            out.push_back(static_cast<char>(c));
        } else if (c == '\n') {
            out += "\\n";
        } else if (c == '\r' || c == '\t') {
            out.push_back(' ');
        } else if (c < 0x20) {
            continue;
        } else {
            out.push_back(static_cast<char>(c));
        }
    }
    return out + "\"";
}

std::string json_string(const std::string& text) { return json_string(text.c_str()); }

std::string num(double value) {
    if (!std::isfinite(value)) return "null";
    char buffer[64];
    std::snprintf(buffer, sizeof buffer, "%.17g", value);
    return buffer;
}

int fail(const std::string& code, const std::string& message) {
    std::printf("{\"ok\":false,\"code\":%s,\"error\":%s}\n", json_string(code).c_str(), json_string(message).c_str());
    return 2;
}

bool read_text(const std::string& path, std::string& out) {
    std::ifstream file(path, std::ios::binary);
    if (!file) return false;
    std::ostringstream buffer;
    buffer << file.rdbuf();
    out = buffer.str();
    return true;
}

std::string lower(std::string text) {
    std::transform(text.begin(), text.end(), text.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return text;
}

// A PROJ string can describe a pipeline or rely on PROJ's default WGS 84
// ellipsoid; only accept it when it names the earth model itself.
std::string check_proj_string(const std::string& definition) {
    const std::string text = lower(definition);
    if (text.find("+proj=pipeline") != std::string::npos || text.find("+step") != std::string::npos) {
        return "PROJ 管线描述的是坐标变换，不是源坐标系";
    }
    const bool earth = text.find("+datum=") != std::string::npos || text.find("+ellps=") != std::string::npos ||
                       text.find("+towgs84=") != std::string::npos || text.find("+a=") != std::string::npos ||
                       text.find("+r=") != std::string::npos;
    if (!earth) return "PROJ 字符串没有写明 +datum 或 +ellps，不能确定椭球";
    return "";
}

const char* crs_type(OGRSpatialReferenceH srs) {
    if (OSRIsCompound(srs)) return "compound";
    if (OSRIsProjected(srs)) return "projected";
    if (OSRIsGeographic(srs)) return "geographic";
    if (OSRIsGeocentric(srs)) return "geocentric";
    if (OSRIsVertical(srs)) return "vertical";
    if (OSRIsLocal(srs)) return "engineering";
    return "other";
}

const char* orientation_name(OGRAxisOrientation orientation) {
    switch (orientation) {
        case OAO_North: return "north";
        case OAO_South: return "south";
        case OAO_East: return "east";
        case OAO_West: return "west";
        case OAO_Up: return "up";
        case OAO_Down: return "down";
        default: return "other";
    }
}

struct Bounds {
    double west, south, east, north;
};

struct OperationReport {
    std::string json;
    std::string pipeline;
    bool usable = false;
};

std::string grids_json(PJ_CONTEXT* ctx, PJ* op, bool& missing) {
    std::ostringstream out;
    out << "[";
    const int count = proj_coordoperation_get_grid_used_count(ctx, op);
    for (int i = 0; i < count; ++i) {
        const char *short_name = nullptr, *full_name = nullptr, *package = nullptr, *url = nullptr;
        int direct = 0, open_license = 0, available = 0;
        proj_coordoperation_get_grid_used(ctx, op, i, &short_name, &full_name, &package, &url, &direct, &open_license, &available);
        if (!available) missing = true;
        out << (i ? "," : "") << "{\"name\":" << json_string(short_name) << ",\"available\":" << (available ? "true" : "false") << "}";
    }
    out << "]";
    return out.str();
}

std::string area_json(PJ_CONTEXT* ctx, PJ* object) {
    double w, s, e, n;
    const char* name = nullptr;
    if (!proj_get_area_of_use(ctx, object, &w, &s, &e, &n, &name) || w < -1000) return "null";
    std::ostringstream out;
    out << "{\"name\":" << json_string(name) << ",\"bounds\":[" << num(w) << "," << num(s) << "," << num(e) << "," << num(n) << "]}";
    return out.str();
}

// Lon/lat of points along the four edges; returns the outer box and the box
// that is inside the transformed footprint on every edge.
bool footprint(PJ_CONTEXT* ctx, PJ* op, const Bounds& source, Bounds& outer, Bounds& inner) {
    const int steps = 64;
    outer = {std::numeric_limits<double>::infinity(), std::numeric_limits<double>::infinity(),
             -std::numeric_limits<double>::infinity(), -std::numeric_limits<double>::infinity()};
    inner = {-std::numeric_limits<double>::infinity(), -std::numeric_limits<double>::infinity(),
             std::numeric_limits<double>::infinity(), std::numeric_limits<double>::infinity()};
    for (int edge = 0; edge < 4; ++edge) {
        for (int i = 0; i <= steps; ++i) {
            const double f = static_cast<double>(i) / steps;
            double x = 0, y = 0;
            switch (edge) {
                case 0: x = source.west; y = source.south + f * (source.north - source.south); break;
                case 1: x = source.east; y = source.south + f * (source.north - source.south); break;
                case 2: x = source.west + f * (source.east - source.west); y = source.south; break;
                default: x = source.west + f * (source.east - source.west); y = source.north; break;
            }
            PJ_COORD c = proj_coord(x, y, 0, 0);
            c = proj_trans(op, PJ_FWD, c);
            const double lon = c.xy.x, lat = c.xy.y;
            if (!std::isfinite(lon) || !std::isfinite(lat)) return false;
            outer.west = std::min(outer.west, lon);
            outer.east = std::max(outer.east, lon);
            outer.south = std::min(outer.south, lat);
            outer.north = std::max(outer.north, lat);
            if (edge == 0) inner.west = std::max(inner.west, lon);
            if (edge == 1) inner.east = std::min(inner.east, lon);
            if (edge == 2) inner.south = std::max(inner.south, lat);
            if (edge == 3) inner.north = std::min(inner.north, lat);
        }
    }
    return true;
}

// CGCS2000 is ITRF97 at epoch 2000.0; WGS 84 (G1762 and later) agrees with
// recent ITRFs at the centimetre level. EPSG only lists ballpark operations
// between them, so CGCS2000 sources are bound to WGS 84 with an explicit
// null geocentric translation (ellipsoid change done exactly through
// geocentric coordinates). Its stated accuracy covers plate motion since
// 2000.0 (about 3.5 cm/a in mainland China, about 0.9 m by 2026); see
// docs/terrain/v1/04-v12-cgcs2000.md.
constexpr const char* kCgcs2000Shift = "cgcs2000-null-geocentric-translation";
constexpr double kCgcs2000AccuracyM = 1.0;

bool is_cgcs2000(PJ_CONTEXT* ctx, PJ* crs) {
    PJ* datum = proj_crs_get_datum_forced(ctx, crs);
    if (!datum) return false;
    const char* auth = proj_get_id_auth_name(datum, 0);
    const char* code = proj_get_id_code(datum, 0);
    const char* name = proj_get_name(datum);
    const bool match = (auth && code && std::string(auth) == "EPSG" && std::string(code) == "1043") ||
                       (name && lower(name) == "china 2000");
    proj_destroy(datum);
    return match;
}

PJ* bind_cgcs2000(PJ_CONTEXT* ctx, PJ* crs, PJ* wgs84) {
    PJ* geodetic = proj_crs_get_geodetic_crs(ctx, crs);
    if (!geodetic) return nullptr;
    PJ_PARAM_DESCRIPTION params[3] = {
        {"X-axis translation", "EPSG", "8605", 0.0, "metre", 1.0, PJ_UT_LINEAR},
        {"Y-axis translation", "EPSG", "8606", 0.0, "metre", 1.0, PJ_UT_LINEAR},
        {"Z-axis translation", "EPSG", "8607", 0.0, "metre", 1.0, PJ_UT_LINEAR},
    };
    PJ* shift = proj_create_transformation(ctx, "CGCS2000 to WGS 84 (GeoForge, null geocentric translation)", "GEOFORGE",
                                           "CGCS2000_TO_WGS84_NULL", geodetic, wgs84, nullptr, "Geocentric translations (geog2D domain)",
                                           "EPSG", "9603", 3, params, kCgcs2000AccuracyM);
    PJ* bound = shift ? proj_crs_create_bound_crs(ctx, crs, wgs84, shift) : nullptr;
    proj_destroy(shift);
    proj_destroy(geodetic);
    return bound;
}

std::string bounds_json(const Bounds& b) {
    return "[" + num(b.west) + "," + num(b.south) + "," + num(b.east) + "," + num(b.north) + "]";
}

// Operations from the horizontal part of `crs` to EPSG:4326, best first
// (PROJ's own ordering). The first instantiable one is selected.
std::string transform_json(PJ_CONTEXT* ctx, PJ* crs, const Bounds& source, std::string& error) {
    PJ* horizontal = proj_get_type(crs) == PJ_TYPE_COMPOUND_CRS ? proj_crs_get_sub_crs(ctx, crs, 0) : proj_clone(ctx, crs);
    PJ* target = proj_create(ctx, "EPSG:4326");
    if (!horizontal || !target) {
        error = "PROJ 无法建立水平坐标系或 EPSG:4326";
        proj_destroy(horizontal);
        proj_destroy(target);
        return "";
    }
    const bool cgcs2000 = is_cgcs2000(ctx, horizontal);
    if (cgcs2000) {
        PJ* bound = bind_cgcs2000(ctx, horizontal, target);
        if (!bound) {
            error = "无法为 CGCS2000 建立到 WGS 84 的显式转换";
            proj_destroy(horizontal);
            proj_destroy(target);
            return "";
        }
        proj_destroy(horizontal);
        horizontal = bound;
    }
    // Rough lon/lat box only to tell PROJ the area of interest.
    Bounds aoi{-180, -90, 180, 90};
    if (PJ* rough = proj_create_crs_to_crs_from_pj(ctx, horizontal, target, nullptr, nullptr)) {
        if (PJ* rough_xy = proj_normalize_for_visualization(ctx, rough)) {
            Bounds outer, inner;
            if (footprint(ctx, rough_xy, source, outer, inner)) aoi = outer;
            proj_destroy(rough_xy);
        }
        proj_destroy(rough);
    }

    PJ_OPERATION_FACTORY_CONTEXT* factory = proj_create_operation_factory_context(ctx, nullptr);
    proj_operation_factory_context_set_spatial_criterion(ctx, factory, PROJ_SPATIAL_CRITERION_PARTIAL_INTERSECTION);
    // Rank by accuracy as if every grid were installed. When the best
    // operation needs a grid we do not ship, the processor refuses instead of
    // falling back to a worse operation.
    proj_operation_factory_context_set_grid_availability_use(ctx, factory, PROJ_GRID_AVAILABILITY_IGNORED);
    proj_operation_factory_context_set_area_of_interest(ctx, factory, aoi.west, aoi.south, aoi.east, aoi.north);
    PJ_OBJ_LIST* list = proj_create_operations(ctx, horizontal, target, factory);
    const int count = list ? proj_list_get_count(list) : 0;

    std::ostringstream ops;
    std::string selected = "null";
    int selected_index = -1;
    for (int i = 0; i < count && i < 8; ++i) {
        PJ* op = proj_list_get(ctx, list, i);
        bool missing = false;
        const std::string grids = grids_json(ctx, op, missing);
        const bool instantiable = proj_coordoperation_is_instantiable(ctx, op) != 0;
        const bool ballpark = proj_coordoperation_has_ballpark_transformation(ctx, op) != 0;
        const double accuracy = proj_coordoperation_get_accuracy(ctx, op);
        std::ostringstream one;
        one << "{\"name\":" << json_string(proj_get_name(op)) << ",\"accuracyM\":" << (accuracy >= 0 ? num(accuracy) : "null")
            << ",\"ballpark\":" << (ballpark ? "true" : "false") << ",\"instantiable\":" << (instantiable ? "true" : "false")
            << ",\"grids\":" << grids << ",\"area\":" << area_json(ctx, op);
        if (i == 0 && instantiable && !missing) {
            PJ* xy = proj_normalize_for_visualization(ctx, op);
            Bounds outer, inner;
            if (xy && footprint(ctx, xy, source, outer, inner)) {
                selected_index = i;
                const char* pipeline = proj_as_proj_string(ctx, xy, PJ_PROJ_5, nullptr);
                // gdalwarp -ct expects the CRSs' own axis order (northing first
                // for EPSG:4547, lat/lon for EPSG:4326), not the GIS order.
                const char* ct_pipeline = proj_as_proj_string(ctx, op, PJ_PROJ_5, nullptr);
                one << ",\"pipeline\":" << json_string(pipeline) << ",\"ctPipeline\":" << json_string(ct_pipeline) << ",\"wgs84Bounds\":" << bounds_json(outer)
                    << ",\"wgs84InnerBounds\":" << bounds_json(inner);
            }
            proj_destroy(xy);
        }
        one << "}";
        ops << (i ? "," : "") << one.str();
        if (selected_index == i) selected = one.str();
        proj_destroy(op);
    }
    proj_list_destroy(list);
    proj_operation_factory_context_destroy(factory);
    proj_destroy(horizontal);
    proj_destroy(target);
    std::ostringstream out;
    out << "{\"target\":\"EPSG:4326\",\"datumShift\":" << (cgcs2000 ? json_string(kCgcs2000Shift) : "null") << ",\"verticalIgnored\":" << (proj_get_type(crs) == PJ_TYPE_COMPOUND_CRS ? "true" : "false")
        << ",\"candidateCount\":" << count << ",\"selectedIndex\":" << selected_index << ",\"selected\":" << selected
        << ",\"candidates\":[" << ops.str() << "]}";
    return out.str();
}

}  // namespace

int run_crs(int argc, char** argv) {
    if (argc < 3) return fail("TERRAIN_CRS_INVALID", "usage: crs <definition> [--bounds minx miny maxx maxy]");
    std::string definition = argv[2];
    bool has_bounds = false;
    Bounds source{0, 0, 0, 0};
    if (argc == 8 && std::string(argv[3]) == "--bounds") {
        source = {CPLAtof(argv[4]), CPLAtof(argv[5]), CPLAtof(argv[6]), CPLAtof(argv[7])};
        has_bounds = true;
    } else if (argc != 3) {
        return fail("TERRAIN_CRS_INVALID", "usage: crs <definition> [--bounds minx miny maxx maxy]");
    }

    OGRSpatialReferenceH srs = OSRNewSpatialReference(nullptr);
    std::string origin = "user";
    if (definition.rfind("raster:", 0) == 0) {
        origin = "raster";
        GDALDatasetH dataset = GDALOpen(definition.substr(7).c_str(), GA_ReadOnly);
        if (!dataset) return fail("TERRAIN_INPUT_INVALID", "cannot open raster: " + definition.substr(7));
        OGRSpatialReferenceH stored = GDALGetSpatialRef(dataset);
        if (!stored) {
            GDALClose(dataset);
            return fail("TERRAIN_CRS_MISSING", "raster has no CRS");
        }
        OSRDestroySpatialReference(srs);
        srs = OSRClone(stored);
        GDALClose(dataset);
    } else {
        if (definition.rfind("@", 0) == 0 && !read_text(definition.substr(1), definition)) {
            return fail("TERRAIN_CRS_INVALID", "cannot read CRS definition file");
        }
        const size_t start = definition.find_first_not_of(" \t\r\n");
        if (start == std::string::npos) return fail("TERRAIN_CRS_MISSING", "empty CRS definition");
        definition = definition.substr(start);
        if (definition[0] == '+' || lower(definition).find("+proj=") != std::string::npos) {
            const std::string problem = check_proj_string(definition);
            if (!problem.empty()) return fail("TERRAIN_CRS_INVALID", problem);
        }
        const char* options[] = {"ALLOW_NETWORK_ACCESS=NO", "ALLOW_FILE_ACCESS=NO", nullptr};
        if (OSRSetFromUserInputEx(srs, definition.c_str(), options) != OGRERR_NONE) {
            OSRDestroySpatialReference(srs);
            return fail("TERRAIN_CRS_INVALID", std::string("GDAL/PROJ cannot parse the CRS: ") + CPLGetLastErrorMsg());
        }
    }
    OSRSetAxisMappingStrategy(srs, OAMS_TRADITIONAL_GIS_ORDER);

    const char* type = crs_type(srs);
    char* wkt = nullptr;
    const char* wkt_options[] = {"FORMAT=WKT2_2019", "MULTILINE=NO", nullptr};
    OSRExportToWktEx(srs, &wkt, wkt_options);
    char* projjson = nullptr;
    OSRExportToPROJJSON(srs, &projjson, nullptr);

    std::ostringstream out;
    out << "{\"ok\":true,\"origin\":" << json_string(origin) << ",\"name\":" << json_string(OSRGetName(srs))
        << ",\"type\":" << json_string(type);
    const char* auth_name = OSRGetAuthorityName(srs, nullptr);
    const char* auth_code = OSRGetAuthorityCode(srs, nullptr);
    if (auth_name && auth_code) {
        out << ",\"authority\":" << json_string(std::string(auth_name) + ":" + auth_code);
    } else {
        out << ",\"authority\":null";
    }
    // Candidates only; an unidentified but valid WKT is still accepted.
    int match_count = 0;
    int* confidence = nullptr;
    OGRSpatialReferenceH* matches = OSRFindMatches(srs, nullptr, &match_count, &confidence);
    out << ",\"matches\":[";
    for (int i = 0; i < match_count && i < 3; ++i) {
        const char* n = OSRGetAuthorityName(matches[i], nullptr);
        const char* c = OSRGetAuthorityCode(matches[i], nullptr);
        out << (i ? "," : "") << "{\"id\":" << (n && c ? json_string(std::string(n) + ":" + c) : "null")
            << ",\"confidence\":" << confidence[i] << "}";
    }
    out << "]";
    OSRFreeSRSArray(matches);
    CPLFree(confidence);

    out << ",\"axes\":[";
    const int axes = OSRGetAxesCount(srs);
    for (int i = 0; i < axes; ++i) {
        OGRAxisOrientation orientation = OAO_Other;
        const char* name = OSRGetAxis(srs, nullptr, i, &orientation);
        out << (i ? "," : "") << "{\"name\":" << json_string(name) << ",\"orientation\":" << json_string(orientation_name(orientation)) << "}";
    }
    out << "]";
    int mapping_count = 0;
    const int* mapping = OSRGetDataAxisToSRSAxisMapping(srs, &mapping_count);
    out << ",\"dataAxisToCrsAxis\":[";
    for (int i = 0; i < mapping_count; ++i) out << (i ? "," : "") << mapping[i];
    out << "]";

    char* linear_name = nullptr;
    const double to_metre = OSRGetLinearUnits(srs, &linear_name);
    char* angular_name = nullptr;
    const double to_radian = OSRGetAngularUnits(srs, &angular_name);
    if (OSRIsProjected(srs) || OSRIsCompound(srs)) {
        out << ",\"linearUnit\":{\"name\":" << json_string(linear_name) << ",\"toMetre\":" << num(to_metre) << "}";
    } else {
        out << ",\"linearUnit\":null";
    }
    out << ",\"angularUnit\":{\"name\":" << json_string(angular_name) << ",\"toRadian\":" << num(to_radian) << "}";
    OGRErr err = OGRERR_NONE;
    const double semi_major = OSRGetSemiMajor(srs, &err);
    out << ",\"semiMajorM\":" << (err == OGRERR_NONE ? num(semi_major) : "null");
    out << ",\"datum\":" << json_string(OSRGetAttrValue(srs, "DATUM", 0));

    PJ_CONTEXT* ctx = proj_context_create();
    proj_context_set_enable_network(ctx, 0);
    PJ* crs = wkt ? proj_create(ctx, wkt) : nullptr;
    if (crs && proj_get_type(crs) == PJ_TYPE_COMPOUND_CRS) {
        PJ* horizontal = proj_crs_get_sub_crs(ctx, crs, 0);
        PJ* vertical = proj_crs_get_sub_crs(ctx, crs, 1);
        out << ",\"horizontalName\":" << json_string(horizontal ? proj_get_name(horizontal) : nullptr)
            << ",\"verticalName\":" << json_string(vertical ? proj_get_name(vertical) : nullptr);
        if (horizontal) {
            const PJ_TYPE h = proj_get_type(horizontal);
            out << ",\"horizontalType\":" << json_string(h == PJ_TYPE_PROJECTED_CRS ? "projected" : (h == PJ_TYPE_GEOGRAPHIC_2D_CRS || h == PJ_TYPE_GEOGRAPHIC_3D_CRS) ? "geographic" : "other");
        }
        proj_destroy(horizontal);
        proj_destroy(vertical);
    } else {
        out << ",\"horizontalName\":null,\"verticalName\":null,\"horizontalType\":" << json_string(type);
    }
    out << ",\"areaOfUse\":" << (crs ? area_json(ctx, crs) : "null");
    if (has_bounds) {
        std::string error;
        const std::string transform = crs ? transform_json(ctx, crs, source, error) : "";
        if (transform.empty()) {
            out << ",\"transform\":null,\"transformError\":" << json_string(error.empty() ? "PROJ 无法读取该坐标系" : error);
        } else {
            out << ",\"transform\":" << transform;
        }
    }
    proj_destroy(crs);
    proj_context_destroy(ctx);

    out << ",\"wkt\":" << json_string(wkt) << ",\"projjson\":" << (projjson ? projjson : "null") << "}";
    std::printf("%s\n", out.str().c_str());
    CPLFree(wkt);
    CPLFree(projjson);
    OSRDestroySpatialReference(srs);
    return 0;
}

// Lon/lat (EPSG:4326, east/north) to raster CRS through the selected
// pipeline, inverted. Without a pipeline the points are already in the
// raster CRS.
bool points_to_raster(const std::string& pipeline, std::vector<double>& xs, std::vector<double>& ys, std::string& error) {
    if (pipeline.empty()) return true;
    PJ_CONTEXT* ctx = proj_context_create();
    proj_context_set_enable_network(ctx, 0);
    PJ* op = proj_create(ctx, pipeline.c_str());
    if (!op) {
        error = "cannot build the coordinate operation";
        proj_context_destroy(ctx);
        return false;
    }
    for (size_t i = 0; i < xs.size(); ++i) {
        PJ_COORD c = proj_trans(op, PJ_INV, proj_coord(xs[i], ys[i], 0, 0));
        xs[i] = c.xy.x;
        ys[i] = c.xy.y;
    }
    proj_destroy(op);
    proj_context_destroy(ctx);
    return true;
}
