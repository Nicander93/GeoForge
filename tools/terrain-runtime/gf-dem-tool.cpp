// gf-dem-tool: the few raster operations the terrain pipeline needs and the
// stock GDAL command-line tools do not provide without Python.
//
//   gf-dem-tool stats <raster>
//   gf-dem-tool fill-constant <in> <out.tif> <value>
//   gf-dem-tool fill-interpolate <in> <out.tif> <max-search-pixels>
//   gf-dem-tool sample <raster> <points.txt>   ("x y" per line, raster CRS)
//
// Every command prints one JSON object on stdout. Exit codes: 0 ok,
// 2 usage or I/O error, 3 NoData left after interpolation.
#include <gdal.h>
#include <gdal_alg.h>
#include <cpl_conv.h>
#include <cpl_string.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

namespace {

struct Counts {
    long long valid = 0;
    long long nodata = 0;
    long long zero = 0;
    double min = std::numeric_limits<double>::infinity();
    double max = -std::numeric_limits<double>::infinity();
};

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

std::string number(double value) {
    if (!std::isfinite(value)) return "null";
    char buffer[64];
    std::snprintf(buffer, sizeof buffer, "%.17g", value);
    return buffer;
}

bool is_nodata(double value, bool has_nodata, double nodata) {
    if (std::isnan(value)) return true;
    if (!has_nodata) return false;
    if (std::isnan(nodata)) return false;
    return value == nodata;
}

// Reads the band in row strips so memory stays bounded for large DEMs.
bool scan_band(GDALRasterBandH band, bool has_nodata, double nodata, Counts& counts) {
    const int width = GDALGetRasterBandXSize(band);
    const int height = GDALGetRasterBandYSize(band);
    int block_x = 0, block_y = 0;
    GDALGetBlockSize(band, &block_x, &block_y);
    const int strip = block_y > 0 && block_y < 1024 ? block_y : 256;
    std::vector<double> rows(static_cast<size_t>(width) * strip);
    for (int y = 0; y < height; y += strip) {
        const int count = std::min(strip, height - y);
        if (GDALRasterIO(band, GF_Read, 0, y, width, count, rows.data(), width, count, GDT_Float64, 0, 0) != CE_None) {
            return false;
        }
        for (size_t i = 0; i < static_cast<size_t>(width) * count; ++i) {
            const double value = rows[i];
            if (is_nodata(value, has_nodata, nodata)) {
                ++counts.nodata;
                continue;
            }
            ++counts.valid;
            if (value == 0.0) ++counts.zero;
            if (value < counts.min) counts.min = value;
            if (value > counts.max) counts.max = value;
        }
    }
    return true;
}

GDALDatasetH open_single_band(const char* path) {
    GDALDatasetH dataset = GDALOpen(path, GA_ReadOnly);
    if (dataset && GDALGetRasterCount(dataset) != 1) {
        GDALClose(dataset);
        return nullptr;
    }
    return dataset;
}

int run_stats(const char* path) {
    GDALDatasetH dataset = open_single_band(path);
    if (!dataset) return fail(std::string("cannot open single-band raster: ") + path);
    GDALRasterBandH band = GDALGetRasterBand(dataset, 1);
    int has = 0;
    const double nodata = GDALGetRasterNoDataValue(band, &has);
    Counts counts;
    if (!scan_band(band, has != 0, nodata, counts)) {
        GDALClose(dataset);
        return fail("read failed");
    }
    std::printf(
        "{\"ok\":true,\"width\":%d,\"height\":%d,\"noDataDeclared\":%s,\"noDataValue\":%s,"
        "\"validCount\":%lld,\"noDataCount\":%lld,\"zeroCount\":%lld,\"min\":%s,\"max\":%s}\n",
        GDALGetRasterXSize(dataset), GDALGetRasterYSize(dataset), has ? "true" : "false",
        has ? number(nodata).c_str() : "null", counts.valid, counts.nodata, counts.zero,
        number(counts.min).c_str(), number(counts.max).c_str());
    GDALClose(dataset);
    return 0;
}

char** tiff_options() {
    char** options = nullptr;
    options = CSLSetNameValue(options, "TILED", "YES");
    options = CSLSetNameValue(options, "COMPRESS", "DEFLATE");
    options = CSLSetNameValue(options, "PREDICTOR", "3");
    options = CSLSetNameValue(options, "BIGTIFF", "IF_SAFER");
    return options;
}

// Float32 copy of the input. The NoData declaration is kept so the fill step
// can find the holes; it is removed once every hole is filled.
GDALDatasetH create_float_copy(GDALDatasetH source, const char* out_path) {
    GDALDriverH driver = GDALGetDriverByName("GTiff");
    const int width = GDALGetRasterXSize(source);
    const int height = GDALGetRasterYSize(source);
    char** options = tiff_options();
    GDALDatasetH out = GDALCreate(driver, out_path, width, height, 1, GDT_Float32, options);
    CSLDestroy(options);
    if (!out) return nullptr;
    double transform[6];
    if (GDALGetGeoTransform(source, transform) == CE_None) GDALSetGeoTransform(out, transform);
    const char* wkt = GDALGetProjectionRef(source);
    if (wkt && *wkt) GDALSetProjection(out, wkt);
    return out;
}

bool copy_rows(GDALRasterBandH from, GDALRasterBandH to, bool replace, bool has_nodata, double nodata, double fill, long long& replaced) {
    const int width = GDALGetRasterBandXSize(from);
    const int height = GDALGetRasterBandYSize(from);
    const int strip = 256;
    std::vector<double> rows(static_cast<size_t>(width) * strip);
    for (int y = 0; y < height; y += strip) {
        const int count = std::min(strip, height - y);
        if (GDALRasterIO(from, GF_Read, 0, y, width, count, rows.data(), width, count, GDT_Float64, 0, 0) != CE_None) return false;
        if (replace) {
            for (size_t i = 0; i < static_cast<size_t>(width) * count; ++i) {
                if (is_nodata(rows[i], has_nodata, nodata)) {
                    rows[i] = fill;
                    ++replaced;
                }
            }
        }
        if (GDALRasterIO(to, GF_Write, 0, y, width, count, rows.data(), width, count, GDT_Float64, 0, 0) != CE_None) return false;
    }
    return true;
}

int run_fill_constant(const char* in_path, const char* out_path, double value) {
    GDALDatasetH source = open_single_band(in_path);
    if (!source) return fail(std::string("cannot open single-band raster: ") + in_path);
    GDALRasterBandH band = GDALGetRasterBand(source, 1);
    int has = 0;
    const double nodata = GDALGetRasterNoDataValue(band, &has);
    GDALDatasetH out = create_float_copy(source, out_path);
    if (!out) {
        GDALClose(source);
        return fail(std::string("cannot create ") + out_path);
    }
    long long replaced = 0;
    const bool ok = copy_rows(band, GDALGetRasterBand(out, 1), true, has != 0, nodata, value, replaced);
    GDALClose(out);
    GDALClose(source);
    if (!ok) return fail("read or write failed");
    std::printf("{\"ok\":true,\"mode\":\"explicit-constant\",\"filledCount\":%lld,\"remainingNoDataCount\":0}\n", replaced);
    return 0;
}

int run_fill_interpolate(const char* in_path, const char* out_path, double max_search) {
    GDALDatasetH source = open_single_band(in_path);
    if (!source) return fail(std::string("cannot open single-band raster: ") + in_path);
    GDALRasterBandH band = GDALGetRasterBand(source, 1);
    int has = 0;
    const double nodata = GDALGetRasterNoDataValue(band, &has);
    if (!has) {
        GDALClose(source);
        return fail("raster declares no NoData value; nothing to interpolate");
    }
    GDALDatasetH out = create_float_copy(source, out_path);
    if (!out) {
        GDALClose(source);
        return fail(std::string("cannot create ") + out_path);
    }
    GDALRasterBandH out_band = GDALGetRasterBand(out, 1);
    GDALSetRasterNoDataValue(out_band, nodata);
    long long unused = 0;
    if (!copy_rows(band, out_band, false, true, nodata, 0.0, unused)) {
        GDALClose(out);
        GDALClose(source);
        return fail("copy failed");
    }
    Counts before;
    scan_band(out_band, true, nodata, before);
    if (GDALFillNodata(out_band, nullptr, max_search, 0, 0, nullptr, nullptr, nullptr) != CE_None) {
        GDALClose(out);
        GDALClose(source);
        return fail("GDALFillNodata failed");
    }
    Counts after;
    scan_band(out_band, true, nodata, after);
    if (after.nodata == 0) GDALDeleteRasterNoDataValue(out_band);
    GDALClose(out);
    GDALClose(source);
    std::printf("{\"ok\":%s,\"mode\":\"interpolate\",\"filledCount\":%lld,\"remainingNoDataCount\":%lld}\n",
                after.nodata == 0 ? "true" : "false", before.nodata - after.nodata, after.nodata);
    return after.nodata == 0 ? 0 : 3;
}

// Bilinear sample in raster CRS; null when any neighbour is NoData or the
// point lies outside the raster.
int run_sample(const char* path, const char* points_path) {
    GDALDatasetH dataset = open_single_band(path);
    if (!dataset) return fail(std::string("cannot open single-band raster: ") + path);
    double t[6];
    if (GDALGetGeoTransform(dataset, t) != CE_None || t[2] != 0.0 || t[4] != 0.0) {
        GDALClose(dataset);
        return fail("raster needs a north-up geotransform");
    }
    GDALRasterBandH band = GDALGetRasterBand(dataset, 1);
    int has = 0;
    const double nodata = GDALGetRasterNoDataValue(band, &has);
    const int width = GDALGetRasterXSize(dataset);
    const int height = GDALGetRasterYSize(dataset);
    std::ifstream points(points_path);
    if (!points) {
        GDALClose(dataset);
        return fail(std::string("cannot read points file: ") + points_path);
    }
    std::string line;
    std::ostringstream values;
    bool first = true;
    while (std::getline(points, line)) {
        std::istringstream fields(line);
        double x = 0, y = 0;
        if (!(fields >> x >> y)) continue;
        const double px = (x - t[0]) / t[1] - 0.5;
        const double py = (y - t[3]) / t[5] - 0.5;
        const int x0 = static_cast<int>(std::floor(px));
        const int y0 = static_cast<int>(std::floor(py));
        std::string result = "null";
        if (x0 >= 0 && y0 >= 0 && x0 + 1 < width && y0 + 1 < height) {
            double window[4];
            if (GDALRasterIO(band, GF_Read, x0, y0, 2, 2, window, 2, 2, GDT_Float64, 0, 0) == CE_None) {
                bool valid = true;
                for (double v : window) valid = valid && !is_nodata(v, has != 0, nodata);
                if (valid) {
                    const double fx = px - x0, fy = py - y0;
                    const double top = window[0] * (1 - fx) + window[1] * fx;
                    const double bottom = window[2] * (1 - fx) + window[3] * fx;
                    result = number(top * (1 - fy) + bottom * fy);
                }
            }
        }
        values << (first ? "" : ",") << result;
        first = false;
    }
    GDALClose(dataset);
    std::printf("{\"ok\":true,\"values\":[%s]}\n", values.str().c_str());
    return 0;
}

}  // namespace

int main(int argc, char** argv) {
    GDALAllRegister();
    CPLSetConfigOption("GDAL_PAM_ENABLED", "NO");
    const std::string command = argc > 1 ? argv[1] : "";
    if (command == "stats" && argc == 3) return run_stats(argv[2]);
    if (command == "fill-constant" && argc == 5) return run_fill_constant(argv[2], argv[3], std::atof(argv[4]));
    if (command == "fill-interpolate" && argc == 5) return run_fill_interpolate(argv[2], argv[3], std::atof(argv[4]));
    if (command == "sample" && argc == 4) return run_sample(argv[2], argv[3]);
    if (command == "--version") {
        std::printf("{\"ok\":true,\"tool\":\"gf-dem-tool\",\"version\":1,\"gdal\":\"%s\"}\n", GDALVersionInfo("RELEASE_NAME"));
        return 0;
    }
    return fail("usage: gf-dem-tool stats|fill-constant|fill-interpolate|sample ...");
}
