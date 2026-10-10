import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Two flat squares as a 3D Tiles 1.1 tileset with EXT_mesh_features and
 * EXT_structural_metadata, written without tools/ifc. The property panel must
 * work on this as well as on IFC output.
 */
export const metadataFeatures = [
  { IfcClass: 'IfcSlab', Storey: '1F', Name: 'Slab A', rating: 'A1', height: 0.25, x: 0 },
  { IfcClass: 'IfcRoof', Storey: '', Name: 'Roof B', rating: '', height: 0.3, x: 1.4 },
];

function align(buffer, size) {
  const padding = (size - (buffer.length % size)) % size;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding)]) : buffer;
}

export async function createMetadataFixture(root, name = 'metadata') {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  const chunks = [];
  const bufferViews = [];
  let length = 0;
  const view = (bytes) => {
    const data = align(bytes, 8);
    bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
    chunks.push(data);
    length += data.length;
    return bufferViews.length - 1;
  };
  const floats = (values) => Buffer.from(new Float32Array(values).buffer);

  const positions = [];
  const featureIds = [];
  metadataFeatures.forEach((feature, id) => {
    const [x0, x1] = [feature.x, feature.x + 1];
    for (const [x, y] of [[x0, 0], [x1, 0], [x1, 1], [x0, 0], [x1, 1], [x0, 1]]) {
      positions.push(x, y, 0);
      featureIds.push(id);
    }
  });
  const strings = (values) => {
    const encoded = values.map((value) => Buffer.from(value, 'utf8'));
    const offsets = new Uint32Array(values.length + 1);
    encoded.forEach((bytes, i) => { offsets[i + 1] = offsets[i] + bytes.length; });
    return { values: view(Buffer.concat(encoded)), stringOffsets: view(Buffer.from(offsets.buffer)) };
  };
  const column = (field) => strings(metadataFeatures.map((feature) => feature[field]));
  const positionView = view(floats(positions));
  const featureIdView = view(floats(featureIds));
  const properties = {
    IfcClass: column('IfcClass'),
    Storey: column('Storey'),
    Name: column('Name'),
    Pset_Test_Rating: column('rating'),
    height: { values: view(Buffer.from(new Float64Array(metadataFeatures.map((f) => f.height)).buffer)) },
  };
  const binary = Buffer.concat(chunks);

  const gltf = {
    asset: { version: '2.0', generator: 'GeoForge metadata fixture' },
    extensionsUsed: ['EXT_mesh_features', 'EXT_structural_metadata'],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.75, 0.75, 0.72, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    meshes: [{ primitives: [{
      attributes: { POSITION: 0, _FEATURE_ID_0: 1 },
      material: 0,
      extensions: { EXT_mesh_features: { featureIds: [{ featureCount: metadataFeatures.length, attribute: 0, propertyTable: 0 }] } },
    }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews,
    accessors: [
      { bufferView: positionView, componentType: 5126, count: positions.length / 3, type: 'VEC3',
        min: [0, 0, 0], max: [Math.max(...positions.filter((_, i) => i % 3 === 0)), 1, 0] },
      { bufferView: featureIdView, componentType: 5126, count: featureIds.length, type: 'SCALAR' },
    ],
    extensions: {
      EXT_structural_metadata: {
        schema: {
          id: 'fixture',
          classes: {
            element: {
              properties: {
                IfcClass: { type: 'STRING', name: 'IfcClass', required: true },
                Storey: { type: 'STRING', name: 'Storey', required: true },
                Name: { type: 'STRING', name: 'Name', required: true },
                Pset_Test_Rating: { type: 'STRING', name: 'Pset_Test.Rating', noData: '' },
                height: { type: 'SCALAR', componentType: 'FLOAT64', name: 'height', required: true },
              },
            },
          },
        },
        propertyTables: [{ class: 'element', count: metadataFeatures.length, properties }],
      },
    },
  };
  const json = Buffer.from(JSON.stringify(gltf));
  const text = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + text.length + binary.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.write('JSON', 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  await writeFile(join(dir, 'tile.glb'), Buffer.concat([header, text, binHeader, binary]));
  // Local x east, y north, z up at 0°N 0°E, scaled to 10 m per unit.
  const transform = [0, 10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 6378137, 0, 0, 1];
  await writeFile(join(dir, 'tileset.json'), JSON.stringify({
    asset: { version: '1.1' },
    geometricError: 8,
    root: { boundingVolume: { box: [1.2, 0.5, 0, 1.2, 0, 0, 0, 0.5, 0, 0, 0, 0.1] }, geometricError: 0,
      refine: 'REPLACE', transform, content: { uri: 'tile.glb' } },
  }, null, 2));
  return dir;
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  console.log(await createMetadataFixture(resolve(process.argv[2] || '../../.cache/metadata-fixture')));
}
