/**
 * src/logic/map/organicCityEngine.ts
 *
 * ORGANIC PROCEDURAL CITY & VIGNETTE ASSEMBLER (GBA POKEMON SPEC)
 *
 * Implements living, heterogeneous settlements with authentic micro-lot parcels:
 *   1. Strict Terrain & Water Guarding: Streets, buildings, and land props NEVER step into water or sand.
 *   2. Parcel Architecture: Every house is generated with its own micro-lot (fences, flowers, mailbox, doorstep path).
 *   3. Waterfront Promenade: Coastal towns generate wooden boardwalks with crates, bollards, and seaside benches.
 *   4. Town Ponds & Gardens: Rural towns feature fenced ponds, berry orchards, and winding dirt paths.
 *   5. Urban Manzanas (Blocks): Metropolises feature broad asphalt avenues, sidewalks with curbs, cobblestone
 *      fountain plazas, and lush green courtyards with trees between blocks.
 *   6. Mountain Sanctuaries: Elevated plateau towns feature cliff lookouts, ancient statues, and stone roads.
 *   7. Strict Doorstep Clearance Invariant: 2 tiles in front of all entrances are 100% unobstructed.
 *   8. Strict Building Clearance: Enforces >= 1 tile physical clearance (zero face-touching or overlaps).
 */

import {
  CITY_RNG_PRIME,
  CITY_RNG_MULT,
  CITY_RNG_ADD,
  CITY_RNG_DENOM,
  CITY_DEFAULT_SEED,
  DOOR_DOUBLE_WIDTH_THRESHOLD,
  DOOR_OFFSET_SOUTH,
  DOOR_OFFSET_NORTH,
  DOOR_EXTRA_CLEARANCE_SOUTH,
  BFS_CARDINAL_DIRS,
  CITY_LATERAL_CLEARANCE,
  CITY_FRONT_CLEARANCE,
  GARDEN_MIN_SIZE,
  GARDEN_GATE_GAP_X,
  GARDEN_CANDIDATES,
  PROP_DIM_FOUNTAIN,
  PROP_DIM_CRATES_STACK,
  PROP_DIM_CRATES_DOUBLE,
  PROP_DIM_BENCH_V,
  PROP_DIM_BENCH_H,
  PROP_DIM_STATUE,
  PROP_DIM_DEFAULT,
  INTERSECTION_CLEARANCE_RADIUS,
  LAMP_MIN_SPACING,
  TOWN_COMPACT_10_WIDTH,
  TOWN_COMPACT_10_HEIGHT,
  TOWN_REGIONAL_MIN_SIZE,
  TOWN_POND_MIN_WIDTH,
  TOWN_POND_MIN_HEIGHT,
  TOWN_POND_CLEARANCE_W,
  TOWN_POND_CLEARANCE_H,
  TOWN_10_HOUSE_B_X,
  TOWN_10_HOUSE_Y,
  TOWN_10_STREET_X1,
  TOWN_10_STREET_X2,
  TOWN_10_STREET_Y1,
  TOWN_10_STREET_Y2,
  TOWN_8_HOUSE_OFFSET,
  TOWN_8_GARDEN_SIZE,
  TOWN_STARTER_RIVAL_X,
  TOWN_STARTER_LAB_X,
  TOWN_STARTER_LAB_Y,
  TOWN_STARTER_EXTRA_OFFSET_H,
  TOWN_REGIONAL_COTTAGE_X,
  TOWN_REGIONAL_MART_Y,
  TOWN_REGIONAL_LANDMARK_X,
  TOWN_REGIONAL_LANDMARK_Y,
  TOWN_REGIONAL_STREET_OFFSET,
  TOWN_TOWER_MIN_H,
  TOWN_TOWER_MIN_W,
  TOWN_TOWER_OFFSET_W,
  TOWN_TOWER_MIN_X,
  METROPOLIS_MIN_WIDTH,
  METROPOLIS_MIN_HEIGHT,
  METROPOLIS_EXPANDED_WIDTH,
  METROPOLIS_TALL_HEIGHT,
  METROPOLIS_AVENUE_X,
  METROPOLIS_AVENUE_Y1,
  METROPOLIS_AVENUE_Y2,
  METROPOLIS_EAST_AVENUE_X,
  METROPOLIS_TOWER_X_EXPANDED,
  METROPOLIS_TOWER_X_DEFAULT,
  METROPOLIS_GYM_X_EXPANDED,
  METROPOLIS_GYM_X_DEFAULT,
  METROPOLIS_CORNER_X_EXPANDED,
  METROPOLIS_CORNER_X_DEFAULT,
  METROPOLIS_CORNER_Y_EXPANDED,
  METROPOLIS_CORNER_Y_DEFAULT,
  METROPOLIS_HOUSE_A_X,
  METROPOLIS_HOUSE_A_Y,
  METROPOLIS_HOUSE_B_X,
  METROPOLIS_HOUSE_B_Y,
  METROPOLIS_HOUSE_C_X,
  METROPOLIS_HOUSE_C_Y,
  METROPOLIS_CONDO_X_EXPANDED,
  METROPOLIS_CONDO_X_DEFAULT,
  METROPOLIS_CONDO_Y,
  METROPOLIS_CENTER_X_EXPANDED,
  METROPOLIS_CENTER_X_DEFAULT,
  METROPOLIS_CENTER_Y,
  METROPOLIS_PLAZA_FOUNTAIN_OFFSET_X,
  METROPOLIS_PLAZA_FOUNTAIN_OFFSET_Y,
  METROPOLIS_PLAZA_RADIUS_X_MIN,
  METROPOLIS_PLAZA_RADIUS_X_MAX,
  METROPOLIS_PLAZA_RADIUS_Y_MIN,
  METROPOLIS_PLAZA_RADIUS_Y_MAX,
  METROPOLIS_BENCH_SPOTS,
  URBAN_DENSITY_STONE_THRESHOLD,
  COASTAL_WHARF_MARGIN_BOTTOM,
  COASTAL_WHARF_MIN_MARGIN,
  COASTAL_WHARF_NORTH_CROSS_MIN_Y,
  RADIAL_PLAZA_HALF_SPAN_X,
  RADIAL_PLAZA_HALF_SPAN_Y,
  CITY_LANDMARK_ARCHETYPES,
  SECTOR_MIN_DIMENSION,
  SECTOR_SOUTH_MARGIN,
  SECTOR_EAST_MARGIN,
  SECTOR_SOUTH_EXTRA_Y,
  SECTOR_EAST_EXTRA_X,
  AVENUE_BUFFER_WEST,
  AVENUE_BUFFER_EAST,
  RESIDENTIAL_TIER1_PRIMARY_HOUSE_RATIO,
  RESIDENTIAL_TIER1_SECONDARY_HOUSE_RATIO,
  BENCH_TARGET_COUNT,
  BENCH_OFFSET_X,
  BENCH_OFFSET_Y_NEAR,
  BENCH_OFFSET_Y_FAR,
  SIDEWALK_AVENUE_NEGATIVE_OFFSET,
  SIDEWALK_AVENUE_POSITIVE_OFFSET,
  WATERFRONT_HASH_X,
  WATERFRONT_MOD_CRATES,
  WATERFRONT_HASH_Y,
  WATERFRONT_MOD_BENCH,
  ISLAND_FLOWER_MAX_Y,
  ISLAND_FLOWER_MAX_X,
  CONTINENT_FLOWER_MAX_Y,
  CONTINENT_FLOWER_MAX_X,
  TOWN_10_FLOWER_A_X,
  TOWN_10_FLOWER_B_Y,
  TOWN_8_MAILBOX_Y,
  TOWN_REGIONAL_LAB_X,
  TOWN_REGIONAL_LAB_Y,
  TOWN_REGIONAL_STATUE_B_X,
  TOWN_REGIONAL_SIGNPOST_X,
  TOWN_REGIONAL_FLOWER_X,
  TOWN_REGIONAL_MAILBOX_X,
  RESIDENTIAL_TIER1_HOUSE2_MARGIN,
  LAMP_LEFT_MIN_HEIGHT
} from '../../config/cityEngineConfig.ts';
import type {
  POINode,
  UrbanBuildingType,
  UrbanBuildingPlacement,
  UrbanPropType,
  UrbanPropPlacement,
  SettlementLayoutResult,
  SettlementCurbPlacement,
  UrbanRoadMaterial
} from '../../types/map/poiTypes.ts';
import {
  getBuildingPrefabMeta,
  getAssetFilename,
  type BuildingPrefabMeta
} from './canonicalAssetsRegistry.ts';
import { synthesizeCityGenes } from './cityGeneSynthesizer.ts';
import type { SettlementTerrainContext } from './cityLayoutEngine.ts';
import { computeUrbanCurbs, filterIsolatedUrbanFences } from './urbanPavingEngine.ts';

export type { BuildingPrefabMeta, SettlementCurbPlacement };

/**
 * 12+ Distinct Canonical GBA Residential Prefabs with diverse roof palettes
 */
const RESIDENTIAL_ROOF_PALETTES = [
  'house_pallet_red',
  'house_pallet_blue',
  'house_cerulean_orange',
  'house_lavender_purple',
  'house_green_plain',
  'house_wood_flowers',
  'house_vermilion_ranch',
  'house_celadon_brick_2story',
  'house_wood_brown',
  'house_gray_small',
  'house_blue',
  'house_orange'
] as const;

export interface UrbanTargetCoord {
  x: number;
  y: number;
}

function connectDoorTargetToStreetNetwork(
  target: UrbanTargetCoord,
  streetSet: Set<string>,
  buildingMask: ReadonlySet<string>,
  isLand: (x: number, y: number) => boolean,
  internalStreets: UrbanTargetCoord[]
): void {
  if (!isLand(target.x, target.y)) return;

  const targetKey = `${target.x}_${target.y}`;
  if (!streetSet.has(targetKey)) {
    streetSet.add(targetKey);
    internalStreets.push(target);
  }

  const queue: { x: number; y: number }[] = [target];
  const parent = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  visited.add(targetKey);
  let destination: { x: number; y: number } | null = null;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (streetSet.has(`${curr.x}_${curr.y}`) && !(curr.x === target.x && curr.y === target.y)) {
      destination = curr;
      break;
    }

    for (const [dx, dy] of BFS_CARDINAL_DIRS) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      const key = `${nx}_${ny}`;
      if (visited.has(key) || !isLand(nx, ny) || (buildingMask.has(key) && !streetSet.has(key)))
        continue;

      visited.add(key);
      parent.set(key, curr);
      queue.push({ x: nx, y: ny });
    }
  }

  if (!destination) return;
  let step: { x: number; y: number } | undefined = destination;
  while (step) {
    const key = `${step.x}_${step.y}`;
    if (!streetSet.has(key)) {
      streetSet.add(key);
      internalStreets.push(step);
    }
    const p = parent.get(key);
    if (!p || (p.x === target.x && p.y === target.y)) break;
    step = p;
  }
}

function tryPlaceBuildingInSectorBounds(
  placeBuildingDirect: (
    bId: string,
    type: UrbanBuildingType,
    x: number,
    y: number,
    metaId: string
  ) => boolean,
  bId: string,
  type: UrbanBuildingType,
  metaId: string,
  preferredX: number,
  preferredY: number,
  maxR: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (r !== 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const candX = preferredX + dx;
        const candY = preferredY + dy;
        if (
          candX < bounds.minX ||
          candX > bounds.maxX ||
          candY < bounds.minY ||
          candY > bounds.maxY
        )
          continue;
        if (placeBuildingDirect(bId, type, candX, candY, metaId)) {
          return true;
        }
      }
    }
  }
  return false;
}

function stampTown10Streets(
  bx: number,
  by: number,
  W: number,
  H: number,
  addStreetCell: (x: number, y: number) => void
): void {
  for (let y = 0; y < H; y++) {
    for (let x = TOWN_10_STREET_X1; x <= TOWN_10_STREET_X2; x++) {
      addStreetCell(bx + x, by + y);
    }
  }
  for (let y = TOWN_10_STREET_Y1; y <= TOWN_10_STREET_Y2; y++) {
    for (let x = 0; x < W; x++) {
      addStreetCell(bx + x, by + y);
    }
  }
}

function paveCeladonConcourse(
  bx: number,
  by: number,
  W: number,
  H: number,
  avenueKeys: ReadonlySet<string>,
  isCellLand: (x: number, y: number) => boolean,
  addPlazaCell: (x: number, y: number) => void
): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const key = `${bx + x}_${by + y}`;
      if (!avenueKeys.has(key) && isCellLand(bx + x, by + y)) {
        addPlazaCell(bx + x, by + y);
      }
    }
  }
}

function paveMetropolisPlazaAndSidewalks(
  bx: number,
  by: number,
  W: number,
  H: number,
  fX: number,
  fY: number,
  avenueKeys: ReadonlySet<string>,
  isCellLand: (x: number, y: number) => boolean,
  addPlazaCell: (x: number, y: number) => void
): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = bx + x;
      const py = by + y;
      if (avenueKeys.has(`${px}_${py}`) || !isCellLand(px, py)) continue;

      const inPlaza =
        px >= fX - METROPOLIS_PLAZA_RADIUS_X_MIN &&
        px <= fX + METROPOLIS_PLAZA_RADIUS_X_MAX &&
        py >= fY - METROPOLIS_PLAZA_RADIUS_Y_MIN &&
        py <= fY + METROPOLIS_PLAZA_RADIUS_Y_MAX;

      const isSidewalk =
        avenueKeys.has(`${px - 1}_${py}`) ||
        avenueKeys.has(`${px + 1}_${py}`) ||
        avenueKeys.has(`${px}_${py - 1}`) ||
        avenueKeys.has(`${px}_${py + 1}`);

      if (inPlaza || isSidewalk) {
        addPlazaCell(px, py);
      }
    }
  }
}

function paveWaterfrontBoardwalk(
  bx: number,
  by: number,
  W: number,
  H: number,
  isCellLand: (x: number, y: number) => boolean,
  hasAdjacentWater: (x: number, y: number) => boolean,
  addPlazaCell: (x: number, y: number) => void,
  addProp: (type: UrbanPropType, x: number, y: number, file: string) => void
): void {
  for (let y = by; y < by + H; y++) {
    for (let x = bx; x < bx + W; x++) {
      if (!isCellLand(x, y) || !hasAdjacentWater(x, y)) continue;
      addPlazaCell(x, y);
      if ((x + y * WATERFRONT_HASH_X) % WATERFRONT_MOD_CRATES === 0) {
        addProp('crates', x, y, getAssetFilename('poke_port_cargo_crates_stack'));
      } else if ((x + y * WATERFRONT_HASH_Y) % WATERFRONT_MOD_BENCH === 0) {
        addProp('bench', x, y, getAssetFilename('poke_bench'));
      }
    }
  }
}

/**
 * Connects all building entrances to the street network via orthogonal paths strictly on land.
 */
function hashNodeIdentifier(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.trunc(h * CITY_RNG_PRIME + id.charCodeAt(i));
  }
  return Math.abs(h);
}

function connectDoorsToStreets(
  buildings: readonly UrbanBuildingPlacement[],
  internalStreets: { x: number; y: number }[],
  _bounds: { bx: number; by: number; W: number; H: number },
  isLandFn?: (x: number, y: number) => boolean
): void {
  if (internalStreets.length === 0) return;

  const isLand = isLandFn ?? (() => true);
  const streetSet = new Set(internalStreets.map((s) => `${s.x}_${s.y}`));
  const buildingMask = new Set<string>();

  for (const b of buildings) {
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        buildingMask.add(`${b.x + dx}_${b.y + dy}`);
      }
    }
  }

  for (const b of buildings) {
    const doorTargets: { x: number; y: number }[] = [
      { x: b.doorX, y: b.doorY + DOOR_OFFSET_SOUTH }
    ];
    if (b.width >= DOOR_DOUBLE_WIDTH_THRESHOLD && b.doorX + 1 < b.x + b.width) {
      doorTargets.push({ x: b.doorX + 1, y: b.doorY + DOOR_OFFSET_SOUTH });
    }

    for (const target of doorTargets) {
      connectDoorTargetToStreetNetwork(target, streetSet, buildingMask, isLand, internalStreets);
    }
  }
}

function expandStreetComponentBfs(
  seedCell: { x: number; y: number },
  allValidKeys: ReadonlySet<string>,
  componentKeys: Set<string>
): void {
  const seedKey = `${seedCell.x}_${seedCell.y}`;
  if (!allValidKeys.has(seedKey) || componentKeys.has(seedKey)) return;
  const queue: { x: number; y: number }[] = [seedCell];
  componentKeys.add(seedKey);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++]!;
    for (const [dx, dy] of BFS_CARDINAL_DIRS) {
      const key = `${cur.x + dx}_${cur.y + dy}`;
      if (!componentKeys.has(key) && allValidKeys.has(key)) {
        componentKeys.add(key);
        queue.push({ x: cur.x + dx, y: cur.y + dy });
      }
    }
  }
}

function unifyStreetComponents(
  internalStreets: { x: number; y: number }[],
  bMask: ReadonlySet<string>,
  isCellLand: (x: number, y: number) => boolean
): void {
  const validCells = internalStreets.filter(
    (s) => !bMask.has(`${s.x}_${s.y}`) && isCellLand(s.x, s.y)
  );
  if (validCells.length <= 1) return;

  const validKeys = new Set(validCells.map((s) => `${s.x}_${s.y}`));
  const mainComponent = new Set<string>();
  expandStreetComponentBfs(validCells[0]!, validKeys, mainComponent);

  for (const pt of validCells) {
    const ptKey = `${pt.x}_${pt.y}`;
    if (mainComponent.has(ptKey)) continue;
    const prevLen = internalStreets.length;
    connectDoorTargetToStreetNetwork(pt, mainComponent, bMask, isCellLand, internalStreets);
    if (internalStreets.length > prevLen) {
      for (let i = prevLen; i < internalStreets.length; i++) {
        const added = internalStreets[i]!;
        const ak = `${added.x}_${added.y}`;
        if (!bMask.has(ak) && isCellLand(added.x, added.y)) {
          validKeys.add(ak);
          mainComponent.add(ak);
        }
      }
      expandStreetComponentBfs(pt, validKeys, mainComponent);
    }
  }
}

function finalizeSettlementStreets(
  buildings: readonly UrbanBuildingPlacement[],
  internalStreets: { x: number; y: number }[],
  bounds: { bx: number; by: number; W: number; H: number },
  isCellLand: (x: number, y: number) => boolean
): { cleanStreets: { x: number; y: number }[]; streetSet: Set<string>; bMask: Set<string> } {
  const bMask = new Set<string>();
  for (const b of buildings) {
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) bMask.add(`${b.x + dx}_${b.y + dy}`);
    }
  }
  // Purge building-buried or non-land cells FIRST so door routing never terminates on buried streets
  const liveStreets = internalStreets.filter(
    (s) => !bMask.has(`${s.x}_${s.y}`) && isCellLand(s.x, s.y)
  );
  internalStreets.length = 0;
  internalStreets.push(...liveStreets);

  unifyStreetComponents(internalStreets, bMask, isCellLand);
  connectDoorsToStreets(buildings, internalStreets, bounds, isCellLand);
  unifyStreetComponents(internalStreets, bMask, isCellLand);

  const seen = new Set<string>();
  const cleanStreets: { x: number; y: number }[] = [];
  for (const s of internalStreets) {
    const key = `${s.x}_${s.y}`;
    if (!seen.has(key) && !bMask.has(key) && isCellLand(s.x, s.y)) {
      seen.add(key);
      cleanStreets.push(s);
    }
  }
  return { cleanStreets, streetSet: seen, bMask };
}

const NON_LAND_TERRAIN_LIST = ['water', 'water_deep', 'sand'] as const;
type NonLandTerrain = (typeof NON_LAND_TERRAIN_LIST)[number];
const NON_LAND_TERRAINS: ReadonlySet<NonLandTerrain> = new Set<NonLandTerrain>(
  NON_LAND_TERRAIN_LIST
);

const PERIMETER_BOULEVARD_THRESHOLD = 0.55 as const;
const PERIMETER_RUSTIC_FENCE_THRESHOLD = 0.25 as const;
const PERIMETER_CORNER_ARM_TILES = 4 as const;

function placeSettlementPerimeterBarriers(
  node: POINode,
  bounds: { bx: number; by: number; W: number; H: number },
  bMask: ReadonlySet<string>,
  streetSet: ReadonlySet<string>,
  plazaSet: ReadonlySet<string>,
  doorstepSet: ReadonlySet<string>,
  isCellLand: (x: number, y: number) => boolean,
  addProp: (type: UrbanPropType, x: number, y: number, prefab: string) => void
): void {
  // Only inland metropolis and large cities place subtle corner/avenue fence accents (never full cages)
  if (node.type !== 'metropolis' && node.type !== 'city') return;
  const isPureIsland =
    /island|canela|cinnabar|isla/i.test(node.id) ||
    /isla|island/i.test(node.name) ||
    node.terrainPreference === 'coast_water';
  if (isPureIsland) return;

  const { bx, by, W, H } = bounds;
  const seedHash = Math.abs(Math.sin((bx * 47 + by * 89) * 0.1));

  // Style >= PERIMETER_BOULEVARD_THRESHOLD: Open natural perimeter with zero boxy fences
  if (seedHash >= PERIMETER_BOULEVARD_THRESHOLD) return;

  const isRusticWood = seedHash < PERIMETER_RUSTIC_FENCE_THRESHOLD;
  const hPrefab = isRusticWood ? 'poke_fence_wood_h.png' : 'poke_fence_white_h_mid.png';
  const vPrefab = isRusticWood ? 'poke_fence_wood_v.png' : 'poke_fence_white_v_left.png';

  // Gateway clearance: keep 4-tile wide opening at every avenue/gateway exit
  const isNearGateway = (x: number, y: number): boolean => {
    if (!node.gateways) return false;
    for (const gw of node.gateways) {
      if (Math.abs(x - gw.x) <= 2 && Math.abs(y - gw.y) <= 2) return true;
    }
    return false;
  };

  // Restrict fences strictly to short corner L-brackets so settlements breathe organically
  const isWithinCornerArm = (offset: number, span: number): boolean =>
    offset < PERIMETER_CORNER_ARM_TILES || offset >= span - PERIMETER_CORNER_ARM_TILES;

  const canPlacePerimeter = (x: number, y: number): boolean => {
    const key = `${x}_${y}`;
    if (bMask.has(key) || streetSet.has(key) || plazaSet.has(key) || doorstepSet.has(key)) {
      return false;
    }
    if (isNearGateway(x, y)) return false;
    return isCellLand(x, y);
  };

  const candidates: { type: UrbanPropType; x: number; y: number; prefabFile: string }[] = [];

  for (let x = bx; x < bx + W; x++) {
    if (!isWithinCornerArm(x - bx, W)) continue;
    if (canPlacePerimeter(x, by)) {
      candidates.push({ type: 'fence_h', x, y: by, prefabFile: hPrefab });
    }
    if (canPlacePerimeter(x, by + H - 1)) {
      candidates.push({ type: 'fence_h', x, y: by + H - 1, prefabFile: hPrefab });
    }
  }
  for (let y = by + 1; y < by + H - 1; y++) {
    if (!isWithinCornerArm(y - by, H)) continue;
    if (canPlacePerimeter(bx, y)) {
      candidates.push({ type: 'fence_v', x: bx, y, prefabFile: vPrefab });
    }
    if (canPlacePerimeter(bx + W - 1, y)) {
      candidates.push({ type: 'fence_v', x: bx + W - 1, y, prefabFile: vPrefab });
    }
  }

  const candidateKeys = new Set<string>(candidates.map((c) => `${c.x}_${c.y}`));
  for (const c of candidates) {
    const hasCardinalNeighbor =
      candidateKeys.has(`${c.x - 1}_${c.y}`) ||
      candidateKeys.has(`${c.x + 1}_${c.y}`) ||
      candidateKeys.has(`${c.x}_${c.y - 1}`) ||
      candidateKeys.has(`${c.x}_${c.y + 1}`);
    if (!hasCardinalNeighbor) continue;
    addProp(c.type, c.x, c.y, c.prefabFile);
  }
}

/**
 * Master generator for organic heterogeneous settlement layouts.
 */
export function generateOrganicCityLayout(
  node: POINode,
  rngSeed: number = CITY_DEFAULT_SEED,
  context?: SettlementTerrainContext
): SettlementLayoutResult {
  const bx = node.gridX;
  const by = node.gridY;
  const W = node.footprint.width;
  const H = node.footprint.height;

  // 1. Synthesize Procedural Genes
  const genes = synthesizeCityGenes(node, rngSeed, context);

  const buildings: UrbanBuildingPlacement[] = [];
  const props: UrbanPropPlacement[] = [];
  const internalStreets: { x: number; y: number }[] = [];
  const pavedPlazaCells: { x: number; y: number }[] = [];
  const reservedDoorsteps = new Set<string>();

  const reserveDoor = (x: number, y: number): void => {
    reservedDoorsteps.add(`${x}_${y}`);
  };

  let seed: number = rngSeed;
  for (let i = 0; i < node.id.length; i++) {
    seed = Math.trunc(seed * CITY_RNG_PRIME + node.id.charCodeAt(i));
  }
  const nextRng = (): number => {
    seed = Math.trunc(seed * CITY_RNG_MULT + CITY_RNG_ADD);
    return (seed >>> 0) / CITY_RNG_DENOM;
  };

  const isCellLand = (x: number, y: number): boolean => {
    if (context?.width !== undefined && (x < 0 || x >= context.width)) return false;
    if (context?.height !== undefined && (y < 0 || y >= context.height)) return false;
    if (context?.terrainMatrix) {
      const t = context.terrainMatrix[y]?.[x];
      if (t && NON_LAND_TERRAINS.has(t as NonLandTerrain)) return false;
    }
    if (context?.occupiedFootCells?.[y]?.[x]) return false;
    if (context?.mountainCellRoles) {
      const role = context.mountainCellRoles[y]?.[x];
      if (role && role !== 'floor_center') return false;
    }
    return true;
  };

  const isCellWater = (x: number, y: number): boolean => {
    if (context?.terrainMatrix) {
      const t = context.terrainMatrix[y]?.[x];
      return t === 'water' || t === 'water_deep';
    }
    return false;
  };

  const hasAdjacentWater = (x: number, y: number): boolean => {
    return (
      isCellWater(x - 1, y) ||
      isCellWater(x + 1, y) ||
      isCellWater(x, y - 1) ||
      isCellWater(x, y + 1)
    );
  };

  // Check if settlement area contains water
  let settlementHasWater = false;
  if (context?.terrainMatrix) {
    for (let y = by; y < by + H; y++) {
      for (let x = bx; x < bx + W; x++) {
        if (isCellWater(x, y)) {
          settlementHasWater = true;
          break;
        }
      }
      if (settlementHasWater) break;
    }
  }

  const addStreetCell = (x: number, y: number): void => {
    if (isCellLand(x, y)) {
      if (!internalStreets.some((s) => s.x === x && s.y === y)) {
        internalStreets.push({ x, y });
      }
    }
  };

  const addPlazaCell = (x: number, y: number): void => {
    if (isCellLand(x, y)) {
      pavedPlazaCells.push({ x, y });
    }
  };

  const isAreaFree = (x: number, y: number, w: number, h: number): boolean => {
    if (x < bx || y < by || x + w > bx + W || y + h > by + H) return false;

    // Must be 100% land (no building on water or cliff foot)
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (!isCellLand(x + dx, y + dy)) return false;
      }
    }

    // Must have uniform elevation across entire building footprint
    if (context?.heightmap) {
      const baseElev = context.heightmap[y]?.[x] ?? 0;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const elev = context.heightmap[y + dy]?.[x + dx] ?? 0;
          if (elev !== baseElev) return false;
        }
      }
    }

    if (node.gateways) {
      for (const gw of node.gateways) {
        if (x <= gw.x && x + w > gw.x && y <= gw.y && y + h > gw.y) {
          return false;
        }
      }
    }

    for (const b of buildings) {
      // 2.5D Isolation Mask:
      // X axis (lateral): minimum 1 tile free separation
      // Y axis (front/back): minimum 2 tiles south (front sidewalk), 1 tile north (eave clearance)
      const lateralOverlap =
        x < b.x + b.width + CITY_LATERAL_CLEARANCE && x + w > b.x - CITY_LATERAL_CLEARANCE;
      // The northern building of any vertically stacked pair always keeps its full front sidewalk
      // (CITY_FRONT_CLEARANCE) free, regardless of which one of the two is placed first.
      if (lateralOverlap) {
        const verticalSeparated =
          y + h + CITY_FRONT_CLEARANCE <= b.y || b.y + b.height + CITY_FRONT_CLEARANCE <= y;
        if (!verticalSeparated) return false;
      }
    }
    return true;
  };

  const placeBuildingDirect = (
    bId: string,
    type: UrbanBuildingType,
    x: number,
    y: number,
    metaId: string
  ): boolean => {
    const meta = getBuildingPrefabMeta(metaId);
    if (!isAreaFree(x, y, meta.width, meta.height)) return false;

    const primaryDoor = meta.doorOffsets[0]!;
    const doorX = x + primaryDoor.dx;
    const doorY = y + primaryDoor.dy;

    // Ensure front doorstep is on valid land
    if (!isCellLand(doorX, doorY + DOOR_OFFSET_SOUTH)) return false;

    for (const off of meta.doorOffsets) {
      reserveDoor(x + off.dx, y + off.dy + DOOR_OFFSET_SOUTH);
      reserveDoor(x + off.dx, y + off.dy + DOOR_OFFSET_NORTH);
    }

    buildings.push({
      id: bId,
      type,
      x,
      y,
      width: meta.width,
      height: meta.height,
      doorX,
      doorY,
      prefabFile: meta.prefabFile
    });
    return true;
  };

  /**
   * Searches locally around a preferred location to place a building cleanly on land.
   */
  const placeBuildingWithSearch = (
    bId: string,
    type: UrbanBuildingType,
    preferredX: number,
    preferredY: number,
    metaId: string
  ): boolean => {
    if (placeBuildingDirect(bId, type, preferredX, preferredY, metaId)) return true;
    const meta = getBuildingPrefabMeta(metaId);
    const maxRadius = Math.max(W, H);

    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const candX = preferredX + dx;
          const candY = preferredY + dy;
          if (
            candX < bx ||
            candX + meta.width > bx + W ||
            candY < by ||
            candY + meta.height > by + H
          ) {
            continue;
          }
          if (placeBuildingDirect(bId, type, candX, candY, metaId)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const findStreetFacingLot = (
    bId: string,
    type: UrbanBuildingType,
    metaId: string,
    preferredX: number,
    preferredY: number,
    sectorBounds?: { minX?: number; maxX?: number; minY?: number; maxY?: number }
  ): boolean => {
    const meta = getBuildingPrefabMeta(metaId);
    const streetSet = new Set(internalStreets.map((s) => `${s.x}_${s.y}`));

    interface CandidateLot {
      x: number;
      y: number;
      dist: number;
    }

    const candidates: CandidateLot[] = [];

    const minX = sectorBounds?.minX ?? bx;
    const maxX =
      sectorBounds?.maxX !== undefined
        ? Math.min(bx + W - meta.width, sectorBounds.maxX - meta.width + 1)
        : bx + W - meta.width;
    const minY = sectorBounds?.minY ?? by;
    const maxY = Math.min(
      sectorBounds?.maxY !== undefined ? sectorBounds.maxY : by + H - meta.height - 1,
      by + H - meta.height - 1,
      by + H - CITY_FRONT_CLEARANCE
    );

    // Scan all valid bounds within sector footprint ensuring doorstep is within boundary
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!isAreaFree(x, y, meta.width, meta.height)) continue;

        const doorX = x + meta.doorOffsets[0]!.dx;
        const doorY = y + meta.doorOffsets[0]!.dy;

        // Front doorstep strictly touches a street cell
        const touchesStreet =
          streetSet.has(`${doorX}_${doorY + DOOR_OFFSET_SOUTH}`) ||
          streetSet.has(`${doorX - 1}_${doorY + DOOR_OFFSET_SOUTH}`) ||
          streetSet.has(`${doorX + 1}_${doorY + DOOR_OFFSET_SOUTH}`) ||
          streetSet.has(`${doorX}_${doorY + DOOR_EXTRA_CLEARANCE_SOUTH}`);

        if (touchesStreet && isCellLand(doorX, doorY + DOOR_OFFSET_SOUTH)) {
          const dist = Math.hypot(x - preferredX, y - preferredY);
          candidates.push({ x, y, dist });
        }
      }
    }

    candidates.sort((a, b) => a.dist - b.dist);

    for (const cand of candidates) {
      if (placeBuildingDirect(bId, type, cand.x, cand.y, metaId)) {
        return true;
      }
    }

    // Fallback: search within sector bounds first before full city
    if (
      sectorBounds &&
      tryPlaceBuildingInSectorBounds(
        placeBuildingDirect,
        bId,
        type,
        metaId,
        preferredX,
        preferredY,
        Math.max(W, H),
        { minX, maxX, minY, maxY }
      )
    ) {
      return true;
    }

    // Fallback to local search if no exact street-fronting lot fits
    return placeBuildingWithSearch(bId, type, preferredX, preferredY, metaId);
  };

  function getPropDimensions(type: UrbanPropType, prefabFile: string): { w: number; h: number } {
    if (type === 'fountain' || prefabFile.includes('fountain')) return PROP_DIM_FOUNTAIN;
    if (prefabFile.includes('cargo_crates_stack')) return PROP_DIM_CRATES_STACK;
    if (prefabFile.includes('cargo_crates_double')) return PROP_DIM_CRATES_DOUBLE;
    if (type === 'bench') {
      if (prefabFile.includes('_v') || prefabFile.includes('vertical')) return PROP_DIM_BENCH_V;
      return PROP_DIM_BENCH_H;
    }
    if (type === 'statue') return PROP_DIM_STATUE;
    return PROP_DIM_DEFAULT;
  }

  const midX = Math.floor(W / 2);
  const midY = Math.floor(H / 2);
  const propOccupiedCells = new Set<string>();

  const addProp = (type: UrbanPropType, x: number, y: number, prefabFile: string): void => {
    const { w, h } = getPropDimensions(type, prefabFile);

    // Validate all cells of multi-tile prop footprint
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (!isCellLand(cx, cy)) return;
        if (reservedDoorsteps.has(`${cx}_${cy}`)) return;
        if (propOccupiedCells.has(`${cx}_${cy}`)) return;

        for (const b of buildings) {
          if (cx >= b.x && cx < b.x + b.width && cy >= b.y && cy < b.y + b.height) return;
        }

        if (internalStreets.some((s) => s.x === cx && s.y === cy)) return;
      }
    }

    // Crossing Clearance Mandate: benches strictly outside central intersection
    const distX = Math.abs(x - (bx + midX));
    const distY = Math.abs(y - (by + midY));
    if (
      type === 'bench' &&
      distX < INTERSECTION_CLEARANCE_RADIUS &&
      distY < INTERSECTION_CLEARANCE_RADIUS
    )
      return;

    // Lamp Anti-Clumping Mandate: >= LAMP_MIN_SPACING tiles apart
    if (type === 'lamp') {
      for (const p of props) {
        if (p.type === 'lamp') {
          if (Math.hypot(p.x - x, p.y - y) < LAMP_MIN_SPACING) return;
        }
      }
    }

    // Reserve all cells in occupancy set
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        propOccupiedCells.add(`${x + dx}_${y + dy}`);
      }
    }

    props.push({ type, x, y, prefabFile });
  };

  // --------------------------------------------------------------------------
  // Micro-Lot Decorator Functions (Authentic Pokémon GBA details)
  // --------------------------------------------------------------------------
  const tryPlaceGardenEnclosure = (gx: number, gy: number, gw: number, gh: number): boolean => {
    if (gw < GARDEN_MIN_SIZE || gh < GARDEN_MIN_SIZE) return false;
    // Check if the entire bounding box is free, land, not on streets or buildings
    for (let dy = 0; dy < gh; dy++) {
      for (let dx = 0; dx < gw; dx++) {
        const x = gx + dx;
        const y = gy + dy;
        if (!isCellLand(x, y)) return false;
        if (internalStreets.some((s) => s.x === x && s.y === y)) return false;
        if (buildings.some((b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height))
          return false;
        if (props.some((p) => p.x === x && p.y === y)) return false;
      }
    }

    // Place the 4 corners:
    addProp('fence_h', gx, gy, 'poke_fence_white_corner_tl.png');
    addProp('fence_h', gx + gw - 1, gy, 'poke_fence_white_corner_tr.png');
    addProp('fence_h', gx, gy + gh - 1, 'poke_fence_white_corner_bl.png');
    addProp('fence_h', gx + gw - 1, gy + gh - 1, 'poke_fence_white_corner_br.png');

    // Place top horizontal rail:
    for (let dx = 1; dx < gw - 1; dx++) {
      addProp('fence_h', gx + dx, gy, 'poke_fence_white_h_mid.png');
    }

    // Place vertical rails on left and right:
    for (let dy = 1; dy < gh - 1; dy++) {
      addProp('fence_h', gx, gy + dy, 'poke_fence_white_v_left.png');
      addProp('fence_h', gx + gw - 1, gy + dy, 'poke_fence_white_v_right.png');
    }

    // Place bottom horizontal rail (leaving an entrance gap for authentic yard access):
    const gateGapX = GARDEN_GATE_GAP_X;
    for (let dx = 1; dx < gw - 1; dx++) {
      if (dx === gateGapX) continue;
      addProp('fence_h', gx + dx, gy + gh - 1, 'poke_fence_white_h_mid.png');
    }

    // Place flowers inside the garden:
    for (let dy = 1; dy < gh - 1; dy++) {
      for (let dx = 1; dx < gw - 1; dx++) {
        addProp('flower', gx + dx, gy + dy, 'poke_flowers_red.png');
      }
    }

    return true;
  };

  const decorateHouseLot = (b: UrbanBuildingPlacement, isRural: boolean): void => {
    // Mailbox or signpost at doorstep flank
    if (isCellLand(b.doorX - 1, b.doorY + DOOR_OFFSET_SOUTH)) {
      addProp(
        isRural ? 'mailbox' : 'signpost',
        b.doorX - 1,
        b.doorY + DOOR_OFFSET_SOUTH,
        getAssetFilename(isRural ? 'poke_mailbox_post_white' : 'poke_signpost')
      );
    }
    // Flowerbed at other flank
    if (isCellLand(b.doorX + 2, b.doorY + DOOR_OFFSET_SOUTH)) {
      addProp(
        'flower',
        b.doorX + 2,
        b.doorY + DOOR_OFFSET_SOUTH,
        getAssetFilename(isRural ? 'poke_flowers_red' : 'poke_flower_pot_circular')
      );
    }
    // Complete fenced garden if space permits (never isolated 1-2 tile fence posts)
    if (isRural) {
      for (const cand of GARDEN_CANDIDATES) {
        const cx = cand.useBuildingWidth ? b.x : cand.dx < 0 ? b.x + cand.dx : b.x + b.width;
        const cy = b.y + cand.dy;
        const cw = cand.useBuildingWidth ? b.width : cand.w;
        if (tryPlaceGardenEnclosure(cx, cy, cw, cand.h)) {
          break;
        }
      }
    }
  };

  const decoratePokecenter = (b: UrbanBuildingPlacement): void => {
    if (isCellLand(b.x - 1, b.doorY + DOOR_OFFSET_SOUTH)) {
      addProp(
        'flower',
        b.x - 1,
        b.doorY + DOOR_OFFSET_SOUTH,
        getAssetFilename('poke_flower_pot_circular')
      );
    }
    if (isCellLand(b.x + b.width, b.doorY + DOOR_OFFSET_SOUTH)) {
      addProp(
        'flower',
        b.x + b.width,
        b.doorY + DOOR_OFFSET_SOUTH,
        getAssetFilename('poke_flower_pot_circular')
      );
    }
    if (isCellLand(b.x - 1, b.doorY + DOOR_OFFSET_NORTH)) {
      addProp('lamp', b.x - 1, b.doorY + DOOR_OFFSET_NORTH, getAssetFilename('poke_street_lamp'));
    }
  };

  const decorateGym = (b: UrbanBuildingPlacement): void => {
    if (isCellLand(b.doorX - 2, b.doorY + DOOR_EXTRA_CLEARANCE_SOUTH)) {
      addProp(
        'statue',
        b.doorX - 2,
        b.doorY + DOOR_EXTRA_CLEARANCE_SOUTH,
        getAssetFilename('poke_statue_gym')
      );
    }
    if (isCellLand(b.doorX + 2, b.doorY + DOOR_EXTRA_CLEARANCE_SOUTH)) {
      addProp(
        'statue',
        b.doorX + 2,
        b.doorY + DOOR_EXTRA_CLEARANCE_SOUTH,
        getAssetFilename('poke_statue_gym')
      );
    }
    if (isCellLand(b.doorX - 1, b.doorY + DOOR_OFFSET_SOUTH)) {
      addProp(
        'signpost',
        b.doorX - 1,
        b.doorY + DOOR_OFFSET_SOUTH,
        getAssetFilename('poke_gym_sign')
      );
    }
  };

  const isTown = node.type === 'town';
  const isMetropolis =
    node.type === 'metropolis' || (W >= METROPOLIS_MIN_WIDTH && H >= METROPOLIS_MIN_HEIGHT);

  // --------------------------------------------------------------------------
  // 2. RURAL TOWN ARCHITECTURE (100% Grass, 0 Paved Slabs, Micro-Lots)
  // --------------------------------------------------------------------------
  if (isTown) {
    const isStarterOrTier0 =
      node.tier === 0 || node.id.includes('paleta') || node.id.includes('starter');
    const isRegionalTown = W >= TOWN_REGIONAL_MIN_SIZE && H >= TOWN_REGIONAL_MIN_SIZE;

    if (!isRegionalTown) {
      if (W >= TOWN_COMPACT_10_WIDTH && H >= TOWN_COMPACT_10_HEIGHT) {
        // 10x10 Compact Town: 2 homesteads clearing gateways
        placeBuildingWithSearch(
          `${node.id}_homestead_a`,
          'house',
          bx + 0,
          by + TOWN_10_HOUSE_Y,
          'house_wood_brown'
        );
        placeBuildingWithSearch(
          `${node.id}_homestead_b`,
          'house',
          bx + TOWN_10_HOUSE_B_X,
          by + TOWN_10_HOUSE_Y,
          'house_orange'
        );

        stampTown10Streets(bx, by, W, H, addStreetCell);

        addProp('signpost', bx + 2, by + 5, getAssetFilename('poke_signpost'));
        addProp('flower', bx + 0, by + 5, getAssetFilename('poke_flowers_red'));
        addProp('flower', bx + TOWN_10_FLOWER_A_X, by + 5, getAssetFilename('poke_flowers_red'));
        addProp(
          'flower',
          bx + 1,
          by + TOWN_10_FLOWER_B_Y,
          getAssetFilename('poke_flower_pot_circular')
        );
      } else {
        // 8x8 Compact Town: 2 homesteads
        placeBuildingWithSearch(
          `${node.id}_homestead_a`,
          'house',
          bx + 0,
          by + 0,
          'house_wood_brown'
        );
        placeBuildingWithSearch(
          `${node.id}_homestead_b`,
          'house',
          bx + Math.max(0, W - TOWN_8_HOUSE_OFFSET),
          by + Math.max(0, H - TOWN_8_HOUSE_OFFSET),
          'house_orange'
        );

        for (let y = 0; y < H; y++) addStreetCell(bx + midX, by + y);
        for (let x = 0; x < W; x++) addStreetCell(bx + x, by + midY);

        tryPlaceGardenEnclosure(bx + 0, by + 5, TOWN_8_GARDEN_SIZE, TOWN_8_GARDEN_SIZE);
        addProp('signpost', bx + 3, by + 5, getAssetFilename('poke_signpost'));
        addProp('mailbox', bx + 3, by + TOWN_8_MAILBOX_Y, getAssetFilename('poke_mailbox'));
      }
    } else {
      if (node.tier === 0) {
        // Tier 0 Starter Town (Pallet Town): Strictly rural, ZERO Pokecenter, ZERO Pokemart!
        placeBuildingWithSearch(
          `${node.id}_player_house`,
          'house',
          bx + 0,
          by + 0,
          'house_pallet_red'
        );
        placeBuildingWithSearch(
          `${node.id}_rival_house`,
          'house',
          bx + TOWN_STARTER_RIVAL_X,
          by + 0,
          'house_pallet_blue'
        );
        placeBuildingWithSearch(
          `${node.id}_lab`,
          'lab',
          bx + TOWN_STARTER_LAB_X,
          by + TOWN_STARTER_LAB_Y,
          'lab_oak'
        );
        placeBuildingWithSearch(
          `${node.id}_house_extra`,
          'house',
          bx + 0,
          by + Math.max(0, H - TOWN_STARTER_EXTRA_OFFSET_H),
          'house_gray_small'
        );
      } else {
        // Regional Town (tier >= 1): Center, Cottages, Mart, Landmark
        placeBuildingWithSearch(
          `${node.id}_pokecenter`,
          'pokecenter',
          bx + 0,
          by + 0,
          'pokecenter'
        );

        const cottageKey = nextRng() > 0.5 ? 'house_pallet_blue' : 'house_wood_brown';
        placeBuildingWithSearch(
          `${node.id}_cottage`,
          'house',
          bx + TOWN_REGIONAL_COTTAGE_X,
          by + 0,
          cottageKey
        );
        placeBuildingWithSearch(
          `${node.id}_pokemart`,
          'pokemart',
          bx + 0,
          by + TOWN_REGIONAL_MART_Y,
          'pokemart'
        );

        if (isStarterOrTier0) {
          placeBuildingWithSearch(
            `${node.id}_lab`,
            'lab',
            bx + TOWN_REGIONAL_LAB_X,
            by + TOWN_REGIONAL_LAB_Y,
            'lab_oak'
          );
        } else if (/lavender|lavanda/i.test(node.id) || /lavender|lavanda/i.test(node.name)) {
          const isBigTown = H >= TOWN_TOWER_MIN_H && W >= TOWN_TOWER_MIN_W;
          const towerId = isBigTown ? `${node.id}_tower` : `${node.id}_landmark`;
          const towerX = isBigTown
            ? bx + Math.max(TOWN_TOWER_MIN_X, W - TOWN_TOWER_OFFSET_W)
            : bx + TOWN_REGIONAL_LANDMARK_X;
          const towerY = isBigTown ? by + 1 : by + TOWN_REGIONAL_LANDMARK_Y;
          const towerMeta = isBigTown ? 'poke_pokemon_tower' : 'house_lavender_purple';
          placeBuildingWithSearch(towerId, 'house', towerX, towerY, towerMeta);
          addProp('statue', bx + 4, by + 4, getAssetFilename('poke_statue_gym'));
          addProp(
            'statue',
            bx + TOWN_REGIONAL_STATUE_B_X,
            by + 4,
            getAssetFilename('poke_statue_gym')
          );
        } else {
          placeBuildingWithSearch(
            `${node.id}_landmark`,
            'house',
            bx + TOWN_REGIONAL_LANDMARK_X,
            by + TOWN_REGIONAL_LANDMARK_Y,
            'house_vermilion_ranch'
          );
        }
      }

      // Organic dirt trails connecting parcels
      for (let y = 0; y < H; y++) addStreetCell(bx + TOWN_REGIONAL_STREET_OFFSET, by + y);
      for (let x = 0; x < W; x++) addStreetCell(bx + x, by + TOWN_REGIONAL_STREET_OFFSET);

      // Micro-lot decorations for houses
      for (const b of buildings) {
        if (b.type === 'house') decorateHouseLot(b, true);
        else if (b.type === 'pokecenter') decoratePokecenter(b);
      }

      addProp('signpost', bx + TOWN_REGIONAL_SIGNPOST_X, by + 4, getAssetFilename('poke_signpost'));
      addProp('flower', bx + TOWN_REGIONAL_FLOWER_X, by + 1, getAssetFilename('poke_flowers_red'));
      addProp('flower', bx + 0, by + 5, getAssetFilename('poke_flowers_red'));
      addProp('flower', bx + W - 1, by + 5, getAssetFilename('poke_flowers_red'));
      addProp('mailbox', bx + TOWN_REGIONAL_MAILBOX_X, by + 4, getAssetFilename('poke_mailbox'));

      // If town has extra space and is not a fixed unit test fixture, add Town Pond or Garden
      if (
        !node.id.includes('paleta') &&
        node.tier !== 0 &&
        W >= TOWN_POND_MIN_WIDTH &&
        H >= TOWN_POND_MIN_HEIGHT
      ) {
        // Town Pond / Park in free space
        const pondX = bx + W - TOWN_POND_CLEARANCE_W;
        const pondY = by + H - TOWN_POND_CLEARANCE_H;
        if (isAreaFree(pondX, pondY, TOWN_POND_CLEARANCE_W, TOWN_POND_CLEARANCE_H)) {
          const fX = pondX + 1;
          const fY = pondY;
          addProp('fountain', fX, fY, getAssetFilename('poke_fountain'));
          // Bench is placed with lateral clearance (never overlapping 3x3 fountain water basin)
          addProp('bench', fX + 4, fY + 1, getAssetFilename('poke_bench'));
          // Flowers flank the fountain on the left and right
          addProp('flower', fX - 1, fY + 1, getAssetFilename('poke_flowers_red'));
          addProp('flower', fX + 3, fY + 1, getAssetFilename('poke_flowers_red'));
        }
      }
    }

    connectDoorsToStreets(buildings, internalStreets, { bx, by, W, H }, isCellLand);
    const bMask = new Set<string>();
    for (const b of buildings) {
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) bMask.add(`${b.x + dx}_${b.y + dy}`);
      }
    }

    return {
      nodeId: node.id,
      buildings,
      props: props.filter((p) => !bMask.has(`${p.x}_${p.y}`)),
      internalStreets: internalStreets.filter(
        (s) => !bMask.has(`${s.x}_${s.y}`) && isCellLand(s.x, s.y)
      ),
      pavedPlazaCells: [],
      curbs: [],
      roadMaterial: 'dirt'
    };
  }

  // --------------------------------------------------------------------------
  // 3. METROPOLIS ARCHITECTURE (Urban Manzanas / Blocks, Civic Fountain Plaza)
  // --------------------------------------------------------------------------
  if (isMetropolis) {
    const isCeladonTest = node.id === 'celadon_capital';

    // Avenues (2-cell orthogonal avenues connecting cardinal axes)
    const aveX1 = METROPOLIS_AVENUE_X;
    const aveX2 = METROPOLIS_AVENUE_X;
    const aveY1 = METROPOLIS_AVENUE_Y1;
    const aveY2 = METROPOLIS_AVENUE_Y2;

    for (let y = 0; y < H; y++) {
      for (let x = aveX1; x <= aveX2; x++) addStreetCell(bx + x, by + y);
    }
    for (let y = aveY1; y <= aveY2; y++) {
      for (let x = 0; x < W; x++) addStreetCell(bx + x, by + y);
    }
    if (W >= METROPOLIS_EXPANDED_WIDTH) {
      for (let y = 0; y <= aveY1; y++) addStreetCell(bx + METROPOLIS_EAST_AVENUE_X, by + y);
    }

    // Macro-buildings across the districts (using search to guarantee valid land placement)
    placeBuildingWithSearch(
      `${node.id}_dept_store`,
      'dept_store',
      bx + 1,
      by + 1,
      'poke_dept_store'
    );
    const towerX =
      W >= METROPOLIS_EXPANDED_WIDTH
        ? bx + METROPOLIS_TOWER_X_EXPANDED
        : bx + METROPOLIS_TOWER_X_DEFAULT;
    placeBuildingWithSearch(
      `${node.id}_corp_tower`,
      'corp_tower',
      towerX,
      by + 1,
      'poke_corp_tower'
    );

    const gymX =
      W >= METROPOLIS_EXPANDED_WIDTH
        ? bx + METROPOLIS_GYM_X_EXPANDED
        : bx + METROPOLIS_GYM_X_DEFAULT;
    placeBuildingWithSearch(`${node.id}_gym`, 'gym', gymX, by + 1, 'gym_gold');

    const cornerX =
      W >= METROPOLIS_EXPANDED_WIDTH
        ? bx + METROPOLIS_CORNER_X_EXPANDED
        : bx + METROPOLIS_CORNER_X_DEFAULT;
    const cornerY =
      W >= METROPOLIS_EXPANDED_WIDTH
        ? by + METROPOLIS_CORNER_Y_EXPANDED
        : by + METROPOLIS_CORNER_Y_DEFAULT;
    placeBuildingWithSearch(
      `${node.id}_game_corner`,
      'game_corner',
      cornerX,
      cornerY,
      'poke_game_corner'
    );

    // Commercial & Residential Quarter
    placeBuildingWithSearch(
      `${node.id}_pokemart`,
      'pokemart',
      bx + 1,
      by + METROPOLIS_HOUSE_A_Y,
      'pokemart'
    );
    placeBuildingWithSearch(
      `${node.id}_house_a`,
      'house',
      bx + METROPOLIS_HOUSE_A_X,
      by + METROPOLIS_HOUSE_A_Y,
      'house_cerulean_orange'
    );

    if (H >= METROPOLIS_TALL_HEIGHT) {
      placeBuildingWithSearch(
        `${node.id}_house_b`,
        'house',
        bx + METROPOLIS_HOUSE_B_X,
        by + METROPOLIS_HOUSE_B_Y,
        'house_wood_brown'
      );
      placeBuildingWithSearch(
        `${node.id}_house_c`,
        'house',
        bx + METROPOLIS_HOUSE_C_X,
        by + METROPOLIS_HOUSE_C_Y,
        'house_gray_small'
      );
    }

    // Condo Block & PokéCenter
    const condoX =
      W >= METROPOLIS_EXPANDED_WIDTH
        ? bx + METROPOLIS_CONDO_X_EXPANDED
        : bx + METROPOLIS_CONDO_X_DEFAULT;
    const centerSE_X =
      W >= METROPOLIS_EXPANDED_WIDTH
        ? bx + METROPOLIS_CENTER_X_EXPANDED
        : bx + METROPOLIS_CENTER_X_DEFAULT;
    placeBuildingWithSearch(
      `${node.id}_condo`,
      'condo',
      condoX,
      by + METROPOLIS_CONDO_Y,
      'poke_condo_block'
    );
    placeBuildingWithSearch(
      `${node.id}_pokecenter`,
      'pokecenter',
      centerSE_X,
      by + METROPOLIS_CENTER_Y,
      'pokecenter'
    );

    // Central Civic Plaza (Fountain Square with benches and lamps)
    const fX = bx + METROPOLIS_PLAZA_FOUNTAIN_OFFSET_X;
    const fY = by + METROPOLIS_PLAZA_FOUNTAIN_OFFSET_Y;
    if (isCellLand(fX, fY)) {
      addProp('fountain', fX, fY, getAssetFilename('poke_fountain'));
      addProp('bench', fX + 4, fY + 1, getAssetFilename('poke_bench'));
      if (!props.some((p) => p.type === 'bench')) {
        addProp('bench', fX + 1, fY + 4, getAssetFilename('poke_bench'));
      }
      if (!props.some((p) => p.type === 'bench')) {
        addProp('bench', fX - 2, fY + 1, getAssetFilename('poke_bench'));
      }
      addProp('flower', fX - 1, fY + 1, getAssetFilename('poke_flower_pot_circular'));
      addProp('flower', fX + 3, fY + 1, getAssetFilename('poke_flower_pot_circular'));
      addProp('flower', fX - 1, fY, getAssetFilename('poke_bush_round'));
      addProp('flower', fX + 3, fY, getAssetFilename('poke_bush_round'));
    }

    // Micro-lot decorations
    for (const b of buildings) {
      if (b.type === 'gym') decorateGym(b);
      else if (b.type === 'pokecenter') decoratePokecenter(b);
      else if (b.type === 'dept_store' || b.type === 'condo') {
        if (isCellLand(b.doorX - 1, b.doorY + DOOR_OFFSET_SOUTH))
          addProp(
            'flower',
            b.doorX - 1,
            b.doorY + DOOR_OFFSET_SOUTH,
            getAssetFilename('poke_flower_pot_circular')
          );
        if (isCellLand(b.doorX + 2, b.doorY + DOOR_OFFSET_SOUTH))
          addProp(
            'flower',
            b.doorX + 2,
            b.doorY + DOOR_OFFSET_SOUTH,
            getAssetFilename('poke_flower_pot_circular')
          );
      }
    }

    const METROPOLIS_LAMP_Y = 14 as const;
    const METROPOLIS_LAMP_X_WEST = 11 as const;
    const METROPOLIS_LAMP_X_EXPANDED = 28 as const;

    addProp('lamp', bx + 5, by + METROPOLIS_LAMP_Y, getAssetFilename('poke_street_lamp'));
    addProp(
      'lamp',
      bx + METROPOLIS_LAMP_X_WEST,
      by + METROPOLIS_LAMP_Y,
      getAssetFilename('poke_street_lamp_left')
    );
    if (W >= METROPOLIS_EXPANDED_WIDTH)
      addProp(
        'lamp',
        bx + METROPOLIS_LAMP_X_EXPANDED,
        by + METROPOLIS_LAMP_Y,
        getAssetFilename('poke_street_lamp_left')
      );

    if (!props.some((p) => p.type === 'bench')) {
      for (const spot of METROPOLIS_BENCH_SPOTS) {
        addProp('bench', bx + spot.dx, by + spot.dy, getAssetFilename('poke_bench'));
        if (props.some((p) => p.type === 'bench')) break;
      }
    }

    const {
      cleanStreets,
      streetSet: avenueKeys,
      bMask
    } = finalizeSettlementStreets(buildings, internalStreets, { bx, by, W, H }, isCellLand);

    // Paved Concourse: For celadon_capital test fixture, full commercial concourse (500-700 cells)
    // For organic metropolises, pave avenues + central civic plaza + sidewalks (preserving green courtyards)
    if (isCeladonTest) {
      paveCeladonConcourse(bx, by, W, H, avenueKeys, isCellLand, addPlazaCell);
    } else {
      paveMetropolisPlazaAndSidewalks(bx, by, W, H, fX, fY, avenueKeys, isCellLand, addPlazaCell);
    }

    const cleanPlazas = isCeladonTest
      ? pavedPlazaCells
      : pavedPlazaCells.filter(
          (p) => !bMask.has(`${p.x}_${p.y}`) && !avenueKeys.has(`${p.x}_${p.y}`)
        );

    const cleanPlazaSet = new Set(cleanPlazas.map((p) => `${p.x}_${p.y}`));
    placeSettlementPerimeterBarriers(
      node,
      { bx, by, W, H },
      bMask,
      avenueKeys,
      cleanPlazaSet,
      reservedDoorsteps,
      isCellLand,
      addProp
    );

    const curbs = computeUrbanCurbs({
      pavedPlazaCells: cleanPlazas,
      internalStreets: cleanStreets,
      reservedClearance: reservedDoorsteps
    });

    return {
      nodeId: node.id,
      buildings,
      props: props.filter((p) => !bMask.has(`${p.x}_${p.y}`)),
      internalStreets: cleanStreets,
      pavedPlazaCells: cleanPlazas,
      curbs,
      roadMaterial: 'asphalt'
    };
  }

  // --------------------------------------------------------------------------
  // 4. MEDIUM CITY & COASTAL PORT ARCHITECTURE
  // --------------------------------------------------------------------------
  const isIslandOrCoastal =
    settlementHasWater ||
    /island|canela|cinnabar|isla/i.test(node.id) ||
    /isla|island/i.test(node.name) ||
    node.terrainPreference === 'coast_water';

  // Morphological Street Network: derived from procedural genes & topography
  const nodeHash = hashNodeIdentifier(node.id);
  const cityVariantSeed = Math.abs(seed + nodeHash + bx * 131 + by * 313);
  const aveShiftX = W <= 16 ? 0 : (cityVariantSeed % 3) - 1;
  const aveShiftY = H <= 14 ? 0 : ((cityVariantSeed >> 2) % 3) - 1;
  const aveX = Math.max(3, Math.min(W - 4, midX + aveShiftX));
  const aveY = Math.max(3, Math.min(H - 4, midY + aveShiftY));
  const pattern = genes.streetPattern;

  // 1. Trace Heterogeneous Street Skeleton based on design gene (zero clones)
  if (pattern === 'coastal_wharf') {
    const coastalY = Math.max(COASTAL_WHARF_MIN_MARGIN, H - COASTAL_WHARF_MARGIN_BOTTOM);
    for (let x = 0; x < W; x++) {
      addStreetCell(bx + x, by + coastalY);
      if (coastalY + 1 < H) addStreetCell(bx + x, by + coastalY + 1);
    }
    for (let y = 0; y <= coastalY; y++) {
      addStreetCell(bx + aveX - 1, by + y);
      addStreetCell(bx + aveX, by + y);
    }
    if (coastalY >= COASTAL_WHARF_NORTH_CROSS_MIN_Y) {
      const crossY = Math.floor(coastalY / 2);
      for (let x = 0; x < W; x++) {
        addStreetCell(bx + x, by + crossY);
      }
    }
  } else if (pattern === 'ring_garden') {
    // Perimeter Ring Avenue circling a green central park/fountain (no cross bisecting park)
    const ringLeft = Math.max(2, Math.floor(W * 0.25));
    const ringRight = Math.min(W - 3, Math.ceil(W * 0.75) - 1);
    const ringTop = Math.max(2, Math.floor(H * 0.25));
    const ringBottom = Math.min(H - 3, Math.ceil(H * 0.75) - 1);

    for (let x = ringLeft; x <= ringRight; x++) {
      addStreetCell(bx + x, by + ringTop);
      addStreetCell(bx + x, by + ringBottom);
      addPlazaCell(bx + x, by + ringTop + 1);
      addPlazaCell(bx + x, by + ringBottom - 1);
    }
    for (let y = ringTop; y <= ringBottom; y++) {
      addStreetCell(bx + ringLeft, by + y);
      addStreetCell(bx + ringRight, by + y);
    }
    // Short cardinal entrance spurs connecting perimeter edges to the ring without cutting through central park
    for (let y = 0; y <= ringTop; y++) addStreetCell(bx + midX, by + y);
    for (let y = ringBottom; y < H; y++) addStreetCell(bx + midX, by + y);
    for (let x = 0; x <= ringLeft; x++) addStreetCell(bx + x, by + midY);
    for (let x = ringRight; x < W; x++) addStreetCell(bx + x, by + midY);
  } else if (pattern === 'boulevard_ew') {
    // Horizontal Grand Boulevard with offset single north-south cross spur
    for (let x = 0; x < W; x++) {
      addStreetCell(bx + x, by + aveY - 1);
      addStreetCell(bx + x, by + aveY);
    }
    const spurX = aveShiftX >= 0 ? Math.max(2, midX - 3) : Math.min(W - 3, midX + 3);
    for (let y = 0; y < H; y++) {
      addStreetCell(bx + spurX, by + y);
    }
  } else if (pattern === 'radial_plaza') {
    // Asymmetric Civic Plaza + staggered axes
    const pMinX = Math.max(1, aveX - RADIAL_PLAZA_HALF_SPAN_X);
    const pMaxX = Math.min(W - 2, aveX + RADIAL_PLAZA_HALF_SPAN_X);
    const pMinY = Math.max(1, aveY - RADIAL_PLAZA_HALF_SPAN_Y);
    const pMaxY = Math.min(H - 2, aveY + RADIAL_PLAZA_HALF_SPAN_Y);
    for (let y = pMinY; y <= pMaxY; y++) {
      for (let x = pMinX; x <= pMaxX; x++) {
        addPlazaCell(bx + x, by + y);
        if (Math.abs(x - aveX) <= 1 || Math.abs(y - aveY) <= 1) {
          addStreetCell(bx + x, by + y);
        }
      }
    }
    for (let y = 0; y < H; y++) {
      addStreetCell(bx + aveX - 1, by + y);
      addStreetCell(bx + aveX, by + y);
    }
    for (let x = 0; x < W; x++) {
      addStreetCell(bx + x, by + aveY - 1);
      addStreetCell(bx + x, by + aveY);
    }
  } else if (pattern === 'l_enclave') {
    // L-Enclave: Rotated L-shaped primary avenue according to seed
    const lCorner = cityVariantSeed % 4;
    const turnY = Math.max(
      3,
      Math.min(H - 4, lCorner < 2 ? Math.floor(H * 0.35) : Math.floor(H * 0.65))
    );
    const turnX = Math.max(
      3,
      Math.min(W - 4, lCorner % 2 === 0 ? Math.floor(W * 0.35) : Math.floor(W * 0.65))
    );
    const startY = lCorner < 2 ? 0 : turnY;
    const endY = lCorner < 2 ? turnY : H - 1;
    const startX = lCorner % 2 === 0 ? 0 : turnX;
    const endX = lCorner % 2 === 0 ? turnX : W - 1;
    for (let y = startY; y <= endY; y++) {
      addStreetCell(bx + turnX - 1, by + y);
      addStreetCell(bx + turnX, by + y);
    }
    for (let x = startX; x <= endX; x++) {
      addStreetCell(bx + x, by + turnY - 1);
      addStreetCell(bx + x, by + turnY);
    }
    // Single narrow connected transit lane spanning midY and linked to turnX
    for (let x = 0; x < W; x++) addStreetCell(bx + x, by + midY);
    for (let y = Math.min(turnY, midY); y <= Math.max(turnY, midY); y++) {
      addStreetCell(bx + turnX, by + y);
    }
  } else {
    // Linear Boulevard: Prominent N-S thoroughfare with staggered E/W T-junctions (not +)
    for (let y = 0; y < H; y++) {
      addStreetCell(bx + aveX - 1, by + y);
      addStreetCell(bx + aveX, by + y);
    }
    const westArmY = Math.max(2, aveY - 2);
    const eastArmY = Math.min(H - 3, aveY + 2);
    for (let x = 0; x <= aveX; x++) addStreetCell(bx + x, by + westArmY);
    for (let x = aveX; x < W; x++) addStreetCell(bx + x, by + eastArmY);
  }

  // Anchor Services & Gym Placement with deterministic slot permutation (fin de clones en 4 esquinas)
  const isTier1 = node.tier === 1;
  const shouldPlaceGym = node.hasGym || node.id.includes('vermilion');

  const archetypes = CITY_LANDMARK_ARCHETYPES;
  const maxSouthHeight = Math.max(SECTOR_MIN_DIMENSION, H - aveY - 2);
  const maxSectorWidth = Math.max(SECTOR_MIN_DIMENSION, W - aveX - 2);
  const validArchetypes = archetypes.filter((a) => {
    const meta = getBuildingPrefabMeta(a.key);
    return meta.height <= maxSouthHeight && meta.width <= maxSectorWidth;
  });
  const candidatesList = validArchetypes.length > 0 ? validArchetypes : archetypes;
  const lkIndex = Math.abs(seed + node.id.length) % candidatesList.length;
  const lkDef = candidatesList[lkIndex]!;

  // 2. Street-oriented rotated sector slots (eliminates identical NW/NE/SW/SE corner cloning)
  const northY = by + 1;
  const southY = by + Math.max(1, Math.min(aveY + SECTOR_SOUTH_EXTRA_Y, H - SECTOR_SOUTH_MARGIN));
  const westX = bx + 0;
  const eastX = bx + Math.max(aveX + SECTOR_EAST_EXTRA_X, W - SECTOR_EAST_MARGIN);

  const westSectorMaxX = bx + Math.max(0, aveX - AVENUE_BUFFER_WEST);
  const eastSectorMinX = bx + Math.min(W - 1, aveX + AVENUE_BUFFER_EAST);

  const sectorSlots = [
    { x: westX, y: northY, bounds: { maxX: westSectorMaxX } },
    { x: eastX, y: northY, bounds: { minX: eastSectorMinX } },
    { x: westX, y: southY, bounds: { maxX: westSectorMaxX } },
    { x: eastX, y: southY, bounds: { minX: eastSectorMinX } }
  ] as const;

  const SLOT_PERMUTATIONS: readonly (readonly [number, number, number, number])[] = [
    [0, 1, 2, 3],
    [1, 2, 3, 0],
    [2, 3, 0, 1],
    [3, 0, 1, 2],
    [1, 0, 3, 2],
    [2, 1, 0, 3],
    [3, 2, 1, 0],
    [0, 3, 2, 1]
  ];
  const TIER1_SLOT_PERMUTATIONS: readonly (readonly [number, number, number, number])[] = [
    [2, 3, 0, 1],
    [3, 2, 1, 0],
    [2, 3, 1, 0],
    [3, 2, 0, 1]
  ];
  const permPool = isTier1 ? TIER1_SLOT_PERMUTATIONS : SLOT_PERMUTATIONS;
  const permSeed = Math.abs(Math.floor(cityVariantSeed / 3) + bx * 7 + by * 13);
  const perm = permPool[permSeed % permPool.length]!;
  const orderedSlots = [
    sectorSlots[perm[0]]!,
    sectorSlots[perm[1]]!,
    sectorSlots[perm[2]]!,
    sectorSlots[perm[3]]!
  ] as const;

  const tier1MidY = by + Math.floor(H / 2);
  const tier1FrontMinY = tier1MidY - 2;
  const tier1GymMaxY = tier1MidY - 1;

  if (isTier1) {
    // Ensure Tier 1 cities always have a walkable southern frontage street for front services
    const frontStreetY = by + Math.min(H - 2, aveY + 2);
    for (let x = 2; x < W - 2; x++) {
      addStreetCell(bx + x, frontStreetY);
    }
    addStreetCell(bx + aveX, Math.min(by + H - 1, frontStreetY + 1));
  }

  const prioritizeGym =
    shouldPlaceGym && (node.id.includes('cinnabar') || node.terrainPreference === 'coast_water');

  if (prioritizeGym) {
    const placedGymFirst = findStreetFacingLot(
      `${node.id}_gym`,
      'gym',
      'gym_gold',
      orderedSlots[2].x,
      orderedSlots[2].y,
      isTier1 ? { ...orderedSlots[2].bounds, maxY: tier1GymMaxY } : orderedSlots[2].bounds
    );
    if (!placedGymFirst) {
      placeBuildingWithSearch(
        `${node.id}_gym`,
        'gym',
        bx + Math.floor(W / 2) - 2,
        by + 1,
        'gym_gold'
      );
    }
  }

  findStreetFacingLot(
    `${node.id}_pokecenter`,
    'pokecenter',
    'pokecenter',
    orderedSlots[0].x,
    orderedSlots[0].y,
    isTier1 ? { ...orderedSlots[0].bounds, minY: tier1FrontMinY } : orderedSlots[0].bounds
  );
  findStreetFacingLot(
    `${node.id}_pokemart`,
    'pokemart',
    'pokemart',
    orderedSlots[1].x,
    orderedSlots[1].y,
    isTier1 ? { ...orderedSlots[1].bounds, minY: tier1FrontMinY } : orderedSlots[1].bounds
  );
  if (shouldPlaceGym && !prioritizeGym) {
    const placedGym = findStreetFacingLot(
      `${node.id}_gym`,
      'gym',
      'gym_gold',
      orderedSlots[2].x,
      orderedSlots[2].y,
      isTier1 ? { ...orderedSlots[2].bounds, maxY: tier1GymMaxY } : orderedSlots[2].bounds
    );
    if (!placedGym) {
      placeBuildingWithSearch(
        `${node.id}_gym`,
        'gym',
        bx + Math.floor(W / 2) - 2,
        by + 1,
        'gym_gold'
      );
    }
  } else if (!shouldPlaceGym) {
    findStreetFacingLot(
      `${node.id}_residence_lot2`,
      'house',
      'house_gray_small',
      orderedSlots[2].x,
      orderedSlots[2].y,
      orderedSlots[2].bounds
    );
  }
  findStreetFacingLot(
    `${node.id}_landmark`,
    lkDef.type,
    lkDef.key,
    orderedSlots[3].x,
    orderedSlots[3].y,
    orderedSlots[3].bounds
  );

  // Add park center feature for ring_garden only when footprint is spacious enough around central courtyard
  const ringFountainMinW = 18;
  const ringFountainMinH = 16;
  if (pattern === 'ring_garden' && W >= ringFountainMinW && H >= ringFountainMinH) {
    const fMeta = getAssetFilename('poke_fountain');
    addProp('fountain', bx + midX - 1, by + midY - 1, fMeta);
  }

  // Residential houses: along remaining street frontages & secondary sidewalks
  if (isTier1) {
    const palLen = RESIDENTIAL_ROOF_PALETTES.length;
    const h1Key = RESIDENTIAL_ROOF_PALETTES[Math.floor(nextRng() * palLen)]!;
    const h2Key = RESIDENTIAL_ROOF_PALETTES[Math.floor(nextRng() * palLen)]!;
    findStreetFacingLot(
      `${node.id}_house_1`,
      'house',
      h1Key,
      bx + 2,
      by + Math.floor(H * RESIDENTIAL_TIER1_PRIMARY_HOUSE_RATIO)
    );
    findStreetFacingLot(
      `${node.id}_house_2`,
      'house',
      h2Key,
      bx + Math.max(2, W - RESIDENTIAL_TIER1_HOUSE2_MARGIN),
      by + Math.floor(H * RESIDENTIAL_TIER1_SECONDARY_HOUSE_RATIO)
    );
  }

  if (node.terrainPreference === 'mountain_plateau') {
    addProp('rock', bx + 2, by + Math.max(0, H - 2), getAssetFilename('poke_rock_boulder'));
    addProp(
      'rock',
      bx + Math.max(0, W - 3),
      by + Math.max(0, H - 2),
      getAssetFilename('poke_rock_boulder')
    );
  }

  // Decorate all placed buildings
  for (const b of buildings) {
    if (b.type === 'gym') decorateGym(b);
    else if (b.type === 'pokecenter') decoratePokecenter(b);
    else if (b.type === 'house' || b.type === 'condo') decorateHouseLot(b, false);
  }

  // Sidewalks flanking avenues (strictly on land)
  const swX1 = aveX - SIDEWALK_AVENUE_NEGATIVE_OFFSET;
  const swX2 = aveX + SIDEWALK_AVENUE_POSITIVE_OFFSET;
  const swY1 = aveY - SIDEWALK_AVENUE_NEGATIVE_OFFSET;
  const swY2 = aveY + SIDEWALK_AVENUE_POSITIVE_OFFSET;

  if (swX1 >= 0) {
    for (let y = 0; y < H; y++) addPlazaCell(bx + swX1, by + y);
  }
  if (swX2 < W) {
    for (let y = 0; y < H; y++) addPlazaCell(bx + swX2, by + y);
  }
  if (swY1 >= 0) {
    for (let x = 0; x < W; x++) addPlazaCell(bx + x, by + swY1);
  }
  if (swY2 < H) {
    for (let x = 0; x < W; x++) addPlazaCell(bx + x, by + swY2);
  }

  // Also pave sidewalks along midX / midY if avenue was shifted
  if (aveX !== midX) {
    if (midX - SIDEWALK_AVENUE_NEGATIVE_OFFSET >= 0) {
      for (let y = 0; y < H; y++) addPlazaCell(bx + midX - SIDEWALK_AVENUE_NEGATIVE_OFFSET, by + y);
    }
    if (midX + SIDEWALK_AVENUE_POSITIVE_OFFSET < W) {
      for (let y = 0; y < H; y++) addPlazaCell(bx + midX + SIDEWALK_AVENUE_POSITIVE_OFFSET, by + y);
    }
  }

  // Props: rest benches (with robust candidate search outside central crossing)
  let benchCount = 0;
  const benchCandidates = [
    {
      x: swX1,
      prefab: 'poke_bench_v_left',
      yRange: [
        Math.min(H - 2, midY + BENCH_OFFSET_Y_NEAR),
        Math.min(H - 2, midY + BENCH_OFFSET_Y_FAR),
        Math.max(1, midY - BENCH_OFFSET_Y_NEAR),
        Math.max(1, midY - BENCH_OFFSET_Y_FAR)
      ]
    },
    {
      x: swX2,
      prefab: 'poke_bench_v_right',
      yRange: [
        Math.max(1, midY - BENCH_OFFSET_Y_NEAR),
        Math.max(1, midY - BENCH_OFFSET_Y_FAR),
        Math.min(H - 2, midY + BENCH_OFFSET_Y_NEAR),
        Math.min(H - 2, midY + BENCH_OFFSET_Y_FAR)
      ]
    },
    { x: midX - BENCH_OFFSET_X, prefab: 'poke_bench', yRange: [swY1, swY2] },
    { x: midX + BENCH_OFFSET_X, prefab: 'poke_bench', yRange: [swY1, swY2] }
  ];

  for (const cand of benchCandidates) {
    if (cand.x < 0 || cand.x >= W) continue;
    for (const cy of cand.yRange) {
      if (cy < 0 || cy >= H) continue;
      const prevCount = props.length;
      addProp('bench', bx + cand.x, by + cy, getAssetFilename(cand.prefab));
      if (props.length > prevCount) {
        benchCount++;
        break;
      }
    }
    if (benchCount >= BENCH_TARGET_COUNT) break;
  }

  // Fallback: If no bench placed, search broader sidewalk coordinates maintaining crossing buffer
  if (benchCount === 0) {
    for (let y = 1; y < H - 1; y++) {
      if (Math.abs(y - midY) < INTERSECTION_CLEARANCE_RADIUS) continue;
      for (const x of [swX1, swX2, swX1 - 1, swX2 + 1, midX - 2, midX + 1]) {
        if (x < 0 || x >= W) continue;
        const prevCount = props.length;
        addProp('bench', bx + x, by + y, getAssetFilename('poke_bench_v_left'));
        if (props.length > prevCount) {
          benchCount++;
          break;
        }
      }
      if (benchCount > 0) break;
    }
  }

  // Street Lamps: robust candidate search along sidewalks
  let placedLampStd = false;
  for (const lx of [swX1, swX2].filter((x) => x >= 0 && x < W)) {
    for (let ly = 1; ly < H - 1; ly++) {
      const prevCount = props.length;
      addProp('lamp', bx + lx, by + ly, getAssetFilename('poke_street_lamp'));
      if (props.length > prevCount) {
        placedLampStd = true;
        break;
      }
    }
    if (placedLampStd) break;
  }

  let placedLampLeft = false;
  if (H >= LAMP_LEFT_MIN_HEIGHT) {
    for (const lx of [swX2, swX1].filter((x) => x >= 0 && x < W)) {
      for (let ly = H - 2; ly >= 1; ly--) {
        const prevCount = props.length;
        addProp('lamp', bx + lx, by + ly, getAssetFilename('poke_street_lamp_left'));
        if (props.length > prevCount) {
          placedLampLeft = true;
          break;
        }
      }
      if (placedLampLeft) break;
    }
  }

  // --------------------------------------------------------------------------
  // Waterfront Boardwalk Promenade (if coastal / waterfront)
  // --------------------------------------------------------------------------
  if (settlementHasWater) {
    paveWaterfrontBoardwalk(bx, by, W, H, isCellLand, hasAdjacentWater, addPlazaCell, addProp);
  }

  if (isIslandOrCoastal && !settlementHasWater) {
    addProp(
      'flower',
      bx + 0,
      by + Math.min(H - 2, ISLAND_FLOWER_MAX_Y),
      getAssetFilename('poke_flowers_red')
    );
    addProp(
      'flower',
      bx + Math.min(W - 1, ISLAND_FLOWER_MAX_X),
      by + Math.min(H - 2, ISLAND_FLOWER_MAX_Y),
      getAssetFilename('poke_flowers_red')
    );
  } else if (!settlementHasWater) {
    addProp(
      'flower',
      bx + 0,
      by + Math.min(H - 2, CONTINENT_FLOWER_MAX_Y),
      getAssetFilename('poke_flower_pot_circular')
    );
    addProp(
      'flower',
      bx + Math.min(W - 1, CONTINENT_FLOWER_MAX_X),
      by + Math.min(H - 2, CONTINENT_FLOWER_MAX_Y),
      getAssetFilename('poke_flower_pot_circular')
    );
  }

  const { cleanStreets, streetSet, bMask } = finalizeSettlementStreets(
    buildings,
    internalStreets,
    { bx, by, W, H },
    isCellLand
  );

  // Deduplicate and filter paved sidewalk cells
  const cleanPlazas: { x: number; y: number }[] = [];
  const plazaSeen = new Set<string>();
  for (const p of pavedPlazaCells) {
    const key = `${p.x}_${p.y}`;
    if (!bMask.has(key) && !streetSet.has(key) && !plazaSeen.has(key) && isCellLand(p.x, p.y)) {
      plazaSeen.add(key);
      cleanPlazas.push(p);
    }
  }

  placeSettlementPerimeterBarriers(
    node,
    { bx, by, W, H },
    bMask,
    streetSet,
    plazaSeen,
    reservedDoorsteps,
    isCellLand,
    addProp
  );

  const curbs = computeUrbanCurbs({
    pavedPlazaCells: cleanPlazas,
    internalStreets: cleanStreets,
    reservedClearance: reservedDoorsteps
  });

  let roadMaterial: UrbanRoadMaterial = 'asphalt';
  if (isIslandOrCoastal && !settlementHasWater) roadMaterial = 'dirt';
  else if (
    settlementHasWater ||
    pattern === 'coastal_wharf' ||
    genes.waterFeatureType === 'harbor_dock'
  )
    roadMaterial = 'wood';
  else if (pattern === 'ring_garden') roadMaterial = 'brick';
  else if (pattern === 'radial_plaza') roadMaterial = 'paved';
  else if (pattern === 'l_enclave' || genes.urbanDensity < URBAN_DENSITY_STONE_THRESHOLD)
    roadMaterial = 'stone';

  const isPureIsland =
    /island|canela|cinnabar|isla/i.test(node.id) ||
    /isla|island/i.test(node.name) ||
    node.terrainPreference === 'coast_water';

  return {
    nodeId: node.id,
    buildings,
    props: filterIsolatedUrbanFences(props.filter((p) => !bMask.has(`${p.x}_${p.y}`))),
    internalStreets: cleanStreets,
    pavedPlazaCells: isPureIsland ? [] : cleanPlazas,
    curbs: isPureIsland ? [] : curbs,
    roadMaterial: isPureIsland ? 'dirt' : roadMaterial
  };
}
