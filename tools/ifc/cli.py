"""GeoForge IFC spike command line.

  python tools/ifc/cli.py fixture OUT.ifc
  python tools/ifc/cli.py export  IN.ifc EXCHANGE_DIR
  python tools/ifc/cli.py tiles   EXCHANGE_DIR TILES_DIR
  python tools/ifc/cli.py convert IN.ifc OUT_DIR      (OUT_DIR/exchange + OUT_DIR/tiles)
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))


def main():
    parser = argparse.ArgumentParser(description="GeoForge IFC to 3D Tiles 1.1 spike")
    commands = parser.add_subparsers(dest="command", required=True)
    fixture = commands.add_parser("fixture", help="generate the GF_Custom test IFC")
    fixture.add_argument("output")
    export = commands.add_parser("export", help="IFC to exchange package")
    export.add_argument("input")
    export.add_argument("output")
    export.add_argument("--include-spaces", action="store_true")
    export.add_argument("--threads", type=int)
    tiles = commands.add_parser("tiles", help="exchange package to 3D Tiles 1.1")
    tiles.add_argument("input")
    tiles.add_argument("output")
    convert = commands.add_parser("convert", help="IFC to exchange package and 3D Tiles 1.1")
    convert.add_argument("input")
    convert.add_argument("output")
    convert.add_argument("--include-spaces", action="store_true")
    convert.add_argument("--threads", type=int)
    args = parser.parse_args()

    if args.command == "fixture":
        from fixture import build_fixture

        print(build_fixture(Path(args.output)))
        return
    started = time.perf_counter()
    summary = {}
    if args.command in ("export", "convert"):
        from exchange import export_exchange

        exchange_dir = Path(args.output) / "exchange" if args.command == "convert" else Path(args.output)
        manifest = export_exchange(args.input, exchange_dir, args.include_spaces, args.threads)
        summary.update(elements=len(manifest["elements"]), withoutGeometry=len(manifest["withoutGeometry"]),
                       georeference=manifest["georeference"]["mode"], exchange=str(exchange_dir))
    if args.command in ("tiles", "convert"):
        from tiles import write_tileset

        exchange_dir = Path(args.output) / "exchange" if args.command == "convert" else Path(args.input)
        tiles_dir = Path(args.output) / "tiles" if args.command == "convert" else Path(args.output)
        result = write_tileset(exchange_dir, tiles_dir)
        summary.update(columns=len(result["columns"]), placement=result["placement"], tiles=str(tiles_dir))
    summary["seconds"] = round(time.perf_counter() - started, 3)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
