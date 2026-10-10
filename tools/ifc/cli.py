"""GeoForge IFC tool command line.

  geoforge-ifc fixture OUT.ifc
  geoforge-ifc export  IN.ifc EXCHANGE_DIR
  geoforge-ifc tiles   EXCHANGE_DIR TILES_DIR
  geoforge-ifc convert IN.ifc OUT_DIR      (OUT_DIR/exchange + OUT_DIR/tiles)
  geoforge-ifc convert IN.ifc TILES_DIR --exchange-dir DIR --progress jsonl

In development ``python tools/ifc/cli.py`` replaces ``geoforge-ifc``.

With ``--progress jsonl`` stdout carries one JSON object per line, each with
``"geoforgeIfc": 1`` and an ``event`` of stage, progress, warning, summary or
error. The processor parses these lines; anything else on stdout is a log line.
"""

import argparse
import json
import multiprocessing
import sys
import time
import traceback
from collections import Counter
from pathlib import Path

if not getattr(sys, "frozen", False):
    sys.path.insert(0, str(Path(__file__).resolve().parent))

PROTOCOL_VERSION = 1
# Thousands of elements would otherwise flood the processor with progress lines.
PROGRESS_INTERVAL_SECONDS = 0.25


def main(argv=None):
    args = parse_args(argv)
    configure_frozen_plugins()
    if args.command == "fixture":
        from fixture import build_fixture

        print(build_fixture(Path(args.output)))
        return 0

    report = JsonLinesReporter() if args.progress == "jsonl" else None
    try:
        summary = execute(args, report)
    except Exception as error:
        if report is None:
            raise
        traceback.print_exc()
        report("error", message=str(error) or type(error).__name__)
        return 1
    if report is None:
        print(json.dumps(summary, ensure_ascii=False))
    else:
        report("summary", summary=summary)
    return 0


def configure_frozen_plugins():
    """Point IfcOpenShell at its bundled plugins in the PyInstaller build.

    IfcOpenShell finds schema and geometry mapping plugins next to its plugin
    loader library. PyInstaller links that library into _internal/, away from
    the plugins in _internal/ifcopenshell/, so the default lookup finds none.
    """
    bundle = getattr(sys, "_MEIPASS", None)
    if not getattr(sys, "frozen", False) or bundle is None:
        return
    import ifcopenshell

    ifcopenshell.set_plugin_search_paths([Path(bundle) / "ifcopenshell"])


def parse_args(argv):
    parser = argparse.ArgumentParser(prog="geoforge-ifc", description="GeoForge IFC to 3D Tiles 1.1")
    commands = parser.add_subparsers(dest="command", required=True)
    fixture = commands.add_parser("fixture", help="generate the GF_Custom test IFC")
    fixture.add_argument("output")
    export = commands.add_parser("export", help="IFC to exchange package")
    export.add_argument("input")
    export.add_argument("output")
    add_export_arguments(export)
    tiles = commands.add_parser("tiles", help="exchange package to 3D Tiles 1.1")
    tiles.add_argument("input")
    tiles.add_argument("output")
    add_tiles_arguments(tiles)
    convert = commands.add_parser("convert", help="IFC to exchange package and 3D Tiles 1.1")
    convert.add_argument("input")
    convert.add_argument("output")
    convert.add_argument("--exchange-dir", help="write the exchange package here and the tileset directly to OUTPUT")
    add_export_arguments(convert)
    add_tiles_arguments(convert)
    for command in (export, tiles, convert):
        command.add_argument("--progress", choices=["none", "jsonl"], default="none")
    args = parser.parse_args(argv)

    if args.command in ("export", "convert"):
        anchor = (args.anchor_lon, args.anchor_lat, args.anchor_height)
        if args.georef == "anchor" and None in anchor:
            parser.error("--georef anchor needs --anchor-lon, --anchor-lat and --anchor-height")
        if args.georef == "crs" and not (args.crs or "").strip():
            parser.error("--georef crs needs --crs")
    return args


def add_export_arguments(parser):
    parser.add_argument("--include-spaces", action="store_true")
    parser.add_argument("--include-class", action="append", default=[], metavar="IFC_CLASS")
    parser.add_argument("--exclude-class", action="append", default=[], metavar="IFC_CLASS")
    parser.add_argument("--georef", choices=["auto", "local", "anchor", "crs"], default="auto")
    parser.add_argument("--anchor-lon", type=float)
    parser.add_argument("--anchor-lat", type=float)
    parser.add_argument("--anchor-height", type=float)
    parser.add_argument("--crs", help="CRS used instead of the file's, e.g. EPSG:2326")
    parser.add_argument("--threads", type=int)


def add_tiles_arguments(parser):
    parser.add_argument("--keep-empty-columns", action="store_true",
                        help="declare properties without any value instead of dropping them")


def execute(args, report):
    report = report or (lambda event, **fields: None)
    started = time.perf_counter()
    output = Path(args.output)
    if args.command == "convert":
        exchange_dir = Path(args.exchange_dir) if args.exchange_dir else output / "exchange"
        tiles_dir = output if args.exchange_dir else output / "tiles"
    else:
        exchange_dir = output if args.command == "export" else Path(args.input)
        tiles_dir = output

    summary = {}
    if args.command in ("export", "convert"):
        from exchange import export_exchange

        manifest = export_exchange(
            args.input, exchange_dir, args.include_spaces, args.threads,
            include_classes=args.include_class, exclude_classes=args.exclude_class,
            georeference=georeference_options(args), report=report,
        )
        summary.update(build_exchange_summary(manifest), exchange=str(exchange_dir))
    if args.command in ("tiles", "convert"):
        from tiles import write_tileset

        report("stage", stage="tiles", message="写出 3D Tiles 1.1")
        result = write_tileset(exchange_dir, tiles_dir, drop_empty_columns=not args.keep_empty_columns)
        summary.update(columns=build_column_summary(result["columns"]), placement=result["placement"],
                       tiles=str(tiles_dir))
    summary["seconds"] = round(time.perf_counter() - started, 3)
    return summary


def georeference_options(args):
    if args.georef == "anchor":
        return {"mode": "anchor", "longitude": args.anchor_lon, "latitude": args.anchor_lat,
                "height": args.anchor_height}
    if args.georef == "crs":
        return {"mode": "crs", "crs": args.crs.strip()}
    return {"mode": args.georef}


def build_exchange_summary(manifest):
    elements = manifest["elements"]
    georeference = manifest["georeference"]
    return {
        "schema": manifest["source"]["schema"],
        "elements": len(elements),
        "classes": dict(Counter(element["ifcClass"] for element in elements).most_common()),
        "storeys": sorted({element["storey"] for element in elements if element["storey"]}),
        "skipped": {
            "withoutGeometry": len(manifest["withoutGeometry"]),
            "excludedByClass": manifest["filter"]["excludedByClass"],
        },
        "withoutGeometry": manifest["withoutGeometry"][:20],
        "georeference": {
            "requested": georeference.get("requested"),
            "mode": georeference["mode"],
            "crs": (georeference.get("crs") or {}).get("name"),
        },
        "warnings": manifest["warnings"],
    }


def build_column_summary(columns):
    empty = sum(1 for column in columns if column["type"] == "EMPTY")
    return {"total": len(columns), "withValues": len(columns) - empty, "empty": empty}


class JsonLinesReporter:
    """Write protocol events to stdout, rate-limiting progress per stage."""

    def __init__(self):
        self.last_progress = {}

    def __call__(self, event, **fields):
        if event == "progress":
            now = time.monotonic()
            finished = fields.get("completed") == fields.get("total")
            if not finished and now - self.last_progress.get(fields.get("stage"), 0) < PROGRESS_INTERVAL_SECONDS:
                return
            self.last_progress[fields.get("stage")] = now
        # ASCII-only JSON survives any Windows console code page.
        line = json.dumps({"geoforgeIfc": PROTOCOL_VERSION, "event": event, **fields})
        sys.stdout.write(line + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    sys.exit(main())
