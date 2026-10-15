// Footprint commands of gf-dem-tool: tell the NoData a reprojection adds
// around the data (outside the source footprint) from real holes inside it,
// and give the outside pixels synthetic heights so CTB never sees NoData
// there (it would write 0 m).
//
//   gf-dem-tool footprint <warped> <coverage> count
//   gf-dem-tool footprint <warped> <coverage> <out.tif> none|constant <m>|interpolate <px>
//
// <warped> is the DEM after gdalwarp (NoData declared). <coverage> is the
// same warp with source NoData ignored, nearest resampling and -dstalpha:
// its last band is 0 exactly where no source pixel lands. Both must share
// one grid. Holes are handled by the user's policy; outside pixels get an
// inverse-distance extension of the valid heights (GDALFillNodata without
// a distance limit), which never changes a valid pixel.
#include "gf-dem-footprint.h"

#include <gdal.h>
#include <gdal_alg.h>
#include <cpl_conv.h>
#include <cpl_string.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

namespace {

int fail(const std::string& message) {
    std::string escaped;
    for (char c : message) {
        if (c == '"' || c == '\\') escaped.push_back('\\');
        if (c == '\n' || c == '\r') c = ' ';
        escaped.push_back(c);
    }
    std::printf("{\"ok\":false,\"error\":\"%s\"}\n", escaped.c_str());
    return 2;
}

bool is_nodata(double value, bool has, double nodata) {
    if (std::isnan(value)) return true;
    return has && !std::isnan(nodata) && value == nodata;
}

struct Raster {
    GDALDatasetH dataset = nullptr;
    GDALRasterBandH band = nullptr;
    int width = 0, height = 0;
    bool has_nodata = false;
    double nodata = 0;

    ~Raster() {
        if (dataset) GDALClose(dataset);
    }
};

bool open(const char* path, Raster& raster, int band, GDALAccess access = GA_ReadOnly) {
    raster.dataset = GDALOpen(path, access);
    if (!raster.dataset) return false;
    const int count = GDALGetRasterCount(raster.dataset);
    raster.band = GDALGetRasterBand(raster.dataset, band < 0 ? count : band);
    if (!raster.band) return false;
    raster.width = GDALGetRasterXSize(raster.dataset);
    raster.height = GDALGetRasterYSize(raster.dataset);
    int has = 0;
    raster.nodata = GDALGetRasterNoDataValue(raster.band, &has);
    raster.has_nodata = has != 0;
    return true;
}

// Float32 GeoTIFF copy of `from`, NoData declaration kept.
bool create_copy(const Raster& from, const std::string& path, Raster& out) {
    char** options = nullptr;
    options = CSLSetNameValue(options, "TILED", "YES");
    options = CSLSetNameValue(options, "COMPRESS", "DEFLATE");
    options = CSLSetNameValue(options, "PREDICTOR", "3");
    options = CSLSetNameValue(options, "BIGTIFF", "IF_SAFER");
    out.dataset = GDALCreate(GDALGetDriverByName("GTiff"), path.c_str(), from.width, from.height, 1, GDT_Float32, options);
    CSLDestroy(options);
    if (!out.dataset) return false;
    double t[6];
    if (GDALGetGeoTransform(from.dataset, t) == CE_None) GDALSetGeoTransform(out.dataset, t);
    const char* wkt = GDALGetProjectionRef(from.dataset);
    if (wkt && *wkt) GDALSetProjection(out.dataset, wkt);
    out.band = GDALGetRasterBand(out.dataset, 1);
    out.width = from.width;
    out.height = from.height;
    out.has_nodata = true;
    out.nodata = from.has_nodata ? from.nodata : -32768.0;
    GDALSetRasterNoDataValue(out.band, out.nodata);
    const int strip = 256;
    std::vector<double> rows(static_cast<size_t>(from.width) * strip);
    for (int y = 0; y < from.height; y += strip) {
        const int n = std::min(strip, from.height - y);
        if (GDALRasterIO(from.band, GF_Read, 0, y, from.width, n, rows.data(), from.width, n, GDT_Float64, 0, 0) != CE_None) return false;
        if (GDALRasterIO(out.band, GF_Write, 0, y, from.width, n, rows.data(), from.width, n, GDT_Float64, 0, 0) != CE_None) return false;
    }
    return true;
}

struct Tally {
    long long valid = 0, holes = 0, outside = 0, filled_holes = 0, auxiliary = 0, remaining = 0, aux_missing = 0;
};

}  // namespace

int run_footprint(int argc, char** argv) {
    if (argc < 5) return fail("usage: footprint <warped> <coverage> count | <out.tif> none|constant <m>|interpolate <px>");
    Raster warped, coverage;
    if (!open(argv[2], warped, 1)) return fail(std::string("cannot open ") + argv[2]);
    if (!open(argv[3], coverage, -1)) return fail(std::string("cannot open ") + argv[3]);
    if (warped.width != coverage.width || warped.height != coverage.height) {
        return fail("warped DEM and coverage raster have different grids");
    }
    const bool count_only = std::string(argv[4]) == "count";
    std::string mode = "none";
    double argument = 0;
    if (!count_only) {
        if (argc < 6) return fail("missing fill mode");
        mode = argv[5];
        if (mode != "none") {
            if (argc < 7) return fail("missing fill argument");
            argument = CPLAtof(argv[6]);
        }
        if (mode != "none" && mode != "constant" && mode != "interpolate") return fail("unknown fill mode " + mode);
    }

    const int w = warped.width, h = warped.height, strip = 256;
    std::vector<double> dem(static_cast<size_t>(w) * strip), cover(dem.size()), out_rows(dem.size()), aux_rows(dem.size());
    Tally tally;

    Raster out, aux;
    std::string aux_path;
    if (!count_only) {
        if (!create_copy(warped, argv[4], out)) return fail(std::string("cannot create ") + argv[4]);
        if (mode == "interpolate") {
            // Holes are filled from valid pixels only: outside pixels are still
            // NoData here, and whatever this puts there is replaced below.
            if (GDALFillNodata(out.band, nullptr, argument, 0, 0, nullptr, nullptr, nullptr) != CE_None) {
                return fail("GDALFillNodata failed for holes");
            }
        }
        aux_path = std::string(argv[4]) + ".aux-extension.tif";
        if (!create_copy(warped, aux_path, aux)) return fail("cannot create auxiliary raster");
        const double reach = static_cast<double>(std::max(w, h));
        if (GDALFillNodata(aux.band, nullptr, reach, 0, 0, nullptr, nullptr, nullptr) != CE_None) {
            return fail("GDALFillNodata failed for the outside extension");
        }
    }

    for (int y = 0; y < h; y += strip) {
        const int n = std::min(strip, h - y);
        const size_t size = static_cast<size_t>(w) * n;
        if (GDALRasterIO(warped.band, GF_Read, 0, y, w, n, dem.data(), w, n, GDT_Float64, 0, 0) != CE_None ||
            GDALRasterIO(coverage.band, GF_Read, 0, y, w, n, cover.data(), w, n, GDT_Float64, 0, 0) != CE_None) {
            return fail("read failed");
        }
        if (!count_only &&
            (GDALRasterIO(out.band, GF_Read, 0, y, w, n, out_rows.data(), w, n, GDT_Float64, 0, 0) != CE_None ||
             GDALRasterIO(aux.band, GF_Read, 0, y, w, n, aux_rows.data(), w, n, GDT_Float64, 0, 0) != CE_None)) {
            return fail("read failed");
        }
        for (size_t i = 0; i < size; ++i) {
            if (!is_nodata(dem[i], warped.has_nodata, warped.nodata)) {
                ++tally.valid;
                continue;
            }
            const bool inside = cover[i] > 0;
            if (inside) {
                ++tally.holes;
                if (count_only) continue;
                if (mode == "constant") out_rows[i] = argument;
                if (is_nodata(out_rows[i], true, out.nodata)) {
                    ++tally.remaining;
                } else {
                    ++tally.filled_holes;
                }
            } else {
                ++tally.outside;
                if (count_only) continue;
                out_rows[i] = aux_rows[i];
                if (is_nodata(aux_rows[i], true, aux.nodata)) {
                    ++tally.aux_missing;
                } else {
                    ++tally.auxiliary;
                }
            }
        }
        if (!count_only && GDALRasterIO(out.band, GF_Write, 0, y, w, n, out_rows.data(), w, n, GDT_Float64, 0, 0) != CE_None) {
            return fail("write failed");
        }
    }

    if (!count_only) {
        if (tally.remaining == 0 && tally.aux_missing == 0) GDALDeleteRasterNoDataValue(out.band);
        GDALClose(aux.dataset);
        aux.dataset = nullptr;
        VSIUnlink(aux_path.c_str());
    }
    std::printf(
        "{\"ok\":%s,\"mode\":\"%s\",\"validCount\":%lld,\"sourceHoleCount\":%lld,\"outsideCount\":%lld,"
        "\"filledHoleCount\":%lld,\"auxiliaryCount\":%lld,\"remainingHoleCount\":%lld,\"auxiliaryMissingCount\":%lld}\n",
        tally.remaining == 0 && tally.aux_missing == 0 ? "true" : "false", count_only ? "count" : mode.c_str(), tally.valid,
        tally.holes, tally.outside, tally.filled_holes, tally.auxiliary, tally.remaining, tally.aux_missing);
    return tally.remaining == 0 && tally.aux_missing == 0 ? 0 : 3;
}
