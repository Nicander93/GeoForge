// gf-dem-tool apron <in> <out.vrt> <pixels>
//
// Display apron around a NoData-free DEM. CTB samples 0 m outside its input
// raster, so the tile set drops from the data edge straight to 0 m. The apron
// adds a band of synthetic heights, <pixels> wide, on every side of the
// raster: the edge heights, smoothed along the edge more the further out they
// are, times a cosine taper that reaches 0 m at the outer border.
//
// The input pixels are not touched: the output is a VRT over the input plus
// four strip rasters (<out>-apron-top.tif etc.) that never overlap it. The
// tool reads the inner window back through the VRT and fails unless every
// pixel equals the input ("innerMismatchCount": 0).
#include "gf-dem-apron.h"

#include <gdal.h>
#include <gdal_vrt.h>
#include <cpl_conv.h>
#include <cpl_string.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

namespace {

const double kPi = 3.14159265358979323846;

int apron_fail(const std::string& message) {
    std::string escaped;
    for (char c : message) {
        if (c == '"' || c == '\\') escaped.push_back('\\');
        if (c == '\n' || c == '\r') c = ' ';
        escaped.push_back(c);
    }
    std::printf("{\"ok\":false,\"error\":\"%s\"}\n", escaped.c_str());
    return 2;
}

std::string json_number(double value) {
    if (!std::isfinite(value)) return "null";
    char buffer[64];
    std::snprintf(buffer, sizeof buffer, "%.17g", value);
    return buffer;
}

// Running mean along one edge, half-window `k` pixels, clamped at the ends.
struct EdgeLine {
    std::vector<double> prefix;  // prefix[i] = sum of values[0..i)

    explicit EdgeLine(const std::vector<double>& values) : prefix(values.size() + 1, 0.0) {
        for (size_t i = 0; i < values.size(); ++i) prefix[i + 1] = prefix[i] + values[i];
    }
    double mean(long long at, long long k) const {
        const long long n = static_cast<long long>(prefix.size()) - 1;
        at = std::min(std::max(at, 0LL), n - 1);
        const long long lo = std::max(0LL, at - k);
        const long long hi = std::min(n - 1, at + k);
        return (prefix[hi + 1] - prefix[lo]) / static_cast<double>(hi - lo + 1);
    }
};

// 1 at the data edge, 0 at `width` pixels and beyond, smooth at both ends.
double taper(double distance, double width) {
    if (distance >= width) return 0.0;
    return 0.5 * (1.0 + std::cos(kPi * distance / width));
}

bool read_line(GDALRasterBandH band, int x, int y, int w, int h, std::vector<double>& out) {
    out.assign(static_cast<size_t>(w) * h, 0.0);
    return GDALRasterIO(band, GF_Read, x, y, w, h, out.data(), w, h, GDT_Float64, 0, 0) == CE_None;
}

GDALDatasetH create_strip(const std::string& path, int w, int h, const double* gt, const char* wkt) {
    char** options = nullptr;
    options = CSLSetNameValue(options, "TILED", "YES");
    options = CSLSetNameValue(options, "COMPRESS", "DEFLATE");
    options = CSLSetNameValue(options, "PREDICTOR", "3");
    GDALDatasetH out = GDALCreate(GDALGetDriverByName("GTiff"), path.c_str(), w, h, 1, GDT_Float32, options);
    CSLDestroy(options);
    if (!out) return nullptr;
    GDALSetGeoTransform(out, const_cast<double*>(gt));
    if (wkt && *wkt) GDALSetProjection(out, wkt);
    return out;
}

}  // namespace

int run_apron(int argc, char** argv) {
    if (argc != 5) return apron_fail("usage: gf-dem-tool apron <in> <out.vrt> <pixels>");
    const char* in_path = argv[2];
    const std::string out_path = argv[3];
    const int a = std::atoi(argv[4]);
    if (a < 1 || a > 4096) return apron_fail("apron width must be 1..4096 pixels");

    GDALDatasetH source = GDALOpen(in_path, GA_ReadOnly);
    if (!source || GDALGetRasterCount(source) != 1) {
        if (source) GDALClose(source);
        return apron_fail(std::string("cannot open single-band raster: ") + in_path);
    }
    double gt[6];
    if (GDALGetGeoTransform(source, gt) != CE_None || gt[2] != 0.0 || gt[4] != 0.0) {
        GDALClose(source);
        return apron_fail("apron needs a north-up geotransform");
    }
    const int W = GDALGetRasterXSize(source);
    const int H = GDALGetRasterYSize(source);
    GDALRasterBandH band = GDALGetRasterBand(source, 1);
    const std::string wkt = GDALGetProjectionRef(source) ? GDALGetProjectionRef(source) : "";

    std::vector<double> top, bottom, left, right;
    if (!read_line(band, 0, 0, W, 1, top) || !read_line(band, 0, H - 1, W, 1, bottom) ||
        !read_line(band, 0, 0, 1, H, left) || !read_line(band, W - 1, 0, 1, H, right)) {
        GDALClose(source);
        return apron_fail("cannot read the raster edges");
    }
    for (const auto* line : {&top, &bottom, &left, &right}) {
        for (double v : *line) {
            if (!std::isfinite(v)) {
                GDALClose(source);
                return apron_fail("raster edge has NaN; fill NoData before the apron");
            }
        }
    }
    const EdgeLine top_line(top), bottom_line(bottom), left_line(left), right_line(right);

    // Strip rasters. Top and bottom span the corners; left and right only H rows.
    struct Strip {
        std::string suffix;
        int x0, y0, w, h;  // pixel offset in the padded grid
    };
    const Strip strips[4] = {
        {"top", 0, 0, W + 2 * a, a},
        {"bottom", 0, H + a, W + 2 * a, a},
        {"left", 0, a, a, H},
        {"right", W + a, a, a, H},
    };
    std::string stem = out_path;
    if (stem.size() > 4 && stem.compare(stem.size() - 4, 4, ".vrt") == 0) stem.resize(stem.size() - 4);
    std::vector<std::string> strip_paths;
    long long apron_count = 0;
    double apron_max = 0.0;
    for (const Strip& s : strips) {
        const std::string path = stem + "-apron-" + s.suffix + ".tif";
        double sgt[6] = {gt[0] + (s.x0 - a) * gt[1], gt[1], 0.0, gt[3] + (s.y0 - a) * gt[5], 0.0, gt[5]};
        GDALDatasetH out = create_strip(path, s.w, s.h, sgt, wkt.c_str());
        if (!out) {
            GDALClose(source);
            return apron_fail("cannot create " + path);
        }
        GDALRasterBandH out_band = GDALGetRasterBand(out, 1);
        std::vector<float> row(s.w);
        bool ok = true;
        for (int r = 0; r < s.h && ok; ++r) {
            const long long py = s.y0 + r - a;  // row in the input grid (may be outside)
            for (int c = 0; c < s.w; ++c) {
                const long long px = s.x0 + c - a;
                const long long dx = px < 0 ? -px : (px > W - 1 ? px - (W - 1) : 0);
                const long long dy = py < 0 ? -py : (py > H - 1 ? py - (H - 1) : 0);
                const double distance = std::sqrt(static_cast<double>(dx * dx + dy * dy));
                // Nearest edge, smoothed over as many pixels as we are away from it.
                double edge;
                if (dy >= dx) {
                    const EdgeLine& line = py < 0 ? top_line : bottom_line;
                    edge = line.mean(px, dy);
                } else {
                    const EdgeLine& line = px < 0 ? left_line : right_line;
                    edge = line.mean(py, dx);
                }
                const double value = edge * taper(distance, a);
                row[c] = static_cast<float>(value);
                apron_max = std::max(apron_max, std::fabs(value));
            }
            ok = GDALRasterIO(out_band, GF_Write, 0, r, s.w, 1, row.data(), s.w, 1, GDT_Float32, 0, 0) == CE_None;
        }
        apron_count += static_cast<long long>(s.w) * s.h;
        GDALClose(out);
        if (!ok) {
            GDALClose(source);
            return apron_fail("cannot write " + path);
        }
        strip_paths.push_back(path);
    }

    // VRT: input in the middle, strips around it, Float32, no NoData: the
    // input has none left after the fill step and 0 m is a real apron height.
    GDALDatasetH vrt = GDALCreate(GDALGetDriverByName("VRT"), out_path.c_str(), W + 2 * a, H + 2 * a, 1, GDT_Float32, nullptr);
    if (!vrt) {
        GDALClose(source);
        return apron_fail("cannot create the apron VRT");
    }
    double vrt_gt[6] = {gt[0] - a * gt[1], gt[1], 0.0, gt[3] - a * gt[5], 0.0, gt[5]};
    GDALSetGeoTransform(vrt, vrt_gt);
    if (!wkt.empty()) GDALSetProjection(vrt, wkt.c_str());
    GDALRasterBandH vrt_out = GDALGetRasterBand(vrt, 1);
    bool added = VRTAddSimpleSource(vrt_out, band, 0, 0, W, H, a, a, W, H, "near", VRT_NODATA_UNSET) == CE_None;
    std::vector<GDALDatasetH> opened;
    for (size_t i = 0; i < 4 && added; ++i) {
        GDALDatasetH strip = GDALOpen(strip_paths[i].c_str(), GA_ReadOnly);
        if (!strip) {
            added = false;
            break;
        }
        opened.push_back(strip);
        const Strip& s = strips[i];
        added = VRTAddSimpleSource(vrt_out, GDALGetRasterBand(strip, 1), 0, 0, s.w, s.h, s.x0, s.y0, s.w, s.h, "near", VRT_NODATA_UNSET) == CE_None;
    }
    GDALFlushCache(vrt);
    if (!added) {
        GDALClose(vrt);
        for (auto d : opened) GDALClose(d);
        GDALClose(source);
        return apron_fail("cannot add sources to the apron VRT");
    }

    // Proof that the data did not move or change: the inner window of the VRT
    // must equal the input pixel for pixel (compared as float32).
    GDALRasterBandH vrt_band = GDALGetRasterBand(vrt, 1);
    long long mismatch = 0;
    const int strip_rows = 256;
    std::vector<float> want(static_cast<size_t>(W) * strip_rows), got(want.size());
    for (int y = 0; y < H; y += strip_rows) {
        const int n = std::min(strip_rows, H - y);
        if (GDALRasterIO(band, GF_Read, 0, y, W, n, want.data(), W, n, GDT_Float32, 0, 0) != CE_None ||
            GDALRasterIO(vrt_band, GF_Read, a, a + y, W, n, got.data(), W, n, GDT_Float32, 0, 0) != CE_None) {
            GDALClose(vrt);
            for (auto d : opened) GDALClose(d);
            GDALClose(source);
            return apron_fail("cannot read back the apron VRT");
        }
        for (size_t i = 0; i < static_cast<size_t>(W) * n; ++i) {
            if (!(want[i] == got[i])) ++mismatch;
        }
    }
    double vgt[6];
    GDALGetGeoTransform(vrt, vgt);
    GDALClose(vrt);
    for (auto d : opened) GDALClose(d);
    GDALClose(source);
    const double west = vgt[0], north = vgt[3];
    const double east = west + vgt[1] * (W + 2 * a), south = north + vgt[5] * (H + 2 * a);
    std::printf(
        "{\"ok\":%s,\"apronPixels\":%d,\"apronCount\":%lld,\"apronMaxAbsM\":%s,\"width\":%d,\"height\":%d,"
        "\"bounds\":[%s,%s,%s,%s],\"innerPixelCount\":%lld,\"innerMismatchCount\":%lld}\n",
        mismatch == 0 ? "true" : "false", a, apron_count, json_number(apron_max).c_str(), W + 2 * a, H + 2 * a,
        json_number(west).c_str(), json_number(south).c_str(), json_number(east).c_str(), json_number(north).c_str(),
        static_cast<long long>(W) * H, mismatch);
    return mismatch == 0 ? 0 : 4;
}
