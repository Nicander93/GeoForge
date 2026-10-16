// Footprint commands of gf-dem-tool: tell the NoData a reprojection adds
// around the data (outside the source footprint) from real holes inside it,
// and give the outside pixels synthetic heights so CTB never sees NoData
// there (it would write 0 m).
//
//   gf-dem-tool footprint <warped> <coverage> count [--gaps]
//   gf-dem-tool footprint <warped> <coverage> <out.tif> none|constant <m>|interpolate <px> [--gaps]
//
// --gaps (several sources), V1.4 rule after the L-shape review: outside
// pixels are split into three kinds.
//   seam:   a narrow strip (at most 2 x kSeamHalfWidthPx wide) inside the
//           convex hull of the covered pixels, where sources meet. Filled from
//           the neighbours; count, largest distance and extent are reported so
//           the caller can check its limits.
//   outside data: any wide blank area (an L-shape's missing corner, the space
//           between separated sources) and everything connected to it that
//           reaches into the hull. Not filled and not blocked: written as 0 m,
//           which is what CTB would write for NoData anyway.
//   border: the rest, i.e. the frame a reprojection leaves outside the hull.
//           Gets the auxiliary extension like before.
// Without --gaps every outside pixel is border.
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
#include <cstdint>
#include <utility>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

namespace {

// Half the widest seam that may be filled (Rust: SourceGapPolicy::max_width_px = 8).
constexpr int kSeamHalfWidthPx = 4;

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
    long long gaps = 0, gap_filled = 0, outside_data = 0;
};

struct Box {
    int x0 = INT32_MAX, y0 = INT32_MAX, x1 = -1, y1 = -1;
    void add(int x, int y) {
        x0 = std::min(x0, x); y0 = std::min(y0, y); x1 = std::max(x1, x); y1 = std::max(y1, y);
    }
    std::string json(const double* t) const {
        if (x1 < 0) return "null";
        char buffer[256];
        // Pixel edges to georeferenced [minX, minY, maxX, maxY] (north-up grid).
        const double ax = t[0] + x0 * t[1], bx = t[0] + (x1 + 1) * t[1];
        const double ay = t[3] + y0 * t[5], by = t[3] + (y1 + 1) * t[5];
        std::snprintf(buffer, sizeof buffer, "[%.9f,%.9f,%.9f,%.9f]", std::min(ax, bx), std::min(ay, by), std::max(ax, bx), std::max(ay, by));
        return buffer;
    }
};

double cross(double ox, double oy, double ax, double ay, double bx, double by) {
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

// Per row, the [left, right] column interval of the convex hull of all
// covered pixels (left > right where the hull misses the row).
bool hull_intervals(const std::vector<uint8_t>& covered, int w, int h, std::vector<int>& left, std::vector<int>& right) {
    std::vector<std::pair<double, double>> points;
    for (int y = 0; y < h; ++y) {
        int lo = -1, hi = -1;
        const uint8_t* row = covered.data() + static_cast<size_t>(y) * w;
        for (int x = 0; x < w; ++x) {
            if (row[x]) { if (lo < 0) lo = x; hi = x; }
        }
        if (lo < 0) continue;
        // Pixel corners, so a single row or column still has an area.
        points.push_back({lo, y}); points.push_back({lo, y + 1.0});
        points.push_back({hi + 1.0, y}); points.push_back({hi + 1.0, y + 1.0});
    }
    left.assign(h, 1); right.assign(h, 0);
    if (points.empty()) return false;
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
    std::vector<std::pair<double, double>> hull(2 * points.size());
    size_t k = 0;
    for (size_t i = 0; i < points.size(); ++i) {
        while (k >= 2 && cross(hull[k - 2].first, hull[k - 2].second, hull[k - 1].first, hull[k - 1].second, points[i].first, points[i].second) <= 0) --k;
        hull[k++] = points[i];
    }
    for (size_t i = points.size() - 1, t = k + 1; i > 0; --i) {
        while (k >= t && cross(hull[k - 2].first, hull[k - 2].second, hull[k - 1].first, hull[k - 1].second, points[i - 1].first, points[i - 1].second) <= 0) --k;
        hull[k++] = points[i - 1];
    }
    hull.resize(k - 1);
    for (int y = 0; y < h; ++y) {
        const double cy = y + 0.5;
        double lo = 1e300, hi = -1e300;
        for (size_t i = 0; i < hull.size(); ++i) {
            const auto& a = hull[i];
            const auto& b = hull[(i + 1) % hull.size()];
            if ((a.second <= cy && b.second >= cy) || (b.second <= cy && a.second >= cy)) {
                const double x = a.second == b.second ? std::min(a.first, b.first)
                                                      : a.first + (cy - a.second) * (b.first - a.first) / (b.second - a.second);
                const double x2 = a.second == b.second ? std::max(a.first, b.first) : x;
                lo = std::min(lo, x); hi = std::max(hi, x2);
            }
        }
        if (lo <= hi) {
            // Pixel centres strictly inside the hull.
            left[y] = static_cast<int>(std::ceil(lo - 0.5 + 1e-9));
            right[y] = static_cast<int>(std::floor(hi - 0.5 - 1e-9));
        }
    }
    return true;
}

// Chamfer (3-4) distance to the nearest covered pixel, in pixels.
std::vector<uint16_t> distance_to_cover(const std::vector<uint8_t>& covered, int w, int h) {
    const uint16_t inf = 65535;
    std::vector<uint16_t> d(covered.size());
    for (size_t i = 0; i < covered.size(); ++i) d[i] = covered[i] ? 0 : inf;
    auto relax = [&](size_t i, int x, int y, int dx, int dy, int cost) {
        const int nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const uint16_t v = d[static_cast<size_t>(ny) * w + nx];
        if (v != inf && v + cost < d[i]) d[i] = static_cast<uint16_t>(std::min(v + cost, 65534));
    };
    for (int y = 0; y < h; ++y)
        for (int x = 0; x < w; ++x) {
            const size_t i = static_cast<size_t>(y) * w + x;
            if (!d[i]) continue;
            relax(i, x, y, -1, 0, 3); relax(i, x, y, 0, -1, 3); relax(i, x, y, -1, -1, 4); relax(i, x, y, 1, -1, 4);
        }
    for (int y = h - 1; y >= 0; --y)
        for (int x = w - 1; x >= 0; --x) {
            const size_t i = static_cast<size_t>(y) * w + x;
            if (!d[i]) continue;
            relax(i, x, y, 1, 0, 3); relax(i, x, y, 0, 1, 3); relax(i, x, y, 1, 1, 4); relax(i, x, y, -1, 1, 4);
        }
    return d;
}

}  // namespace

int run_footprint(int argc, char** argv) {
    bool classify_gaps = false;
    if (argc > 0 && std::string(argv[argc - 1]) == "--gaps") {
        classify_gaps = true;
        --argc;
    }
    if (argc < 5) return fail("usage: footprint <warped> <coverage> count | <out.tif> none|constant <m>|interpolate <px> [--gaps]");
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
    double transform[6] = {0, 1, 0, 0, 0, -1};
    GDALGetGeoTransform(warped.dataset, transform);
    Box border_box, gap_box, outside_box;
    std::vector<int> hull_left, hull_right;
    std::vector<uint16_t> distance;
    // Per pixel (with --gaps): 0 covered, 1 border, 2 seam, 3 outside data.
    std::vector<uint8_t> kind;
    int gap_max_distance = 0;  // chamfer units (3 per pixel step)
    if (classify_gaps) {
        std::vector<uint8_t> covered(static_cast<size_t>(w) * h);
        for (int y = 0; y < h; y += strip) {
            const int n = std::min(strip, h - y);
            if (GDALRasterIO(coverage.band, GF_Read, 0, y, w, n, cover.data(), w, n, GDT_Float64, 0, 0) != CE_None) return fail("read failed");
            for (size_t i = 0; i < static_cast<size_t>(w) * n; ++i) covered[static_cast<size_t>(y) * w + i] = cover[i] > 0;
        }
        hull_intervals(covered, w, h, hull_left, hull_right);
        // Erode the hull by a couple of pixels in both directions: the nearest-
        // neighbour staircase along a slanted source edge leaves outside pixels
        // just inside the hull, and those belong to the reprojection border.
        const int margin = 2;
        std::vector<int> left(h), right(h);
        for (int y = 0; y < h; ++y) {
            int lo = INT32_MIN, hi = INT32_MAX;
            for (int k = std::max(0, y - margin); k <= std::min(h - 1, y + margin); ++k) {
                lo = std::max(lo, hull_left[k]);
                hi = std::min(hi, hull_right[k]);
            }
            left[y] = lo + margin;
            right[y] = hi - margin;
        }
        hull_left.swap(left);
        hull_right.swap(right);
        distance = distance_to_cover(covered, w, h);

        const size_t size = covered.size();
        const int reach = 3 * kSeamHalfWidthPx;  // chamfer units
        // Wide: farther than half a seam from any data. Grow it back by the
        // same amount (a morphological opening of the blank area), so the
        // strip along the edge of a wide blank is part of that blank.
        std::vector<uint8_t> wide(size);
        for (size_t i = 0; i < size; ++i) wide[i] = !covered[i] && distance[i] > reach;
        const std::vector<uint16_t> to_wide = distance_to_cover(wide, w, h);
        kind.assign(size, 0);
        std::vector<uint8_t> region(size);
        // Grow by 4/3 of the threshold: at a concave corner of the blank (the
        // inner corner of an L) the nearest wide pixel is diagonal, and a
        // radius of `reach` would leave a few corner pixels looking like a seam.
        const int grow = 4 * kSeamHalfWidthPx;
        for (size_t i = 0; i < size; ++i) region[i] = !covered[i] && to_wide[i] <= grow;
        auto in_hull = [&](size_t i) {
            const int x = static_cast<int>(i % w), y = static_cast<int>(i / w);
            return x >= hull_left[y] && x <= hull_right[y];
        };
        std::vector<size_t> component, stack;
        for (size_t start = 0; start < size; ++start) {
            if (!region[start] || kind[start]) continue;
            component.clear();
            stack.assign(1, start);
            kind[start] = 1;
            bool reaches_hull = false;
            while (!stack.empty()) {
                const size_t i = stack.back();
                stack.pop_back();
                component.push_back(i);
                reaches_hull = reaches_hull || in_hull(i);
                const int x = static_cast<int>(i % w), y = static_cast<int>(i / w);
                const size_t next[4] = {x > 0 ? i - 1 : i, x + 1 < w ? i + 1 : i, y > 0 ? i - w : i, y + 1 < h ? i + w : i};
                for (size_t j : next) {
                    if (j != i && region[j] && !kind[j]) {
                        kind[j] = 1;
                        stack.push_back(j);
                    }
                }
            }
            if (reaches_hull) {
                for (size_t i : component) kind[i] = 3;
            }
        }
        for (size_t i = 0; i < size; ++i) {
            if (!covered[i] && !kind[i]) kind[i] = in_hull(i) ? 2 : 1;
        }
    }

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
                const int px = static_cast<int>(i % w), py = y + static_cast<int>(i / w);
                const uint8_t k = classify_gaps ? kind[static_cast<size_t>(py) * w + px] : 1;
                const bool gap = k == 2;
                if (k == 3) {
                    ++tally.outside_data;
                    outside_box.add(px, py);
                    if (!count_only) out_rows[i] = 0.0;
                    continue;
                }
                if (gap) {
                    ++tally.gaps;
                    gap_box.add(px, py);
                    gap_max_distance = std::max<int>(gap_max_distance, distance[static_cast<size_t>(py) * w + px]);
                } else {
                    border_box.add(px, py);
                }
                if (count_only) continue;
                out_rows[i] = aux_rows[i];
                if (is_nodata(aux_rows[i], true, aux.nodata)) {
                    ++tally.aux_missing;
                } else if (gap) {
                    ++tally.gap_filled;
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
        "\"filledHoleCount\":%lld,\"auxiliaryCount\":%lld,\"remainingHoleCount\":%lld,\"auxiliaryMissingCount\":%lld,"
        "\"gapsClassified\":%s,\"borderCount\":%lld,\"borderExtent\":%s,\"gapCount\":%lld,\"gapFilledCount\":%lld,"
        "\"gapMaxDistancePx\":%.3f,\"gapExtent\":%s,\"outsideDataCount\":%lld,\"outsideDataExtent\":%s}\n",
        tally.remaining == 0 && tally.aux_missing == 0 ? "true" : "false", count_only ? "count" : mode.c_str(), tally.valid,
        tally.holes, tally.outside, tally.filled_holes, tally.auxiliary, tally.remaining, tally.aux_missing,
        classify_gaps ? "true" : "false", tally.outside - tally.gaps - tally.outside_data, border_box.json(transform).c_str(), tally.gaps,
        tally.gap_filled, gap_max_distance / 3.0, gap_box.json(transform).c_str(),
        tally.outside_data, outside_box.json(transform).c_str());
    return tally.remaining == 0 && tally.aux_missing == 0 ? 0 : 3;
}
