"""Compare Cesium sampleTerrainMostDetailed heights (from capture.mjs JSON) with source DEM and truth.
python cesium_samples_check.py capture.json --dem D0.tif --truth geo"""
import argparse, json, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import qm_validate as Q
ap = argparse.ArgumentParser(); ap.add_argument("capture"); ap.add_argument("--dem", action="append", required=True); ap.add_argument("--truth", default="none")
a = ap.parse_args(); c = json.load(open(a.capture, encoding="utf-8")); s = c["summary"]["p0"]["samples"] or []
lon = np.array([p["lon"] for p in s]); lat = np.array([p["lat"] for p in s]); h = np.array([p["height"] for p in s], float)
dem = Q.Dem(a.dem); src = dem.sample(lon, lat); tr = Q.truth(a.truth, dem, lon, lat)
rows = [dict(lon=float(lon[i]), lat=float(lat[i]), cesium=round(float(h[i]), 3), sourceDem=round(float(src[i]), 3),
             truth=None if tr is None else round(float(tr[i]), 3), dCesiumMinusSource=round(float(h[i] - src[i]), 3)) for i in range(len(s))]
out = dict(points=rows, vsSource=Q.stats(h - src), vsTruth=Q.stats(h - tr) if tr is not None else None,
           note="heights are as stored in the DEM (synthetic, vertical datum unspecified); Cesium treats them as ellipsoidal")
print(json.dumps(out, indent=1))
