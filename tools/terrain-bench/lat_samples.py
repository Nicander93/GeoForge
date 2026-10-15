"""Make maxDepth=auto latitude samples for Gate V1.2 #7.

There is no real metric DEM away from 30 N on LM, so D1 (10 m, EPSG:4547)
is relabeled as WGS 84 / UTM 50N with its top edge near 0, 45, 60 and 70 N.
Heights and the 10 m grid are unchanged; only the georeference moves.

    python lat_samples.py --runtime <runtime> --d1 <D1.tif> --out <dir>
"""
import argparse
import shutil
import subprocess
from pathlib import Path

# Top northing (m) of each 20 km x 20 km sample in UTM 50N.
TOPS = {"LAT-00": 20000, "LAT-45": 4995000, "LAT-60": 6665000, "LAT-70": 7775000}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--d1", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.d1, args.out / "LAT-30-D1.tif")
    for name, top in TOPS.items():
        subprocess.run(
            [str(args.runtime / "bin" / "gdal_translate.exe"), "-q", "-a_srs", "EPSG:32650",
             "-a_ullr", "490000", str(top), "510000", str(top - 20000), str(args.d1), str(args.out / f"{name}.tif")],
            check=True,
        )


if __name__ == "__main__":
    main()
