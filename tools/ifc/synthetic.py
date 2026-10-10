"""Generate large synthetic IFC4 buildings for scale tests and benchmarks.

``build_synthetic(path, elements=10000)`` writes a multi-storey office-like
grid: one large slab per storey, perimeter walls, columns and beams on a 6 m
grid, partitions, doors, windows, furniture and lights. Columns, beams, doors,
windows, furniture and lights reuse a few IfcRepresentationMaps through
IfcMappedItem, the way authoring tools export repeated types; slabs and walls
have their own geometry. Every element has an occurrence property set with a
unique AssetCode and some deliberately missing values, plus shared type sets.

Entities are created with ``create_entity`` instead of ``ifcopenshell.api``,
which is too slow for 100k elements. Output is deterministic for a seed.
"""

import random
import uuid

import ifcopenshell
import ifcopenshell.guid

SYNTHETIC_NAMESPACE = uuid.UUID("0b8f2a4e-3d61-4c1f-9a7e-5e2d4b6c8a10")
BAY = 6.0
STOREY_HEIGHT = 3.6
# Elements per bay and storey: column, 2 beams, partition, door, 4 furniture,
# 2 lights and a window on perimeter bays. Sizes the grid for a target count.
PER_BAY = 11.4


def synthetic_guid(key):
    return ifcopenshell.guid.compress(uuid.uuid5(SYNTHETIC_NAMESPACE, key).hex)


class Builder:
    def __init__(self, seed):
        self.model = ifcopenshell.file(schema="IFC4")
        self.random = random.Random(seed)
        self.count = 0
        model = self.model
        self.origin = model.createIfcCartesianPoint((0.0, 0.0, 0.0))
        self.z_axis = model.createIfcDirection((0.0, 0.0, 1.0))
        self.x_axis = model.createIfcDirection((1.0, 0.0, 0.0))
        self.identity = model.createIfcAxis2Placement3D(self.origin, None, None)
        self.owner = self.create_owner_history()
        self.context = model.createIfcGeometricRepresentationContext(None, "Model", 3, 1e-5, self.identity, None)
        self.body = model.createIfcGeometricRepresentationSubContext(
            "Body", "Model", None, None, None, None, self.context, None, "MODEL_VIEW", None)
        self.styles = {}

    def create_owner_history(self):
        model = self.model
        person = model.createIfcPerson(None, None, "GeoForge", None, None, None, None, None)
        organization = model.createIfcOrganization(None, "GeoForge", None, None, None)
        user = model.createIfcPersonAndOrganization(person, organization, None)
        application = model.createIfcApplication(organization, "1", "GeoForge synthetic", "geoforge-synthetic")
        return model.createIfcOwnerHistory(user, application, None, "ADDED", None, None, None, 0)

    def root(self, ifc_class, key, name, **attributes):
        return self.model.create_entity(
            ifc_class, GlobalId=synthetic_guid(key), OwnerHistory=self.owner, Name=name, **attributes)

    def style(self, name, color, transparency=0.0):
        if name not in self.styles:
            model = self.model
            rendering = model.createIfcSurfaceStyleRendering(
                model.createIfcColourRgb(None, *color), transparency, None, None, None, None, None, None, "FLAT")
            self.styles[name] = model.createIfcSurfaceStyle(name, "BOTH", [rendering])
        return self.styles[name]

    def box_solid(self, x, y, z, style, centered=True):
        """Extruded rectangle; the profile is centred in plan, the base at z = 0."""
        model = self.model
        position = model.createIfcAxis2Placement2D(
            model.createIfcCartesianPoint((0.0, 0.0) if centered else (x / 2, y / 2)), None)
        profile = model.createIfcRectangleProfileDef("AREA", None, position, x, y)
        solid = model.createIfcExtrudedAreaSolid(profile, self.identity, self.z_axis, z)
        model.createIfcStyledItem(solid, [self.style(*style)], None)
        return solid

    def shape(self, items, kind="SweptSolid"):
        return self.model.createIfcShapeRepresentation(self.body, "Body", kind, items)

    def mapped_type(self, ifc_class, key, name, solid, psets):
        model = self.model
        mapping = model.createIfcRepresentationMap(self.identity, self.shape([solid]))
        element_type = self.root(ifc_class, f"type-{key}", name, RepresentationMaps=[mapping])
        element_type.PredefinedType = "NOTDEFINED"
        element_type.HasPropertySets = [self.pset(f"type-pset-{key}-{i}", pset_name, values)
                                        for i, (pset_name, values) in enumerate(psets)]
        return element_type, mapping

    def placement(self, relative_to, x, y, z, angle_x_axis=None):
        model = self.model
        axis = model.createIfcAxis2Placement3D(
            model.createIfcCartesianPoint((x, y, z)), self.z_axis if angle_x_axis else None,
            model.createIfcDirection(angle_x_axis) if angle_x_axis else None)
        return model.createIfcLocalPlacement(relative_to, axis)

    def product(self, ifc_class, key, name, placement, representation):
        model = self.model
        shape = model.createIfcProductDefinitionShape(None, None, [representation])
        self.count += 1
        return self.root(ifc_class, key, name, ObjectPlacement=placement, Representation=shape)

    def mapped(self, mapping):
        model = self.model
        operator = model.createIfcCartesianTransformationOperator3D(None, None, self.origin, None, None)
        return self.shape([model.createIfcMappedItem(mapping, operator)], "MappedRepresentation")

    def pset(self, key, name, values):
        model = self.model
        properties = []
        for prop_name, value in values.items():
            if value is None:
                continue
            if isinstance(value, bool):
                wrapped = model.createIfcBoolean(value)
            elif isinstance(value, int):
                wrapped = model.createIfcInteger(value)
            elif isinstance(value, float):
                wrapped = model.createIfcReal(value)
            else:
                wrapped = model.createIfcLabel(value)
            properties.append(model.createIfcPropertySingleValue(prop_name, None, wrapped, None))
        return model.create_entity("IfcPropertySet", GlobalId=synthetic_guid(key), OwnerHistory=self.owner,
                                   Name=name, HasProperties=properties)


def build_synthetic(path, elements=10000, storeys=None, seed=1):
    """Write a synthetic building with about ``elements`` products and return a summary."""
    storeys = storeys or max(2, min(40, round(elements / 2500)))
    bays = max(1, round(elements / storeys / PER_BAY))
    columns_x = max(1, round(bays ** 0.5))
    columns_y = max(1, -(-bays // columns_x))
    builder = Builder(seed)
    model = builder.model
    rng = builder.random

    project = builder.root("IfcProject", "project", "GeoForge Synthetic",
                           RepresentationContexts=[builder.context])
    project.UnitsInContext = model.createIfcUnitAssignment([
        model.createIfcSIUnit(None, "LENGTHUNIT", None, "METRE"),
        model.createIfcSIUnit(None, "AREAUNIT", None, "SQUARE_METRE"),
        model.createIfcSIUnit(None, "VOLUMEUNIT", None, "CUBIC_METRE"),
    ])
    site_placement = builder.placement(None, 0.0, 0.0, 0.0)
    site = builder.root("IfcSite", "site", "Synthetic Site", ObjectPlacement=site_placement)
    building = builder.root("IfcBuilding", "building", "Synthetic Building",
                            ObjectPlacement=builder.placement(site_placement, 0.0, 0.0, 0.0))
    model.createIfcRelAggregates(synthetic_guid("agg-project"), builder.owner, None, None, project, [site])
    model.createIfcRelAggregates(synthetic_guid("agg-site"), builder.owner, None, None, site, [building])

    concrete = ("Concrete", (0.75, 0.75, 0.72))
    steel = ("Steel", (0.45, 0.47, 0.52))
    brick = ("Brick", (0.70, 0.35, 0.25))
    plaster = ("Plaster", (0.92, 0.91, 0.86))
    wood = ("Wood", (0.60, 0.42, 0.25))
    glass = ("Glass", (0.45, 0.70, 0.90), 0.6)
    light = ("Light", (1.0, 0.95, 0.75))

    types = {
        "column": builder.mapped_type("IfcColumnType", "column", "C400", builder.box_solid(0.4, 0.4, STOREY_HEIGHT, concrete),
                                      [("Pset_ColumnCommon", {"LoadBearing": True, "Reference": "C400"})]),
        "beam": builder.mapped_type("IfcBeamType", "beam", "HEA300", builder.box_solid(BAY, 0.3, 0.3, steel, centered=False),
                                    [("Pset_BeamCommon", {"LoadBearing": True, "Span": BAY})]),
        "door": builder.mapped_type("IfcDoorType", "door", "D90", builder.box_solid(0.9, 0.08, 2.1, wood),
                                    [("Pset_DoorCommon", {"FireRating": "EI30", "IsExternal": False})]),
        "window": builder.mapped_type("IfcWindowType", "window", "W150", builder.box_solid(1.5, 0.06, 1.4, glass),
                                      [("Pset_WindowCommon", {"IsExternal": True, "ThermalTransmittance": 1.1})]),
        "desk": builder.mapped_type("IfcFurnitureType", "desk", "Desk 160", builder.box_solid(1.6, 0.8, 0.75, wood),
                                    [("Pset_FurnitureTypeCommon", {"Style": "Desk"})]),
        "chair": builder.mapped_type("IfcFurnitureType", "chair", "Chair", builder.box_solid(0.5, 0.5, 0.9, wood),
                                     [("Pset_FurnitureTypeCommon", {"Style": "Chair"})]),
        "light": builder.mapped_type("IfcLightFixtureType", "light", "Panel 60", builder.box_solid(0.6, 0.6, 0.05, light),
                                     [("Pset_LightFixtureTypeCommon", {"NumberOfSources": 4})]),
    }
    occurrences = {name: [] for name in types}

    width, depth = columns_x * BAY, columns_y * BAY
    zones = ["North", "South", "East", "West", "Core"]
    occurrence_psets = []

    def add(ifc_class, key, name, placement, representation, type_name=None, extra=None):
        product = builder.product(ifc_class, key, name, placement, representation)
        if type_name:
            occurrences[type_name].append(product)
        values = {
            "AssetCode": f"SYN-{builder.count:06d}",
            "Zone": rng.choice(zones),
            # Sparse on purpose: tiles must encode noData for these.
            "DesignLoad": round(rng.uniform(0.5, 25.0), 2) if rng.random() < 0.7 else None,
            "InstallYear": rng.randint(1990, 2026) if rng.random() < 0.8 else None,
            "Inspected": rng.random() < 0.5 if rng.random() < 0.6 else None,
        }
        values.update(extra or {})
        occurrence_psets.append((product, builder.pset(f"pset-{key}", "GF_Synthetic", values)))
        return product

    storey_entities = []
    for level in range(storeys):
        elevation = level * STOREY_HEIGHT
        storey_placement = builder.placement(building.ObjectPlacement, 0.0, 0.0, elevation)
        storey = builder.root("IfcBuildingStorey", f"storey-{level}", f"L{level + 1:02d}",
                              ObjectPlacement=storey_placement, Elevation=elevation)
        storey_entities.append(storey)
        contained = []

        def at(x, y, z=0.0, direction=None, storey_placement=storey_placement):
            return builder.placement(storey_placement, x, y, z, direction)

        slab = builder.box_solid(width, depth, 0.25, concrete, centered=False)
        contained.append(add("IfcSlab", f"slab-{level}", f"Slab L{level + 1:02d}", at(0.0, 0.0, -0.25),
                             builder.shape([slab]), extra={"Area": width * depth}))
        for side, (x, y, length, direction) in enumerate([
            (width / 2, 0.0, width, None), (width / 2, depth, width, None),
            (0.0, depth / 2, depth, (0.0, 1.0, 0.0)), (width, depth / 2, depth, (0.0, 1.0, 0.0)),
        ]):
            wall = builder.box_solid(length, 0.3, STOREY_HEIGHT, brick)
            contained.append(add("IfcWall", f"facade-{level}-{side}", f"Facade {side + 1}", at(x, y, 0.0, direction),
                                 builder.shape([wall]), extra={"Length": length}))

        for ix in range(columns_x):
            for iy in range(columns_y):
                bay_key = f"{level}-{ix}-{iy}"
                x0, y0 = ix * BAY, iy * BAY
                contained.append(add("IfcColumn", f"column-{bay_key}", "Column", at(x0 + 0.2, y0 + 0.2),
                                     builder.mapped(types["column"][1]), "column"))
                contained.append(add("IfcBeam", f"beam-x-{bay_key}", "Beam X", at(x0, y0 + 0.05, STOREY_HEIGHT - 0.3),
                                     builder.mapped(types["beam"][1]), "beam"))
                contained.append(add("IfcBeam", f"beam-y-{bay_key}", "Beam Y",
                                     at(x0 + 0.35, y0, STOREY_HEIGHT - 0.3, (0.0, 1.0, 0.0)),
                                     builder.mapped(types["beam"][1]), "beam"))
                length = round(rng.uniform(1.5, BAY - 0.6), 2)
                partition = builder.box_solid(length, 0.1, STOREY_HEIGHT - 0.3, plaster)
                contained.append(add("IfcWall", f"partition-{bay_key}", "Partition",
                                     at(x0 + BAY / 2, y0 + BAY / 2), builder.shape([partition]), extra={"Length": length}))
                contained.append(add("IfcDoor", f"door-{bay_key}", "Door", at(x0 + BAY / 2 - 1.0, y0 + BAY / 2 + 0.6),
                                     builder.mapped(types["door"][1]), "door"))
                if ix in (0, columns_x - 1) or iy in (0, columns_y - 1):
                    contained.append(add("IfcWindow", f"window-{bay_key}", "Window", at(x0 + BAY / 2, y0 + 0.4, 0.9),
                                         builder.mapped(types["window"][1]), "window"))
                for n in range(2):
                    contained.append(add("IfcFurniture", f"desk-{bay_key}-{n}", "Desk",
                                         at(x0 + 1.5 + n * 2.5, y0 + 2.0), builder.mapped(types["desk"][1]), "desk"))
                    contained.append(add("IfcFurniture", f"chair-{bay_key}-{n}", "Chair",
                                         at(x0 + 1.5 + n * 2.5, y0 + 2.9), builder.mapped(types["chair"][1]), "chair"))
                for n in range(2):
                    contained.append(add("IfcLightFixture", f"light-{bay_key}-{n}", "Light",
                                         at(x0 + 2.0 + n * 2.0, y0 + 4.0, STOREY_HEIGHT - 0.4),
                                         builder.mapped(types["light"][1]), "light"))
        model.createIfcRelContainedInSpatialStructure(
            synthetic_guid(f"contained-{level}"), builder.owner, None, None, contained, storey)

    model.createIfcRelAggregates(synthetic_guid("agg-building"), builder.owner, None, None, building, storey_entities)
    for name, (element_type, _) in types.items():
        if occurrences[name]:
            model.createIfcRelDefinesByType(synthetic_guid(f"type-rel-{name}"), builder.owner, None, None,
                                            occurrences[name], element_type)
    for product, pset in occurrence_psets:
        model.createIfcRelDefinesByProperties(synthetic_guid(f"pset-rel-{product.GlobalId}"), builder.owner,
                                              None, None, [product], pset)
    model.write(str(path))
    return {"path": str(path), "elements": builder.count, "storeys": storeys,
            "grid": [columns_x, columns_y], "size": [width, depth, storeys * STOREY_HEIGHT]}
