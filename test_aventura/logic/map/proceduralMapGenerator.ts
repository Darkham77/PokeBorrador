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
import type { CityGenerationConfig } from '../../types/map/adventureWorldTypes.ts';
import { generateUrbanLayout } from './urbanZoningEngine.ts';
import { createMulberry32 } from './noise/simplexNoise.ts';
import {
  DEFAULT_CITY_PROPS_DENSITY,
  STANDARD_GBA_TILE_SIZE,
  ROUTE_BRANCH_X_RATIO,
  ROUTE_TOWN_CENTER_EXCLUSION_RATIO,
  ROUTE_LEDGE_NORTH_RATIO,
  ROUTE_LEDGE_SOUTH_RATIO
} from '../../config/proceduralMapConfig.ts';

export type {
  CollisionType,
  MapType,
  MapWarp,
  MapSpawn,
  MapEntities,
  PlacedStructure,
  ProceduralMapOptions,
  MapCell,
  ProceduralMapLayers,
  GeneratedMap
} from '../../types/map/proceduralMapTypes.ts';
import type {
  MapWarp,
  MapSpawn,
  ProceduralMapOptions,
  MapCell,
  GeneratedMap
} from '../../types/map/proceduralMapTypes.ts';
import { stampStructure } from './structureStamper.ts';
import { resolvePathAutotiling } from './proceduralAutotileEngine.ts';
import {
  stampOrganicWaterBodies,
  stampElevationCliffsAndCones
} from './proceduralTopographyEngine.ts';
import { stampPerimeterForestAndCanopy } from './proceduralForestEngine.ts';
import { stampFloraLedgesAndProps } from './proceduralFloraEngine.ts';
import {
  resolveMapSettings,
  initBaseLayers,
  clearBiomeMaskPaths,
  stampCustomStructures,
  carveRouteCorridors,
  enforcePathClearance,
  buildCollisionMatrix,
  resolveMapSpawns,
  countTotalTilesPlaced
} from './proceduralMapHelpers.ts';


import {
  CANONICAL_PALETTES,
  getBiomePalette,
  type Autotile9Slice,
  type MultitileTemplate,
  type ThemeBiomePalette
} from './proceduralBiomePalettes.ts';
export {
  CANONICAL_PALETTES,
  getBiomePalette,
  type Autotile9Slice,
  type MultitileTemplate,
  type ThemeBiomePalette
};

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
    const {
      width,
      height,
      seed,
      theme,
      mapType,
      withTown,
      withWater,
      withHills,
      withVegetation,
      waterPercent,
      mountainPercent,
      forestPercent
    } = resolveMapSettings(options);

    const prng = createMulberry32(seed);
    const palette = CANONICAL_PALETTES[theme] ?? CANONICAL_PALETTES.firered;

    const warps: MapWarp[] = [];
    const spawns: MapSpawn[] = [];

    // 1. Initialize Base Layer (Homogeneous base grass without borders)
    const { baseLayer, elevationLayer, objectLayer, collisionGrid } = initBaseLayers(
      width,
      height,
      palette,
      prng,
      (tileId, collision) => this.makeCell(tileId, collision)
    );

    // 2. Carve Paths with Autotiling 9-Slice (Parallel borders & open endpoints)
    const midY = Math.floor(height / 2);
    const branchX = Math.floor(width * ROUTE_BRANCH_X_RATIO);
    const isPathCell: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

    if (mapType === 'route') {
      carveRouteCorridors(width, height, prng, isPathCell);
    }

    // Resolve Path Autotiling for each cell
    resolvePathAutotiling(isPathCell, palette, baseLayer, width, height, (t, c) => this.makeCell(t, c));

    // 3. Town Pass (Intelligent Urban Zoning: Streets, Lots, Civic & Residential Allocation)
    if (withTown) {
      const cityConfig: CityGenerationConfig = {
        scale: options.cityConfig?.scale ?? 'town',
        buildingDensity: options.cityConfig?.buildingDensity ?? 7,
        includeGym: options.cityConfig?.includeGym ?? true,
        includeLab: options.cityConfig?.includeLab ?? false,
        plazaType: options.cityConfig?.plazaType ?? 'fountain',
        propsDensity: options.cityConfig?.propsDensity ?? options.propsDensity ?? DEFAULT_CITY_PROPS_DENSITY,
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
      resolvePathAutotiling(isPathCell, palette, baseLayer, width, height, (t, c) => this.makeCell(t, c));
    }

    // 3.5 Compute Organic Biome Distribution via Simplex Noise FBM & Quantile Thresholding
    const centerExclusion = withTown
      ? { x: branchX, y: midY, radius: Math.floor(Math.min(width, height) * ROUTE_TOWN_CENTER_EXCLUSION_RATIO) }
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
    clearBiomeMaskPaths(biomeDist, isPathCell, elevationLayer, width, height);

    // 4. Stamp Organic 9-Slice Water Bodies governed by Biome Distribution Engine
    stampOrganicWaterBodies({
      withWater,
      width,
      height,
      biomeDist,
      isPathCell,
      elevationLayer,
      collisionGrid,
      palette,
      makeCell: (t, c) => this.makeCell(t, c)
    });

    // 5. Stamp Authentic GBA Elevation Cliffs or Cones governed by Biome Distribution Engine
    stampElevationCliffsAndCones({
      withHills,
      withTown,
      width,
      height,
      mountainPercent,
      biomeDist,
      isPathCell,
      elevationLayer,
      objectLayer,
      collisionGrid,
      palette,
      makeCell: (t, c) => this.makeCell(t, c)
    });

    // 6. Perimeter Forest Border & Dense Wilderness Canopy
    stampPerimeterForestAndCanopy({
      withVegetation,
      width,
      height,
      mapType,
      withTown,
      palette,
      biomeDist,
      isPathCell,
      elevationLayer,
      objectLayer,
      collisionGrid,
      makeCell: (t, c) => this.makeCell(t, c)
    });

      // 7.5 - 10.5 Jumpable Ledges, Tall Grass, Flowers, Bushes & Route Scenic Props
      const ledgeY1 = Math.floor(height * ROUTE_LEDGE_NORTH_RATIO);
      const ledgeY2 = Math.floor(height * ROUTE_LEDGE_SOUTH_RATIO);
      const candidateLedgeRows = [ledgeY1, ledgeY1 + 1, ledgeY1 - 1, ledgeY2, ledgeY2 + 1, ledgeY2 - 1];

      stampFloraLedgesAndProps({
        width,
        height,
        midY,
        seed,
        prng,
        mapType,
        withTown,
        candidateLedgeRows,
        palette,
        isPathCell,
        baseLayer,
        elevationLayer,
        objectLayer,
        collisionGrid,
        warps,
        spawns,
        propsDensity: options.propsDensity,
        includeFences: options.includeFences,
        makeCell: (t, c) => this.makeCell(t, c)
      });

    // 11. Custom Predefined Multitile Structures (if specified in options)
    stampCustomStructures({
      structures: options.structures,
      elevationLayer,
      collisionGrid,
      objectLayer,
      width,
      height,
      registry: this.registry,
      warps,
      spawns
    });

    // 12. Enforce Master Path Invariant: paths must be strictly clear and transitable
    enforcePathClearance(isPathCell, objectLayer, elevationLayer, collisionGrid, width, height);

    // Build numeric collision matrix: 0: transitable, 1: obstacle, 2: water, 3: ledge
    const collisionMatrix = buildCollisionMatrix(collisionGrid, width, height);

    // 13. Player and Navigation Spawns
    resolveMapSpawns({
      mapType,
      withTown,
      width,
      height,
      branchX,
      midY,
      isPathCell,
      spawns
    });

    const totalPlaced = countTotalTilesPlaced(elevationLayer, objectLayer, width, height);

    return {
      width,
      height,
      tileSize: STANDARD_GBA_TILE_SIZE,
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

  public stampStructure(
    targetMap: GeneratedMap,
    structureTemplate: StructureTemplate,
    gridX: number,
    gridY: number
  ): boolean {
    return stampStructure(targetMap, structureTemplate, gridX, gridY, this.registry);
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

export { stampStructure } from './structureStamper.ts';

