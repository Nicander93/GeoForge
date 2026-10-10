import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import cli  # noqa: E402
import fixture  # noqa: E402
import tiles  # noqa: E402

import ifcopenshell  # noqa: E402
import ifcopenshell.api.georeference  # noqa: E402


class ConvertCommandTest(unittest.TestCase):
    """The ``convert`` contract the processor relies on."""

    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.TemporaryDirectory()
        cls.root = Path(cls.work.name)
        cls.ifc_path = fixture.build_fixture(cls.root / "fixture.ifc")
        # Same building without IfcMapConversion / IfcProjectedCRS.
        model = ifcopenshell.open(str(cls.ifc_path))
        ifcopenshell.api.georeference.remove_georeferencing(model)
        cls.plain_path = cls.root / "plain.ifc"
        model.write(str(cls.plain_path))

    @classmethod
    def tearDownClass(cls):
        cls.work.cleanup()

    def run_cli(self, name, *options, source=None):
        out = self.root / name
        argv = ["convert", str(source or self.ifc_path), str(out / "tiles"),
                "--exchange-dir", str(out / "exchange"), "--progress", "jsonl", *options]
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(io.StringIO()):
            code = cli.main(argv)
        events = [json.loads(line) for line in stdout.getvalue().splitlines()]
        return code, events, out

    def tileset(self, out):
        return json.loads((out / "tiles" / "tileset.json").read_text(encoding="utf-8"))

    def test_jsonl_events_report_stages_progress_and_summary(self):
        code, events, out = self.run_cli("events")
        self.assertEqual(code, 0)
        self.assertTrue(all(event["geoforgeIfc"] == 1 for event in events))
        stages = [event["stage"] for event in events if event["event"] == "stage"]
        self.assertEqual(stages, ["open", "tessellate", "properties", "tiles"])
        for stage in ("tessellate", "properties"):
            last = [e for e in events if e["event"] == "progress" and e["stage"] == stage][-1]
            self.assertEqual((last["completed"], last["total"]), (7, 7))

        summary = events[-1]["summary"]
        self.assertEqual(events[-1]["event"], "summary")
        self.assertEqual(summary["elements"], 7)
        self.assertEqual(summary["classes"], {"IfcWall": 4, "IfcSlab": 2, "IfcWindow": 1})
        self.assertEqual(summary["storeys"], ["1F", "2F"])
        self.assertEqual(summary["skipped"], {"withoutGeometry": 0, "excludedByClass": 0})
        self.assertEqual(summary["georeference"], {"requested": "auto", "mode": "map-conversion", "crs": "EPSG:2326"})
        self.assertEqual(summary["columns"], {"total": 13, "withValues": 13, "empty": 0})
        self.assertTrue((out / "tiles" / "content.glb").is_file())
        self.assertTrue((out / "exchange" / "manifest.json").is_file())

    def test_failure_is_reported_as_error_event_with_exit_code(self):
        code, events, _ = self.run_cli("missing", source=self.root / "missing.ifc")
        self.assertEqual(code, 1)
        self.assertEqual(events[-1]["event"], "error")
        self.assertTrue(events[-1]["message"])

    def test_class_filters_count_excluded_elements_and_warn_on_unknown_names(self):
        code, events, _ = self.run_cli("filter", "--include-class", "IfcWall", "--include-class", "IfcSlab",
                                       "--exclude-class", "IfcSlab", "--include-class", "IfcNotAClass")
        self.assertEqual(code, 0)
        summary = events[-1]["summary"]
        self.assertEqual(summary["classes"], {"IfcWall": 4})
        self.assertEqual(summary["skipped"]["excludedByClass"], 3)
        self.assertEqual([w["code"] for w in summary["warnings"]], ["IFC_UNKNOWN_CLASS"])
        self.assertIn("IFC_UNKNOWN_CLASS", [e.get("code") for e in events if e["event"] == "warning"])

    def test_local_mode_writes_no_transform(self):
        _, events, out = self.run_cli("local", "--georef", "local")
        self.assertNotIn("transform", self.tileset(out)["root"])
        self.assertEqual(events[-1]["summary"]["placement"], {"mode": "local"})

    def test_anchor_mode_puts_the_ifc_origin_on_the_anchor(self):
        _, _, out = self.run_cli("anchor", "--georef", "anchor", "--anchor-lon", "114.17",
                                 "--anchor-lat", "22.3", "--anchor-height", "10")
        transform = np.array(self.tileset(out)["root"]["transform"]).reshape(4, 4, order="F")
        origin = json.loads((out / "exchange" / "manifest.json").read_text(encoding="utf-8"))["origin"]
        # Tile coordinates are relative to the manifest origin; -origin is the IFC project origin.
        project_origin = transform @ np.array([-origin[0], -origin[1], -origin[2], 1.0])
        np.testing.assert_allclose(project_origin[:3], tiles.geodetic_to_ecef(114.17, 22.3, 10), atol=1e-6)

    def test_auto_mode_without_map_conversion_warns(self):
        _, events, out = self.run_cli("plain-auto", source=self.plain_path)
        codes = [w["code"] for w in events[-1]["summary"]["warnings"]]
        self.assertTrue({"IFC_NO_GEOREFERENCE", "IFC_SITE_REFERENCE_APPROXIMATE"} & set(codes), codes)
        self.assertNotEqual(events[-1]["summary"]["georeference"]["mode"], "map-conversion")

    def test_crs_override_reads_ifc_coordinates_as_projected(self):
        from pyproj import Transformer

        _, events, out = self.run_cli("plain-crs", "--georef", "crs", "--crs", "EPSG:2326", source=self.plain_path)
        self.assertEqual(events[-1]["summary"]["georeference"]["crs"], "EPSG:2326")
        manifest = json.loads((out / "exchange" / "manifest.json").read_text(encoding="utf-8"))
        local_to_map = np.array(manifest["georeference"]["localToMap"]).reshape(4, 4, order="F")
        np.testing.assert_allclose(local_to_map[:3, 3], manifest["origin"], atol=1e-9)

        transform = np.array(self.tileset(out)["root"]["transform"]).reshape(4, 4, order="F")
        longitude, latitude, _ = Transformer.from_crs("EPSG:4978", "EPSG:4979", always_xy=True).transform(*transform[:3, 3])
        expected = Transformer.from_crs("EPSG:2326", "EPSG:4326", always_xy=True).transform(*manifest["origin"][:2])
        self.assertAlmostEqual(longitude, expected[0], places=7)
        self.assertAlmostEqual(latitude, expected[1], places=7)

    def test_crs_override_rejects_geographic_crs(self):
        code, events, _ = self.run_cli("geographic", "--georef", "crs", "--crs", "EPSG:4326", source=self.plain_path)
        self.assertEqual(code, 1)
        self.assertIn("EPSG:4326", events[-1]["message"])


class EmptyColumnTest(unittest.TestCase):
    elements = [
        {"globalId": "a", "ifcClass": "IfcWall", "name": "A", "storey": None, "mesh": {"vertexOffset": 0, "vertexCount": 3},
         "properties": {"Pset.Empty": {"value": None, "dataType": None}, "Pset.Width": {"value": 2, "dataType": "integer"}}},
    ]

    def test_empty_columns_are_dropped_by_default(self):
        names = [column["name"] for column in tiles.build_columns(self.elements)]
        self.assertNotIn("Pset.Empty", names)

    def test_kept_empty_columns_are_declared_but_not_stored(self):
        columns = tiles.build_columns(self.elements, drop_empty_columns=False)
        empty = next(column for column in columns if column["name"] == "Pset.Empty")
        self.assertEqual((empty["type"], empty["required"]), ("EMPTY", False))

        geometry = {
            "positions": np.zeros((3, 3), dtype=np.float32),
            "normals": np.zeros((3, 3), dtype=np.float32),
            "colors": np.full((3, 4), 255, dtype=np.uint8),
        }
        glb = tiles.build_glb(self.elements, geometry, columns)
        json_length = int.from_bytes(glb[12:16], "little")
        metadata = json.loads(glb[20:20 + json_length])["extensions"]["EXT_structural_metadata"]
        declared = metadata["schema"]["classes"]["ifc_element"]["properties"]
        self.assertEqual(declared[empty["id"]], {"type": "STRING", "noData": "", "name": "Pset.Empty",
                                                 "description": "no values in source"})
        self.assertNotIn(empty["id"], metadata["propertyTables"][0]["properties"])
        self.assertIn("Pset_Width", metadata["propertyTables"][0]["properties"])


if __name__ == "__main__":
    unittest.main()
