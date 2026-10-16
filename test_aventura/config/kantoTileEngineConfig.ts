/**
 * test_aventura/config/kantoTileEngineConfig.ts
 *
 * TILE ENGINE, AUTOTILING & CHUNK RENDERING CONFIGURATION (SSoT)
 * Centralizes subtile offsets, regional palette bounds, piece slice mappings,
 * and chunk baking dimensions for kantoTileEngine.ts.
 */

export interface RmxpSubtilePos {
  readonly sx: number;
  readonly sy: number;
}

export const DEFAULT_CATALOG_TILE_SIZE = 32;
export const DEFAULT_CATALOG_SHEET_WIDTH = 96;
export const DEFAULT_CATALOG_SHEET_HEIGHT = 192;
export const RMXP_SUBTILE_SIZE = 16;

export const RMXP_SUBTILES = {
  tl: {
    outer: { sx: 0, sy: 32 },
    topEdge: { sx: 32, sy: 32 },
    leftEdge: { sx: 0, sy: 64 },
    inner: { sx: 32, sy: 0 },
    center: { sx: 32, sy: 64 }
  },
  tr: {
    outer: { sx: 80, sy: 32 },
    topEdge: { sx: 48, sy: 32 },
    rightEdge: { sx: 80, sy: 64 },
    inner: { sx: 48, sy: 0 },
    center: { sx: 48, sy: 64 }
  },
  bl: {
    outer: { sx: 0, sy: 112 },
    bottomEdge: { sx: 32, sy: 112 },
    leftEdge: { sx: 0, sy: 80 },
    inner: { sx: 32, sy: 16 },
    center: { sx: 32, sy: 80 }
  },
  br: {
    outer: { sx: 80, sy: 112 },
    bottomEdge: { sx: 48, sy: 112 },
    rightEdge: { sx: 80, sy: 80 },
    inner: { sx: 48, sy: 16 },
    center: { sx: 48, sy: 80 }
  }
} as const;

export const REGIONAL_MASSIF_BOUNDS = {
  mtMoon: { minGx: 35, maxGx: 95, maxGy: 45 },
  rockTunnel: { minGx: 75, minGy: 45, maxGy: 80 },
  indigoPlateauMinGx: 30,
  seafoamMinGy: 100,
  hashPrimeX: 73,
  hashPrimeY: 37,
  hashXor: 0x5bf03635,
  hashMask: 0x7fffffff
} as const;

export const LPC_PIECE_SLICES: Record<string, { sx: number; sy: number }> = {
  // open-record: Autotile piece slice identifiers mapped to sprite coordinates
  TL: { sx: 0, sy: 64 },
  T: { sx: 32, sy: 64 },
  TR: { sx: 64, sy: 64 },
  L: { sx: 0, sy: 96 },
  C: { sx: 32, sy: 96 },
  R: { sx: 64, sy: 96 },
  BL: { sx: 0, sy: 128 },
  B: { sx: 32, sy: 128 },
  BR: { sx: 64, sy: 128 },
  F0: { sx: 0, sy: 160 },
  F1: { sx: 32, sy: 160 },
  F2: { sx: 64, sy: 160 },
  ITL: { sx: 64, sy: 32 },
  ITR: { sx: 32, sy: 32 },
  IBL: { sx: 64, sy: 0 },
  IBR: { sx: 32, sy: 0 },
  S0: { sx: 0, sy: 0 }
};

export const BOARDWALK_RENDER_CONFIG = {
  plankOffsetsY: [7, 15, 23, 31] as const,
  plankThickness: 2,
  plankWidth: 32,
  bridgeSize: 32
} as const;

export const CHUNK_BAKE_CONFIG = {
  defaultNatureSize: 64,
  defaultBridgeWidth: 64,
  defaultBridgeHeight: 96,
  buildingYSortOffset: 60,
  treeYSortOffset: 48,
  propYSortOffset: 32,
  treeBoundsOffsetY: 32,
  treeBoundsWidth: 64,
  treeBoundsHeight: 96,
  treeTallThreshold: 64,
  buildingBoundsWidth: 128,
  buildingBoundsHeight: 100,
  propBoundsDefault: 64
} as const;
