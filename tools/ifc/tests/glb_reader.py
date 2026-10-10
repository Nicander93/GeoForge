"""Minimal GLB reader for the tests: accessors (incl. strided, normalized) and property tables."""

import json
import struct

import numpy as np

COMPONENTS = {5120: "<i1", 5121: "<u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
OFFSET_TYPES = {"UINT8": "<u1", "UINT16": "<u2", "UINT32": "<u4"}
SCALAR_TYPES = {"INT8": "<i1", "INT16": "<i2", "INT32": "<i4", "FLOAT64": "<f8"}


class Glb:
    def __init__(self, data, schema=None):
        magic, version, length = struct.unpack_from("<III", data, 0)
        assert (magic, version, length) == (0x46546C67, 2, len(data))
        json_length, _ = struct.unpack_from("<II", data, 12)
        self.gltf = json.loads(data[20:20 + json_length])
        offset = 20 + json_length
        binary_length, _ = struct.unpack_from("<II", data, offset)
        self.binary = data[offset + 8:offset + 8 + binary_length]
        metadata = self.gltf["extensions"]["EXT_structural_metadata"]
        self.schema = metadata.get("schema", schema)
        self.table = metadata["propertyTables"][0]

    @classmethod
    def read(cls, path, schema=None):
        with open(path, "rb") as file:
            return cls(file.read(), schema)

    def view(self, index):
        view = self.gltf["bufferViews"][index]
        return self.binary[view["byteOffset"]:view["byteOffset"] + view["byteLength"]], view.get("byteStride")

    def accessor(self, index, dequantize=True):
        accessor = self.gltf["accessors"][index]
        data, stride = self.view(accessor["bufferView"])
        dtype = np.dtype(COMPONENTS[accessor["componentType"]])
        width = WIDTH[accessor["type"]]
        row = stride // dtype.itemsize if stride else width
        values = np.frombuffer(data, dtype=dtype, count=accessor["count"] * row).reshape(-1, row)[:, :width]
        if dequantize and accessor.get("normalized"):
            if dtype.kind == "u":
                values = values / float(np.iinfo(dtype).max)
            else:
                values = np.maximum(values / float(np.iinfo(dtype).max), -1.0)
        return values[:, 0] if width == 1 else values

    def class_properties(self):
        return self.schema["classes"]["ifc_element"]["properties"]

    def column(self, property_id):
        """Values of one property-table column, or None if the tile leaves it out."""
        entry = self.table["properties"].get(property_id)
        if entry is None:
            return None
        definition = self.class_properties()[property_id]
        data, _ = self.view(entry["values"])
        if definition["type"] == "STRING":
            offsets = np.frombuffer(self.view(entry["stringOffsets"])[0],
                                    dtype=OFFSET_TYPES[entry.get("stringOffsetType", "UINT32")])
            return [data[offsets[i]:offsets[i + 1]].decode("utf-8") for i in range(len(offsets) - 1)]
        if definition["type"] == "BOOLEAN":
            bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8), bitorder="little")
            return [bool(bit) for bit in bits[:self.table["count"]]]
        return np.frombuffer(data, dtype=SCALAR_TYPES[definition["componentType"]]).tolist()

    def world_positions(self, primitive):
        """POSITION in the glTF node's frame after the node transform (Y up)."""
        positions = self.accessor(primitive["attributes"]["POSITION"])
        node = self.gltf["nodes"][0]
        return positions * np.array(node.get("scale", [1, 1, 1])) + np.array(node.get("translation", [0, 0, 0]))
