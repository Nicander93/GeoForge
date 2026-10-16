"""Create the EDGE-PLATEAU fixture (constant 500 m, EPSG:4326)."""
from __future__ import annotations
import argparse, hashlib, subprocess, tempfile
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--gdal-translate", required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--size", type=int, default=200)
    p.add_argument("--cell", type=float, default=0.001)
    p.add_argument("--west", type=float, default=114.0)
    p.add_argument("--north", type=float, default=30.1)
    p.add_argument("--height", type=float, default=500.0)
    args = p.parse_args()
    south = args.north - args.size * args.cell
    with tempfile.TemporaryDirectory() as tmp:
        asc = Path(tmp) / "p.asc"
        lines = [
            f"NCOLS {args.size}",
            f"NROWS {args.size}",
            f"XLLCORNER {args.west}",
            f"YLLCORNER {south}",
            f"CELLSIZE {args.cell}",
            "NODATA_VALUE -9999",
        ]
        row = " ".join([str(args.height)] * args.size)
        lines.extend([row] * args.size)
        asc.write_text("\n".join(lines) + "\n", encoding="ascii")
        args.out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.check_call([
            args.gdal_translate, "-q", "-of", "GTiff", "-a_srs", "EPSG:4326",
            "-ot", "Float32", "-co", "COMPRESS=DEFLATE", str(asc), str(args.out),
        ])
    digest = hashlib.sha256(args.out.read_bytes()).hexdigest()
    print(f"wrote {args.out} sha256={digest}")

if __name__ == "__main__":
    main()
