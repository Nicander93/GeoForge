export type TaskStatus =
  | 'queued'
  | 'running'
  | 'cancelling'
  | 'succeeded'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export type TaskStage =
  | 'queued'
  | 'scan'
  | 'convert'
  | 'rebuild'
  | 'texture'
  | 'check'
  | 'done'
  | 'cancelled'
  | 'failed'
  | 'interrupted';

export interface TaskStageInfo {
  id: TaskStage | string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  message?: string;
}

export interface TaskProgressDetail {
  completed?: number;
  total?: number;
  stage?: string;
  message?: string;
  parallelism?: number;
  resourceWait?: boolean;
  /** 0..1 task-wide progress from the processor. */
  overall?: number;
  /** 0..1 progress within the current stage. */
  stagePercent?: number;
  unit?: string;
  phase?: string;
  indeterminate?: boolean;
  plan?: Array<{ stage?: string; weight?: number }>;
  errorCode?: string;
  errorMessage?: string;
  failedStage?: string;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  name: string;
  taskName?: string;
  operation: string;
  status: TaskStatus;
  input: string;
  output: string;
  options?: Record<string, unknown>;
  progress?: number | TaskProgressDetail;
  stage?: string;
  stages?: TaskStageInfo[];
  log?: string;
  logPath?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  message?: string;
  error?: string;
  artifactId?: string;
  artifactPath?: string;
}

export interface ApiTask {
  id: string;
  operation: string;
  status: string;
  taskName?: string;
  input?: { path?: string } | string;
  output?: { path?: string } | string;
  options?: Record<string, unknown>;
  stage?: string;
  progress?: Record<string, unknown> | number;
  log?: string;
  logPath?: string;
  error?: string | null;
  createdAt?: number;
  updatedAt?: number;
  startedAt?: number | null;
  finishedAt?: number | null;
  pid?: number | null;
  cancelRequested?: boolean;
}

export interface HealthResponse {
  ok?: boolean;
  status?: string;
  product?: string;
  version?: string;
  message?: string;
  convertBin?: string;
  texture?: {
    enableTextureCompress?: boolean;
    ktx2Etc1s?: boolean;
    ktx2Uastc?: boolean;
    processTilesetTexture?: boolean;
    postprocessBasisu?: boolean;
    basisuPath?: string;
    notes?: string[];
  };
}

export type TextureMode = 'keep' | 'ktx2' | 'ktx2-etc1s' | 'ktx2-uastc';

export interface TextureModeInfo {
  mode: string;
  supported: boolean;
  cliFlags?: string[];
  postprocess?: boolean;
  reason?: string;
  processTileset?: { mode: string; supported: boolean; reason?: string };
}

export interface ConvertCapabilities {
  bin?: string;
  exists?: boolean;
  docker?: boolean;
  processor?: boolean;
  image?: string;
}

export interface CapabilitiesResponse {
  ok?: boolean;
  convert?: ConvertCapabilities;
  textureModes?: TextureModeInfo[];
  aliases?: Record<string, string>;
  postprocessBasisu?: { available?: boolean; path?: string | null };
  terrain?: { ready?: boolean; reason?: string | null; missing?: string[] };
  model?: {
    ready?: boolean;
    formats?: string[];
    modelConfigVersion?: number;
    georeferenceModes?: string[];
    projectedGeoreference?: boolean;
    reason?: string | null;
  };
  ifc?: {
    ready?: boolean;
    kind?: 'executable' | 'script' | 'missing';
    path?: string;
    optionsVersion?: number;
    reason?: string | null;
  };
}

export interface OsgbScanGeo {
  scanSrs?: string | null;
  scanOrigin?: string | null;
  effectiveCrs?: string | null;
  effectiveOrigin?: {
    x?: number | null;
    y?: number | null;
    z?: number | null;
    source?: string;
    text?: string;
  } | null;
  unitHint?: string;
  geographicExport?: boolean;
  hasCrs?: boolean;
  enuLatLon?: { lat: number; lon: number } | null;
  epsg?: number | null;
}

export interface OsgbScanResult {
  ok?: boolean;
  path: string;
  valid: boolean;
  hasMetadata?: boolean;
  hasDataDir?: boolean;
  tileCount?: number;
  message?: string;
  warnings?: string[];
  errors?: string[];
  unitHint?: string;
  geo?: OsgbScanGeo;
  metadata?: {
    srs?: string | null;
    srsOrigin?: string | null;
    path?: string;
  };
  summary?: {
    root?: string;
    tileCount?: number;
    osgbFileCount?: number;
    totalBytes?: number;
    srs?: string | null;
    srsOrigin?: string | null;
  };
  tiles?: Array<{
    name: string;
    entryExists?: boolean;
    osgbCount?: number;
  }>;
}

export interface ModelScanResult {
  path: string;
  format?: 'fbx' | 'obj';
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  summary?: { bytes?: number; materialLibraryCount?: number };
  materials?: Array<{
    reference: string;
    path: string;
    exists: boolean;
    textures?: Array<{ reference: string; path: string; exists: boolean }>;
  }>;
}

export interface CreateTaskRequest {
  operation: string;
  input: { path: string } | string;
  output: { path: string } | string;
  options?: Record<string, unknown>;
  taskName?: string;
  name?: string;
}

export interface CreateTaskResponse {
  ok?: boolean;
  task?: ApiTask;
  id?: string;
}

export interface Artifact {
  id: string;
  taskId?: string;
  path: string;
  kind?: string;
  label?: string;
  createdAt?: number;
  created_at?: number;
  available?: boolean;
  has_tileset?: boolean;
  hasTileset?: boolean;
  hasLayer?: boolean;
  /** `tileset.json`, `layer.json`, or null when neither exists. */
  entryFile?: string | null;
  previewable?: boolean;
  /** `ok`, `missing` (folder moved or deleted) or `incomplete` (no entry file). */
  status?: 'ok' | 'missing' | 'incomplete';
  terrain?: TerrainSummary | null;
}

/** Summary of geoforge-terrain.json (artifact_store.rs `terrain_summary`). */
export interface TerrainSummary {
  reportError?: string;
  reportVersion?: number;
  bounds?: number[] | null;
  areaKm2?: number | null;
  maxDepth?: number | null;
  maxDepthAuto?: boolean | null;
  meshQuality?: string | null;
  tiles?: number | null;
  heightMinM?: number | null;
  heightMaxM?: number | null;
  sampleRmseM?: number | null;
  sampleCleanRmseM?: number | null;
  sampleP95M?: number | null;
  maxEdgeGapM?: number | null;
  noDataPolicy?: string | null;
  sourceHoleCount?: number | null;
  filledCount?: number | null;
  crsName?: string | null;
  crsAuthority?: string | null;
  route?: string | null;
  verticalDatumMode?: string | null;
  verticalConverted?: boolean | null;
  verticalNote?: string | null;
}

export interface PreviewUrlResponse {
  ok: boolean;
  id?: string;
  kind?: string;
  url: string;
  previewUrl?: string;
  terrainUrl?: string;
  terrain?: TerrainSummary | null;
  path?: string;
  has_tileset?: boolean;
}

export interface PrepareOsgbResponse {
  ok: boolean;
  cacheDir?: string;
  models: Array<{ name: string; url: string; path?: string; bytes?: number }>;
  errors?: string[];
  scan?: OsgbScanResult;
}

export interface NativePreviewResponse {
  ok: boolean;
  pid?: number;
  display?: string;
  path?: string;
  error?: string;
}

/** `processor inspect-terrain` output (crates/processor/src/stages/terrain/preflight.rs, version 1). */
export interface TerrainInspectError {
  code: string;
  message: string;
  path?: string | null;
}

export interface TerrainCount {
  state: 'not-computed' | 'estimated' | 'computed';
  value: number | null;
}

export interface TerrainCrsInfo {
  label?: string;
  name?: string | null;
  authority?: string | null;
  type?: string | null;
  linearUnit?: { name?: string; toMetre?: number } | null;
  verticalName?: string | null;
  userSpecified?: boolean;
  transform?: { name?: string | null; accuracyM?: number | null; ballpark?: boolean } | null;
  [key: string]: unknown;
}

export interface TerrainSourceInfo {
  path: string;
  driver?: string;
  dimensions?: [number, number];
  bandCount?: number;
  dataType?: string;
  pixelSize?: [number, number];
  crs?: TerrainCrsInfo;
  bounds?: { source: [number, number, number, number]; wgs84: [number, number, number, number] | null };
  noData?: { declared: number | 'nan' | null; sourceHoles: TerrainCount };
  overviews?: boolean;
  error?: TerrainInspectError | null;
}

export interface TerrainPlan {
  targetGrid: string;
  projectionMode: 'auto' | 'normalize';
  route: 'direct' | 'normalize';
  routeReason: string;
  uniform: boolean;
  overlaps: Array<[number, number]>;
  crs: TerrainCrsInfo;
  crsLabel: string;
  wgs84Bounds: [number, number, number, number];
  recommendedMaxDepth: number;
  pixelGroundMetres: number;
  sourceHoles: TerrainCount;
  verticalName: string | null;
  verticalDatumStatus: 'confirmation-required';
}

export interface TerrainInspectResult {
  version: number;
  valid: boolean;
  sources: TerrainSourceInfo[];
  plan: TerrainPlan | null;
  errors: TerrainInspectError[];
}

export interface TerrainInspectRequest {
  paths: string[];
  crsOverride?: string | null;
  acceptBallpark?: boolean;
  projectionMode?: 'auto' | 'normalize';
}
