"""Build the small IFC4 fixture used by the IFC spike tests.

The fixture is generated instead of committed so its license is unambiguous
(it is part of this repository) and its content stays readable as code.
GlobalIds are derived from fixed names, so repeated runs produce the same
element identities.
"""

import uuid

import ifcopenshell
import ifcopenshell.api.aggregate
import ifcopenshell.api.context
import ifcopenshell.api.geometry
import ifcopenshell.api.georeference
import ifcopenshell.api.project
import ifcopenshell.api.pset
import ifcopenshell.api.root
import ifcopenshell.api.spatial
import ifcopenshell.api.style
import ifcopenshell.api.unit
import ifcopenshell.guid
import ifcopenshell.util.element
import numpy as np

FIXTURE_NAMESPACE = uuid.UUID("5d4f8a0e-9c1b-4e55-9c63-2f6f2b7a1f10")

# HK1980 Grid; the values place the fixture in Hong Kong with a 30° rotation
# so georeferencing tests exercise translation and rotation together.
FIXTURE_CRS = "EPSG:2326"
FIXTURE_MAP_CONVERSION = {
    "Eastings": 836000.0,
    "Northings": 820000.0,
    "OrthogonalHeight": 5.0,
    "XAxisAbscissa": 0.8660254037844387,
    "XAxisOrdinate": 0.5,
    "Scale": 1.0,
}


def fixture_guid(name):
    return ifcopenshell.guid.compress(uuid.uuid5(FIXTURE_NAMESPACE, name).hex)


def build_fixture(path):
    model = ifcopenshell.api.project.create_file(version="IFC4")
    project = create(model, "IfcProject", "project", "GeoForge IFC Spike")
    metre = ifcopenshell.api.unit.add_si_unit(model, unit_type="LENGTHUNIT")
    ifcopenshell.api.unit.assign_unit(model, units=[
        metre,
        ifcopenshell.api.unit.add_si_unit(model, unit_type="AREAUNIT"),
        ifcopenshell.api.unit.add_si_unit(model, unit_type="VOLUMEUNIT"),
    ])
    context = ifcopenshell.api.context.add_context(model, context_type="Model")
    body = ifcopenshell.api.context.add_context(
        model, context_type="Model", context_identifier="Body", target_view="MODEL_VIEW", parent=context
    )
    ifcopenshell.api.georeference.add_georeferencing(model, name=FIXTURE_CRS)
    ifcopenshell.api.georeference.edit_georeferencing(
        model,
        coordinate_operation=FIXTURE_MAP_CONVERSION,
        projected_crs={"Name": FIXTURE_CRS, "Description": "Hong Kong 1980 Grid System", "MapUnit": metre},
    )

    site = create(model, "IfcSite", "site", "Fixture Site")
    building = create(model, "IfcBuilding", "building", "Fixture Building")
    ground = create(model, "IfcBuildingStorey", "storey-1f", "1F")
    upper = create(model, "IfcBuildingStorey", "storey-2f", "2F")
    ifcopenshell.api.aggregate.assign_object(model, products=[site], relating_object=project)
    ifcopenshell.api.aggregate.assign_object(model, products=[building], relating_object=site)
    ifcopenshell.api.aggregate.assign_object(model, products=[ground, upper], relating_object=building)
    place(model, upper, z=3.0)

    concrete = create_style(model, "Concrete", (0.75, 0.75, 0.72), 0.0)
    brick = create_style(model, "Brick", (0.70, 0.35, 0.25), 0.0)
    glass = create_style(model, "Glass", (0.45, 0.70, 0.90), 0.6)

    walls = [
        ("wall-south", "South Wall", (0.0, 0.0), 0.0, 10.0),
        ("wall-east", "East Wall", (10.0, 0.0), 90.0, 6.0),
        ("wall-north", "North Wall", (10.0, 6.0), 180.0, 10.0),
        ("wall-west", "West Wall", (0.0, 6.0), 270.0, 6.0),
    ]
    for key, name, (x, y), angle, length in walls:
        wall = create(model, "IfcWall", key, name)
        representation = ifcopenshell.api.geometry.add_wall_representation(
            model, context=body, length=length, height=3.0, thickness=0.2
        )
        assign_geometry(model, wall, representation, brick, ground, x=x, y=y, angle=angle)
        add_pset(model, wall, "Pset_WallCommon", {"IsExternal": True, "FireRating": "REI60"})
        add_qto(model, wall, "Qto_WallBaseQuantities", {"Length": length, "Height": 3.0})

    # GF_Custom is the custom (non-Pset_) property set the spike must keep with types.
    south = model.by_guid(fixture_guid("wall-south"))
    add_pset(model, south, "GF_Custom", {
        "AssetCode": "GF-W-001",
        "DesignLoad": 12.5,
        "InstallYear": 2026,
        "Inspected": True,
    })
    east = model.by_guid(fixture_guid("wall-east"))
    add_pset(model, east, "GF_Custom", {"AssetCode": "GF-W-002", "Inspected": False})
    add_enumerated_property(model, east, "GF_Custom", "Finish", ["Painted", "Plastered"])

    for key, name, storey, depth, style in [
        ("slab-1f", "Ground Slab", ground, 0.2, concrete),
        ("slab-2f", "Upper Slab", upper, 0.2, concrete),
    ]:
        slab = create(model, "IfcSlab", key, name)
        representation = ifcopenshell.api.geometry.add_slab_representation(
            model, context=body, depth=depth, polyline=[(0.0, 0.0), (10.0, 0.0), (10.0, 6.0), (0.0, 6.0)]
        )
        assign_geometry(model, slab, representation, style, storey, z=-depth if storey is ground else 0.0)

    window = create(model, "IfcWindow", "window-south", "South Window")
    representation = ifcopenshell.api.geometry.add_wall_representation(
        model, context=body, length=2.0, height=1.2, thickness=0.05
    )
    assign_geometry(model, window, representation, glass, ground, x=4.0, y=-0.05, z=1.0)
    add_pset(model, window, "GF_Custom", {"AssetCode": "GF-WIN-001", "DesignLoad": 0.8})

    model.write(str(path))
    return path


def create(model, ifc_class, key, name):
    entity = ifcopenshell.api.root.create_entity(model, ifc_class=ifc_class, name=name)
    entity.GlobalId = fixture_guid(key)
    return entity


def place(model, product, x=0.0, y=0.0, z=0.0, angle=0.0):
    radians = np.radians(angle)
    matrix = np.eye(4)
    matrix[:2, :2] = [[np.cos(radians), -np.sin(radians)], [np.sin(radians), np.cos(radians)]]
    matrix[:3, 3] = [x, y, z]
    ifcopenshell.api.geometry.edit_object_placement(model, product=product, matrix=matrix)


def assign_geometry(model, product, representation, style, storey, x=0.0, y=0.0, z=0.0, angle=0.0):
    ifcopenshell.api.geometry.assign_representation(model, product=product, representation=representation)
    ifcopenshell.api.style.assign_representation_styles(model, shape_representation=representation, styles=[style])
    ifcopenshell.api.spatial.assign_container(model, products=[product], relating_structure=storey)
    storey_z = storey.ObjectPlacement.RelativePlacement.Location.Coordinates[2] if storey.ObjectPlacement else 0.0
    place(model, product, x=x, y=y, z=storey_z + z, angle=angle)


def create_style(model, name, color, transparency):
    style = ifcopenshell.api.style.add_style(model, name=name)
    ifcopenshell.api.style.add_surface_style(model, style=style, ifc_class="IfcSurfaceStyleShading", attributes={
        "SurfaceColour": {"Name": None, "Red": color[0], "Green": color[1], "Blue": color[2]},
        "Transparency": transparency,
    })
    return style


def add_pset(model, product, name, properties):
    pset = ifcopenshell.api.pset.add_pset(model, product=product, name=name)
    ifcopenshell.api.pset.edit_pset(model, pset=pset, properties=properties)


def add_qto(model, product, name, quantities):
    qto = ifcopenshell.api.pset.add_qto(model, product=product, name=name)
    ifcopenshell.api.pset.edit_qto(model, qto=qto, properties=quantities)


def add_enumerated_property(model, product, pset_name, name, values):
    pset = model.by_id(ifcopenshell.util.element.get_pset(product, pset_name)["id"])
    labels = [model.create_entity("IfcLabel", value) for value in values]
    prop = model.create_entity("IfcPropertyEnumeratedValue", Name=name, EnumerationValues=labels)
    pset.HasProperties = list(pset.HasProperties) + [prop]
