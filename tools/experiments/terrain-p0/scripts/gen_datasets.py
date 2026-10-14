"""Generate synthetic DEM datasets D0-D4 for terrain P0 (deterministic, analytic).

Every dataset is a float32 GeoTIFF of raw elevation in metres. Heights are given
by closed-form functions (see truth_* below) so any sample point has an exact
expected value. Vertical datum: synthetic, declared as "unspecified" - the
values are not tied to 1985 national height datum or to the ellipsoid.

Usage: python gen_datasets.py --out D:\\work\\terrain-p0\\data [--only D0,D1] [--d4-size 24000]
"""
import argparse, json, math, os
import numpy as np
from osgeo import gdal, osr

gdal.UseExceptions()
SEED = 20261014
NODATA = -9999.0

def truth_geo(lon, lat):
    """D0/D3/D4 surface in geographic coordinates (degrees) -> metres."""
    return (600.0 + 250.0 * np.sin((lon - 113.9) * 40.0) * np.cos((lat - 30.4) * 35.0)
            + 80.0 * np.sin((lon + lat) * 90.0) + 300.0 * (lat - 30.4))

def truth_proj(x, y):
    """D1 surface in EPSG:4547 metres: tilted plane + ridges."""
    return (100.0 + 0.02 * (x - 490000.0) + 0.01 * (y - 3370000.0)
            + 60.0 * np.sin((x - 490000.0) / 1500.0) * np.cos((y - 3370000.0) / 2300.0))

def truth_d2(lon, lat):
    """D2: basin to -50 m, 300 m cliff at lon>=114.25, holes are NoData."""
    base = 20.0 + 40.0 * np.sin((lon - 114.2) * 120.0)
    r = np.hypot(lon - 114.23, lat - 30.53)
    basin = -70.0 * np.clip(1.0 - r / 0.015, 0.0, 1.0)
    cliff = np.where(lon >= 114.25, 300.0, 0.0)
    return base + basin + cliff

def d2_nodata_mask(lon, lat):
    hole = np.hypot(lon - 114.27, lat - 30.57) < 0.008
    strip = lat > 30.595  # missing northern edge strip
    return hole | strip

def write(path, w, h, gt, srs_epsg, fill, block=1024, bigtiff=False):
    drv = gdal.GetDriverByName("GTiff")
    opts = ["TILED=YES", "BLOCKXSIZE=256", "BLOCKYSIZE=256", "COMPRESS=DEFLATE", "PREDICTOR=3"]
    if bigtiff: opts.append("BIGTIFF=YES")
    ds = drv.Create(path, w, h, 1, gdal.GDT_Float32, opts)
    ds.SetGeoTransform(gt)
    s = osr.SpatialReference(); s.ImportFromEPSG(srs_epsg); ds.SetProjection(s.ExportToWkt())
    b = ds.GetRasterBand(1); b.SetNoDataValue(NODATA)
    for y0 in range(0, h, block):
        bh = min(block, h - y0)
        ys = gt[3] + (np.arange(y0, y0 + bh) + 0.5) * gt[5]
        xs = gt[0] + (np.arange(w) + 0.5) * gt[1]
        X, Y = np.meshgrid(xs, ys)
        b.WriteArray(fill(X, Y).astype(np.float32), 0, y0)
    b.ComputeStatistics(False)
    ds = None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="D0,D1,D2,D3")
    ap.add_argument("--d4-size", type=int, default=24000)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    only = set(a.only.split(","))
    rng = np.random.default_rng(SEED)
    if "D0" in only:  # 2000x2000, 0.0001 deg
        write(os.path.join(a.out, "D0.tif"), 2000, 2000, (113.9, 1e-4, 0, 30.6, 0, -1e-4), 4326, truth_geo)
    if "D1" in only:  # EPSG:4547 CGCS2000 3-degree GK CM 114E, 10 m, 20 km
        write(os.path.join(a.out, "D1.tif"), 2000, 2000, (490000.0, 10.0, 0, 3390000.0, 0, -10.0), 4547, truth_proj)
    if "D2" in only:  # 1000x1000, 0.0001 deg, holes + negative + cliff
        def f2(X, Y):
            v = truth_d2(X, Y); v[d2_nodata_mask(X, Y)] = NODATA; return v
        write(os.path.join(a.out, "D2.tif"), 1000, 1000, (114.2, 1e-4, 0, 30.6, 0, -1e-4), 4326, f2)
    if "D3" in only:  # two adjacent 1000x1000 tiles sharing the lon=114.4 edge
        write(os.path.join(a.out, "D3_a.tif"), 1000, 1000, (114.3, 1e-4, 0, 30.6, 0, -1e-4), 4326, truth_geo)
        write(os.path.join(a.out, "D3_b.tif"), 1000, 1000, (114.4, 1e-4, 0, 30.6, 0, -1e-4), 4326, truth_geo)
    if "D4" in only:  # large: N x N at 0.00005 deg (~5 m), BigTIFF
        n = a.d4_size
        write(os.path.join(a.out, "D4.tif"), n, n, (113.9, 5e-5, 0, 30.6 + 0.0, 0, -5e-5), 4326, truth_geo, bigtiff=True)

if __name__ == "__main__":
    main()
