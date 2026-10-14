"""Summarize results-bench.jsonl to CSV-friendly stdout and a small JSON for docs."""
import json, sys, statistics as st
from collections import defaultdict
rows = [json.loads(l) for l in open(sys.argv[1], encoding="utf-8")]
by = defaultdict(list)
for r in rows: by[(r["engine"], r["datasetId"], r["tag"].rsplit("-rep", 1)[0] if "-rep" in r["tag"] else r["tag"])].append(r)
out = []
for k, rs in sorted(by.items()):
    ts = [r["totalSeconds"] for r in rs]; rss = [r["peakRssMiB"] for r in rs]
    out.append(dict(engine=k[0], datasetId=k[1], tag=k[2], n=len(rs), totalSecondsMedian=round(st.median(ts), 3),
        totalSecondsAll=ts, peakRssMiBMedian=round(st.median(rss), 1), peakRssMiBAll=rss,
        avgCoresBusyMedian=round(st.median([r["avgCoresBusy"] for r in rs]), 2),
        tileCount=rs[0]["tileCount"], outputBytes=rs[0]["outputBytes"],
        timeToFirstPreviewMedian=round(st.median([r["timeToFirstPreviewSeconds"] for r in rs]), 3)))
json.dump(out, open(sys.argv[2], "w"), indent=1); print(json.dumps(out, indent=1))
