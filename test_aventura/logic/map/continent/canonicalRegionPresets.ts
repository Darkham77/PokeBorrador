/**
 * test_aventura/logic/map/continent/canonicalRegionPresets.ts
 *
 * CANONICAL POKÉMON REGIONAL PRESET GENERATOR (KANTO & JOHTO)
 *
 * Generates 100% authentic regional geography, canonical settlements in exact
 * geographic coordinates, authentic route network (including sea crossings for Surf),
 * autotiled coastlines/mountains, and full GBA urban layouts.
 */

import type {
  ContinentMapResult,
  ContinentCellDetails
} from '../continentGenerator.ts';
import {
  resolveWaterCoastGrid,
  type WaterTerrainKind,
  type WaterTerrainMatrix
} from '../waterAutotileEngine.ts';
import {
  resolveMountainMapGrid,
  type MountainPalette,
  type MountainStairLocation
} from '../mountainAutotileEngine.ts';
import { clusterMountainMassifs } from '../geologicalClusterEngine.ts';
import { synthesizeMacroBiomes } from '../macroBiomeSynthesizer.ts';
import { resolveMacroBiomeAutotile } from '../macroBiomeAutotileEngine.ts';
import { generateSettlementLayout } from '../cityLayoutEngine.ts';
import { computeTransitableGrid } from '../transitableGridEngine.ts';
import { generateWildernessLayer } from '../wildernessVegetationEngine.ts';
import {
  buildZeroCopyPreviewBuffer,
  type RegionalGenerationPipelineResult
} from '../continentGenerator.worker.ts';
import type {
  POINode,
  RouteEdge,
  RouteWaypoint
} from '../../../types/map/poiTypes.ts';
import {
  sculptOrganicIsland,
  sculptArchipelagoChain,
  applyNaturalBeaches,
  sampleCoastalDisplacement
} from './coastalFractalEngine.ts';
import {
  carveOrganicLake,
  carveRiverSystem,
  stampBridgesOnWaterIntersections
} from './riverHydrographyEngine.ts';
import { findPathAStar, computeOceanGrid } from '../routePathfinding.ts';
import { SimplexNoise, fbm2D } from '../noise/simplexNoise.ts';
import type { ResolvedRouteNetworkResult } from '../routeNetworkEngine.ts';
import { stampPortDockPier } from '../portDockPierEngine.ts';
import {
  KANTO_BLUEPRINTS,
  JOHTO_BLUEPRINTS,
  KANTO_ROUTES,
  JOHTO_ROUTES,
  type CanonicalPresetId
} from '../../../data/map/canonicalRegionData.ts';
import {
  KANTO_TERRAIN_CONFIG,
  JOHTO_TERRAIN_CONFIG,
  ROUTE_WAYPOINTS_CONFIG
} from '../../../config/canonicalRegionTerrainConfig.ts';

export type { CanonicalPresetId };

// ---------------------------------------------------------------------------
// Regional Sizing & Seed Constants
// ---------------------------------------------------------------------------

const KANTO_MAP_DIMENSION = 256 as const;
const JOHTO_MAP_DIMENSION = 128 as const;
const KANTO_PRESET_SEED = 151 as const;
const JOHTO_PRESET_SEED = 251 as const;
const DEFAULT_FALLBACK_ROUTE_DISTANCE = 10 as const;

// ---------------------------------------------------------------------------
// 1. Vector Geometry Helpers
// ---------------------------------------------------------------------------

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// ---------------------------------------------------------------------------
// 2. Kanto Regional Terrain Sculptor
// ---------------------------------------------------------------------------

function sculptKantoTerrain(
  W: number,
  H: number
): { readonly terrainMatrix: WaterTerrainMatrix; readonly heightmap: number[][] } {
  const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const noise = new SimplexNoise(KANTO_PRESET_SEED);

  // 1. Continental Mainland with Organic, Naturally Sculpted Geography:
  for (let y = KANTO_TERRAIN_CONFIG.MAINLAND_MIN_Y; y <= KANTO_TERRAIN_CONFIG.MAINLAND_MAX_Y; y++) {
    // A) Define baseline west coast based on latitude y
    let baseWestX: number;
    if (y <= KANTO_TERRAIN_CONFIG.WEST_INDIGO_MAX_Y) {
      baseWestX = KANTO_TERRAIN_CONFIG.WEST_INDIGO_BASE_X;
    } else if (y <= KANTO_TERRAIN_CONFIG.WEST_GULF_MAX_Y) {
      const t = (y - KANTO_TERRAIN_CONFIG.WEST_INDIGO_MAX_Y) / KANTO_TERRAIN_CONFIG.WEST_GULF_SPAN_Y;
      baseWestX = KANTO_TERRAIN_CONFIG.WEST_INDIGO_BASE_X + Math.sin(t * Math.PI) * KANTO_TERRAIN_CONFIG.WEST_GULF_SWEEP_AMPLITUDE;
    } else if (y <= KANTO_TERRAIN_CONFIG.WEST_ROUTE22_MAX_Y) {
      baseWestX = KANTO_TERRAIN_CONFIG.WEST_ROUTE22_BASE_X;
    } else if (y <= KANTO_TERRAIN_CONFIG.WEST_WOODS_MAX_Y) {
      baseWestX = KANTO_TERRAIN_CONFIG.WEST_WOODS_BASE_X;
    } else {
      baseWestX = KANTO_TERRAIN_CONFIG.WEST_PALLET_SOUTH_BASE_X;
    }

    // B) Define baseline east coast based on latitude y
    let baseEastX: number;
    if (y <= KANTO_TERRAIN_CONFIG.EAST_CAPE_MAX_Y) {
      baseEastX = KANTO_TERRAIN_CONFIG.EAST_CAPE_BASE_X;
    } else if (y <= KANTO_TERRAIN_CONFIG.EAST_ROCK_TUNNEL_MAX_Y) {
      baseEastX = KANTO_TERRAIN_CONFIG.EAST_ROCK_TUNNEL_BASE_X;
    } else if (y <= KANTO_TERRAIN_CONFIG.EAST_LAVENDER_MAX_Y) {
      baseEastX = KANTO_TERRAIN_CONFIG.EAST_LAVENDER_BASE_X;
    } else if (y <= KANTO_TERRAIN_CONFIG.EAST_COASTAL_MAX_Y) {
      const t = (y - KANTO_TERRAIN_CONFIG.EAST_LAVENDER_MAX_Y) / KANTO_TERRAIN_CONFIG.EAST_COASTAL_SPAN_Y;
      baseEastX = KANTO_TERRAIN_CONFIG.EAST_LAVENDER_BASE_X - t * KANTO_TERRAIN_CONFIG.EAST_COASTAL_TAPER;
    } else {
      baseEastX = KANTO_TERRAIN_CONFIG.EAST_FUCHSIA_BASE_X;
    }

    // Multi-octave fractal displacement
    const westOffset = sampleCoastalDisplacement(noise, baseWestX, y, {
      amplitude: KANTO_TERRAIN_CONFIG.COAST_NOISE_AMPLITUDE,
      scale: KANTO_TERRAIN_CONFIG.COAST_NOISE_SCALE
    });
    const eastOffset = sampleCoastalDisplacement(noise, baseEastX, y, {
      amplitude: KANTO_TERRAIN_CONFIG.COAST_NOISE_AMPLITUDE,
      scale: KANTO_TERRAIN_CONFIG.COAST_NOISE_SCALE
    });

    const westX = Math.max(KANTO_TERRAIN_CONFIG.BORDER_PADDING, Math.round(baseWestX + westOffset));
    const eastX = Math.min(W - KANTO_TERRAIN_CONFIG.BORDER_PADDING, Math.round(baseEastX + eastOffset));

    for (let x = westX; x <= eastX; x++) {
      // 0. Northern ocean undulating falloff
      const northDisplacement = sampleCoastalDisplacement(noise, x, KANTO_TERRAIN_CONFIG.NORTH_OCEAN_REF_Y, {
        amplitude: KANTO_TERRAIN_CONFIG.NORTH_OCEAN_AMP,
        scale: KANTO_TERRAIN_CONFIG.NORTH_OCEAN_SCALE
      });
      if (y < KANTO_TERRAIN_CONFIG.MAINLAND_MIN_Y + northDisplacement) continue;

      // 1. Northwest ocean falloff (north of Indigo)
      if (y < KANTO_TERRAIN_CONFIG.NW_OCEAN_MAX_Y && x < KANTO_TERRAIN_CONFIG.NW_OCEAN_MAX_X) {
        if (Math.hypot(x - KANTO_TERRAIN_CONFIG.NW_OCEAN_CENTER_X, y - KANTO_TERRAIN_CONFIG.NW_OCEAN_CENTER_Y) > KANTO_TERRAIN_CONFIG.NW_OCEAN_RADIUS) continue;
      }

      // 2. Cerulean Bay
      if (y < KANTO_TERRAIN_CONFIG.CERULEAN_BAY_MAX_Y && x < KANTO_TERRAIN_CONFIG.CERULEAN_BAY_MAX_X) {
        const capeDist = Math.hypot(
          (x - KANTO_TERRAIN_CONFIG.CERULEAN_BAY_CENTER_X) / KANTO_TERRAIN_CONFIG.CERULEAN_BAY_RADIUS_X,
          (y - KANTO_TERRAIN_CONFIG.CERULEAN_BAY_CENTER_Y) / KANTO_TERRAIN_CONFIG.CERULEAN_BAY_RADIUS_Y
        );
        if (capeDist > 1.0 && y < KANTO_TERRAIN_CONFIG.CERULEAN_BAY_INNER_Y && x > KANTO_TERRAIN_CONFIG.CERULEAN_BAY_MIN_X) continue;
      }

      // 3. Cerulean Cape eastern ocean
      if (y < KANTO_TERRAIN_CONFIG.EAST_CAPE_MAX_Y && x > KANTO_TERRAIN_CONFIG.EAST_CAPE_BASE_X) continue;

      // 4. Vermilion Bay & Harbor
      if (y >= KANTO_TERRAIN_CONFIG.VERMILION_BAY_MIN_Y && x >= KANTO_TERRAIN_CONFIG.VERMILION_BAY_MIN_X && x <= KANTO_TERRAIN_CONFIG.VERMILION_BAY_MAX_X) {
        const bayNoise = fbm2D(noise, x * KANTO_TERRAIN_CONFIG.VERMILION_BAY_NOISE_SCALE, y * KANTO_TERRAIN_CONFIG.VERMILION_BAY_NOISE_SCALE, { octaves: 2 }) * 2;
        const leftShore = KANTO_TERRAIN_CONFIG.VERMILION_BAY_LEFT_SHORE + Math.sin((y - KANTO_TERRAIN_CONFIG.VERMILION_BAY_MIN_Y) * KANTO_TERRAIN_CONFIG.VERMILION_BAY_FREQ_LEFT) * 2 + bayNoise;
        const rightShore = KANTO_TERRAIN_CONFIG.VERMILION_BAY_RIGHT_SHORE - Math.sin((y - KANTO_TERRAIN_CONFIG.VERMILION_BAY_MIN_Y) * KANTO_TERRAIN_CONFIG.VERMILION_BAY_FREQ_RIGHT) * 2 - bayNoise;
        if (x >= leftShore && x <= rightShore) continue;
      }

      // 5. Cycling Road Marine Sound
      if (y >= KANTO_TERRAIN_CONFIG.SOUND_MIN_Y && y <= KANTO_TERRAIN_CONFIG.SOUND_MAX_Y && x >= KANTO_TERRAIN_CONFIG.SOUND_MIN_X && x <= KANTO_TERRAIN_CONFIG.SOUND_MAX_X) {
        const soundDist = Math.hypot(
          (x - KANTO_TERRAIN_CONFIG.SOUND_CENTER_X) / KANTO_TERRAIN_CONFIG.SOUND_RADIUS_X,
          (y - KANTO_TERRAIN_CONFIG.SOUND_CENTER_Y) / KANTO_TERRAIN_CONFIG.SOUND_RADIUS_Y
        );
        const soundNoise = fbm2D(noise, x * KANTO_TERRAIN_CONFIG.SOUND_NOISE_SCALE, y * KANTO_TERRAIN_CONFIG.SOUND_NOISE_SCALE, { octaves: 2 }) * KANTO_TERRAIN_CONFIG.SOUND_NOISE_WEIGHT;
        if (soundDist + soundNoise < 1.0 || (y >= KANTO_TERRAIN_CONFIG.SOUND_OUTLET_MIN_Y && x <= KANTO_TERRAIN_CONFIG.SOUND_OUTLET_MAX_X)) continue;
      }

      // 6. South Sea Channel
      if (y >= KANTO_TERRAIN_CONFIG.SOUTH_SEA_MIN_Y && x >= KANTO_TERRAIN_CONFIG.SOUTH_SEA_MIN_X && x <= KANTO_TERRAIN_CONFIG.SOUTH_SEA_MAX_X) {
        continue;
      }

      // 7. Route 21 Open Ocean
      if (y > KANTO_TERRAIN_CONFIG.ROUTE21_MIN_Y && x <= KANTO_TERRAIN_CONFIG.ROUTE21_MAX_X) {
        continue;
      }

      terrain[y]![x] = 'grass';
    }
  }

  // 1b. Route 23 Inland Valley Corridor
  for (let y = KANTO_TERRAIN_CONFIG.VALLEY_MIN_Y; y <= KANTO_TERRAIN_CONFIG.VALLEY_MAX_Y; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.VALLEY_MIN_X; x <= KANTO_TERRAIN_CONFIG.VALLEY_MAX_X; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // 2. Cerulean Cape Peninsula
  for (let y = KANTO_TERRAIN_CONFIG.CAPE_MIN_Y; y <= KANTO_TERRAIN_CONFIG.CAPE_MAX_Y; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.CAPE_MIN_X; x <= KANTO_TERRAIN_CONFIG.CAPE_MAX_X; x++) {
      const capeDisplacement = sampleCoastalDisplacement(noise, x, y, {
        amplitude: KANTO_TERRAIN_CONFIG.CAPE_AMP,
        scale: KANTO_TERRAIN_CONFIG.CAPE_SCALE
      });
      if (y >= KANTO_TERRAIN_CONFIG.CAPE_START_Y + capeDisplacement && y <= KANTO_TERRAIN_CONFIG.CAPE_END_Y) {
        terrain[y]![x] = 'grass';
      }
    }
  }

  // 3. Cinnabar Island
  sculptOrganicIsland(
    terrain,
    KANTO_TERRAIN_CONFIG.CINNABAR_ISLAND_X,
    KANTO_TERRAIN_CONFIG.CINNABAR_ISLAND_Y,
    {
      radiusX: KANTO_TERRAIN_CONFIG.CINNABAR_ISLAND_RADIUS_X,
      radiusY: KANTO_TERRAIN_CONFIG.CINNABAR_ISLAND_RADIUS_Y,
      roughness: KANTO_TERRAIN_CONFIG.CINNABAR_ISLAND_ROUGHNESS,
      angleRad: KANTO_TERRAIN_CONFIG.CINNABAR_ISLAND_ANGLE
    },
    KANTO_PRESET_SEED
  );

  for (let y = KANTO_TERRAIN_CONFIG.CINNABAR_TOWN_MIN_Y; y <= KANTO_TERRAIN_CONFIG.CINNABAR_TOWN_MAX_Y; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.CINNABAR_TOWN_MIN_X; x <= KANTO_TERRAIN_CONFIG.CINNABAR_TOWN_MAX_X; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // Volcanic caldera plateau in northern half of Cinnabar town
  for (let y = KANTO_TERRAIN_CONFIG.CINNABAR_PLATEAU_MIN_Y; y <= KANTO_TERRAIN_CONFIG.CINNABAR_PLATEAU_MAX_Y; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.CINNABAR_PLATEAU_MIN_X; x <= KANTO_TERRAIN_CONFIG.CINNABAR_PLATEAU_MAX_X; x++) {
      heightmap[y]![x] = 1;
    }
  }
  for (let y = KANTO_TERRAIN_CONFIG.CINNABAR_GROUND_MIN_Y; y <= KANTO_TERRAIN_CONFIG.CINNABAR_GROUND_MAX_Y; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.CINNABAR_GROUND_MIN_X; x <= KANTO_TERRAIN_CONFIG.CINNABAR_GROUND_MAX_X; x++) {
      heightmap[y]![x] = 0;
    }
  }

  // 4. Seafoam Islands
  sculptArchipelagoChain(
    terrain,
    [
      KANTO_TERRAIN_CONFIG.SEAFOAM_ISLET_1,
      KANTO_TERRAIN_CONFIG.SEAFOAM_ISLET_2,
      KANTO_TERRAIN_CONFIG.SEAFOAM_ISLET_3
    ],
    KANTO_TERRAIN_CONFIG.SEAFOAM_SEED
  );

  // 5. Global Hydrography
  carveRiverSystem(
    terrain,
    {
      id: 'cerulean_river',
      name: 'Río Celeste',
      points: [...KANTO_TERRAIN_CONFIG.RIVER_POINTS],
      width: KANTO_TERRAIN_CONFIG.RIVER_WIDTH,
      meanderRoughness: KANTO_TERRAIN_CONFIG.RIVER_MEANDER
    },
    KANTO_TERRAIN_CONFIG.RIVER_SEED
  );

  carveOrganicLake(terrain, KANTO_TERRAIN_CONFIG.VIRIDIAN_POND.x, KANTO_TERRAIN_CONFIG.VIRIDIAN_POND.y, KANTO_TERRAIN_CONFIG.VIRIDIAN_POND.radius, KANTO_TERRAIN_CONFIG.VIRIDIAN_POND.roughness, KANTO_TERRAIN_CONFIG.VIRIDIAN_POND.seed);
  carveOrganicLake(terrain, KANTO_TERRAIN_CONFIG.ROUTE22_POND.x, KANTO_TERRAIN_CONFIG.ROUTE22_POND.y, KANTO_TERRAIN_CONFIG.ROUTE22_POND.radius, KANTO_TERRAIN_CONFIG.ROUTE22_POND.roughness, KANTO_TERRAIN_CONFIG.ROUTE22_POND.seed);

  applyNaturalBeaches(terrain);

  // 7. Continuous Mountain Cordilleras: Northern & Western Frontier Spines
  for (let y = KANTO_TERRAIN_CONFIG.BORDER_PADDING; y < H - KANTO_TERRAIN_CONFIG.BORDER_PADDING; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.BORDER_PADDING; x < W - KANTO_TERRAIN_CONFIG.BORDER_PADDING; x++) {
      if (terrain[y]![x] !== 'grass') continue;

      if (KANTO_TERRAIN_CONFIG.FLAT_RESERVES.some((r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2)) {
        continue;
      }

      let minDistNorth = Infinity;
      for (let i = 0; i < KANTO_TERRAIN_CONFIG.NORTHERN_SPINE.length - 1; i++) {
        const p1 = KANTO_TERRAIN_CONFIG.NORTHERN_SPINE[i]!;
        const p2 = KANTO_TERRAIN_CONFIG.NORTHERN_SPINE[i + 1]!;
        const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < minDistNorth) minDistNorth = d;
      }

      let minDistWest = Infinity;
      for (let i = 0; i < KANTO_TERRAIN_CONFIG.WESTERN_SPINE.length - 1; i++) {
        const p1 = KANTO_TERRAIN_CONFIG.WESTERN_SPINE[i]!;
        const p2 = KANTO_TERRAIN_CONFIG.WESTERN_SPINE[i + 1]!;
        const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < minDistWest) minDistWest = d;
      }

      const mNoise = fbm2D(noise, x * KANTO_TERRAIN_CONFIG.MOUNTAIN_NOISE_SCALE, y * KANTO_TERRAIN_CONFIG.MOUNTAIN_NOISE_SCALE, { octaves: 2 }) * KANTO_TERRAIN_CONFIG.MOUNTAIN_NOISE_WEIGHT;

      if (minDistNorth + mNoise < KANTO_TERRAIN_CONFIG.NORTH_RIDGE_MAX_DIST) {
        heightmap[y]![x] = 1;
      }

      if (minDistWest + mNoise < KANTO_TERRAIN_CONFIG.WEST_RIDGE_MAX_DIST) {
        heightmap[y]![x] = 1;
      }

      if (Math.hypot((x - KANTO_TERRAIN_CONFIG.INDIGO_MASSIF.cx) / KANTO_TERRAIN_CONFIG.INDIGO_MASSIF.rx, (y - KANTO_TERRAIN_CONFIG.INDIGO_MASSIF.cy) / KANTO_TERRAIN_CONFIG.INDIGO_MASSIF.ry) + mNoise * KANTO_TERRAIN_CONFIG.MASSIF_NOISE_WEIGHT < 1.0) {
        heightmap[y]![x] = 1;
      }

      if (Math.hypot((x - KANTO_TERRAIN_CONFIG.MT_MOON_MASSIF.cx) / KANTO_TERRAIN_CONFIG.MT_MOON_MASSIF.rx, (y - KANTO_TERRAIN_CONFIG.MT_MOON_MASSIF.cy) / KANTO_TERRAIN_CONFIG.MT_MOON_MASSIF.ry) + mNoise * KANTO_TERRAIN_CONFIG.MASSIF_NOISE_WEIGHT < 1.0) {
        heightmap[y]![x] = 1;
      }

      if (Math.hypot((x - KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_MASSIF.cx) / KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_MASSIF.rx, (y - KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_MASSIF.cy) / KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_MASSIF.ry) + mNoise * KANTO_TERRAIN_CONFIG.MASSIF_NOISE_WEIGHT < 1.0) {
        heightmap[y]![x] = 1;
      }
    }
  }

  // 8. Cave Niches
  interface CaveNicheBoundary {
    readonly minY: number;
    readonly maxY: number;
    readonly minX: number;
    readonly maxX: number;
  }

  const applyCaveNiche = (cliff: CaveNicheBoundary, ground: CaveNicheBoundary, cliffElev = 1, groundElev = 0): void => {
    for (let y = cliff.minY; y <= cliff.maxY; y++) {
      for (let x = cliff.minX; x <= cliff.maxX; x++) {
        if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = cliffElev;
      }
    }
    for (let y = ground.minY; y <= ground.maxY; y++) {
      for (let x = ground.minX; x <= ground.maxX; x++) {
        if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = groundElev;
      }
    }
  };

  applyCaveNiche(KANTO_TERRAIN_CONFIG.MT_MOON_WEST_CLIFF, KANTO_TERRAIN_CONFIG.MT_MOON_WEST_GROUND);
  applyCaveNiche(KANTO_TERRAIN_CONFIG.MT_MOON_EAST_CLIFF, KANTO_TERRAIN_CONFIG.MT_MOON_EAST_GROUND);

  for (let y = KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_CLIFF.minY; y <= KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_CLIFF.maxY; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_CLIFF.minX; x <= KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_CLIFF.maxX; x++) {
      terrain[y]![x] = 'grass';
      heightmap[y]![x] = 1;
    }
  }
  for (let y = KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_GROUND.minY; y <= KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_GROUND.maxY; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_GROUND.minX; x <= KANTO_TERRAIN_CONFIG.ROCK_TUNNEL_NORTH_GROUND.maxX; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 0;
    }
  }

  applyCaveNiche(KANTO_TERRAIN_CONFIG.DIGLETT_CLIFF, KANTO_TERRAIN_CONFIG.DIGLETT_GROUND);
  applyCaveNiche(KANTO_TERRAIN_CONFIG.VICTORY_ROAD_LOWER_CLIFF, KANTO_TERRAIN_CONFIG.VICTORY_ROAD_LOWER_GROUND);
  applyCaveNiche(KANTO_TERRAIN_CONFIG.VICTORY_ROAD_UPPER_RIDGE, KANTO_TERRAIN_CONFIG.VICTORY_ROAD_UPPER_PLATEAU, 2, 1);

  for (let y = KANTO_TERRAIN_CONFIG.POWER_PLANT_CHANNEL.minY; y <= KANTO_TERRAIN_CONFIG.POWER_PLANT_CHANNEL.maxY; y++) {
    for (let x = KANTO_TERRAIN_CONFIG.POWER_PLANT_CHANNEL.minX; x <= KANTO_TERRAIN_CONFIG.POWER_PLANT_CHANNEL.maxX; x++) {
      terrain[y]![x] = 'water';
    }
  }

  return { terrainMatrix: terrain as WaterTerrainMatrix, heightmap };
}

// ---------------------------------------------------------------------------
// 3. Johto Regional Terrain Sculptor
// ---------------------------------------------------------------------------

function sculptJohtoTerrain(
  W: number,
  H: number
): { readonly terrainMatrix: WaterTerrainMatrix; readonly heightmap: number[][] } {
  const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));

  for (let y = JOHTO_TERRAIN_CONFIG.MAINLAND_MIN_Y; y <= JOHTO_TERRAIN_CONFIG.MAINLAND_MAX_Y; y++) {
    for (let x = JOHTO_TERRAIN_CONFIG.MAINLAND_MIN_X; x <= JOHTO_TERRAIN_CONFIG.MAINLAND_MAX_X; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  for (let y = JOHTO_TERRAIN_CONFIG.CIANWOOD_MIN_Y; y <= JOHTO_TERRAIN_CONFIG.CIANWOOD_MAX_Y; y++) {
    for (let x = JOHTO_TERRAIN_CONFIG.CIANWOOD_MIN_X; x <= JOHTO_TERRAIN_CONFIG.CIANWOOD_MAX_X; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  for (let y = JOHTO_TERRAIN_CONFIG.WHIRL_MIN_Y; y <= JOHTO_TERRAIN_CONFIG.WHIRL_MAX_Y; y++) {
    for (let x = JOHTO_TERRAIN_CONFIG.WHIRL_MIN_X; x <= JOHTO_TERRAIN_CONFIG.WHIRL_MAX_X; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  for (let y = JOHTO_TERRAIN_CONFIG.LAKE_RAGE_MIN_Y; y <= JOHTO_TERRAIN_CONFIG.LAKE_RAGE_MAX_Y; y++) {
    for (let x = JOHTO_TERRAIN_CONFIG.LAKE_RAGE_MIN_X; x <= JOHTO_TERRAIN_CONFIG.LAKE_RAGE_MAX_X; x++) {
      terrain[y]![x] = 'water';
    }
  }

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (terrain[y]![x] === 'grass') {
        const touchesWater =
          terrain[y - 1]![x] === 'water' ||
          terrain[y + 1]![x] === 'water' ||
          terrain[y]![x - 1] === 'water' ||
          terrain[y]![x + 1] === 'water';
        if (touchesWater) {
          terrain[y]![x] = 'sand';
        }
      }
    }
  }

  for (let y = JOHTO_TERRAIN_CONFIG.MT_SILVER_MIN_Y; y <= JOHTO_TERRAIN_CONFIG.MT_SILVER_MAX_Y; y++) {
    for (let x = JOHTO_TERRAIN_CONFIG.MT_SILVER_MIN_X; x <= JOHTO_TERRAIN_CONFIG.MT_SILVER_MAX_X; x++) {
      heightmap[y]![x] = 1;
      terrain[y]![x] = 'grass';
    }
  }

  for (let y = JOHTO_TERRAIN_CONFIG.MT_MORTAR_MIN_Y; y <= JOHTO_TERRAIN_CONFIG.MT_MORTAR_MAX_Y; y++) {
    for (let x = JOHTO_TERRAIN_CONFIG.MT_MORTAR_MIN_X; x <= JOHTO_TERRAIN_CONFIG.MT_MORTAR_MAX_X; x++) {
      heightmap[y]![x] = 1;
      terrain[y]![x] = 'grass';
    }
  }

  return { terrainMatrix: terrain as WaterTerrainMatrix, heightmap };
}

// ---------------------------------------------------------------------------
// 4. Master Canonical Region Pipeline Builder
// ---------------------------------------------------------------------------

export function buildCanonicalRegionMap(
  presetId: CanonicalPresetId,
  customSeed?: number
): RegionalGenerationPipelineResult {
  const W = presetId === 'kanto' ? KANTO_MAP_DIMENSION : JOHTO_MAP_DIMENSION;
  const H = presetId === 'kanto' ? KANTO_MAP_DIMENSION : JOHTO_MAP_DIMENSION;
  const seed = customSeed ?? (presetId === 'kanto' ? KANTO_PRESET_SEED : JOHTO_PRESET_SEED);
  const blueprints = presetId === 'kanto' ? KANTO_BLUEPRINTS : JOHTO_BLUEPRINTS;
  const routeBlueprints = presetId === 'kanto' ? KANTO_ROUTES : JOHTO_ROUTES;

  // 1. Sculpt authentic terrain & heightmap
  const { terrainMatrix, heightmap } =
    presetId === 'kanto' ? sculptKantoTerrain(W, H) : sculptJohtoTerrain(W, H);

  // 2. Autotile water and mountains
  const resolvedWater = resolveWaterCoastGrid(terrainMatrix);
  const macroBiomes = synthesizeMacroBiomes({ width: W, height: H, seed, terrainMatrix });
  const geologicalClusters = clusterMountainMassifs({
    elevationMatrix: heightmap,
    macroBiomeGrid: macroBiomes.biomeGrid,
    seed,
    defaultPalette: 'brown'
  });
  const placedStairs: MountainStairLocation[] =
    presetId === 'kanto'
      ? [
          { x: 53, y: 221 }
        ]
      : [];
  const mountainResult = resolveMountainMapGrid(heightmap, {
    palette: 'brown',
    paletteMatrix: geologicalClusters.paletteMatrix,
    stairs: placedStairs
  });
  const resolvedMacroBiomes = resolveMacroBiomeAutotile(
    macroBiomes.biomeGrid,
    terrainMatrix,
    heightmap
  );

  // 3. Assemble cell details
  const cells: ContinentCellDetails[][] = Array.from({ length: H }, () => Array(W));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const terrain = terrainMatrix[y]![x]!;
      const elev = heightmap[y]![x]!;
      const waterCell = resolvedWater.cellDetails[y]![x];
      const mtnCell = mountainResult.cellDetails[y]![x];
      const layerStack: string[] = []; // no-domain: Procedural adventure layer

      let isWalkable = true;
      if (terrain === 'water' && waterCell?.role === 'center') {
        isWalkable = false;
      }

      if (elev > 0) {
        layerStack.push('poke_cliff_brown_plateau_rock.png');
      } else if (waterCell && waterCell.terrain !== 'grass') {
        layerStack.push(...waterCell.layerStack);
      } else if (terrain === 'water') {
        layerStack.push('poke_water_ocean_center.png');
      } else {
        const mCell = resolvedMacroBiomes.cellDetails[y]?.[x];
        layerStack.push(...(mCell ? mCell.layerStack : ['poke_grass_plain.png']));
      }

      if (mtnCell && elev > 0) {
        layerStack.push(mtnCell.primaryTile);
        if (mtnCell.overlayTiles) layerStack.push(...mtnCell.overlayTiles);
        if (
          mtnCell.role === 'peak_isolated' ||
          mtnCell.role.startsWith('edge_') ||
          mtnCell.role.startsWith('corner_outer_')
        ) {
          isWalkable = false;
        }
      }

      cells[y]![x] = {
        x,
        y,
        terrain,
        elevation: elev,
        macroBiome: macroBiomes.biomeGrid[y]?.[x],
        mountainPalette: 'brown' as MountainPalette,
        waterRole: waterCell?.role,
        mountainRole: mtnCell?.role,
        isStair: false,
        isWalkable,
        layerStack
      };
    }
  }

  const continent: ContinentMapResult = {
    width: W,
    height: H,
    seed,
    terrainMatrix,
    heightmap,
    resolvedWater,
    resolvedMountain: mountainResult,
    placedStairs,
    cells,
    mountainPalette: 'brown',
    macroBiomes,
    resolvedMacroBiomes,
    geologicalClusters
  };

  // 4. Construct POI nodes with official GBA urban layouts
  const pois: POINode[] = blueprints.map((bp) => {
    const node: POINode = {
      id: bp.id,
      name: bp.name,
      type: bp.type,
      urbanScale: bp.urbanScale,
      footprint: { width: bp.width, height: bp.height },
      terrainPreference: bp.type === 'cave_entrance' ? 'mountain_wall' : bp.type === 'port_dock' ? 'coast_water' : 'flat_grass',
      gridX: bp.gridX,
      gridY: bp.gridY,
      elevation: bp.elevation ?? 0,
      hasGym: bp.hasGym,
      facing: bp.facing,
      buildingFile: bp.buildingFile,
      roadMaterial: bp.roadMaterial,
      gateways: [
        { x: bp.gridX + Math.floor(bp.width / 2), y: bp.gridY - 1, direction: 'north' },
        { x: bp.gridX + Math.floor(bp.width / 2), y: bp.gridY + bp.height, direction: 'south' },
        { x: bp.gridX - 1, y: bp.gridY + Math.floor(bp.height / 2), direction: 'west' },
        { x: bp.gridX + bp.width, y: bp.gridY + Math.floor(bp.height / 2), direction: 'east' }
      ]
    };
    const layout = generateSettlementLayout(node);
    if (bp.id === 'indigo' && layout) {
      const extendedStreets = [...layout.internalStreets];
      for (let y = 38; y <= 42; y++) {
        extendedStreets.push({ x: 41, y }, { x: 42, y });
      }
      for (let x = 36; x <= 40; x++) {
        extendedStreets.push({ x, y: 41 }, { x, y: 42 });
      }
      return { ...node, urbanLayout: { ...layout, internalStreets: extendedStreets } };
    }
    return { ...node, urbanLayout: layout };
  });

  // 5. Construct Authentic Routes with A* Pathfinding and Bridges
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const nodeMap = new Map<string, POINode>(pois.map((p) => [p.id, p]));

  const excludedNodeZones = pois.map((p) => ({
    x1: p.gridX,
    y1: p.gridY,
    x2: p.gridX + p.footprint.width - 1,
    y2: p.gridY + p.footprint.height - 1
  }));

  const isOceanGrid = computeOceanGrid(continent);

  const edges: RouteEdge[] = routeBlueprints.map((rb) => {
    const fromNode = nodeMap.get(rb.from);
    const toNode = nodeMap.get(rb.to);
    if (!fromNode || !toNode) {
      return {
        id: rb.id,
        fromNodeId: rb.from,
        toNodeId: rb.to,
        routeType: rb.routeType,
        distance: DEFAULT_FALLBACK_ROUTE_DISTANCE,
        waypoints: [],
        isWaterCrossing: rb.isWaterCrossing
      };
    }

    const startX = fromNode.gridX + Math.floor(fromNode.footprint.width / 2);
    const startY = fromNode.gridY + Math.floor(fromNode.footprint.height / 2);
    const endX = toNode.gridX + Math.floor(toNode.footprint.width / 2);
    const endY = toNode.gridY + Math.floor(toNode.footprint.height / 2);

    let waypoints: RouteWaypoint[];

    if (rb.isWaterCrossing) {
      if (rb.id === 'kanto_r19') {
        waypoints = [
          { x: startX, y: startY },
          { x: startX, y: ROUTE_WAYPOINTS_CONFIG.KANTO_R19_WATER_Y },
          { x: endX + ROUTE_WAYPOINTS_CONFIG.KANTO_R19_WATER_X_OFFSET, y: ROUTE_WAYPOINTS_CONFIG.KANTO_R19_WATER_Y },
          { x: endX, y: endY }
        ];
      } else if (rb.id === 'kanto_r20') {
        waypoints = [
          { x: startX, y: startY },
          { x: Math.round((startX + endX) / 2), y: ROUTE_WAYPOINTS_CONFIG.KANTO_R20_WATER_Y },
          { x: endX, y: endY }
        ];
      } else if (rb.id === 'kanto_r21') {
        waypoints = [
          { x: startX, y: startY },
          { x: startX, y: ROUTE_WAYPOINTS_CONFIG.KANTO_R21_WATER_Y },
          { x: endX, y: ROUTE_WAYPOINTS_CONFIG.KANTO_R21_WATER_Y },
          { x: endX, y: endY }
        ];
      } else {
        waypoints = [
          { x: startX, y: startY },
          { x: endX, y: endY }
        ];
      }
    } else if (rb.id === 'kanto_r16_18') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.CYCLING_ROAD_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r11_15') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE11_15_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r3') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE3_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r4') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE4_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r9_10') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE9_10_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r10_powerplant') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE10_POWERPLANT_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r10_s') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE10_SOUTH_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_diglett') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.DIGLETT_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r24_25') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE24_25_POINTS,
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r22_23') {
      waypoints = [
        { x: startX, y: startY },
        ...ROUTE_WAYPOINTS_CONFIG.ROUTE22_23_POINTS
      ];
    } else if (rb.id === 'kanto_victory_road') {
      waypoints = [
        { x: startX, y: startY },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_indigo_avenue') {
      waypoints = [
        ...ROUTE_WAYPOINTS_CONFIG.INDIGO_AVENUE_POINTS
      ];
    } else {
      const astar = findPathAStar(
        continent,
        startX,
        startY,
        endX,
        endY,
        pathGrid,
        true,
        excludedNodeZones,
        isOceanGrid
      );

      if (astar && astar.path.length > 0) {
        waypoints = astar.path;
      } else {
        const midX = Math.round((startX + endX) / 2);
        waypoints = [
          { x: startX, y: startY },
          { x: midX, y: startY },
          { x: midX, y: endY },
          { x: endX, y: endY }
        ];
      }
    }

    if (!rb.isWaterCrossing && rb.id !== 'kanto_victory_road') {
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i]!;
        for (let py = wp.y; py <= wp.y + 1; py++) {
          for (let px = wp.x; px <= wp.x + 1; px++) {
            if (py >= 0 && py < H && px >= 0 && px < W) {
              pathGrid[py]![px] = true;
            }
          }
        }
        const stamp2x2 = (cx: number, cy: number): void => {
          for (let py = cy; py <= cy + 1; py++) {
            if (py < 0 || py >= H) continue;
            for (let px = cx; px <= cx + 1; px++) {
              if (px >= 0 && px < W) pathGrid[py]![px] = true;
            }
          }
        };

        if (i < waypoints.length - 1) {
          const nextWp = waypoints[i + 1]!;
          let curX = wp.x;
          let curY = wp.y;
          const stepX = nextWp.x >= curX ? 1 : -1;
          while (curX !== nextWp.x) {
            stamp2x2(curX, curY);
            curX += stepX;
          }
          const stepY = nextWp.y >= curY ? 1 : -1;
          while (curY !== nextWp.y) {
            stamp2x2(curX, curY);
            curY += stepY;
          }
        }
      }
    }

    const dist = waypoints.length > 1 ? waypoints.length : Math.hypot(endX - startX, endY - startY);

    return {
      id: rb.id,
      fromNodeId: rb.from,
      toNodeId: rb.to,
      routeType: rb.routeType,
      distance: Math.round(dist),
      waypoints,
      isWaterCrossing: rb.isWaterCrossing
    };
  });

  stampBridgesOnWaterIntersections(terrainMatrix, pathGrid, bridgeGrid);

  const portDockBridgeKeys = new Set<string>();

  for (const node of pois) {
    stampPortDockPier({
      node,
      isWaterAt: (x, y) => terrainMatrix[y]?.[x] === 'water',
      bridgeGrid,
      portDockBridgeKeys,
      width: W,
      height: H
    });
  }

  const bridgeShoreLandings = new Set<string>();

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]?.[x] && terrainMatrix[y]?.[x] !== 'water') {
        const hasWaterBridgeNeighbor = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ].some((n) => {
          const ny = y + n.dy;
          const nx = x + n.dx;
          return (
            ny >= 0 &&
            ny < H &&
            nx >= 0 &&
            nx < W &&
            terrainMatrix[ny]?.[nx] === 'water' &&
            bridgeGrid[ny]?.[nx]
          );
        });

        if (hasWaterBridgeNeighbor) {
          bridgeGrid[y]![x] = true;
          bridgeShoreLandings.add(`${x}_${y}`);
        }
      }
    }
  }

  const routeNetwork: ResolvedRouteNetworkResult = {
    nodes: pois,
    edges,
    pathGrid,
    bridgeGrid,
    bridgeShoreLandings,
    portDockBridgeKeys
  };

  const transitableGrid = computeTransitableGrid(continent, pathGrid, bridgeGrid, pois);
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid = transitableGrid;

  const wilderness = generateWildernessLayer(continent, pois, pathGrid, {
    seed,
    transitableGrid
  });

  const rawBuffer = buildZeroCopyPreviewBuffer(continent, pathGrid);

  return {
    continent,
    pois,
    routeNetwork,
    wilderness,
    rawBuffer
  };
}
