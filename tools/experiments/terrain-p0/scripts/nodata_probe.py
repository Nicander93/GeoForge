r"""NoData behaviour probe for D2: what height does each engine put inside the NoData hole / strip?
python nodata_probe.py out\A-D2 out\B-D2"""
import sys, os, glob, json
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import qm_validate as Q, gen_datasets as G
res = {}
for d in sys.argv[1:]:
    files = glob.glob(os.path.join(d, "*", "*", "*.terrain")); maxz = max(int(f.split(os.sep)[-3]) for f in files)
    hole = []; strip = []; valid = []; minh = []
    for f in files:
        p = f.split(os.sep); z, x, y = int(p[-3]), int(p[-2]), int(p[-1][:-8])
        t = Q.decode(open(f, "rb").read()); lon, lat, h = Q.geo(t, z, x, y); minh.append(h.min())
        if z != maxz: continue
        inside = (lon >= 114.2) & (lon <= 114.3) & (lat >= 30.5) & (lat <= 30.6)
        m_h = inside & (np.hypot(lon - 114.27, lat - 30.57) < 0.007)
        m_s = inside & (lat > 30.597)
        hole += list(h[m_h]); strip += list(h[m_s]); valid += list(h[inside & ~G.d2_nodata_mask(lon, lat)])
    S = lambda a: None if not a else dict(n=len(a), min=round(float(np.min(a)), 2), max=round(float(np.max(a)), 2), mean=round(float(np.mean(a)), 2))
    res[d] = dict(maxZoom=maxz, verticesInHole=S(hole), verticesInMissingStrip=S(strip), verticesValid=S(valid), globalMinHeight=round(float(np.min(minh)), 2),
                  expectedValidRange=[round(float(G.truth_d2(np.array([114.23]), np.array([30.53]))[0]), 2), "about -50 .. 360"])
print(json.dumps(res, indent=1))

