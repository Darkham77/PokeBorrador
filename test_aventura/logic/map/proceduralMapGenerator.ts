/**
 * src/logic/map/proceduralMapGenerator.ts
 *
 * CANONICAL PROCEDURAL MAP GENERATOR (SSoT v2.0)
 *
 * High-performance layered procedural generator powered by Mulberry32 PRNG
 * and the canonical TilesRegistryService. Generates coherent retro-modern maps
 * adhering strictly to Pokémon GBA visual assembly standards:
 *   - Layer 0: Base Ground (Homogeneous base grass & parallel-bordered path autotiling)
 *   - Layer 1: Natural Topography (9-slice water ponds & 2x3 multitile mountain cones)
 *   - Layer 2: Overworld Dressing (2x3 FireRed rounded forest perimeter & standalone trees,
 *              tall grass encounter patches, flowers, and curated 16x16 props)
 *   - Collision Matrix: 0: transitable, 1: solid obstacle, 2: water
 */

import {
  type TilesRegistryService,
  type TileCollision,
  defaultTilesRegistry
} from './tilesRegistry.ts';
import type { StructureTemplate } from '../../config/mapStructures.ts';
import { computeBiomeDistribution } from './biomeDistributionEngine.ts';
import type { CityGenerationConfig, CanonicalThemeSource } from '../../types/map/adventureWorldTypes';
import { generateUrbanLayout } from './urbanZoningEngine.ts';
import { placeScenicProps } from './propsPlacementEngine.ts';

export type CollisionType = 0 | 1 | 2 | 3; // 0: transitable, 1: colisión, 2: agua, 3: salto hacia abajo (ledge)

export type MapType = 'town' | 'route';

export interface MapWarp {
  readonly x: number;
  readonly y: number;
  readonly targetMapId: string;
  readonly targetSpawnId: string;
}

export interface MapSpawn {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly direction?: 'up' | 'down' | 'left' | 'right';
}

export interface MapEntities {
  readonly spawns: readonly MapSpawn[];
  readonly warps: readonly MapWarp[];
}

export interface PlacedStructure {
  readonly template: StructureTemplate;
  readonly x: number;
  readonly y: number;
}

export interface ProceduralMapOptions {
  readonly width: number;
  readonly height: number;
  readonly seed?: number;
  readonly theme?: CanonicalThemeSource;
  readonly type?: MapType;
  readonly withWater?: boolean;
  readonly withHills?: boolean;
  readonly withVegetation?: boolean;
  readonly withTown?: boolean;
  readonly structures?: readonly PlacedStructure[];
  readonly waterPercent?: number; // 0 to 100
  readonly mountainPercent?: number; // 0 to 100
  readonly forestPercent?: number; // 0 to 100
  readonly propsDensity?: number; // 0 to 100
  readonly includeFences?: boolean;
  readonly cityConfig?: CityGenerationConfig;
}

export interface MapCell {
  readonly tileId: string;
  readonly filePath: string;
  readonly collision: TileCollision;
}

export interface ProceduralMapLayers {
  readonly ground: readonly (readonly MapCell[])[];
  readonly elevation: readonly (readonly (MapCell | null)[])[];
  readonly decorations: readonly (readonly (MapCell | null)[])[];
}

export interface GeneratedMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly seed: number;
  readonly theme: CanonicalThemeSource;
  readonly type: MapType;
  readonly layers: ProceduralMapLayers;
  readonly collisionMatrix: readonly (readonly CollisionType[])[];
  readonly entities: MapEntities;
  // Layer direct aliases
  readonly ground: readonly (readonly MapCell[])[];
  readonly elevation: readonly (readonly (MapCell | null)[])[];
  readonly decorations: readonly (readonly (MapCell | null)[])[];
  // Backward-compatible fields
  readonly baseLayer: readonly (readonly MapCell[])[];
  readonly elevationLayer: readonly (readonly (MapCell | null)[])[];
  readonly objectLayer: readonly (readonly (MapCell | null)[])[];
  readonly collisionGrid: readonly (readonly TileCollision[])[];
  readonly totalTilesPlaced: number;
}

export interface Autotile9Slice {
  readonly center: string;
  readonly top: string;
  readonly bottom: string;
  readonly left: string;
  readonly right: string;
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
}

export interface MultitileTemplate {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly (readonly string[])[];
  readonly collision: readonly (readonly TileCollision[])[];
}

export interface ThemeBiomePalette {
  readonly grass: string;
  readonly grassAccents: readonly string[];
  readonly path: Autotile9Slice;
  readonly urbanPavement?: string;
  readonly water: Autotile9Slice;
  readonly ledge?: {
    readonly center: string;
    readonly centerAlt?: string;
  };
  readonly cliff?: {
    readonly top: string;
    readonly face: string;
    readonly left?: string;
    readonly right?: string;
  };
  readonly tree2x3: MultitileTemplate;
  readonly tree2x2: MultitileTemplate;
  readonly standaloneTree?: MultitileTemplate;
  readonly mountainCone2x3: MultitileTemplate;
  readonly props: {
    readonly flowers: readonly string[];
    readonly tallGrass: string;
    readonly bush: string;
    readonly rock?: string;
  };
}

/**
 * Verified Canonical GBA Tile Sets from the 116k catalog.
 * Strict Theme Isolation:
 * - firered: Classic rounded leafy trees of Kanto & Safari Zone pond 9-slice
 * - emerald / ruby_sapphire: Hoenn coniferous pine trees & Hoenn palettes
 */
export const CANONICAL_PALETTES: Record<CanonicalThemeSource, ThemeBiomePalette> = {
  firered: {
    grass: 'tile_vegetation_184ee2f2ca', // Seamless soft overworld grass
    grassAccents: ['tile_vegetation_13f0a9ea38'], // Subtle grass tuft variation
    path: {
      center: 'tile_terrain_4756bdfd4e',
      top: 'tile_terrain_b3840e05af',
      bottom: 'tile_terrain_35acffed79',
      left: 'tile_terrain_b07ce4bfe6',
      right: 'tile_terrain_554fe90459',
      topLeft: 'tile_terrain_aeed0bb8ac',
      topRight: 'tile_terrain_93efbc410a',
      bottomLeft: 'tile_terrain_b8d7bb69ce',
      bottomRight: 'tile_terrain_3928852ac2'
    },
    urbanPavement: 'tile_terrain_4756bdfd4e', // Canonical seamless sand/dirt path
    water: {
      center: 'tile_water_5e550af5c2', // Canonical FireRed Safari overworld pond wavy water
      top: 'tile_water_b2b02a5e0e',
      bottom: 'tile_water_f3cf81311b',
      left: 'tile_water_34d262e7f2',
      right: 'tile_water_e780c4f413',
      topLeft: 'tile_water_bbae919e5f',
      topRight: 'tile_water_2610e35f18',
      bottomLeft: 'tile_water_1da2cf6c52',
      bottomRight: 'tile_water_577cd9fb73'
    },
    ledge: {
      center: 'tile_terrain_120d7decae',
      centerAlt: 'tile_terrain_1938e75eaa'
    },
    cliff: {
      top: 'tile_elevation_top',
      face: 'tile_elevation_face',
      left: 'tile_elevation_left',
      right: 'tile_elevation_right'
    },
    // Canonical FireRed/LeafGreen rounded leafy tree (2x3 tiles / 32x48 px)
    tree2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_9cf406a0d5', 'tile_vegetation_493a154ab0'],
        ['tile_vegetation_9668f2a496', 'tile_vegetation_3978273469'],
        ['tile_vegetation_8e73525ab6', 'tile_vegetation_f4e0a51729']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    tree2x2: {
      width: 2,
      height: 2,
      tiles: [
        ['tile_vegetation_9cf406a0d5', 'tile_vegetation_493a154ab0'],
        ['tile_vegetation_8e73525ab6', 'tile_vegetation_f4e0a51729']
      ],
      collision: [
        [true, true],
        [true, true]
      ]
    },
    mountainCone2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_bf0a3c7024', 'tile_elevation_7eccbe22e5'],
        ['tile_elevation_10dccf3c52', 'tile_elevation_e5a5b972eb'],
        ['tile_elevation_e8e8f562ef', 'tile_elevation_84c75dc969']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    props: {
      flowers: ['tile_vegetation_6d432cbe6d'],
      tallGrass: 'tile_vegetation_6b1605d4cf',
      bush: 'tile_vegetation_77ac70f502'
    }
  },
  emerald: {
    grass: 'tile_vegetation_184ee2f2ca',
    grassAccents: ['tile_vegetation_13f0a9ea38'],
    path: {
      center: 'tile_terrain_4756bdfd4e',
      top: 'tile_terrain_b3840e05af',
      bottom: 'tile_terrain_35acffed79',
      left: 'tile_terrain_b07ce4bfe6',
      right: 'tile_terrain_554fe90459',
      topLeft: 'tile_terrain_aeed0bb8ac',
      topRight: 'tile_terrain_93efbc410a',
      bottomLeft: 'tile_terrain_b8d7bb69ce',
      bottomRight: 'tile_terrain_3928852ac2'
    },
    urbanPavement: 'tile_terrain_4756bdfd4e',
    water: {
      center: 'tile_water_5e550af5c2',
      top: 'tile_water_b2b02a5e0e',
      bottom: 'tile_water_f3cf81311b',
      left: 'tile_water_34d262e7f2',
      right: 'tile_water_e780c4f413',
      topLeft: 'tile_water_bbae919e5f',
      topRight: 'tile_water_2610e35f18',
      bottomLeft: 'tile_water_1da2cf6c52',
      bottomRight: 'tile_water_577cd9fb73'
    },
    ledge: {
      center: 'tile_terrain_120d7decae',
      centerAlt: 'tile_terrain_1938e75eaa'
    },
    // Hoenn Coniferous Pine Tree (2x3 tiles)
    tree2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_afed389c7f', 'tile_vegetation_3d3a41c32d'],
        ['tile_vegetation_3e24e0f99d', 'tile_vegetation_a88df6ec45'],
        ['tile_vegetation_6be35c9857', 'tile_vegetation_1e7ae8dbad']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    tree2x2: {
      width: 2,
      height: 2,
      tiles: [
        ['tile_vegetation_821ff1bb4d', 'tile_vegetation_d27ee608ad'],
        ['tile_vegetation_31defe8241', 'tile_vegetation_32124203a1']
      ],
      collision: [
        [true, true],
        [true, true]
      ]
    },
    mountainCone2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_bf0a3c7024', 'tile_elevation_7eccbe22e5'],
        ['tile_elevation_10dccf3c52', 'tile_elevation_e5a5b972eb'],
        ['tile_elevation_e8e8f562ef', 'tile_elevation_84c75dc969']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    props: {
      flowers: ['tile_vegetation_6d432cbe6d'],
      tallGrass: 'tile_vegetation_6b1605d4cf',
      bush: 'tile_vegetation_77ac70f502'
    }
  },
  ruby_sapphire: {
    grass: 'tile_vegetation_0036b62873',
    grassAccents: ['tile_vegetation_13f0a9ea38'],
    path: {
      center: 'tile_terrain_4756bdfd4e',
      top: 'tile_terrain_b3840e05af',
      bottom: 'tile_terrain_35acffed79',
      left: 'tile_terrain_b07ce4bfe6',
      right: 'tile_terrain_554fe90459',
      topLeft: 'tile_terrain_aeed0bb8ac',
      topRight: 'tile_terrain_93efbc410a',
      bottomLeft: 'tile_terrain_b8d7bb69ce',
      bottomRight: 'tile_terrain_3928852ac2'
    },
    urbanPavement: 'tile_terrain_4756bdfd4e',
    water: {
      center: 'tile_water_5e550af5c2',
      top: 'tile_water_b2b02a5e0e',
      bottom: 'tile_water_f3cf81311b',
      left: 'tile_water_34d262e7f2',
      right: 'tile_water_e780c4f413',
      topLeft: 'tile_water_bbae919e5f',
      topRight: 'tile_water_2610e35f18',
      bottomLeft: 'tile_water_1da2cf6c52',
      bottomRight: 'tile_water_577cd9fb73'
    },
    ledge: {
      center: 'tile_terrain_120d7decae',
      centerAlt: 'tile_terrain_1938e75eaa'
    },
    tree2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_afed389c7f', 'tile_vegetation_3d3a41c32d'],
        ['tile_vegetation_3e24e0f99d', 'tile_vegetation_a88df6ec45'],
        ['tile_vegetation_6be35c9857', 'tile_vegetation_1e7ae8dbad']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    tree2x2: {
      width: 2,
      height: 2,
      tiles: [
        ['tile_vegetation_821ff1bb4d', 'tile_vegetation_d27ee608ad'],
        ['tile_vegetation_31defe8241', 'tile_vegetation_32124203a1']
      ],
      collision: [
        [true, true],
        [true, true]
      ]
    },
    mountainCone2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_bf0a3c7024', 'tile_elevation_7eccbe22e5'],
        ['tile_elevation_10dccf3c52', 'tile_elevation_e5a5b972eb'],
        ['tile_elevation_e8e8f562ef', 'tile_elevation_84c75dc969']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    props: {
      flowers: ['tile_vegetation_6d432cbe6d'],
      tallGrass: 'tile_vegetation_6b1605d4cf',
      bush: 'tile_vegetation_77ac70f502'
    }
  }
};

export function getBiomePalette(theme: CanonicalThemeSource = 'firered'): ThemeBiomePalette {
  return CANONICAL_PALETTES[theme] ?? CANONICAL_PALETTES.firered;
}

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Canonical Procedural Map Generator Engine
 */
export class ProceduralMapGenerator {
  private readonly registry: TilesRegistryService;

  constructor(registry: TilesRegistryService = defaultTilesRegistry) {
    this.registry = registry;
  }

  private makeCell(tileId: string, collision: TileCollision): MapCell {
    const tileEntry = this.registry.getTileById(tileId);
    const filePath = tileEntry?.file_path || `/assets/tiles/terrain/${tileId}.png`;
    return { tileId, filePath, collision };
  }

  public generate(options: ProceduralMapOptions): GeneratedMap {
    const width = Math.max(16, options.width);
    const height = Math.max(16, options.height);
    const seed = options.seed ?? 42;
    const theme = options.theme ?? 'firered';
    const mapType: MapType =
      options.type ?? (options.withTown === false ? 'route' : theme === 'firered' && width >= 25 && height >= 25 ? 'town' : 'town');
    const withTown = mapType === 'town' && (options.withTown ?? true);
    const withWater = options.withWater ?? true;
    const withHills = options.withHills ?? true;
    const withVegetation = options.withVegetation ?? true;
    const waterPercent = withWater ? (options.waterPercent ?? 12) : 0;
    const mountainPercent = withHills ? (options.mountainPercent ?? 10) : 0;
    const forestPercent = withVegetation ? (options.forestPercent ?? 20) : 0;

    const prng = createMulberry32(seed);
    const palette = CANONICAL_PALETTES[theme] ?? CANONICAL_PALETTES.firered;

    const warps: MapWarp[] = [];
    const spawns: MapSpawn[] = [];

    // Layer allocations
    const baseLayer: MapCell[][] = [];
    const elevationLayer: (MapCell | null)[][] = [];
    const objectLayer: (MapCell | null)[][] = [];
    const collisionGrid: TileCollision[][] = [];

    // 1. Initialize Base Layer (Homogeneous base grass without borders)
    for (let y = 0; y < height; y++) {
      baseLayer[y] = [];
      elevationLayer[y] = [];
      objectLayer[y] = [];
      collisionGrid[y] = [];
      for (let x = 0; x < width; x++) {
        const isAccent = prng() < 0.04 && palette.grassAccents.length > 0;
        const grassId = isAccent ? palette.grassAccents[0]! : palette.grass;
        baseLayer[y]![x] = this.makeCell(grassId, false);
        elevationLayer[y]![x] = null;
        objectLayer[y]![x] = null;
        collisionGrid[y]![x] = false;
      }
    }

    // 2. Carve Paths with Autotiling 9-Slice (Parallel borders & open endpoints)
    const midY = Math.floor(height / 2);
    const branchX = Math.floor(width * 0.38);
    const isPathCell: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

    if (mapType === 'route') {
      // Classic GBA Orthogonal Route Corridors (Pure horizontal & vertical segments)
      const pathWidth = Math.min(3, Math.max(2, Math.floor(width / 12)));
      const startX = Math.max(pathWidth + 3, Math.min(width - pathWidth - 4, Math.floor(width * (0.42 + (prng() - 0.5) * 0.25))));
      const endX = Math.max(pathWidth + 3, Math.min(width - pathWidth - 4, Math.floor(width * (0.5 + (prng() - 0.5) * 0.3))));

      const turnY1 = Math.floor(height * 0.65);
      const turnY2 = Math.floor(height * 0.35);
      const midX = Math.max(pathWidth + 3, Math.min(width - pathWidth - 4, Math.floor((startX + endX) / 2 + (prng() - 0.5) * 6)));

      const stampRect = (x0: number, y0: number, x1: number, y1: number) => {
        const minX = Math.max(2, Math.min(x0, x1));
        const maxX = Math.min(width - 3, Math.max(x0, x1));
        const minY = Math.max(0, Math.min(y0, y1));
        const maxY = Math.min(height - 1, Math.max(y0, y1));
        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            isPathCell[py]![px] = true;
          }
        }
      };

      // 1. South vertical leg: from bottom (height - 1) up to turnY1
      stampRect(startX - Math.floor(pathWidth / 2), turnY1, startX + Math.ceil(pathWidth / 2) - 1, height - 1);

      // 2. Horizontal connector between turnY1 and middle leg
      stampRect(Math.min(startX, midX) - Math.floor(pathWidth / 2), turnY1 - Math.floor(pathWidth / 2), Math.max(startX, midX) + Math.ceil(pathWidth / 2) - 1, turnY1 + Math.ceil(pathWidth / 2) - 1);

      // 3. Middle vertical leg: from turnY1 to turnY2
      stampRect(midX - Math.floor(pathWidth / 2), turnY2, midX + Math.ceil(pathWidth / 2) - 1, turnY1);

      // 4. Horizontal connector to endX at turnY2
      stampRect(Math.min(midX, endX) - Math.floor(pathWidth / 2), turnY2 - Math.floor(pathWidth / 2), Math.max(midX, endX) + Math.ceil(pathWidth / 2) - 1, turnY2 + Math.ceil(pathWidth / 2) - 1);

      // 5. North vertical leg: from turnY2 up to top (0)
      stampRect(endX - Math.floor(pathWidth / 2), 0, endX + Math.ceil(pathWidth / 2) - 1, turnY2);
    }

    // Resolve Path Autotiling for each cell
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isPathCell[y]![x]) continue;

        const hasN = y > 0 && isPathCell[y - 1]![x];
        const hasS = y < height - 1 && isPathCell[y + 1]![x];
        const hasW = x > 0 && isPathCell[y]![x - 1];
        const hasE = x < width - 1 && isPathCell[y]![x + 1];

        let pathTileId = palette.path.center;

        // Corners MUST be evaluated before single cardinal borders
        if (!hasN && !hasW && (hasS || hasE)) {
          pathTileId = palette.path.topLeft;
        } else if (!hasN && !hasE && (hasS || hasW)) {
          pathTileId = palette.path.topRight;
        } else if (!hasS && !hasW && (hasN || hasE)) {
          pathTileId = palette.path.bottomLeft;
        } else if (!hasS && !hasE && (hasN || hasW)) {
          pathTileId = palette.path.bottomRight;
        } else if (!hasN && hasS) {
          pathTileId = palette.path.top;
        } else if (!hasS && hasN) {
          pathTileId = palette.path.bottom;
        } else if (!hasW && hasE) {
          pathTileId = palette.path.left;
        } else if (!hasE && hasW) {
          pathTileId = palette.path.right;
        } else {
          pathTileId = palette.path.center;
        }

        baseLayer[y]![x] = this.makeCell(pathTileId, false);
      }
    }

    // 3. Town Pass (Intelligent Urban Zoning: Streets, Lots, Civic & Residential Allocation)
    if (withTown) {
      const cityConfig: CityGenerationConfig = {
        scale: options.cityConfig?.scale ?? 'town',
        buildingDensity: options.cityConfig?.buildingDensity ?? 7,
        includeGym: options.cityConfig?.includeGym ?? true,
        includeLab: options.cityConfig?.includeLab ?? false,
        plazaType: options.cityConfig?.plazaType ?? 'fountain',
        propsDensity: options.cityConfig?.propsDensity ?? options.propsDensity ?? 50,
        includeFences: options.cityConfig?.includeFences ?? options.includeFences ?? true
      };

      generateUrbanLayout({
        mapWidth: width,
        mapHeight: height,
        seed,
        config: cityConfig,
        palette,
        baseLayer,
        elevationLayer,
        objectLayer,
        collisionGrid,
        isPathCell,
        warps,
        spawns,
        makeCell: (tileId, col) => this.makeCell(tileId, col)
      });

      // Re-resolve Path Autotiling for all newly connected avenues and doorways
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isPathCell[y]![x]) continue;

          const hasN = y > 0 && isPathCell[y - 1]![x];
          const hasS = y < height - 1 && isPathCell[y + 1]![x];
          const hasW = x > 0 && isPathCell[y]![x - 1];
          const hasE = x < width - 1 && isPathCell[y]![x + 1];

          let pathTileId = palette.path.center;
          // Corners MUST be evaluated before single cardinal borders
          if (!hasN && !hasW && (hasS || hasE)) {
            pathTileId = palette.path.topLeft;
          } else if (!hasN && !hasE && (hasS || hasW)) {
            pathTileId = palette.path.topRight;
          } else if (!hasS && !hasW && (hasN || hasE)) {
            pathTileId = palette.path.bottomLeft;
          } else if (!hasS && !hasE && (hasN || hasW)) {
            pathTileId = palette.path.bottomRight;
          } else if (!hasN && hasS) {
            pathTileId = palette.path.top;
          } else if (!hasS && hasN) {
            pathTileId = palette.path.bottom;
          } else if (!hasW && hasE) {
            pathTileId = palette.path.left;
          } else if (!hasE && hasW) {
            pathTileId = palette.path.right;
          } else {
            pathTileId = palette.path.center;
          }

          baseLayer[y]![x] = this.makeCell(pathTileId, false);
        }
      }
    }

    // 3.5 Compute Organic Biome Distribution via Simplex Noise FBM & Quantile Thresholding
    const centerExclusion = withTown
      ? { x: branchX, y: midY, radius: Math.floor(Math.min(width, height) * 0.35) }
      : undefined;

    const biomeDist = computeBiomeDistribution({
      width,
      height,
      seed,
      waterPercent,
      mountainPercent,
      forestPercent,
      centerExclusion
    });

    // Enforce Master Path & Town Clearance: paths, doorsteps, and buildings are never flooded
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isPathCell[y]![x] || elevationLayer[y]![x] !== null) {
          biomeDist.waterMask[y]![x] = false;
          biomeDist.mountainMask[y]![x] = false;
        }
      }
    }

    // 4. Stamp Organic 9-Slice Water Bodies governed by Biome Distribution Engine
    if (withWater && width >= 16 && height >= 16) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!biomeDist.waterMask[y]![x] || isPathCell[y]![x] || elevationLayer[y]![x] !== null) continue;

          // Check orthogonal neighbors in waterMask that are not path cells or buildings
          const hasN = y > 0 && biomeDist.waterMask[y - 1]![x] && !isPathCell[y - 1]![x] && elevationLayer[y - 1]![x] === null;
          const hasS = y < height - 1 && biomeDist.waterMask[y + 1]![x] && !isPathCell[y + 1]![x] && elevationLayer[y + 1]![x] === null;
          const hasW = x > 0 && biomeDist.waterMask[y]![x - 1] && !isPathCell[y]![x - 1] && elevationLayer[y]![x - 1] === null;
          const hasE = x < width - 1 && biomeDist.waterMask[y]![x + 1] && !isPathCell[y]![x + 1] && elevationLayer[y]![x + 1] === null;

          let waterId = palette.water.center;

          if (!hasN && !hasW) waterId = palette.water.topLeft;
          else if (!hasN && !hasE) waterId = palette.water.topRight;
          else if (!hasS && !hasW) waterId = palette.water.bottomLeft;
          else if (!hasS && !hasE) waterId = palette.water.bottomRight;
          else if (!hasN) waterId = palette.water.top;
          else if (!hasS) waterId = palette.water.bottom;
          else if (!hasW) waterId = palette.water.left;
          else if (!hasE) waterId = palette.water.right;
          else waterId = palette.water.center;

          elevationLayer[y]![x] = this.makeCell(waterId, 'water');
          collisionGrid[y]![x] = 'water';
        }
      }
    }

    // 5. Stamp Authentic GBA Elevation Cliffs or Cones governed by Biome Distribution Engine
    if (withHills && !withTown && width >= 16 && height >= 16) {
      if (palette.cliff) {
        const topTile = palette.cliff.top;
        const faceTile = palette.cliff.face;
        const leftTile = palette.cliff.left ?? topTile;
        const rightTile = palette.cliff.right ?? topTile;

        // Stamp 2-tile high south-facing cliff terraces along mountainMask
        for (let y = 2; y <= height - 4; y += 3) {
          let runStart = -1;
          for (let x = 2; x <= width - 3; x++) {
            const isMountain = biomeDist.mountainMask[y]![x] && biomeDist.mountainMask[y + 1]![x];
            const isClear =
              !isPathCell[y]![x] &&
              !isPathCell[y + 1]![x] &&
              elevationLayer[y]![x] === null &&
              elevationLayer[y + 1]![x] === null &&
              objectLayer[y]![x] === null &&
              objectLayer[y + 1]![x] === null;

            if (isMountain && isClear) {
              if (runStart === -1) runStart = x;
            } else {
              if (runStart !== -1 && x - runStart >= 3) {
                const runEnd = x - 1;
                for (let cx = runStart; cx <= runEnd; cx++) {
                  const tId = cx === runStart ? leftTile : cx === runEnd ? rightTile : topTile;
                  elevationLayer[y]![cx] = this.makeCell(tId, true);
                  elevationLayer[y + 1]![cx] = this.makeCell(faceTile, true);
                  collisionGrid[y]![cx] = true;
                  collisionGrid[y + 1]![cx] = true;
                }
              }
              runStart = -1;
            }
          }
          if (runStart !== -1 && width - 2 - runStart >= 3) {
            for (let cx = runStart; cx < width - 2; cx++) {
              elevationLayer[y]![cx] = this.makeCell(topTile, true);
              elevationLayer[y + 1]![cx] = this.makeCell(faceTile, true);
              collisionGrid[y]![cx] = true;
              collisionGrid[y + 1]![cx] = true;
            }
          }
        }
      } else {
        const cone = palette.mountainCone2x3;
        let placedCones = 0;
        const maxCones = Math.min(8, Math.max(2, Math.floor((width * height * (mountainPercent / 100)) / 15)));

        for (let y = 1; y <= height - cone.height - 1; y += 2) {
          for (let x = 1; x <= width - cone.width - 1; x += 2) {
            if (biomeDist.mountainMask[y]![x] && !isPathCell[y]![x]) {
              if (this.canStamp(objectLayer, elevationLayer, isPathCell, cone.width, cone.height, x, y)) {
                this.stampMultitile(elevationLayer, collisionGrid, cone, x, y, width, height);
                placedCones++;
                if (placedCones >= maxCones) break;
              }
            }
          }
          if (placedCones >= maxCones) break;
        }
      }
    }

    // 6. Perimeter Forest Border & Dense Wilderness Canopy (Multitile 2x3 Trees)
    if (withVegetation) {
      const treeTpl = palette.tree2x3;

      // Top perimeter border
      for (let x = 0; x <= width - treeTpl.width; x += treeTpl.width) {
        if (!this.overlapsPath(x, 0, treeTpl.width, treeTpl.height, isPathCell)) {
          this.stampMultitile(objectLayer, collisionGrid, treeTpl, x, 0, width, height);
        }
      }
      // Bottom perimeter border
      const bottomY = height - treeTpl.height;
      for (let x = 0; x <= width - treeTpl.width; x += treeTpl.width) {
        if (!this.overlapsPath(x, bottomY, treeTpl.width, treeTpl.height, isPathCell)) {
          this.stampMultitile(objectLayer, collisionGrid, treeTpl, x, bottomY, width, height);
        }
      }
      // Left perimeter border
      for (let y = treeTpl.height; y < bottomY; y += treeTpl.height) {
        if (!this.overlapsPath(0, y, treeTpl.width, treeTpl.height, isPathCell)) {
          this.stampMultitile(objectLayer, collisionGrid, treeTpl, 0, y, width, height);
        }
      }
      // Right perimeter border
      const rightX = width - treeTpl.width;
      for (let y = treeTpl.height; y < bottomY; y += treeTpl.height) {
        if (!this.overlapsPath(rightX, y, treeTpl.width, treeTpl.height, isPathCell)) {
          this.stampMultitile(objectLayer, collisionGrid, treeTpl, rightX, y, width, height);
        }
      }

      // In Route mode: fill the entire negative space outside the route corridor with dense interlocking tree walls
      if (mapType === 'route') {
        const corridorRadius = 4;
        const isCorridor: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            if (isPathCell[py]![px]) {
              for (let dy = -corridorRadius; dy <= corridorRadius; dy++) {
                for (let dx = -corridorRadius; dx <= corridorRadius; dx++) {
                  const cy = py + dy;
                  const cx = px + dx;
                  if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                    if (Math.abs(dx) + Math.abs(dy) <= corridorRadius + 1) {
                      isCorridor[cy]![cx] = true;
                    }
                  }
                }
              }
            }
          }
        }

        // Fill non-corridor wilderness with dense canopy trees in staggered pattern
        for (let y = 1; y <= height - treeTpl.height - 1; y += 2) {
          const xOffset = ((Math.floor(y / 2) % 2) === 1) ? 1 : 0;
          for (let x = 1 + xOffset; x <= width - treeTpl.width - 1; x += 2) {
            let overlapsCorridor = false;
            for (let ty = 0; ty < treeTpl.height && !overlapsCorridor; ty++) {
              for (let tx = 0; tx < treeTpl.width; tx++) {
                if (isCorridor[y + ty]?.[x + tx] || isPathCell[y + ty]?.[x + tx]) {
                  overlapsCorridor = true;
                  break;
                }
              }
            }

            if (!overlapsCorridor && this.canStamp(objectLayer, elevationLayer, isPathCell, treeTpl.width, treeTpl.height, x, y)) {
              this.stampMultitile(objectLayer, collisionGrid, treeTpl, x, y, width, height);
            }
          }
        }
      }

      // 7. Interior Standalone Trees governed by Biome Distribution Engine
      if (width >= 20 && height >= 20 && !withTown) {
        const standaloneTpl = palette.standaloneTree ?? treeTpl;
        let placedInteriorTrees = 0;
        for (let y = 4; y <= height - standaloneTpl.height - 4; y += 4) {
          for (let x = 4; x <= width - standaloneTpl.width - 4; x += 4) {
            if (biomeDist.forestMask[y]![x]) {
              if (this.canStamp(objectLayer, elevationLayer, isPathCell, standaloneTpl.width, standaloneTpl.height, x, y)) {
                this.stampMultitile(objectLayer, collisionGrid, standaloneTpl, x, y, width, height);
                placedInteriorTrees++;
                if (placedInteriorTrees >= 3) break;
              }
            }
          }
          if (placedInteriorTrees >= 3) break;
        }
      }

      // 7.5. Jumpable Ledges (strictly in Route mode)
      if (mapType === 'route' && palette.ledge) {
        const ledgeY1 = Math.floor(height * 0.35);
        const ledgeY2 = Math.floor(height * 0.65);
        const candidateLedgeRows = [ledgeY1, ledgeY1 + 1, ledgeY1 - 1, ledgeY2, ledgeY2 + 1, ledgeY2 - 1];

        let placedLedgeCount = 0;
        for (const ly of candidateLedgeRows) {
          if (ly < 4 || ly >= height - 4) continue;
          const segments = [
            { startX: 3, endX: Math.min(width - 4, Math.floor(width * 0.42)) },
            { startX: Math.max(4, Math.floor(width * 0.58)), endX: width - 4 }
          ];

          for (const seg of segments) {
            if (seg.endX - seg.startX < 3) continue;

            // Find a continuous clear stretch of at least 3 tiles
            let currentRunStart = -1;
            let bestRun: { start: number; end: number } | null = null;

            for (let x = seg.startX; x <= seg.endX; x++) {
              const isBlocked =
                isPathCell[ly]![x] ||
                isPathCell[ly - 1]?.[x] ||
                isPathCell[ly + 1]?.[x] ||
                elevationLayer[ly]![x] !== null ||
                elevationLayer[ly + 1]?.[x] !== null ||
                objectLayer[ly]![x] !== null;

              if (!isBlocked) {
                if (currentRunStart === -1) currentRunStart = x;
                const runLength = x - currentRunStart + 1;
                if (runLength >= 3) {
                  bestRun = { start: currentRunStart, end: x };
                }
              } else {
                if (bestRun) break;
                currentRunStart = -1;
              }
            }

            if (bestRun) {
              for (let x = bestRun.start; x <= bestRun.end; x++) {
                const tileId =
                  prng() < 0.35 && palette.ledge.centerAlt
                    ? palette.ledge.centerAlt
                    : palette.ledge.center;
                baseLayer[ly]![x] = this.makeCell(tileId, 'ledge');
                collisionGrid[ly]![x] = 'ledge';
              }
              placedLedgeCount++;
              if (placedLedgeCount >= 2) break;
            }
          }
          if (placedLedgeCount >= 2) break;
        }
      }

      // 8. Tall Grass Encounter Patches (Directly bordering or crossing the route corridor)
      if (mapType === 'route') {
        // Collect candidate anchor points directly bordering the path
        const pathBorderCandidates: { x: number; y: number }[] = [];
        for (let y = 3; y < height - 4; y++) {
          for (let x = 3; x < width - 4; x++) {
            if (!isPathCell[y]![x] && elevationLayer[y]![x] === null && objectLayer[y]![x] === null && collisionGrid[y]![x] !== 'ledge') {
              const hasAdjacentPath = [
                isPathCell[y - 1]?.[x],
                isPathCell[y + 1]?.[x],
                isPathCell[y]?.[x - 1],
                isPathCell[y]?.[x + 1]
              ].some(Boolean);
              if (hasAdjacentPath) {
                pathBorderCandidates.push({ x, y });
              }
            }
          }
        }

        const numPatches = Math.min(8, Math.max(5, Math.floor(width / 5)));
        for (let p = 0; p < numPatches; p++) {
          const patchW = 3 + Math.floor(prng() * 4);
          const patchH = 3 + Math.floor(prng() * 4);
          let px0: number;
          let py0: number;

          if (pathBorderCandidates.length > 0 && prng() < 0.8) {
            const anchor = pathBorderCandidates[Math.floor(prng() * pathBorderCandidates.length)]!;
            px0 = Math.max(2, Math.min(width - patchW - 3, anchor.x - Math.floor(patchW / 2)));
            py0 = Math.max(2, Math.min(height - patchH - 3, anchor.y - Math.floor(patchH / 2)));
          } else {
            px0 = 3 + Math.floor(prng() * Math.max(1, width - patchW - 6));
            py0 = 4 + Math.floor(prng() * Math.max(1, height - patchH - 7));
          }

          for (let gy = 0; gy < patchH; gy++) {
            for (let gx = 0; gx < patchW; gx++) {
              if (prng() < 0.05) continue;
              const px = px0 + gx;
              const py = py0 + gy;
              if (
                px < width &&
                py < height &&
                !isPathCell[py]![px] &&
                elevationLayer[py]![px] === null &&
                objectLayer[py]![px] === null &&
                collisionGrid[py]![px] !== 'ledge'
              ) {
                objectLayer[py]![px] = this.makeCell(palette.props.tallGrass, false);
              }
            }
          }
        }
      }

      // 9. Curated Flowers along roads and open pasture
      for (let x = 4; x < width - 4; x++) {
        const yTopRoad = midY - 2;
        if (yTopRoad >= 0 && !isPathCell[yTopRoad]![x] && !elevationLayer[yTopRoad]![x] && !objectLayer[yTopRoad]![x]) {
          if (prng() < 0.45 && palette.props.flowers.length > 0) {
            const flowerId = palette.props.flowers[Math.floor(prng() * palette.props.flowers.length)]!;
            objectLayer[yTopRoad]![x] = this.makeCell(flowerId, false);
          }
        }
        const yBottomRoad = midY + 2;
        if (yBottomRoad < height && !isPathCell[yBottomRoad]![x] && !elevationLayer[yBottomRoad]![x] && !objectLayer[yBottomRoad]![x]) {
          if (prng() < 0.45 && palette.props.flowers.length > 0) {
            const flowerId = palette.props.flowers[Math.floor(prng() * palette.props.flowers.length)]!;
            objectLayer[yBottomRoad]![x] = this.makeCell(flowerId, false);
          }
        }
      }

      // 10. Scatter Small Rocks & Bushes (strictly in open pasture away from path, structures, and tree trunks)
      for (let y = 3; y < height - 3; y++) {
        for (let x = 3; x < width - 3; x++) {
          if (isPathCell[y]![x] || elevationLayer[y]![x] !== null || objectLayer[y]![x] !== null) continue;
          const roll = prng();
          if (roll < 0.02) {
            objectLayer[y]![x] = this.makeCell(palette.props.bush, true);
            collisionGrid[y]![x] = true;
          } else if (roll < 0.035 && palette.props.rock) {
            objectLayer[y]![x] = this.makeCell(palette.props.rock, true);
            collisionGrid[y]![x] = true;
          }
        }
      }

      // 10.5. Route Scenic Props & Nature Furniture Pass
      if (!withTown) {
        placeScenicProps({
          mapWidth: width,
          mapHeight: height,
          seed,
          density: options.propsDensity ?? 40,
          includeFences: options.includeFences ?? true,
          isUrban: false,
          baseLayer,
          elevationLayer,
          objectLayer,
          collisionGrid,
          isPathCell,
          spawns,
          warps,
          makeCell: (tileId, col) => this.makeCell(tileId, col)
        });
      }
    }

    // 11. Custom Predefined Multitile Structures (if specified in options)
    if (options.structures && options.structures.length > 0) {
      for (const item of options.structures) {
        this.stampStructureInternal(
          elevationLayer,
          collisionGrid,
          objectLayer,
          item.template,
          item.x,
          item.y,
          width,
          height
        );
        this.registerStructureEntities(warps, spawns, item.template, item.x, item.y, height);
      }
    }

    // 12. Enforce Master Path Invariant: paths must be strictly clear and transitable
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isPathCell[y]![x]) {
          objectLayer[y]![x] = null;
          if (elevationLayer[y]![x]?.collision === true) {
            elevationLayer[y]![x] = null;
          }
          collisionGrid[y]![x] = false;
        }
      }
    }

    // Explicit solid corners for topology consistency
    collisionGrid[0]![0] = true;
    collisionGrid[0]![width - 1] = true;
    collisionGrid[height - 1]![0] = true;
    collisionGrid[height - 1]![width - 1] = true;

    // Build numeric collision matrix: 0: transitable, 1: colisión, 2: agua, 3: ledge
    const collisionMatrix: CollisionType[][] = [];
    for (let y = 0; y < height; y++) {
      collisionMatrix[y] = [];
      for (let x = 0; x < width; x++) {
        const col = collisionGrid[y]![x];
        if (col === 'water') {
          collisionMatrix[y]![x] = 2;
        } else if (col === 'ledge') {
          collisionMatrix[y]![x] = 3;
        } else if (col === true) {
          collisionMatrix[y]![x] = 1;
        } else {
          collisionMatrix[y]![x] = 0;
        }
      }
    }

    // 13. Player and Navigation Spawns
    if (mapType === 'town') {
      if (!withTown) {
        spawns.unshift({
          id: 'player_start',
          x: branchX,
          y: midY,
          direction: 'down'
        });
        spawns.push({
          id: 'town_exit_south',
          x: branchX,
          y: height - 2,
          direction: 'up'
        });
      }
    } else {
      let southX = Math.floor(width * 0.5);
      for (let x = 0; x < width; x++) {
        if (isPathCell[height - 2]?.[x]) {
          southX = x;
          break;
        }
      }
      spawns.push({
        id: 'player_start',
        x: southX,
        y: height - 2,
        direction: 'up'
      });

      let northX = Math.floor(width * 0.5);
      for (let x = 0; x < width; x++) {
        if (isPathCell[1]?.[x]) {
          northX = x;
          break;
        }
      }
      spawns.push({
        id: 'route_exit_north',
        x: northX,
        y: 1,
        direction: 'down'
      });
    }

    let totalPlaced = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        totalPlaced++;
        if (elevationLayer[y]![x]) totalPlaced++;
        if (objectLayer[y]![x]) totalPlaced++;
      }
    }

    return {
      width,
      height,
      tileSize: 16,
      seed,
      theme,
      type: mapType,
      layers: {
        ground: baseLayer,
        elevation: elevationLayer,
        decorations: objectLayer
      },
      collisionMatrix,
      entities: {
        spawns,
        warps
      },
      ground: baseLayer,
      elevation: elevationLayer,
      decorations: objectLayer,
      baseLayer,
      elevationLayer,
      objectLayer,
      collisionGrid,
      totalTilesPlaced: totalPlaced
    };
  }

  private overlapsPath(
    sx: number,
    sy: number,
    w: number,
    h: number,
    isPath: readonly (readonly boolean[])[]
  ): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = sx + dx;
        const py = sy + dy;
        if (py < isPath.length && px < (isPath[py]?.length ?? 0) && isPath[py]![px]) {
          return true;
        }
      }
    }
    return false;
  }

  private canStamp(
    objLayer: readonly (readonly (MapCell | null)[])[],
    elevLayer: readonly (readonly (MapCell | null)[])[],
    isPath: readonly (readonly boolean[])[],
    w: number,
    h: number,
    sx: number,
    sy: number
  ): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = sx + dx;
        const py = sy + dy;
        if (
          py >= objLayer.length ||
          px >= (objLayer[py]?.length ?? 0) ||
          objLayer[py]![px] !== null ||
          elevLayer[py]![px] !== null ||
          isPath[py]![px]
        ) {
          return false;
        }
      }
    }
    return true;
  }

  private stampMultitile(
    targetLayer: (MapCell | null)[][],
    collisionGrid: TileCollision[][],
    template: MultitileTemplate,
    startX: number,
    startY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    for (let r = 0; r < template.height; r++) {
      for (let c = 0; c < template.width; c++) {
        const gx = startX + c;
        const gy = startY + r;
        if (gx >= 0 && gx < mapWidth && gy >= 0 && gy < mapHeight) {
          const tileId = template.tiles[r]?.[c];
          if (tileId) {
            const coll = template.collision[r]?.[c] ?? false;
            targetLayer[gy]![gx] = this.makeCell(tileId, coll);
            collisionGrid[gy]![gx] = coll;
          }
        }
      }
    }
  }

  public stampStructure(
    targetMap: GeneratedMap,
    structureTemplate: StructureTemplate,
    gridX: number,
    gridY: number
  ): boolean {
    return stampStructure(targetMap, structureTemplate, gridX, gridY, this.registry);
  }

  private stampStructureInternal(
    targetElevationLayer: (MapCell | null)[][],
    collisionGrid: TileCollision[][],
    objectLayer: (MapCell | null)[][],
    template: StructureTemplate,
    startX: number,
    startY: number,
    mapWidth: number,
    mapHeight: number
  ): boolean {
    const { width: footW, height: footH } = template.footprint;
    if (startX < 0 || startY < 0 || startX + footW > mapWidth || startY + footH > mapHeight) {
      return false;
    }
    for (let r = 0; r < footH; r++) {
      for (let c = 0; c < footW; c++) {
        const tileId = template.tiles[r]?.[c];
        const col = template.collisionMask[r]?.[c] ?? 1;
        const gx = startX + c;
        const gy = startY + r;
        if (tileId) {
          const tileCol: TileCollision = col === 1 ? true : col === 2 ? 'water' : false;
          targetElevationLayer[gy]![gx] = this.makeCell(tileId, tileCol);
          collisionGrid[gy]![gx] = tileCol;
        }
        if (objectLayer[gy]) {
          objectLayer[gy]![gx] = null;
        }
      }
    }
    return true;
  }

  private registerStructureEntities(
    warps: MapWarp[],
    spawns: MapSpawn[],
    template: StructureTemplate,
    startX: number,
    startY: number,
    mapHeight: number,
    instanceSuffix: string = ''
  ): void {
    if (!template.interiorMapId) return;

    for (let r = 0; r < template.footprint.height; r++) {
      for (let c = 0; c < template.footprint.width; c++) {
        if (template.collisionMask[r]?.[c] === 0) {
          const doorX = startX + c;
          const doorY = startY + r;
          const targetSpawnId = template.defaultSpawnId ?? 'spawn_entrance';

          warps.push({
            x: doorX,
            y: doorY,
            targetMapId: template.interiorMapId,
            targetSpawnId
          });

          const stepY = doorY + 1;
          if (stepY < mapHeight) {
            spawns.push({
              id: `${template.id}${instanceSuffix}_exit`,
              x: doorX,
              y: stepY,
              direction: 'down'
            });
          }
        }
      }
    }
  }
}

/**
 * Clean main function exposed directly to the game engine
 */
export function generateProceduralMap(
  config: ProceduralMapOptions,
  registry: TilesRegistryService = defaultTilesRegistry
): GeneratedMap {
  const generator = new ProceduralMapGenerator(registry);
  return generator.generate(config);
}

/**
 * Declarative function to stamp a multitile structure template and overwrite
 * the collision matrix atomically in a single step.
 */
export function stampStructure(
  targetMap: GeneratedMap,
  structureTemplate: StructureTemplate,
  gridX: number,
  gridY: number,
  registry: TilesRegistryService = defaultTilesRegistry
): boolean {
  const { width: footW, height: footH } = structureTemplate.footprint;

  if (
    gridX < 0 ||
    gridY < 0 ||
    gridX + footW > targetMap.width ||
    gridY + footH > targetMap.height
  ) {
    return false;
  }

  const elev = targetMap.layers.elevation as (MapCell | null)[][];
  const colMat = targetMap.collisionMatrix as CollisionType[][];
  const colGrid = targetMap.collisionGrid as TileCollision[][] | undefined;
  const legacyElev = targetMap.elevationLayer as (MapCell | null)[][] | undefined;
  const decLayer = targetMap.layers.decorations as (MapCell | null)[][];
  const legacyDec = targetMap.objectLayer as (MapCell | null)[][] | undefined;

  for (let r = 0; r < footH; r++) {
    for (let c = 0; c < footW; c++) {
      const tileId = structureTemplate.tiles[r]?.[c];
      const col = structureTemplate.collisionMask[r]?.[c] ?? 1;
      const gx = gridX + c;
      const gy = gridY + r;

      if (tileId) {
        const entry = registry.getTileById(tileId);
        const filePath = entry ? entry.file_path : `/assets/tiles/decorations/${tileId}.png`;
        const tileCol: TileCollision = col === 1 ? true : col === 2 ? 'water' : false;
        const cell: MapCell = { tileId, filePath, collision: tileCol };

        const isProp = structureTemplate.id.startsWith('prop_');

        if (isProp) {
          decLayer[gy]![gx] = cell;
          if (legacyDec) {
            legacyDec[gy]![gx] = cell;
          }
        } else {
          elev[gy]![gx] = cell;
          if (legacyElev) {
            legacyElev[gy]![gx] = cell;
          }

          // Clear decorations/props so vegetation or rocks never clip into the building
          if (decLayer[gy]) {
            decLayer[gy]![gx] = null;
          }
          if (legacyDec?.[gy]) {
            legacyDec[gy]![gx] = null;
          }
        }
      }

      colMat[gy]![gx] = col;
      if (colGrid) {
        colGrid[gy]![gx] = col === 1 ? true : col === 2 ? 'water' : false;
      }
    }
  }

  // Register warps and exit spawns if interiorMapId is provided
  if (structureTemplate.interiorMapId && targetMap.entities) {
    const warps = targetMap.entities.warps as MapWarp[];
    const spawns = targetMap.entities.spawns as MapSpawn[];
    for (let r = 0; r < footH; r++) {
      for (let c = 0; c < footW; c++) {
        if (structureTemplate.collisionMask[r]?.[c] === 0) {
          const doorX = gridX + c;
          const doorY = gridY + r;
          warps.push({
            x: doorX,
            y: doorY,
            targetMapId: structureTemplate.interiorMapId,
            targetSpawnId: structureTemplate.defaultSpawnId ?? 'spawn_entrance'
          });
          const stepY = doorY + 1;
          if (stepY < targetMap.height) {
            spawns.push({
              id: `${structureTemplate.id}_exit`,
              x: doorX,
              y: stepY,
              direction: 'down'
            });
          }
        }
      }
    }
  }

  return true;
}

export { stampProp } from './propsPlacementEngine.ts';
