"""Write a single-tile 3D Tiles 1.1 tileset from a GeoForge IFC exchange package.

Output:
  tileset.json  asset.version 1.1, one root tile, optional ECEF transform
  content.glb   glTF 2.0 with EXT_mesh_features (one feature ID per IFC element)
                and EXT_structural_metadata (one property table row per element)

This module only needs numpy and pyproj; it is written so the processor can
port it to Rust without depending on IfcOpenShell.
"""

import json
import math
import re
import struct
from pathlib import Path

import numpy as np

METADATA_CLASS = "ifc_element"
BASE_COLUMNS = [
    ("GlobalId", "globalId", True),
    ("IfcClass", "ifcClass", True),
    ("Name", "name", False),
    ("Storey", "storey", False),
]
FLOAT64_NO_DATA = -1.7976931348623157e308
INT32_NO_DATA = -2147483648
BOOLEAN_NO_DATA = -1
OPAQUE_MATERIAL = {
    "name": "opaque", "doubleSided": True,
    "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 0.9},
}
TRANSPARENT_MATERIAL = {
    "name": "transparent", "doubleSided": True, "alphaMode": "BLEND",
    "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 0.2},
}
WGS84_A = 6378137.0
WGS84_E2 = 6.69437999014e-3


def write_tileset(exchange_dir, out_dir, drop_empty_columns=True):
    exchange_dir = Path(exchange_dir)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((exchange_dir / "manifest.json").read_text(encoding="utf-8"))
    geometry = read_geometry(exchange_dir / manifest["geometry"]["uri"], manifest["geometry"])
    columns = build_columns(manifest["elements"], drop_empty_columns)

    glb = build_glb(manifest["elements"], geometry, columns)
    (out_dir / "content.glb").write_bytes(glb)

    low = np.array(manifest["bounds"]["min"])
    high = np.array(manifest["bounds"]["max"])
    center = (low + high) / 2
    half = np.maximum((high - low) / 2, 0.01)
    root = {
        "boundingVolume": {"box": [*center, half[0], 0, 0, 0, half[1], 0, 0, 0, half[2]]},
        "geometricError": 0,
        "refine": "ADD",
        "content": {"uri": "content.glb"},
    }
    transform, placement = build_root_transform(manifest)
    if transform is not None:
        root["transform"] = transform
    tileset = {
        "asset": {"version": "1.1", "generator": "GeoForge tools/ifc"},
        "geometricError": float(np.linalg.norm(high - low)),
        "root": root,
    }
    (out_dir / "tileset.json").write_text(json.dumps(tileset, indent=2), encoding="utf-8")
    return {"tileset": tileset, "placement": placement, "columns": columns}


def read_geometry(path, layout):
    data = Path(path).read_bytes()
    count = layout["vertexCount"]

    def section(name, dtype, components):
        offset = layout[name]["byteOffset"]
        return np.frombuffer(data, dtype=dtype, count=count * components, offset=offset).reshape(count, components)

    return {
        "positions": section("positions", "<f4", 3),
        "normals": section("normals", "<f4", 3),
        "colors": section("colors", np.uint8, 4),
    }


def build_columns(elements, drop_empty_columns=True):
    """Decide one typed property-table column per base field and per ``Pset.Prop``.

    A property without any value is either dropped or kept as an ``EMPTY``
    column: declared in the class but absent from the property table, which
    EXT_structural_metadata allows for optional properties.
    """
    columns = []
    used_ids = set()
    for name, field, required in BASE_COLUMNS:
        values = [element[field] for element in elements]
        columns.append(create_column(name, "STRING", values, used_ids, required=required))

    keys = sorted({key for element in elements for key in element["properties"]})
    for key in keys:
        typed = [element["properties"].get(key) for element in elements]
        values = [entry["value"] if entry else None for entry in typed]
        # Encoding such a column would need an empty buffer view, which glTF forbids.
        if all(v is None or v == "" for v in values):
            if not drop_empty_columns:
                columns.append(create_column(key, "EMPTY", values, used_ids, description="no values in source"))
            continue
        data_types = {entry["dataType"] for entry in typed if entry and entry["value"] is not None}
        units = sorted({entry["unit"] for entry in typed if entry and entry.get("unit")})
        ifc_types = sorted({entry["ifcType"] for entry in typed if entry and entry.get("ifcType")})
        column_type = choose_column_type(data_types, values)
        if column_type == "STRING":
            values = [None if v is None else format_text(v) for v in values]
        description = ", ".join(filter(None, [
            "/".join(ifc_types),
            f"unit {'/'.join(units)}" if units else "",
            "boolean stored as 1/0, -1 = missing" if column_type == "BOOLEAN_INT8" else "",
        ]))
        columns.append(create_column(key, column_type, values, used_ids, description=description))
    return columns


def choose_column_type(data_types, values):
    missing = any(v is None for v in values)
    if data_types == {"boolean"}:
        # EXT_structural_metadata forbids noData on BOOLEAN, so sparse booleans become INT8.
        return "BOOLEAN_INT8" if missing else "BOOLEAN"
    if data_types == {"integer"} and all(v is None or -2**31 < v < 2**31 for v in values):
        return "INT32"
    if data_types and data_types <= {"integer", "number"}:
        return "FLOAT64"
    return "STRING"


def format_text(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def create_column(name, column_type, values, used_ids, required=False, description=""):
    property_id = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not re.match(r"[A-Za-z_]", property_id):
        property_id = "_" + property_id
    candidate, suffix = property_id, 2
    while candidate in used_ids:
        candidate, suffix = f"{property_id}_{suffix}", suffix + 1
    used_ids.add(candidate)
    return {
        "id": candidate,
        "name": name,
        "type": column_type,
        "values": values,
        "required": required or (column_type != "EMPTY" and all(v is not None for v in values)),
        "description": description,
    }


def build_glb(elements, geometry, columns):
    writer = BufferWriter()
    gltf = {
        "asset": {"version": "2.0", "generator": "GeoForge tools/ifc"},
        "extensionsUsed": ["EXT_mesh_features", "EXT_structural_metadata"],
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "IFC elements"}],
        "materials": [],
        "meshes": [{"name": "IFC elements", "primitives": []}],
        "accessors": [],
        "bufferViews": writer.buffer_views,
        "buffers": [],
    }

    feature_ids = np.empty(len(geometry["positions"]), dtype=np.float32)
    for index, element in enumerate(elements):
        mesh = element["mesh"]
        feature_ids[mesh["vertexOffset"]:mesh["vertexOffset"] + mesh["vertexCount"]] = index

    # glTF content is Y up; Cesium rotates it back to the tile's Z-up frame.
    positions = geometry["positions"][:, [0, 2, 1]] * np.array([1, 1, -1], dtype=np.float32)
    normals = geometry["normals"][:, [0, 2, 1]] * np.array([1, 1, -1], dtype=np.float32)
    colors = geometry["colors"]
    transparent = colors[:, 3] < 255
    for material, mask in [(OPAQUE_MATERIAL, ~transparent), (TRANSPARENT_MATERIAL, transparent)]:
        if not mask.any():
            continue
        gltf["materials"].append(material)
        ids = feature_ids[mask]
        attributes = {
            "POSITION": add_accessor(gltf, writer, positions[mask], "VEC3", with_bounds=True),
            "NORMAL": add_accessor(gltf, writer, normals[mask], "VEC3"),
            "COLOR_0": add_accessor(gltf, writer, colors[mask], "VEC4", normalized=True),
            # FLOAT feature IDs are exact up to 2^24 elements and avoid stride padding.
            "_FEATURE_ID_0": add_accessor(gltf, writer, ids, "SCALAR"),
        }
        gltf["meshes"][0]["primitives"].append({
            "attributes": attributes,
            "material": len(gltf["materials"]) - 1,
            "mode": 4,
            "extensions": {"EXT_mesh_features": {"featureIds": [
                {"featureCount": int(len(np.unique(ids))), "attribute": 0, "propertyTable": 0},
            ]}},
        })

    gltf["extensions"] = {"EXT_structural_metadata": build_metadata(writer, columns, len(elements))}
    binary = writer.finish()
    gltf["buffers"].append({"byteLength": len(binary)})
    return pack_glb(gltf, binary)


def build_metadata(writer, columns, count):
    class_properties = {}
    table_properties = {}
    for column in columns:
        if column["type"] == "EMPTY":
            class_properties[column["id"]] = {
                "type": "STRING", "noData": "", "name": column["name"], "description": column["description"],
            }
            continue
        definition, table_entry = encode_column(writer, column)
        definition["name"] = column["name"]
        if column["description"]:
            definition["description"] = column["description"]
        if column["required"]:
            definition["required"] = True
        class_properties[column["id"]] = definition
        table_properties[column["id"]] = table_entry
    return {
        "schema": {
            "id": "geoforge_ifc",
            "name": "GeoForge IFC elements",
            "classes": {METADATA_CLASS: {"name": "IFC element", "properties": class_properties}},
        },
        "propertyTables": [{
            "name": "IFC elements",
            "class": METADATA_CLASS,
            "count": count,
            "properties": table_properties,
        }],
    }


def encode_column(writer, column):
    values = column["values"]
    column_type = column["type"]
    required = column["required"]
    if column_type == "STRING":
        encoded = [(v or "").encode("utf-8") for v in values]
        offsets = np.zeros(len(encoded) + 1, dtype="<u4")
        offsets[1:] = np.cumsum([len(b) for b in encoded])
        definition = {"type": "STRING"}
        if not required:
            definition["noData"] = ""
        return definition, {
            "values": writer.add(b"".join(encoded)),
            "stringOffsets": writer.add(offsets.tobytes()),
            "stringOffsetType": "UINT32",
        }
    if column_type == "BOOLEAN":
        bits = np.packbits(np.array(values, dtype=bool), bitorder="little")
        return {"type": "BOOLEAN"}, {"values": writer.add(bits.tobytes())}
    if column_type == "BOOLEAN_INT8":
        array = np.array([BOOLEAN_NO_DATA if v is None else int(v) for v in values], dtype=np.int8)
        return ({"type": "SCALAR", "componentType": "INT8", "noData": BOOLEAN_NO_DATA},
                {"values": writer.add(array.tobytes())})
    if column_type == "INT32":
        array = np.array([INT32_NO_DATA if v is None else v for v in values], dtype="<i4")
        definition = {"type": "SCALAR", "componentType": "INT32"}
        if not required:
            definition["noData"] = INT32_NO_DATA
        return definition, {"values": writer.add(array.tobytes())}
    array = np.array([FLOAT64_NO_DATA if v is None else float(v) for v in values], dtype="<f8")
    definition = {"type": "SCALAR", "componentType": "FLOAT64"}
    if not required:
        definition["noData"] = FLOAT64_NO_DATA
    return definition, {"values": writer.add(array.tobytes())}


def add_accessor(gltf, writer, array, accessor_type, normalized=False, with_bounds=False):
    component_types = {np.dtype(np.float32): 5126, np.dtype(np.uint8): 5121}
    array = np.ascontiguousarray(array)
    accessor = {
        "bufferView": writer.add(array.tobytes(), target=34962),
        "componentType": component_types[array.dtype],
        "count": len(array),
        "type": accessor_type,
    }
    if normalized:
        accessor["normalized"] = True
    if with_bounds:
        accessor["min"] = array.min(axis=0).astype(float).tolist()
        accessor["max"] = array.max(axis=0).astype(float).tolist()
    gltf["accessors"].append(accessor)
    return len(gltf["accessors"]) - 1


class BufferWriter:
    """Packs buffer views into one GLB binary chunk with 8-byte alignment (required for metadata)."""

    def __init__(self):
        self.chunks = []
        self.length = 0
        self.buffer_views = []

    def add(self, data, target=None):
        padding = (-self.length) % 8
        if padding:
            self.chunks.append(b"\0" * padding)
            self.length += padding
        view = {"buffer": 0, "byteOffset": self.length, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        self.chunks.append(data)
        self.length += len(data)
        self.buffer_views.append(view)
        return len(self.buffer_views) - 1

    def finish(self):
        data = b"".join(self.chunks)
        return data + b"\0" * ((-len(data)) % 4)


def pack_glb(gltf, binary):
    json_chunk = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * ((-len(json_chunk)) % 4)
    total = 12 + 8 + len(json_chunk) + 8 + len(binary)
    return b"".join([
        struct.pack("<III", 0x46546C67, 2, total),
        struct.pack("<II", len(json_chunk), 0x4E4F534A), json_chunk,
        struct.pack("<II", len(binary), 0x004E4942), binary,
    ])


def build_root_transform(manifest):
    """Return (column-major ECEF transform or None, placement description)."""
    georeference = manifest.get("georeference") or {}
    if georeference.get("mode") == "map-conversion":
        return map_conversion_transform(georeference), {"mode": "map-conversion", "crs": georeference["crs"]["name"]}
    if georeference.get("mode") == "anchor":
        anchor = georeference["anchor"]
        enu = east_north_up(anchor["longitude"], anchor["latitude"], anchor["height"])
        offset = np.eye(4)
        offset[:3, 3] = manifest["origin"]
        return (enu @ offset).flatten(order="F").tolist(), {"mode": "anchor", "approximate": False}
    if georeference.get("mode") == "site-reference":
        site = georeference["site"]
        # IfcSite RefLatitude/RefLongitude describe the site origin; TrueNorth is not applied yet.
        enu = east_north_up(site["longitude"], site["latitude"], site["elevation"])
        offset = np.eye(4)
        offset[:3, 3] = manifest["origin"]
        return (enu @ offset).flatten(order="F").tolist(), {"mode": "site-reference", "approximate": True}
    return None, {"mode": "local"}


def map_conversion_transform(georeference):
    """Linearise the CRS around the tile origin into one ECEF affine matrix.

    Heights are treated as ellipsoidal (no geoid model) and the projection is
    linearised with 10 m steps, which is adequate for a single building tile.
    """
    from pyproj import Transformer

    local_to_map = np.array(georeference["localToMap"]).reshape(4, 4, order="F")
    transformer = Transformer.from_crs(georeference["crs"]["name"], "EPSG:4326", always_xy=True)

    def to_ecef(local):
        easting, northing, height = (local_to_map @ np.array([*local, 1.0]))[:3]
        longitude, latitude = transformer.transform(easting, northing)
        return geodetic_to_ecef(longitude, latitude, height)

    step = 10.0
    anchor = to_ecef((0.0, 0.0, 0.0))
    matrix = np.eye(4)
    for axis in range(3):
        offset = np.zeros(3)
        offset[axis] = step
        matrix[:3, axis] = (to_ecef(offset) - anchor) / step
    matrix[:3, 3] = anchor
    return matrix.flatten(order="F").tolist()


def east_north_up(longitude, latitude, height):
    lon, lat = math.radians(longitude), math.radians(latitude)
    east = np.array([-math.sin(lon), math.cos(lon), 0.0])
    north = np.array([-math.sin(lat) * math.cos(lon), -math.sin(lat) * math.sin(lon), math.cos(lat)])
    up = np.array([math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)])
    matrix = np.eye(4)
    matrix[:3, 0], matrix[:3, 1], matrix[:3, 2] = east, north, up
    matrix[:3, 3] = geodetic_to_ecef(longitude, latitude, height)
    return matrix


def geodetic_to_ecef(longitude, latitude, height):
    lon, lat = math.radians(longitude), math.radians(latitude)
    radius = WGS84_A / math.sqrt(1 - WGS84_E2 * math.sin(lat) ** 2)
    return np.array([
        (radius + height) * math.cos(lat) * math.cos(lon),
        (radius + height) * math.cos(lat) * math.sin(lon),
        (radius * (1 - WGS84_E2) + height) * math.sin(lat),
    ])
