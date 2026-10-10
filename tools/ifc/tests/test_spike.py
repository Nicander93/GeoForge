import json
import math
import struct
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import exchange  # noqa: E402
import fixture  # noqa: E402
import tiles  # noqa: E402

SOUTH_WALL = fixture.fixture_guid("wall-south")
EAST_WALL = fixture.fixture_guid("wall-east")


class IfcSpikeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.TemporaryDirectory()
        root = Path(cls.work.name)
        cls.ifc_path = fixture.build_fixture(root / "fixture.ifc")
        cls.manifest = exchange.export_exchange(cls.ifc_path, root / "exchange")
        cls.result = tiles.write_tileset(root / "exchange", root / "tiles")
        cls.gltf, cls.binary = read_glb((root / "tiles" / "content.glb").read_bytes())
        cls.tileset = json.loads((root / "tiles" / "tileset.json").read_text(encoding="utf-8"))
        cls.elements = {element["globalId"]: element for element in cls.manifest["elements"]}

    @classmethod
    def tearDownClass(cls):
        cls.work.cleanup()

    def test_fixture_global_ids_are_stable(self):
        self.assertEqual(SOUTH_WALL, "0$hZgVeZ1MpxRkA$6n9RpZ")
        self.assertEqual(len(self.manifest["elements"]), 7)
        self.assertEqual(self.manifest["withoutGeometry"], [])

    def test_manifest_keeps_identity_storey_and_typed_custom_properties(self):
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

    def test_geometry_layout_matches_manifest(self):
        geometry = self.manifest["geometry"]
        size = (Path(self.work.name) / "exchange" / "geometry.bin").stat().st_size
        self.assertEqual(size, geometry["vertexCount"] * 28)
        self.assertEqual(sum(e["mesh"]["vertexCount"] for e in self.manifest["elements"]), geometry["vertexCount"])
        low, high = np.array(self.manifest["bounds"]["min"]), np.array(self.manifest["bounds"]["max"])
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

    def test_tileset_is_single_tile_1_1_placed_in_hong_kong(self):
        from pyproj import Transformer

        self.assertEqual(self.tileset["asset"]["version"], "1.1")
        root = self.tileset["root"]
        self.assertEqual(root["content"]["uri"], "content.glb")
        self.assertNotIn("children", root)
        transform = np.array(root["transform"]).reshape(4, 4, order="F")
        longitude, latitude, height = Transformer.from_crs("EPSG:4978", "EPSG:4979", always_xy=True).transform(*transform[:3, 3])
        local_to_map = np.array(self.manifest["georeference"]["localToMap"]).reshape(4, 4, order="F")
        expected = Transformer.from_crs("EPSG:2326", "EPSG:4326", always_xy=True).transform(*local_to_map[:2, 3])
        self.assertAlmostEqual(longitude, expected[0], places=8)
        self.assertAlmostEqual(latitude, expected[1], places=8)
        self.assertAlmostEqual(height, local_to_map[2, 3], places=3)
        # The local frame keeps metres: each axis column is a unit vector in ECEF.
        np.testing.assert_allclose(np.linalg.norm(transform[:3, :3], axis=0), [1, 1, 1], atol=1e-3)

    def test_glb_feature_ids_and_property_table_match_manifest(self):
        self.assertEqual(set(self.gltf["extensionsUsed"]), {"EXT_mesh_features", "EXT_structural_metadata"})
        metadata = self.gltf["extensions"]["EXT_structural_metadata"]
        table = metadata["propertyTables"][0]
        self.assertEqual(table["count"], len(self.manifest["elements"]))
        global_ids = self.read_strings(table["properties"]["GlobalId"])
        self.assertEqual(global_ids, [e["globalId"] for e in self.manifest["elements"]])

        primitive_ids = []
        for primitive in self.gltf["meshes"][0]["primitives"]:
            ids = self.read_accessor(primitive["attributes"]["_FEATURE_ID_0"])
            feature = primitive["extensions"]["EXT_mesh_features"]["featureIds"][0]
            self.assertEqual(feature["featureCount"], len(np.unique(ids)))
            primitive_ids.append(ids)
        self.assertEqual(len(self.gltf["meshes"][0]["primitives"]), 2, "the glass window gets the BLEND primitive")
        counts = np.bincount(np.concatenate(primitive_ids).astype(int))
        self.assertEqual(counts.tolist(), [e["mesh"]["vertexCount"] for e in self.manifest["elements"]])

    def test_property_columns_keep_types_and_missing_values(self):
        properties = self.gltf["extensions"]["EXT_structural_metadata"]["schema"]["classes"]["ifc_element"]["properties"]
        table = self.gltf["extensions"]["EXT_structural_metadata"]["propertyTables"][0]["properties"]
        order = [e["globalId"] for e in self.manifest["elements"]]
        south = order.index(SOUTH_WALL)

        self.assertEqual(properties["GF_Custom_AssetCode"]["name"], "GF_Custom.AssetCode")
        self.assertEqual(properties["GF_Custom_AssetCode"]["noData"], "")
        self.assertEqual(self.read_strings(table["GF_Custom_AssetCode"])[south], "GF-W-001")

        self.assertEqual(properties["GF_Custom_DesignLoad"]["componentType"], "FLOAT64")
        self.assertEqual(self.read_values(table["GF_Custom_DesignLoad"], "<f8")[south], 12.5)
        self.assertEqual(properties["GF_Custom_InstallYear"]["componentType"], "INT32")
        install_year = self.read_values(table["GF_Custom_InstallYear"], "<i4")
        self.assertEqual(install_year[south], 2026)
        self.assertEqual(install_year[order.index(EAST_WALL)], tiles.INT32_NO_DATA)

        self.assertEqual(properties["GF_Custom_Inspected"]["componentType"], "INT8")
        inspected = self.read_values(table["GF_Custom_Inspected"], "<i1")
        self.assertEqual((inspected[south], inspected[order.index(EAST_WALL)]), (1, 0))
        self.assertEqual(properties["Pset_WallCommon_IsExternal"]["type"], "SCALAR", "slabs have no IsExternal")

    def test_columns_sanitize_ids_and_drop_empty_text(self):
        elements = [
            {"globalId": "a", "ifcClass": "IfcWall", "name": None, "storey": None, "properties": {
                "P set.Width": {"value": 1, "dataType": "integer"},
                "P_set.Width": {"value": 2, "dataType": "integer"},
                "Pset.Empty": {"value": "", "dataType": "string"},
                "Pset.Flag": {"value": True, "dataType": "boolean"},
            }},
        ]
        columns = {column["name"]: column for column in tiles.build_columns(elements)}
        self.assertEqual(columns["P set.Width"]["id"], "P_set_Width")
        self.assertEqual(columns["P_set.Width"]["id"], "P_set_Width_2")
        self.assertNotIn("Pset.Empty", columns)
        self.assertEqual(columns["Pset.Flag"]["type"], "BOOLEAN")
        self.assertFalse(columns["Name"]["required"])

    def read_view(self, index):
        view = self.gltf["bufferViews"][index]
        return self.binary[view["byteOffset"]:view["byteOffset"] + view["byteLength"]]

    def read_accessor(self, index):
        accessor = self.gltf["accessors"][index]
        self.assertEqual(accessor["componentType"], 5126)
        return np.frombuffer(self.read_view(accessor["bufferView"]), dtype="<f4", count=accessor["count"])

    def read_values(self, entry, dtype):
        return np.frombuffer(self.read_view(entry["values"]), dtype=dtype).tolist()

    def read_strings(self, entry):
        data = self.read_view(entry["values"])
        offsets = np.frombuffer(self.read_view(entry["stringOffsets"]), dtype="<u4")
        return [data[offsets[i]:offsets[i + 1]].decode("utf-8") for i in range(len(offsets) - 1)]


def read_glb(data):
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert (magic, version, length) == (0x46546C67, 2, len(data))
    json_length, _ = struct.unpack_from("<II", data, 12)
    gltf = json.loads(data[20:20 + json_length])
    binary_offset = 20 + json_length
    binary_length, _ = struct.unpack_from("<II", data, binary_offset)
    return gltf, data[binary_offset + 8:binary_offset + 8 + binary_length]


if __name__ == "__main__":
    unittest.main()
