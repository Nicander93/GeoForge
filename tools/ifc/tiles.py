"""Write a 3D Tiles 1.1 tileset from a GeoForge IFC exchange package (version 2).

Output:
  tileset.json   asset.version 1.1, explicit tree with additive refinement
                 (see tiling.py), optional ECEF root transform
  content.glb    the only content when everything fits in one tile, or
  tiles/*.glb    one glTF per tile, named by tree address (0, 0-1, 0-1-3, ...)
  schema.json    the shared EXT_structural_metadata schema when it is too big
                 to repeat in every tile (glTF files then use schemaUri)
  index.json     optional: GlobalId -> [content index, feature ID]

Every glTF has EXT_mesh_features (one feature ID per IFC element, local to
the tile) and EXT_structural_metadata (one property table row per element).
All tiles use the same schema and class, so a column has the same name and
type everywhere; a tile leaves out optional columns it has no values for.
Meshes are indexed; with ``quantize`` positions and normals use
KHR_mesh_quantization (16-bit positions with one uniform scale per tile,
8-bit normals).

This module only needs numpy and pyproj; it is written so the processor can
port it to Rust without depending on IfcOpenShell.
"""

import json
import math
import re
import struct
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

import tiling

METADATA_CLASS = "ifc_element"
BASE_COLUMNS = [
    ("GlobalId", "globalId", True),
    ("IfcClass", "ifcClass", True),
    ("Name", "name", False),
    ("Storey", "storey", False),
]
FLOAT64_NO_DATA = -1.7976931348623157e308
# Integer columns use the narrowest type that holds the column's range; the
# type's minimum is the noData value.
INTEGER_TYPES = [("INT8", "<i1", -128), ("INT16", "<i2", -32768), ("INT32", "<i4", -2147483648)]
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
# Schemas up to this size are embedded in every glTF; larger ones go to schema.json.
EMBEDDED_SCHEMA_BYTES = 32 * 1024
SCHEMA_FILE = "schema.json"
INDEX_FILE = "index.json"


def write_tileset(exchange_dir, out_dir, drop_empty_columns=True, tiling_mode="adaptive",
                  max_features=tiling.DEFAULT_MAX_FEATURES, max_triangles=tiling.DEFAULT_MAX_TRIANGLES,
                  quantize=True, write_index=False, threads=1, dense_tables=False, report=None):
    report = report or (lambda event, **fields: None)
    exchange = Exchange(exchange_dir)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = exchange.manifest
    columns = build_columns(manifest, drop_empty_columns)
    schema = build_schema(columns)

    origin = np.array(manifest["origin"])
    rows = exchange.rows
    root = tiling.build_tree(rows["min"] - origin, rows["max"] - origin, rows["triangles"],
                             keys=rows["globalId"], max_features=max_features, max_triangles=max_triangles,
                             single=tiling_mode == "single")
    tiles = list(root.walk())
    contents = [tile for tile in tiles if len(tile.elements)]
    single = len(contents) == 1 and len(tiles) == 1
    uris = {tile.address: "content.glb" if single else f"tiles/{tile.address}.glb" for tile in contents}
    if not single:
        (out_dir / "tiles").mkdir(exist_ok=True)

    schema_json = json.dumps(schema, separators=(",", ":"))
    external_schema = not single and len(schema_json) > EMBEDDED_SCHEMA_BYTES
    if external_schema:
        (out_dir / SCHEMA_FILE).write_text(schema_json, encoding="utf-8")

    def write(tile):
        uri = uris[tile.address]
        schema_ref = {"schemaUri": "../" + SCHEMA_FILE} if external_schema else {"schema": schema}
        records, meshes = exchange.read(tile.elements, origin)
        glb, stats = build_glb(records, meshes, columns, schema_ref, quantize, dense_tables)
        (out_dir / uri).write_bytes(glb)
        return tile.address, [record["globalId"] for record in records], stats

    report("progress", stage="tiles", completed=0, total=len(contents))
    results = {}
    with ThreadPoolExecutor(max_workers=max(1, int(threads or 1))) as pool:
        for done, (address, global_ids, stats) in enumerate(pool.map(write, contents), start=1):
            results[address] = (global_ids, stats)
            report("progress", stage="tiles", completed=done, total=len(contents))
    exchange.close()

    tileset = {
        "asset": {"version": "1.1", "generator": "GeoForge tools/ifc"},
        "geometricError": float(np.linalg.norm(root.high - root.low)),
        "root": tile_json(root, uris),
        # Whole-model counts, so a viewer can list classes and storeys before every tile is loaded.
        "extras": {"geoforge": {
            "elements": int(manifest["elementCount"]),
            "facets": {
                "IfcClass": sorted([name, count] for name, count in manifest["classes"].items()),
                "Storey": sorted([name, count] for name, count in manifest["storeyCounts"].items()),
            },
        }},
    }
    transform, placement = build_root_transform(manifest)
    if transform is not None:
        tileset["root"]["transform"] = transform
    (out_dir / "tileset.json").write_text(json.dumps(tileset, indent=1), encoding="utf-8")

    content_order = [tile.address for tile in contents]
    if write_index:
        index = {"version": 1, "contents": [uris[address] for address in content_order], "elements": {}}
        for content_index, address in enumerate(content_order):
            for feature_id, global_id in enumerate(results[address][0]):
                index["elements"][global_id] = [content_index, feature_id]
        (out_dir / INDEX_FILE).write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")

    stats = [results[address][1] for address in content_order]
    tree = tiling.tree_stats(root)
    return {
        "tileset": tileset,
        "placement": placement,
        "columns": columns,
        "tiling": {
            "mode": "single" if single else "adaptive",
            "requested": tiling_mode,
            "tiles": tree["tiles"],
            "contents": tree["contents"],
            "depth": tree["depth"],
            "maxFeaturesPerTile": tree["maxFeatures"],
            "maxTrianglesPerTile": max(stat["triangles"] for stat in stats),
            "schema": "external" if external_schema else "embedded",
            "index": write_index,
        },
        "geometry": {
            "triangles": sum(stat["triangles"] for stat in stats),
            "vertices": sum(stat["vertices"] for stat in stats),
            "contentBytes": sum(stat["bytes"] for stat in stats),
            "quantized": bool(quantize),
        },
    }


def tile_json(tile, uris):
    center = (tile.low + tile.high) / 2
    half = np.maximum((tile.high - tile.low) / 2, 0.01)
    node = {
        "boundingVolume": {"box": [*center.tolist(), half[0], 0, 0, 0, half[1], 0, 0, 0, half[2]]},
        "geometricError": tile.geometric_error,
        "refine": "ADD",
    }
    if tile.address in uris:
        node["content"] = {"uri": uris[tile.address]}
    if tile.children:
        node["children"] = [tile_json(child, uris) for child in tile.children]
    return node


class Exchange:
    """Random access to the elements of an exchange package."""

    def __init__(self, exchange_dir):
        self.dir = Path(exchange_dir)
        self.manifest = json.loads((self.dir / "manifest.json").read_text(encoding="utf-8"))
        if self.manifest.get("version") != 2:
            raise ValueError(f"unsupported exchange package version {self.manifest.get('version')}")
        files = self.manifest["files"]
        self.rows = np.load(self.dir / files["elements"], allow_pickle=False)
        geometry_path = self.dir / files["geometry"]
        self.geometry = (np.memmap(geometry_path, dtype=np.uint8, mode="r")
                         if geometry_path.stat().st_size else np.zeros(0, dtype=np.uint8))
        self.properties_path = self.dir / files["properties"]

    def read(self, indices, origin):
        """Records and meshes (positions relative to ``origin``) of ``indices``, in that order."""
        records, meshes = [], []
        with open(self.properties_path, "rb") as file:
            for index in indices:
                row = self.rows[index]
                file.seek(int(row["propsOffset"]))
                records.append(json.loads(file.read(int(row["propsLength"])).decode("utf-8")))
                base = row["min"] - origin
                parts = []
                for part in range(2):
                    vertices = int(row["partVertices"][part])
                    triangles = int(row["partTriangles"][part])
                    if triangles == 0:
                        parts.append(None)
                        continue
                    offset = int(row["partOffset"][part])

                    def take(dtype, count, width):
                        nonlocal offset
                        size = np.dtype(dtype).itemsize * count * width
                        data = np.frombuffer(self.geometry[offset:offset + size], dtype=dtype).reshape(count, width)
                        offset += size
                        return data

                    positions = take("<f4", vertices, 3).astype(np.float64) + base
                    normals = take("<f4", vertices, 3)
                    colors = take(np.uint8, vertices, 4)
                    indices_ = take("<u4", triangles, 3)
                    parts.append({"positions": positions, "normals": normals, "colors": colors, "indices": indices_})
                meshes.append(parts)
        return records, meshes

    def close(self):
        if isinstance(self.geometry, np.memmap):
            self.geometry._mmap.close()


def build_columns(manifest, drop_empty_columns=True):
    """Decide one typed property-table column per base field and per ``Pset.Prop``.

    Types come from the statistics the exporter collected over all elements,
    so every tile encodes a column the same way. A property without any
    value is either dropped or kept as an ``EMPTY`` column: declared in the
    class but absent from all property tables, which EXT_structural_metadata
    allows for optional properties.
    """
    total = manifest["elementCount"]
    stats = manifest["columns"]
    columns = []
    used_ids = set()
    for name, field, required in BASE_COLUMNS:
        present = total if required else stats["base"].get(field, 0)
        columns.append(create_column(name, field, "STRING", used_ids, required=present == total))
    for key, stat in stats["properties"].items():
        if stat["count"] == 0:
            if not drop_empty_columns:
                columns.append(create_column(key, key, "EMPTY", used_ids, description="no values in source"))
            continue
        data_types = set(stat["dataTypes"])
        missing = stat["count"] < total
        column_type = choose_column_type(data_types, missing, stat.get("intMin"), stat.get("intMax"))
        description = ", ".join(filter(None, [
            "/".join(stat["ifcTypes"]),
            f"unit {'/'.join(stat['units'])}" if stat["units"] else "",
            "boolean stored as 1/0, -1 = missing" if column_type == "BOOLEAN_INT8" else "",
        ]))
        columns.append(create_column(key, key, column_type, used_ids, required=not missing,
                                     description=description, property_key=True))
    return columns


def choose_column_type(data_types, missing, int_min=None, int_max=None):
    if data_types == {"boolean"}:
        # EXT_structural_metadata forbids noData on BOOLEAN, so sparse booleans become INT8.
        return "BOOLEAN_INT8" if missing else "BOOLEAN"
    if data_types == {"integer"} and int_min is not None:
        for name, _, no_data in INTEGER_TYPES:
            if no_data < int_min and int_max <= -no_data - 1:
                return name
    if data_types and data_types <= {"integer", "number"}:
        return "FLOAT64"
    return "STRING"


def format_text(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def create_column(name, source, column_type, used_ids, required=False, description="", property_key=False):
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
        "source": source,
        "fromProperties": property_key,
        "type": column_type,
        "required": required and column_type != "EMPTY",
        "description": description,
    }


def column_values(column, records):
    if column["fromProperties"]:
        values = []
        for record in records:
            entry = record["properties"].get(column["source"])
            value = entry["value"] if entry else None
            values.append(None if value == "" else value)
    else:
        values = [record[column["source"]] for record in records]
        values = [None if value == "" else value for value in values]
    if column["type"] == "STRING":
        values = [None if value is None else format_text(value) for value in values]
    return values


def build_schema(columns):
    class_properties = {}
    for column in columns:
        definition = column_definition(column)
        definition["name"] = column["name"]
        if column["description"]:
            definition["description"] = column["description"]
        if column["required"]:
            definition["required"] = True
        class_properties[column["id"]] = definition
    return {
        "id": "geoforge_ifc",
        "name": "GeoForge IFC elements",
        "classes": {METADATA_CLASS: {"name": "IFC element", "properties": class_properties}},
    }


def column_definition(column):
    column_type = column["type"]
    required = column["required"]
    if column_type in ("STRING", "EMPTY"):
        return {"type": "STRING"} if required else {"type": "STRING", "noData": ""}
    if column_type == "BOOLEAN":
        return {"type": "BOOLEAN"}
    if column_type == "BOOLEAN_INT8":
        return {"type": "SCALAR", "componentType": "INT8", "noData": BOOLEAN_NO_DATA}
    integer = {name: no_data for name, _, no_data in INTEGER_TYPES}
    if column_type in integer:
        definition = {"type": "SCALAR", "componentType": column_type}
        if not required:
            definition["noData"] = integer[column_type]
        return definition
    definition = {"type": "SCALAR", "componentType": "FLOAT64"}
    if not required:
        definition["noData"] = FLOAT64_NO_DATA
    return definition


def build_glb(records, meshes, columns, schema_ref, quantize=True, dense_tables=False):
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

    primitives = []
    for part_index, material in enumerate([OPAQUE_MATERIAL, TRANSPARENT_MATERIAL]):
        chunks = [(feature_id, mesh[part_index]) for feature_id, mesh in enumerate(meshes)
                  if mesh[part_index] is not None]
        if chunks:
            primitives.append((material, merge_parts(chunks)))

    # glTF content is Y up; Cesium rotates it back to the tile's Z-up frame.
    for _, merged in primitives:
        merged["positions"] = merged["positions"][:, [0, 2, 1]] * np.array([1, 1, -1])
        merged["normals"] = merged["normals"][:, [0, 2, 1]] * np.array([1, 1, -1], dtype=np.float32)
    if quantize:
        all_positions = np.concatenate([merged["positions"] for _, merged in primitives])
        low = all_positions.min(axis=0)
        # One uniform scale keeps the node's normal matrix a pure scale.
        scale = max(float((all_positions.max(axis=0) - low).max()), 1e-6)
        gltf["nodes"][0].update(translation=low.tolist(), scale=[scale, scale, scale])
        gltf["extensionsUsed"].append("KHR_mesh_quantization")
        gltf["extensionsRequired"] = ["KHR_mesh_quantization"]

    triangles = vertices = 0
    for material, merged in primitives:
        gltf["materials"].append(material)
        count = len(merged["positions"])
        if quantize:
            quantized = np.zeros((count, 4), dtype="<u2")
            quantized[:, :3] = np.clip(np.round((merged["positions"] - low) / scale * 65535), 0, 65535)
            position = add_accessor(gltf, writer, quantized, "VEC3", 5123, normalized=True, components=3,
                                    with_bounds=True)
            packed = np.zeros((count, 4), dtype=np.int8)
            packed[:, :3] = np.clip(np.round(merged["normals"] * 127), -127, 127)
            normal = add_accessor(gltf, writer, packed, "VEC3", 5120, normalized=True, components=3)
        else:
            position = add_accessor(gltf, writer, merged["positions"].astype("<f4"), "VEC3", 5126, with_bounds=True)
            normal = add_accessor(gltf, writer, merged["normals"].astype("<f4"), "VEC3", 5126)
        attributes = {
            "POSITION": position,
            "NORMAL": normal,
            "COLOR_0": add_accessor(gltf, writer, merged["colors"], "VEC4", 5121, normalized=True),
            # FLOAT feature IDs are exact up to 2^24 elements and avoid stride padding.
            "_FEATURE_ID_0": add_accessor(gltf, writer, merged["featureIds"], "SCALAR", 5126),
        }
        indices = merged["indices"].reshape(-1)
        index_type = 5123 if count <= 65535 else 5125
        indices = indices.astype("<u2" if index_type == 5123 else "<u4")
        index_accessor = len(gltf["accessors"])
        gltf["accessors"].append({
            "bufferView": writer.add(indices.tobytes(), target=34963),
            "componentType": index_type, "count": int(len(indices)), "type": "SCALAR",
        })
        gltf["meshes"][0]["primitives"].append({
            "attributes": attributes,
            "indices": index_accessor,
            "material": len(gltf["materials"]) - 1,
            "mode": 4,
            "extensions": {"EXT_mesh_features": {"featureIds": [
                {"featureCount": int(len(np.unique(merged["featureIds"]))), "attribute": 0, "propertyTable": 0},
            ]}},
        })
        triangles += len(indices) // 3
        vertices += count

    gltf["extensions"] = {"EXT_structural_metadata": {
        **schema_ref,
        "propertyTables": [build_property_table(writer, columns, records, dense_tables)],
    }}
    binary = writer.finish()
    gltf["buffers"].append({"byteLength": len(binary)})
    glb = pack_glb(gltf, binary)
    return glb, {"triangles": triangles, "vertices": vertices, "bytes": len(glb), "features": len(records)}


def merge_parts(chunks):
    positions, normals, colors, feature_ids, indices = [], [], [], [], []
    offset = 0
    for feature_id, part in chunks:
        count = len(part["positions"])
        positions.append(part["positions"])
        normals.append(part["normals"])
        colors.append(part["colors"])
        feature_ids.append(np.full(count, feature_id, dtype=np.float32))
        indices.append(part["indices"].astype(np.int64) + offset)
        offset += count
    return {
        "positions": np.concatenate(positions),
        "normals": np.concatenate(normals).astype(np.float32),
        "colors": np.ascontiguousarray(np.concatenate(colors), dtype=np.uint8),
        "featureIds": np.concatenate(feature_ids),
        "indices": np.concatenate(indices),
    }


def build_property_table(writer, columns, records, dense=False):
    """Encode the tile's rows; optional columns without values here are left out.

    EXT_structural_metadata only requires required properties in a table.
    3d-tiles-validator 0.6.1 nevertheless fails with an internal error on an
    omitted numeric property, so ``dense`` keeps those (strings without any
    value cannot be encoded: glTF forbids an empty values buffer view).
    """
    table_properties = {}
    for column in columns:
        if column["type"] == "EMPTY":
            continue
        values = column_values(column, records)
        if not column["required"] and all(value is None for value in values):
            if not dense or column["type"] == "STRING":
                continue
        table_properties[column["id"]] = encode_column(writer, column, values)
    return {"name": "IFC elements", "class": METADATA_CLASS, "count": len(records),
            "properties": table_properties}


def encode_column(writer, column, values):
    column_type = column["type"]
    if column_type == "STRING":
        encoded = [(v or "").encode("utf-8") for v in values]
        offsets = np.zeros(len(encoded) + 1, dtype=np.int64)
        offsets[1:] = np.cumsum([len(b) for b in encoded])
        # The offset type is per table, so small tiles use 1 or 2 bytes per row.
        offset_type, dtype = next((name, dtype) for name, dtype, limit in [
            ("UINT8", "<u1", 2**8), ("UINT16", "<u2", 2**16), ("UINT32", "<u4", 2**32),
        ] if offsets[-1] < limit)
        return {
            "values": writer.add(b"".join(encoded)),
            "stringOffsets": writer.add(offsets.astype(dtype).tobytes()),
            "stringOffsetType": offset_type,
        }
    if column_type == "BOOLEAN":
        bits = np.packbits(np.array(values, dtype=bool), bitorder="little")
        return {"values": writer.add(bits.tobytes())}
    if column_type == "BOOLEAN_INT8":
        array = np.array([BOOLEAN_NO_DATA if v is None else int(v) for v in values], dtype=np.int8)
        return {"values": writer.add(array.tobytes())}
    for name, dtype, no_data in INTEGER_TYPES:
        if column_type == name:
            array = np.array([no_data if v is None else v for v in values], dtype=dtype)
            return {"values": writer.add(array.tobytes())}
    array = np.array([FLOAT64_NO_DATA if v is None else float(v) for v in values], dtype="<f8")
    return {"values": writer.add(array.tobytes())}


def add_accessor(gltf, writer, array, accessor_type, component_type, normalized=False, components=None,
                 with_bounds=False):
    """Add a vertex attribute; ``components`` < row width means padded rows (byteStride)."""
    array = np.ascontiguousarray(array)
    width = array.shape[1] if array.ndim == 2 else 1
    view = writer.add(array.tobytes(), target=34962)
    if components is not None and components != width:
        writer.buffer_views[view]["byteStride"] = array.itemsize * width
    accessor = {
        "bufferView": view,
        "componentType": component_type,
        "count": len(array),
        "type": accessor_type,
    }
    if normalized:
        accessor["normalized"] = True
    if with_bounds:
        used = array[:, :components] if components else array
        cast = int if np.issubdtype(array.dtype, np.integer) else float
        accessor["min"] = [cast(v) for v in used.min(axis=0)]
        accessor["max"] = [cast(v) for v in used.max(axis=0)]
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
