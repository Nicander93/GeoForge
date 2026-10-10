"""Export an IFC file into the GeoForge IFC exchange package.

Package layout (format "geoforge-ifc-exchange", version 1):

  manifest.json  element identities, typed properties, georeference, geometry layout
  geometry.bin   float32 positions, float32 normals, uint8 RGBA colors, one vertex per
                 triangle corner (flat shading, no index buffer)

Coordinates are IFC world coordinates in metres, Z up, relative to
``manifest.origin`` so float32 keeps millimetre precision far from the project
origin. The tiles writer reads only this package, which keeps it free of any
IfcOpenShell dependency and lets the processor reimplement it later.
"""

import hashlib
import json
import multiprocessing
from pathlib import Path

import numpy as np

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.ifcopenshell_wrapper
import ifcopenshell.util.element
import ifcopenshell.util.geolocation
import ifcopenshell.util.unit

EXCHANGE_FORMAT = "geoforge-ifc-exchange"
EXCHANGE_VERSION = 1
DEFAULT_COLOR = (0.8, 0.8, 0.8, 1.0)
# Openings and spaces would hide real elements or duplicate their volume.
SKIPPED_CLASSES = ("IfcFeatureElementSubtraction", "IfcVirtualElement", "IfcSpace")


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

    report("stage", stage="tessellate", message=f"三角化 {len(products)} 个构件")
    meshes = tessellate(model, products, threads or multiprocessing.cpu_count(), report)

    elements = []
    without_geometry = []
    for product in products:
        mesh = meshes.get(product.id())
        if mesh is None:
            without_geometry.append(product.GlobalId)
            continue
        elements.append((product, mesh))
    if not elements:
        raise ValueError(f"{ifc_path.name} 中没有可三角化的 IFC 构件")
    if without_geometry:
        warn("IFC_ELEMENTS_WITHOUT_GEOMETRY", f"{len(without_geometry)} 个构件没有可显示的几何体，已跳过")

    all_positions = np.concatenate([mesh["positions"] for _, mesh in elements])
    low, high = all_positions.min(axis=0), all_positions.max(axis=0)
    origin = np.array([(low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]])

    report("stage", stage="properties", message="读取属性集")
    unit_scale = ifcopenshell.util.unit.calculate_unit_scale(model)
    records = []
    vertex_offset = 0
    for index, (product, mesh) in enumerate(elements, start=1):
        vertex_count = len(mesh["positions"])
        records.append({
            "globalId": product.GlobalId,
            "ifcClass": product.is_a(),
            "name": product.Name,
            "storey": find_storey_name(product),
            "properties": collect_properties(model, product),
            "mesh": {"vertexOffset": vertex_offset, "vertexCount": vertex_count},
        })
        vertex_offset += vertex_count
        report("progress", stage="properties", completed=index, total=len(elements))

    write_geometry(out_dir / "geometry.bin", elements, origin)
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
        "coordinates": "IFC world coordinates, metres, Z up, relative to origin",
        "origin": origin.tolist(),
        "bounds": {"min": (low - origin).tolist(), "max": (high - origin).tolist()},
        "georeference": build_georeference(model, origin, unit_scale, georeference, warn),
        "geometry": {
            "uri": "geometry.bin",
            "vertexCount": vertex_offset,
            "positions": {"byteOffset": 0, "componentType": "float32", "components": 3},
            "normals": {"byteOffset": vertex_offset * 12, "componentType": "float32", "components": 3},
            "colors": {"byteOffset": vertex_offset * 24, "componentType": "uint8", "components": 4},
        },
        "elements": records,
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


def tessellate(model, products, threads, report):
    settings = ifcopenshell.geom.settings()
    settings.set("use-world-coords", True)
    iterator = ifcopenshell.geom.iterator(settings, model, threads, include=products)
    meshes = {}
    if iterator.initialize():
        processed = 0
        while True:
            shape = iterator.get()
            mesh = unweld_triangles(shape.geometry)
            if mesh is not None:
                meshes[shape.id] = mesh
            processed += 1
            report("progress", stage="tessellate", completed=processed, total=len(products))
            if not iterator.next():
                break
    # Products without a representation never reach the iterator.
    report("progress", stage="tessellate", completed=len(products), total=len(products))
    return meshes


def unweld_triangles(geometry):
    faces = np.asarray(geometry.faces, dtype=np.int64).reshape(-1, 3)
    if len(faces) == 0:
        return None
    vertices = np.asarray(geometry.verts, dtype=np.float64).reshape(-1, 3)
    positions = vertices[faces.reshape(-1)]

    corners = positions.reshape(-1, 3, 3)
    normals = np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0])
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    normals = np.divide(normals, lengths, out=np.zeros_like(normals), where=lengths > 0)
    normals = np.repeat(normals, 3, axis=0)

    palette = [material_color(material) for material in geometry.materials]
    material_ids = np.asarray(geometry.material_ids, dtype=np.int64)
    colors = np.array([palette[i] if 0 <= i < len(palette) else DEFAULT_COLOR for i in material_ids])
    colors = np.repeat(colors, 3, axis=0)
    return {"positions": positions, "normals": normals, "colors": colors}


def material_color(material):
    red, green, blue = material.diffuse.components
    transparency = material.transparency if material.transparency == material.transparency else 0.0
    return (red, green, blue, 1.0 - transparency)


def write_geometry(path, elements, origin):
    positions = np.concatenate([mesh["positions"] for _, mesh in elements]) - origin
    normals = np.concatenate([mesh["normals"] for _, mesh in elements])
    colors = np.concatenate([mesh["colors"] for _, mesh in elements])
    with open(path, "wb") as file:
        file.write(positions.astype("<f4").tobytes())
        file.write(normals.astype("<f4").tobytes())
        file.write(np.clip(np.round(colors * 255), 0, 255).astype(np.uint8).tobytes())


def find_storey_name(product):
    parent = ifcopenshell.util.element.get_container(product) or ifcopenshell.util.element.get_aggregate(product)
    while parent is not None:
        if parent.is_a("IfcBuildingStorey"):
            return parent.Name
        parent = ifcopenshell.util.element.get_aggregate(parent) or ifcopenshell.util.element.get_container(parent)
    return None


def collect_properties(model, product):
    """Return ``{"Pset.Prop": typed value}`` with occurrence values overriding type values."""
    definitions = []
    element_type = ifcopenshell.util.element.get_type(product)
    if element_type is not None:
        definitions += list(element_type.HasPropertySets or [])
    for relation in getattr(product, "IsDefinedBy", None) or []:
        if relation.is_a("IfcRelDefinesByProperties"):
            definition = relation.RelatingPropertyDefinition
            # IFC4 allows a set of definitions in one relation.
            definitions += list(definition) if isinstance(definition, tuple) else [definition]

    properties = {}
    for definition in definitions:
        if definition.is_a("IfcPropertySet"):
            for prop in definition.HasProperties or []:
                add_property(model, properties, definition.Name, prop)
        elif definition.is_a("IfcElementQuantity"):
            for quantity in definition.Quantities or []:
                add_quantity(model, properties, definition.Name, quantity)
    return properties


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
