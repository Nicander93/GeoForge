"""Export an IFC file into the GeoForge IFC exchange package.

Package layout (format "geoforge-ifc-exchange", version 2):

  manifest.json   source, georeference, origin and bounds, class/storey
                  counts and per-property column statistics
  elements.npy    one row per element: bounds, triangle and vertex
                  counts, byte offsets into geometry.bin and elements.jsonl
  elements.jsonl  one JSON object per element: GlobalId, class, name,
                  storey and typed properties
  geometry.bin    per element up to two indexed meshes (opaque, transparent):
                  float32 positions relative to the element's bounds minimum,
                  float32 normals, uint8 RGBA colors, uint32 triangle indices

Elements are written while the geometry iterator runs, so memory does not
grow with the model's triangle count. Products sharing a representation
(IfcMappedItem, type geometry) are processed once and transformed per
occurrence. Coordinates are IFC world coordinates in metres, Z up; element
bounds are float64 so float32 positions keep millimetre precision far from
the project origin. The tiles writer reads only this package and needs no
IfcOpenShell.
"""

import hashlib
import json
import multiprocessing
from collections import Counter, OrderedDict
from pathlib import Path

import numpy as np

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.ifcopenshell_wrapper
import ifcopenshell.util.geolocation
import ifcopenshell.util.unit

EXCHANGE_FORMAT = "geoforge-ifc-exchange"
EXCHANGE_VERSION = 2
DEFAULT_COLOR = (0.8, 0.8, 0.8, 1.0)
# Openings and spaces would hide real elements or duplicate their volume.
SKIPPED_CLASSES = ("IfcFeatureElementSubtraction", "IfcVirtualElement", "IfcSpace")
ELEMENT_DTYPE = np.dtype([
    ("globalId", "S22"),
    ("min", "<f8", 3),
    ("max", "<f8", 3),
    ("triangles", "<u4"),
    ("vertices", "<u4"),
    # Per part (0 opaque, 1 transparent): byte offset into geometry.bin,
    # vertex and triangle count. A part without triangles has count 0.
    ("partOffset", "<u8", 2),
    ("partVertices", "<u4", 2),
    ("partTriangles", "<u4", 2),
    ("propsOffset", "<u8"),
    ("propsLength", "<u4"),
])
# Processed meshes of shared representations; LRU-evicted beyond this size.
MESH_CACHE_BYTES = 256 * 1024 * 1024
NORMAL_KEY_SCALE = 1024


def export_exchange(ifc_path, out_dir, include_spaces=False, threads=None, include_classes=(),
                    exclude_classes=(), georeference=None, report=None):
    """Write the exchange package and return its manifest.

    ``georeference`` is ``{"mode": "auto" | "local" | "anchor" | "crs", ...}``;
    ``report(event, **fields)`` receives stage, progress and warning events.
    """
    report = report or (lambda event, **fields: None)
    georeference = georeference or {"mode": "auto"}
    ifc_path = Path(ifc_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    report("stage", stage="open", message=f"读取 {ifc_path.name}")
    model = ifcopenshell.open(str(ifc_path))
    warnings = []

    def warn(code, message):
        warnings.append({"code": code, "message": message})
        report("warning", code=code, message=message)

    include_classes = known_classes(model, include_classes, warn)
    exclude_classes = known_classes(model, exclude_classes, warn)
    include_spaces = include_spaces or any(name.lower() == "ifcspace" for name in include_classes)
    candidates = list(model.by_type("IfcElement")) + (list(model.by_type("IfcSpace")) if include_spaces else [])
    candidates = [p for p in candidates if not is_skipped(p, include_spaces)]
    products = [p for p in candidates if class_selected(p, include_classes, exclude_classes)]
    if not products:
        raise ValueError(f"{ifc_path.name} 中没有符合类过滤条件的 IFC 构件")

    report("stage", stage="index", message="建立属性和楼层索引")
    properties = PropertyIndex(model)
    storeys = StoreyIndex(model)

    report("stage", stage="tessellate", message=f"三角化并读取属性 {len(products)} 个构件")
    writer = ElementWriter(out_dir)
    try:
        reuse = stream_elements(model, products, threads or multiprocessing.cpu_count(), report,
                                lambda product, mesh: writer.add(product, mesh, storeys.name(product),
                                                                 properties.collect(product)))
    finally:
        writer.close()
    if writer.count == 0:
        raise ValueError(f"{ifc_path.name} 中没有可三角化的 IFC 构件")
    written = set(writer.global_ids)
    without_geometry = [p.GlobalId for p in products if p.GlobalId not in written]
    if without_geometry:
        warn("IFC_ELEMENTS_WITHOUT_GEOMETRY", f"{len(without_geometry)} 个构件没有可显示的几何体，已跳过")

    low, high = writer.low, writer.high
    origin = np.array([(low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]])
    unit_scale = ifcopenshell.util.unit.calculate_unit_scale(model)
    manifest = {
        "format": EXCHANGE_FORMAT,
        "version": EXCHANGE_VERSION,
        "source": {
            "file": ifc_path.name,
            "schema": model.schema,
            "sha256": file_sha256(ifc_path),
            "lengthUnitScale": unit_scale,
        },
        "generator": {"name": "geoforge tools/ifc", "ifcopenshell": ifcopenshell.version},
        "coordinates": "IFC world coordinates, metres, Z up; element positions are relative to the element's min bound",
        "origin": origin.tolist(),
        "bounds": {"min": (low - origin).tolist(), "max": (high - origin).tolist()},
        "georeference": build_georeference(model, origin, unit_scale, georeference, warn),
        "files": {"elements": "elements.npy", "properties": "elements.jsonl", "geometry": "geometry.bin"},
        "elementCount": writer.count,
        "triangleCount": writer.triangles,
        "vertexCount": writer.vertices,
        "geometryReuse": reuse,
        "classes": dict(writer.classes.most_common()),
        "storeys": sorted(name for name in writer.storeys if name),
        # Element count per storey name; "" counts elements outside any storey.
        "storeyCounts": dict(sorted(writer.storeys.items())),
        "columns": writer.column_stats(),
        "withoutGeometry": without_geometry,
        "filter": {
            "includeClasses": include_classes,
            "excludeClasses": exclude_classes,
            "includeSpaces": include_spaces,
            "excludedByClass": len(candidates) - len(products),
        },
        "warnings": warnings,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def known_classes(model, names, warn):
    schema = ifcopenshell.ifcopenshell_wrapper.schema_by_name(model.schema)
    known = []
    for name in names:
        try:
            known.append(schema.declaration_by_name(name).name())
        except RuntimeError:
            warn("IFC_UNKNOWN_CLASS", f"{model.schema} 中没有 {name}，该过滤条件已忽略")
    return known


def class_selected(product, include_classes, exclude_classes):
    if include_classes and not any(product.is_a(name) for name in include_classes):
        return False
    return not any(product.is_a(name) for name in exclude_classes)


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as file:
        for block in iter(lambda: file.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def is_skipped(product, include_spaces):
    if include_spaces and product.is_a("IfcSpace"):
        return False
    return any(product.is_a(ifc_class) for ifc_class in SKIPPED_CLASSES)


def stream_elements(model, products, threads, report, consume):
    """Call ``consume(product, mesh)`` for every product the iterator meshes.

    The iterator runs in local coordinates so products sharing a
    representation report the same geometry id; the processed mesh is cached
    and only the placement matrix differs per occurrence.
    """
    settings = ifcopenshell.geom.settings()
    iterator = ifcopenshell.geom.iterator(settings, model, threads, include=products)
    cache = MeshCache(MESH_CACHE_BYTES)
    processed = 0
    if iterator.initialize():
        while True:
            shape = iterator.get()
            local = cache.get(shape.geometry.id)
            if local is None:
                local = indexed_mesh(shape.geometry)
                cache.put(shape.geometry.id, local)
            if local is not None:
                matrix = np.array(shape.transformation.matrix, dtype=np.float64).reshape(4, 4, order="F")
                consume(model.by_id(shape.id), transform_mesh(local, matrix))
            processed += 1
            report("progress", stage="tessellate", completed=processed, total=len(products))
            if not iterator.next():
                break
    # Products without a representation never reach the iterator.
    report("progress", stage="tessellate", completed=len(products), total=len(products))
    return {"shapes": processed, "uniqueGeometries": cache.misses, "reused": cache.hits}


class MeshCache:
    def __init__(self, budget):
        self.budget = budget
        self.size = 0
        self.items = OrderedDict()
        self.hits = 0
        self.misses = 0
        self.empty = set()

    def get(self, key):
        if key in self.empty:
            self.hits += 1
            return None
        mesh = self.items.get(key)
        if mesh is not None:
            self.items.move_to_end(key)
            self.hits += 1
        return mesh

    def put(self, key, mesh):
        self.misses += 1
        if mesh is None:
            self.empty.add(key)
            return
        size = mesh_bytes(mesh)
        self.items[key] = mesh
        self.size += size
        while self.size > self.budget and len(self.items) > 1:
            _, old = self.items.popitem(last=False)
            self.size -= mesh_bytes(old)


def mesh_bytes(parts):
    return sum(array.nbytes for part in parts if part is not None for array in part.values())


def indexed_mesh(geometry):
    """Split into opaque/transparent parts with flat normals and shared corners.

    Corners are merged when vertex, face normal and colour agree, so a box
    needs 24 vertices instead of 36. Returns ``[opaque, transparent]`` (each
    None or a dict of positions, normals, colors, indices) or None when the
    shape has no triangles.
    """
    faces = np.asarray(geometry.faces, dtype=np.int64).reshape(-1, 3)
    if len(faces) == 0:
        return None
    vertices = np.asarray(geometry.verts, dtype=np.float64).reshape(-1, 3)
    corners = vertices[faces]
    normals = normalized(np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0]))

    palette = np.array([material_color(material) for material in geometry.materials] or [DEFAULT_COLOR])
    palette = np.clip(np.round(palette * 255), 0, 255).astype(np.uint8)
    material_ids = np.asarray(geometry.material_ids, dtype=np.int64)
    if len(material_ids) != len(faces):
        material_ids = np.full(len(faces), -1)
    default = len(palette)
    palette = np.vstack([palette, np.clip(np.round(np.array(DEFAULT_COLOR) * 255), 0, 255).astype(np.uint8)])
    material_ids = np.where((material_ids >= 0) & (material_ids < default), material_ids, default)
    transparent = palette[material_ids, 3] < 255

    parts = []
    for mask in (~transparent, transparent):
        if not mask.any():
            parts.append(None)
            continue
        part_faces = faces[mask]
        face_normals = normals[mask]
        face_materials = material_ids[mask]
        keys = np.empty((len(part_faces) * 3, 5), dtype=np.int64)
        keys[:, 0] = part_faces.reshape(-1)
        keys[:, 1:4] = np.repeat(np.round(face_normals * NORMAL_KEY_SCALE).astype(np.int64), 3, axis=0)
        keys[:, 4] = np.repeat(face_materials, 3)
        view = np.ascontiguousarray(keys).view(np.dtype((np.void, keys.dtype.itemsize * keys.shape[1]))).ravel()
        _, first, inverse = np.unique(view, return_index=True, return_inverse=True)
        corner_normals = np.repeat(face_normals, 3, axis=0)
        parts.append({
            "positions": vertices[keys[first, 0]],
            "normals": corner_normals[first],
            "colors": palette[keys[first, 4]],
            "indices": inverse.reshape(-1, 3).astype(np.uint32),
        })
    return parts


def transform_mesh(parts, matrix):
    rotation = matrix[:3, :3]
    gram = rotation.T @ rotation
    scale = gram[0, 0]
    if np.abs(gram - np.diag((scale, scale, scale))).max() <= 1e-9 * max(scale, 1.0):
        # Rotation with uniform scale (the usual placement): normals rotate like positions.
        normal_matrix = rotation
    else:
        try:
            normal_matrix = np.linalg.inv(rotation).T
        except np.linalg.LinAlgError:
            normal_matrix = rotation
    result = []
    for part in parts:
        if part is None:
            result.append(None)
            continue
        result.append({
            "positions": part["positions"] @ rotation.T + matrix[:3, 3],
            "normals": normalized(part["normals"] @ normal_matrix.T),
            "colors": part["colors"],
            "indices": part["indices"],
        })
    return result


def normalized(vectors):
    lengths = np.sqrt(np.einsum("ij,ij->i", vectors, vectors))[:, None]
    return np.divide(vectors, lengths, out=np.zeros_like(vectors), where=lengths > 0)


def material_color(material):
    red, green, blue = material.diffuse.components
    transparency = material.transparency if material.transparency == material.transparency else 0.0
    return (red, green, blue, 1.0 - transparency)


class ElementWriter:
    """Append elements to the package files and keep only per-element rows."""

    def __init__(self, out_dir):
        self.out_dir = out_dir
        self.geometry = open(out_dir / "geometry.bin", "wb")
        self.properties = open(out_dir / "elements.jsonl", "wb")
        self.rows = []
        self.global_ids = []
        self.geometry_offset = 0
        self.properties_offset = 0
        self.low = np.full(3, np.inf)
        self.high = np.full(3, -np.inf)
        self.triangles = 0
        self.vertices = 0
        self.classes = Counter()
        self.storeys = Counter()
        self.base_counts = Counter()
        self.stats = {}

    @property
    def count(self):
        return len(self.rows)

    def add(self, product, parts, storey, properties):
        present = [part for part in parts if part is not None]
        low = np.min([part["positions"].min(axis=0) for part in present], axis=0)
        high = np.max([part["positions"].max(axis=0) for part in present], axis=0)
        offsets, vertex_counts, triangle_counts = [0, 0], [0, 0], [0, 0]
        for index, part in enumerate(parts):
            if part is None:
                continue
            offsets[index] = self.geometry_offset
            vertex_counts[index] = len(part["positions"])
            triangle_counts[index] = len(part["indices"])
            for data in (
                (part["positions"] - low).astype("<f4"),
                part["normals"].astype("<f4"),
                part["colors"].astype(np.uint8),
                part["indices"].astype("<u4"),
            ):
                buffer = np.ascontiguousarray(data).tobytes()
                self.geometry.write(buffer)
                self.geometry_offset += len(buffer)

        record = {
            "globalId": product.GlobalId,
            "ifcClass": product.is_a(),
            "name": product.Name,
            "storey": storey,
            "properties": properties,
        }
        line = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        self.properties.write(line)
        self.rows.append((
            product.GlobalId.encode("ascii", "replace")[:22], low, high,
            sum(triangle_counts), sum(vertex_counts), offsets, vertex_counts, triangle_counts,
            self.properties_offset, len(line),
        ))
        self.properties_offset += len(line)
        self.global_ids.append(product.GlobalId)
        self.low = np.minimum(self.low, low)
        self.high = np.maximum(self.high, high)
        self.triangles += sum(triangle_counts)
        self.vertices += sum(vertex_counts)
        self.classes[record["ifcClass"]] += 1
        self.storeys[storey or ""] += 1
        for field in ("name", "storey"):
            if record[field] not in (None, ""):
                self.base_counts[field] += 1
        for key, entry in properties.items():
            self.add_stat(key, entry)

    def add_stat(self, key, entry):
        stat = self.stats.get(key)
        if stat is None:
            stat = self.stats[key] = {"dataTypes": set(), "units": set(), "ifcTypes": set(), "count": 0,
                                      "intMin": None, "intMax": None}
        value = entry["value"]
        if entry.get("unit"):
            stat["units"].add(entry["unit"])
        if entry.get("ifcType"):
            stat["ifcTypes"].add(entry["ifcType"])
        if value is None or value == "":
            return
        stat["count"] += 1
        stat["dataTypes"].add(entry["dataType"])
        if entry["dataType"] == "integer":
            stat["intMin"] = value if stat["intMin"] is None else min(stat["intMin"], value)
            stat["intMax"] = value if stat["intMax"] is None else max(stat["intMax"], value)

    def column_stats(self):
        return {
            "base": {"name": self.base_counts["name"], "storey": self.base_counts["storey"]},
            "properties": {key: {**stat, "dataTypes": sorted(stat["dataTypes"]), "units": sorted(stat["units"]),
                                 "ifcTypes": sorted(stat["ifcTypes"])}
                           for key, stat in sorted(self.stats.items())},
        }

    def close(self):
        self.geometry.close()
        self.properties.close()
        rows = np.array(self.rows, dtype=ELEMENT_DTYPE) if self.rows else np.zeros(0, dtype=ELEMENT_DTYPE)
        np.save(self.out_dir / "elements.npy", rows, allow_pickle=False)


class StoreyIndex:
    """Storey name per product from containment and aggregation, cached per parent."""

    def __init__(self, model):
        self.parent = {}
        for relation in model.by_type("IfcRelContainedInSpatialStructure"):
            for element in relation.RelatedElements or []:
                self.parent[element.id()] = relation.RelatingStructure
        for relation in model.by_type("IfcRelAggregates"):
            for part in relation.RelatedObjects or []:
                self.parent.setdefault(part.id(), relation.RelatingObject)
        self.names = {}

    def name(self, product):
        chain = []
        node = self.parent.get(product.id())
        result = None
        while node is not None:
            if node.id() in self.names:
                result = self.names[node.id()]
                break
            if node.is_a("IfcBuildingStorey"):
                result = node.Name
                break
            chain.append(node.id())
            node = self.parent.get(node.id())
        for node_id in chain:
            self.names[node_id] = result
        return result


class PropertyIndex:
    """Property and quantity sets per product, parsing shared sets once."""

    def __init__(self, model):
        self.model = model
        self.definitions = {}
        usage = Counter()
        for relation in model.by_type("IfcRelDefinesByProperties"):
            definition = relation.RelatingPropertyDefinition
            # IFC4 allows a set of definitions in one relation.
            definitions = list(definition) if isinstance(definition, tuple) else [definition]
            for product in relation.RelatedObjects or []:
                self.definitions.setdefault(product.id(), []).extend(definitions)
            for item in definitions:
                usage[item.id()] += len(relation.RelatedObjects or [])
        self.types = {}
        for relation in model.by_type("IfcRelDefinesByType"):
            for product in relation.RelatedObjects or []:
                self.types[product.id()] = relation.RelatingType
        self.shared = {key for key, count in usage.items() if count > 1}
        self.cache = {}

    def collect(self, product):
        """Return ``{"Pset.Prop": typed value}`` with occurrence values overriding type values."""
        element_type = self.types.get(product.id())
        properties = {}
        for definition in getattr(element_type, "HasPropertySets", None) or []:
            properties.update(self.parse(definition, shared=True))
        for definition in self.definitions.get(product.id(), []):
            properties.update(self.parse(definition, shared=definition.id() in self.shared))
        return properties

    def parse(self, definition, shared):
        cached = self.cache.get(definition.id())
        if cached is not None:
            return cached
        values = {}
        if definition.is_a("IfcPropertySet"):
            for prop in definition.HasProperties or []:
                add_property(self.model, values, definition.Name, prop)
        elif definition.is_a("IfcElementQuantity"):
            for quantity in definition.Quantities or []:
                add_quantity(self.model, values, definition.Name, quantity)
        if shared:
            self.cache[definition.id()] = values
        return values


def add_property(model, properties, prefix, prop):
    key = f"{prefix}.{prop.Name}"
    if prop.is_a("IfcComplexProperty"):
        for part in prop.HasProperties or []:
            add_property(model, properties, key, part)
        return
    if prop.is_a("IfcPropertySingleValue"):
        nominal = prop.NominalValue
        value = nominal.wrappedValue if nominal is not None else None
        properties[key] = typed_value(value, nominal.is_a() if nominal is not None else None, unit_name(model, prop))
        return
    # Enumerated, list, bounded, table and reference values are kept as text in V1.
    properties[key] = typed_value(format_complex_value(prop), prop.is_a(), unit_name(model, prop), force_string=True)


def add_quantity(model, properties, prefix, quantity):
    key = f"{prefix}.{quantity.Name}"
    if quantity.is_a("IfcPhysicalComplexQuantity"):
        for part in quantity.HasQuantities or []:
            add_quantity(model, properties, key, part)
        return
    value = quantity[3] if quantity.is_a("IfcPhysicalSimpleQuantity") else None
    properties[key] = typed_value(value, quantity.is_a(), unit_name(model, quantity))


def typed_value(value, ifc_type, unit, force_string=False):
    if value is None:
        data_type = None
    elif force_string:
        data_type = "string"
    elif isinstance(value, bool):
        data_type = "boolean"
    elif isinstance(value, int):
        data_type = "integer"
    elif isinstance(value, float):
        data_type = "number"
    else:
        # IfcLogical UNKNOWN, IfcComplexNumber tuples and other rare values.
        data_type = "string"
        value = value if isinstance(value, str) else str(value)
    return {"value": value, "dataType": data_type, "ifcType": ifc_type, "unit": unit}


def format_complex_value(prop):
    if prop.is_a("IfcPropertyEnumeratedValue"):
        return "; ".join(str(v.wrappedValue) for v in prop.EnumerationValues or [])
    if prop.is_a("IfcPropertyListValue"):
        return "; ".join(str(v.wrappedValue) for v in prop.ListValues or [])
    if prop.is_a("IfcPropertyBoundedValue"):
        lower = prop.LowerBoundValue.wrappedValue if prop.LowerBoundValue else ""
        upper = prop.UpperBoundValue.wrappedValue if prop.UpperBoundValue else ""
        return f"{lower}..{upper}"
    if prop.is_a("IfcPropertyTableValue"):
        defining = [v.wrappedValue for v in prop.DefiningValues or []]
        defined = [v.wrappedValue for v in prop.DefinedValues or []]
        return "; ".join(f"{a}={b}" for a, b in zip(defining, defined))
    if prop.is_a("IfcPropertyReferenceValue"):
        reference = prop.PropertyReference
        if reference is None:
            return None
        return f"{reference.is_a()}:{getattr(reference, 'Name', None) or reference.id()}"
    return None


def unit_name(model, prop):
    try:
        unit = ifcopenshell.util.unit.get_property_unit(prop, model, use_cache=True)
    except Exception:
        # Some exporters write measures the unit lookup does not know; the value is still valid.
        return None
    if unit is None:
        return None
    try:
        return ifcopenshell.util.unit.get_full_unit_name(unit)
    except Exception:
        return getattr(unit, "Name", None) or unit.is_a()


def build_georeference(model, origin, unit_scale, requested, warn):
    """Describe how ``origin``-relative metres map to the earth.

    ``localToMap`` is a column-major 4x4 affine from origin-relative metres to
    map coordinates in map units, derived from IfcMapConversion (or the IFC2X3
    ePSet_MapConversion) through IfcOpenShell's own conversion helper.
    """
    mode = requested.get("mode", "auto")
    if mode == "local":
        return {"mode": "local", "requested": "local"}
    if mode == "anchor":
        return {"mode": "anchor", "requested": "anchor", "anchor": {
            "longitude": requested["longitude"],
            "latitude": requested["latitude"],
            "height": requested["height"],
        }}

    georeference = {"mode": "local", "requested": mode}
    site = next(iter(model.by_type("IfcSite")), None)
    if site is not None and site.RefLatitude and site.RefLongitude:
        georeference["site"] = {
            "latitude": ifcopenshell.util.geolocation.dms2dd(*site.RefLatitude),
            "longitude": ifcopenshell.util.geolocation.dms2dd(*site.RefLongitude),
            "elevation": (site.RefElevation or 0.0) * unit_scale,
        }
        georeference["mode"] = "site-reference"

    parameters = ifcopenshell.util.geolocation.get_helmert_transformation_parameters(model)
    crs = ifcopenshell.util.geolocation.get_crs(model) or {}
    if mode == "crs":
        override = requested["crs"]
        projected = parse_projected_crs(override)
        if crs.get("Name") and crs["Name"] != override:
            warn("IFC_CRS_OVERRIDDEN", f"文件声明的 CRS 为 {crs['Name']}，已按 {override} 处理")
        if parameters is None:
            georeference.update(projected_coordinates(override, projected, origin))
            return georeference
        crs = {"Name": override}
    elif parameters is None or not crs.get("Name"):
        if georeference["mode"] == "site-reference":
            warn("IFC_SITE_REFERENCE_APPROXIMATE", "只有 IfcSite 经纬度，定位为近似值，未应用真北方向")
        else:
            warn("IFC_NO_GEOREFERENCE", "文件没有地理参考，输出保留本地坐标")
        return georeference

    def to_map(point):
        x, y, z = (np.asarray(point) + origin) / unit_scale
        return np.array(ifcopenshell.util.geolocation.auto_xyz2enh(model, x, y, z))

    anchor = to_map((0.0, 0.0, 0.0))
    columns = [to_map(axis) - anchor for axis in np.eye(3)]
    matrix = np.eye(4)
    matrix[:3, 0], matrix[:3, 1], matrix[:3, 2] = columns
    matrix[:3, 3] = anchor
    map_unit = crs.get("MapUnit")
    georeference.update({
        "mode": "map-conversion",
        "source": "crs-override" if mode == "crs" else "ifc",
        "crs": {
            "name": crs.get("Name"),
            "description": crs.get("Description"),
            "geodeticDatum": crs.get("GeodeticDatum"),
            "verticalDatum": crs.get("VerticalDatum"),
            "mapUnit": ifcopenshell.util.unit.get_full_unit_name(map_unit) if hasattr(map_unit, "is_a") else map_unit,
        },
        "mapConversion": parameters._asdict(),
        "localToMap": matrix.flatten(order="F").tolist(),
    })
    return georeference


def parse_projected_crs(crs_name):
    from pyproj import CRS

    try:
        crs = CRS.from_user_input(crs_name)
    except Exception as error:
        raise ValueError(f"无法识别 CRS {crs_name}: {error}") from error
    if not crs.is_projected:
        raise ValueError(f"{crs_name} 不是投影坐标系")
    return crs


def projected_coordinates(crs_name, crs, origin):
    """IFC coordinates already are easting/northing/height in ``crs``.

    IFC geometry is in metres here, so easting and northing are scaled to the
    CRS axis unit. Heights stay in metres because the tiles writer treats them
    as ellipsoidal metres.
    """
    metres_per_unit = crs.axis_info[0].unit_conversion_factor
    matrix = np.eye(4)
    matrix[0, 0] = matrix[1, 1] = 1 / metres_per_unit
    matrix[:3, 3] = [origin[0] / metres_per_unit, origin[1] / metres_per_unit, origin[2]]
    return {
        "mode": "map-conversion",
        "source": "crs-override",
        "crs": {"name": crs_name, "description": crs.name, "mapUnit": crs.axis_info[0].unit_name},
        "mapConversion": None,
        "localToMap": matrix.flatten(order="F").tolist(),
    }
