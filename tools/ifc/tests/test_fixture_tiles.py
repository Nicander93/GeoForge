import json
import math
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import exchange  # noqa: E402
import fixture  # noqa: E402
import tiles  # noqa: E402
from glb_reader import Glb  # noqa: E402

SOUTH_WALL = fixture.fixture_guid("wall-south")
EAST_WALL = fixture.fixture_guid("wall-east")


def read_elements(exchange_dir):
    with open(Path(exchange_dir) / "elements.jsonl", encoding="utf-8") as file:
        return [json.loads(line) for line in file]


class FixtureTilesTest(unittest.TestCase):
    """The 7-element fixture: exchange package v2 and the single-tile output."""

    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.TemporaryDirectory()
        cls.root = Path(cls.work.name)
        cls.ifc_path = fixture.build_fixture(cls.root / "fixture.ifc")
        cls.manifest = exchange.export_exchange(cls.ifc_path, cls.root / "exchange", threads=2)
        cls.result = tiles.write_tileset(cls.root / "exchange", cls.root / "tiles")
        cls.glb = Glb.read(cls.root / "tiles" / "content.glb")
        cls.tileset = json.loads((cls.root / "tiles" / "tileset.json").read_text(encoding="utf-8"))
        cls.records = read_elements(cls.root / "exchange")
        cls.elements = {record["globalId"]: record for record in cls.records}
        cls.rows = np.load(cls.root / "exchange" / "elements.npy")

    @classmethod
    def tearDownClass(cls):
        cls.work.cleanup()

    def test_fixture_global_ids_are_stable(self):
        self.assertEqual(SOUTH_WALL, "0$hZgVeZ1MpxRkA$6n9RpZ")
        self.assertEqual(self.manifest["elementCount"], 7)
        self.assertEqual(self.manifest["withoutGeometry"], [])
        self.assertEqual(sorted(self.elements), sorted(row["globalId"].decode() for row in self.rows))

    def test_records_keep_identity_storey_and_typed_custom_properties(self):
        wall = self.elements[SOUTH_WALL]
        self.assertEqual((wall["ifcClass"], wall["name"], wall["storey"]), ("IfcWall", "South Wall", "1F"))
        props = wall["properties"]
        self.assertEqual(props["GF_Custom.AssetCode"], {"value": "GF-W-001", "dataType": "string", "ifcType": "IfcLabel", "unit": None})
        self.assertEqual(props["GF_Custom.DesignLoad"]["value"], 12.5)
        self.assertEqual(props["GF_Custom.DesignLoad"]["dataType"], "number")
        self.assertEqual(props["GF_Custom.InstallYear"]["dataType"], "integer")
        self.assertIs(props["GF_Custom.Inspected"]["value"], True)
        self.assertEqual(props["Qto_WallBaseQuantities.Length"]["unit"], "METRE")
        finish = self.elements[EAST_WALL]["properties"]["GF_Custom.Finish"]
        self.assertEqual((finish["value"], finish["dataType"]), ("Painted; Plastered", "string"))
        self.assertEqual(self.elements[fixture.fixture_guid("slab-2f")]["storey"], "2F")

    def test_column_statistics_cover_every_element(self):
        stats = self.manifest["columns"]
        self.assertEqual(stats["base"], {"name": 7, "storey": 7})
        install_year = stats["properties"]["GF_Custom.InstallYear"]
        self.assertEqual((install_year["count"], install_year["intMin"], install_year["intMax"]), (1, 2026, 2026))
        self.assertEqual(stats["properties"]["Pset_WallCommon.IsExternal"]["dataTypes"], ["boolean"])

    def test_geometry_is_indexed_with_shared_corners(self):
        geometry_size = (self.root / "exchange" / "geometry.bin").stat().st_size
        expected = int((self.rows["partVertices"].sum(axis=1) * 28 + self.rows["partTriangles"].sum(axis=1) * 12).sum())
        self.assertEqual(geometry_size, expected)
        south = self.rows[[row["globalId"].decode() == SOUTH_WALL for row in self.rows]][0]
        # A box wall: 12 triangles, 24 corners (4 per face) instead of 36.
        self.assertEqual((int(south["triangles"]), int(south["vertices"])), (12, 24))
        low = np.array(self.manifest["bounds"]["min"])
        high = np.array(self.manifest["bounds"]["max"])
        np.testing.assert_allclose(high - low, [10.0, 6.05, 3.4], atol=1e-6)

    def test_map_conversion_follows_ifc_formula(self):
        local_to_map = np.array(self.manifest["georeference"]["localToMap"]).reshape(4, 4, order="F")
        conversion = fixture.FIXTURE_MAP_CONVERSION
        x, y, z = self.manifest["origin"]
        theta = math.atan2(conversion["XAxisOrdinate"], conversion["XAxisAbscissa"])
        expected = [
            conversion["Eastings"] + x * math.cos(theta) - y * math.sin(theta),
            conversion["Northings"] + x * math.sin(theta) + y * math.cos(theta),
            conversion["OrthogonalHeight"] + z,
        ]
        np.testing.assert_allclose(local_to_map[:3, 3], expected, atol=1e-6)
        np.testing.assert_allclose(local_to_map[:2, 0], [math.cos(theta), math.sin(theta)], atol=1e-6)

    def test_small_model_stays_one_tile_placed_in_hong_kong(self):
        from pyproj import Transformer

        self.assertEqual(self.tileset["asset"]["version"], "1.1")
        root = self.tileset["root"]
        self.assertEqual(root["content"]["uri"], "content.glb")
        self.assertNotIn("children", root)
        self.assertEqual(root["geometricError"], 0)
        self.assertEqual(self.result["tiling"]["mode"], "single")
        transform = np.array(root["transform"]).reshape(4, 4, order="F")
        longitude, latitude, height = Transformer.from_crs("EPSG:4978", "EPSG:4979", always_xy=True).transform(*transform[:3, 3])
        local_to_map = np.array(self.manifest["georeference"]["localToMap"]).reshape(4, 4, order="F")
        expected = Transformer.from_crs("EPSG:2326", "EPSG:4326", always_xy=True).transform(*local_to_map[:2, 3])
        self.assertAlmostEqual(longitude, expected[0], places=8)
        self.assertAlmostEqual(latitude, expected[1], places=8)
        self.assertAlmostEqual(height, local_to_map[2, 3], places=3)
        # The local frame keeps metres: each axis column is a unit vector in ECEF.
        np.testing.assert_allclose(np.linalg.norm(transform[:3, :3], axis=0), [1, 1, 1], atol=1e-3)

    def test_glb_is_indexed_quantized_and_ids_match_table(self):
        gltf = self.glb.gltf
        self.assertEqual(set(gltf["extensionsUsed"]),
                         {"EXT_mesh_features", "EXT_structural_metadata", "KHR_mesh_quantization"})
        self.assertEqual(gltf["extensionsRequired"], ["KHR_mesh_quantization"])
        table = self.glb.table
        self.assertEqual(table["count"], 7)
        # Rows follow GlobalId order, independent of the iterator's thread order.
        self.assertEqual(self.glb.column("GlobalId"), sorted(self.elements))

        primitives = gltf["meshes"][0]["primitives"]
        self.assertEqual(len(primitives), 2, "the glass window gets the BLEND primitive")
        triangles = {}
        for primitive in primitives:
            self.assertIn("indices", primitive)
            ids = self.glb.accessor(primitive["attributes"]["_FEATURE_ID_0"])
            feature = primitive["extensions"]["EXT_mesh_features"]["featureIds"][0]
            self.assertEqual(feature["featureCount"], len(np.unique(ids)))
            indices = self.glb.accessor(primitive["indices"]).astype(int).reshape(-1, 3)
            for feature_id in ids[indices[:, 0]].astype(int):
                triangles[feature_id] = triangles.get(feature_id, 0) + 1
        expected = {gid: int(row["triangles"]) for gid, row in
                    ((row["globalId"].decode(), row) for row in self.rows)}
        self.assertEqual([triangles[i] for i in range(7)], [expected[gid] for gid in sorted(expected)])

    def test_quantized_positions_stay_within_a_millimetre(self):
        primitive = self.glb.gltf["meshes"][0]["primitives"][0]
        positions = self.glb.world_positions(primitive)
        accessor = self.glb.gltf["accessors"][primitive["attributes"]["POSITION"]]
        self.assertEqual((accessor["componentType"], accessor["normalized"]), (5123, True))
        # Back to Z up: glTF (x, y, z) = tile (x, z, -y).
        tile = np.column_stack([positions[:, 0], -positions[:, 2], positions[:, 1]])
        low = np.array(self.manifest["bounds"]["min"])
        high = np.array(self.manifest["bounds"]["max"])
        step = (high - low).max() / 65535
        self.assertTrue(np.all(tile >= low - step) and np.all(tile <= high + step))
        self.assertLess(step, 0.001)
        normals = self.glb.accessor(primitive["attributes"]["NORMAL"])
        np.testing.assert_allclose(np.linalg.norm(normals, axis=1), 1, atol=0.02)

    def test_property_columns_keep_types_and_missing_values(self):
        properties = self.glb.class_properties()
        order = self.glb.column("GlobalId")
        south, east = order.index(SOUTH_WALL), order.index(EAST_WALL)

        self.assertEqual(properties["GF_Custom_AssetCode"]["name"], "GF_Custom.AssetCode")
        self.assertEqual(properties["GF_Custom_AssetCode"]["noData"], "")
        self.assertEqual(self.glb.column("GF_Custom_AssetCode")[south], "GF-W-001")
        self.assertEqual(self.glb.table["properties"]["GF_Custom_AssetCode"]["stringOffsetType"], "UINT8")

        self.assertEqual(properties["GF_Custom_DesignLoad"]["componentType"], "FLOAT64")
        self.assertEqual(self.glb.column("GF_Custom_DesignLoad")[south], 12.5)
        # 2026 needs 16 bits; the type comes from the range over all elements.
        self.assertEqual(properties["GF_Custom_InstallYear"]["componentType"], "INT16")
        install_year = self.glb.column("GF_Custom_InstallYear")
        self.assertEqual((install_year[south], install_year[east]), (2026, properties["GF_Custom_InstallYear"]["noData"]))

        self.assertEqual(properties["GF_Custom_Inspected"]["componentType"], "INT8")
        inspected = self.glb.column("GF_Custom_Inspected")
        self.assertEqual((inspected[south], inspected[east]), (1, 0))
        self.assertEqual(properties["Pset_WallCommon_IsExternal"]["type"], "SCALAR", "slabs have no IsExternal")

    def test_columns_sanitize_ids_and_drop_empty_text(self):
        manifest = {"elementCount": 1, "columns": {"base": {"name": 0, "storey": 0}, "properties": {
            "P set.Width": stat("integer", 1, 1),
            "P_set.Width": stat("integer", 2, 2),
            "Pset.Empty": {**stat("string"), "count": 0, "dataTypes": []},
            "Pset.Flag": stat("boolean"),
        }}}
        columns = {column["name"]: column for column in tiles.build_columns(manifest)}
        self.assertEqual(columns["P set.Width"]["id"], "P_set_Width")
        self.assertEqual(columns["P_set.Width"]["id"], "P_set_Width_2")
        self.assertEqual(columns["P set.Width"]["type"], "INT8")
        self.assertNotIn("Pset.Empty", columns)
        self.assertEqual(columns["Pset.Flag"]["type"], "BOOLEAN")
        self.assertFalse(columns["Name"]["required"])
        kept = {column["name"]: column for column in tiles.build_columns(manifest, drop_empty_columns=False)}
        self.assertEqual(kept["Pset.Empty"]["type"], "EMPTY")


def stat(data_type, int_min=None, int_max=None):
    return {"dataTypes": [data_type], "units": [], "ifcTypes": [], "count": 1, "intMin": int_min, "intMax": int_max}


if __name__ == "__main__":
    unittest.main()
