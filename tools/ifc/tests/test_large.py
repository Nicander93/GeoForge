import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import cli  # noqa: E402
import synthetic  # noqa: E402
import tiles  # noqa: E402
from glb_reader import Glb  # noqa: E402

import ifcopenshell  # noqa: E402


class SyntheticTilingTest(unittest.TestCase):
    """A ~1000-element synthetic building split into many tiles."""

    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.TemporaryDirectory()
        cls.root = Path(cls.work.name)
        cls.info = synthetic.build_synthetic(cls.root / "synthetic.ifc", elements=1000, storeys=3)
        out = cls.root / "out"
        argv = ["convert", str(cls.root / "synthetic.ifc"), str(out / "tiles"), "--exchange-dir", str(out / "exchange"),
                "--progress", "jsonl", "--threads", "2", "--max-features-per-tile", "120", "--index"]
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(io.StringIO()):
            assert cli.main(argv) == 0
        cls.events = [json.loads(line) for line in stdout.getvalue().splitlines()]
        cls.summary = cls.events[-1]["summary"]
        cls.tiles_dir = out / "tiles"
        cls.tileset = json.loads((cls.tiles_dir / "tileset.json").read_text(encoding="utf-8"))
        cls.index = json.loads((cls.tiles_dir / "index.json").read_text(encoding="utf-8"))
        cls.glbs = {uri: Glb.read(cls.tiles_dir / uri) for uri in cls.index["contents"]}
        with open(out / "exchange" / "elements.jsonl", encoding="utf-8") as file:
            cls.records = {record["globalId"]: record for record in map(json.loads, file)}
        cls.rows = {row["globalId"].decode(): row for row in np.load(out / "exchange" / "elements.npy")}

    @classmethod
    def tearDownClass(cls):
        cls.work.cleanup()

    def test_generator_writes_mapped_types_storeys_and_psets(self):
        model = ifcopenshell.open(str(self.root / "synthetic.ifc"))
        self.assertEqual(len(model.by_type("IfcElement")), self.info["elements"])
        self.assertEqual(len(model.by_type("IfcBuildingStorey")), 3)
        self.assertGreater(len(model.by_type("IfcMappedItem")), self.info["elements"] / 2)
        again = synthetic.build_synthetic(self.root / "again.ifc", elements=1000, storeys=3)
        self.assertEqual(again["elements"], self.info["elements"])
        first = sorted(e.GlobalId for e in model.by_type("IfcElement"))
        second = sorted(e.GlobalId for e in ifcopenshell.open(str(self.root / "again.ifc")).by_type("IfcElement"))
        self.assertEqual(first, second)

    def test_mapped_geometry_is_processed_once(self):
        reuse = self.summary["geometryReuse"]
        self.assertEqual(reuse["shapes"], self.info["elements"])
        self.assertLess(reuse["uniqueGeometries"], reuse["shapes"] / 3)

    def test_tree_is_explicit_additive_and_multi_tile(self):
        tiling = self.summary["tiling"]
        self.assertEqual(tiling["mode"], "adaptive")
        self.assertGreater(tiling["contents"], 4)
        self.assertLessEqual(tiling["maxFeaturesPerTile"], 120)

        def walk(tile, parent_error):
            self.assertEqual(tile["refine"], "ADD")
            self.assertLessEqual(tile["geometricError"], parent_error)
            if "children" not in tile:
                self.assertEqual(tile["geometricError"], 0)
            for child in tile.get("children", []):
                walk(child, tile["geometricError"])

        walk(self.tileset["root"], self.tileset["geometricError"])
        extras = self.tileset["extras"]["geoforge"]
        self.assertEqual(extras["elements"], self.info["elements"])
        for field in ("IfcClass", "Storey"):
            self.assertEqual(sum(count for _, count in extras["facets"][field]), self.info["elements"])
        self.assertEqual([name for name, _ in extras["facets"]["Storey"]], ["L01", "L02", "L03"])
        self.assertNotIn("implicitTiling", json.dumps(self.tileset))

    def test_every_element_is_whole_in_exactly_one_tile(self):
        seen = {}
        for uri, glb in self.glbs.items():
            for feature_id, global_id in enumerate(glb.column("GlobalId")):
                self.assertNotIn(global_id, seen)
                seen[global_id] = (uri, feature_id)
            triangles = {}
            for primitive in glb.gltf["meshes"][0]["primitives"]:
                ids = glb.accessor(primitive["attributes"]["_FEATURE_ID_0"]).astype(int)
                corners = glb.accessor(primitive["indices"]).astype(int).reshape(-1, 3)
                # All three corners of a triangle belong to the same element.
                self.assertTrue(np.all(ids[corners] == ids[corners[:, :1]]))
                for feature_id, count in zip(*np.unique(ids[corners[:, 0]], return_counts=True), strict=True):
                    triangles[int(feature_id)] = triangles.get(int(feature_id), 0) + int(count)
            for feature_id, global_id in enumerate(glb.column("GlobalId")):
                self.assertEqual(triangles[feature_id], int(self.rows[global_id]["triangles"]))
        self.assertEqual(sorted(seen), sorted(self.records))
        self.assertEqual({gid: tuple(entry) for gid, entry in self.index["elements"].items()},
                         {gid: (self.index["contents"].index(uri), fid) for gid, (uri, fid) in seen.items()})

    def test_tiles_share_one_schema_and_consistent_values(self):
        schemas = {json.dumps(glb.schema, sort_keys=True) for glb in self.glbs.values()}
        self.assertEqual(len(schemas), 1)
        for glb in self.glbs.values():
            self.assertEqual(glb.table["class"], "ifc_element")
            ids = glb.column("GlobalId")
            asset = glb.column("GF_Synthetic_AssetCode")
            classes = glb.column("IfcClass")
            storeys = glb.column("Storey")
            load = glb.column("GF_Synthetic_DesignLoad")
            no_data = glb.class_properties()["GF_Synthetic_DesignLoad"]["noData"]
            for row, global_id in enumerate(ids):
                record = self.records[global_id]
                self.assertEqual(asset[row], record["properties"]["GF_Synthetic.AssetCode"]["value"])
                self.assertEqual((classes[row], storeys[row]), (record["ifcClass"], record["storey"]))
                expected = record["properties"].get("GF_Synthetic.DesignLoad")
                if load is not None:
                    self.assertEqual(load[row], expected["value"] if expected else no_data)

    def test_elements_keep_their_position_after_quantization(self):
        origin = np.array(json.loads((self.root / "out" / "exchange" / "manifest.json").read_text())["origin"])
        for glb in self.glbs.values():
            ids = glb.column("GlobalId")
            scale = glb.gltf["nodes"][0]["scale"][0]
            for primitive in glb.gltf["meshes"][0]["primitives"]:
                positions = glb.world_positions(primitive)
                tile = np.column_stack([positions[:, 0], -positions[:, 2], positions[:, 1]]) + origin
                features = glb.accessor(primitive["attributes"]["_FEATURE_ID_0"]).astype(int)
                for feature_id in np.unique(features):
                    row = self.rows[ids[feature_id]]
                    points = tile[features == feature_id]
                    tolerance = scale / 65535 + 1e-6
                    self.assertTrue(np.all(points >= row["min"] - tolerance))
                    self.assertTrue(np.all(points <= row["max"] + tolerance))

    def test_large_schemas_move_to_a_shared_file(self):
        out = self.root / "external"
        with mock.patch.object(tiles, "EMBEDDED_SCHEMA_BYTES", 100):
            result = tiles.write_tileset(self.root / "out" / "exchange", out, max_features=200)
        self.assertEqual(result["tiling"]["schema"], "external")
        schema = json.loads((out / "schema.json").read_text(encoding="utf-8"))
        for path in (out / "tiles").glob("*.glb"):
            glb = Glb.read(path, schema)
            self.assertEqual(glb.gltf["extensions"]["EXT_structural_metadata"]["schemaUri"], "../schema.json")
            self.assertNotIn("schema", glb.gltf["extensions"]["EXT_structural_metadata"])
            self.assertEqual(len(glb.column("GlobalId")), glb.table["count"])

    def test_tile_progress_and_unquantized_option(self):
        tiles_progress = [e for e in self.events if e["event"] == "progress" and e["stage"] == "tiles"]
        self.assertEqual(tiles_progress[-1]["completed"], self.summary["tiling"]["contents"])
        out = self.root / "float"
        tiles.write_tileset(self.root / "out" / "exchange", out, quantize=False, tiling_mode="single")
        glb = Glb.read(out / "content.glb")
        self.assertNotIn("KHR_mesh_quantization", glb.gltf["extensionsUsed"])
        accessor = glb.gltf["accessors"][glb.gltf["meshes"][0]["primitives"][0]["attributes"]["POSITION"]]
        self.assertEqual(accessor["componentType"], 5126)
        self.assertEqual(glb.table["count"], self.info["elements"])


if __name__ == "__main__":
    unittest.main()
