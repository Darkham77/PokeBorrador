/**
 * test_aventura/logic/map/wildernessBoundarySealing.ts
 *
 * HERMETIC WILDERNESS BOUNDARY SEALING ENGINE
 *
 * Guarantees that non-transitable wilderness (`!transitableGrid`) forms a
 * mathematically watertight barrier against player bypass across EVERY terrain:
 *   - Coastal sand beaches (`sand`)
 *   - Arid deserts & volcanic plateaus (`arid_desert`, `volcanic_plateau`)
 *   - Narrow gaps between tree roots, cliffs, lakes, and settlement walls
 *   - Flanks around route gatehouse checkpoints (without encroaching on doorways)
 */

import type { POINode } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';
import type { TreePlacement, WildernessPropPlacement } from './wildernessVegetationEngine.ts';

export type NaturalBushPrefab = 'poke_fern_wild_bush.png' | 'poke_bush_round.png';

/**
 * Resolves a varied natural bush/fern prefab for sealing or flanking tiles,
 * strictly avoiding fern prefabs in Mint Highland per biome palette rules.
 */
export function resolveNaturalBushPrefab(
  mBiome: MacroBiome | undefined,
  x: number,
  y: number,
  parityOffset = 0
): NaturalBushPrefab {
  if (mBiome !== 'mint_highland' && ((parityOffset + x + y) & 1) === 0) {
    return 'poke_fern_wild_bush.png';
  }
  return 'poke_bush_round.png';
}

const IMPASSABLE_WILDERNESS_PROP_TYPE_LIST = [
  'boulder',
  'fence_h',
  'fence_v',
  'bush',
  'sapling'
] as const;
export const IMPASSABLE_WILDERNESS_PROP_TYPES: ReadonlySet<string> = new Set<string>( // runtime-set: heterogeneous prop type lookups
  IMPASSABLE_WILDERNESS_PROP_TYPE_LIST
);

const EIGHT_DIRECTION_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
] as const satisfies readonly (readonly [number, number])[];

const OAK_WIDTH = 3;
const OAK_HEIGHT = 4;
const PINE_WIDTH = 2;
const PINE_HEIGHT = 3;
const TRUNK_DEPTH_ROWS = 2;
const GATE_ROADWAY_CLEAR_EXTENT = 6;
const HORIZONTAL_GATE_DOOR_OFFSET_Y = 6;
const CLIFF_PROXIMITY_RADIUS = 2 as const;
const FENCE_MOUNTAIN_SAFETY_RADIUS = 2 as const;
const AUTUMN_OAK_SEGREGATION_RADIUS = 8 as const;
const PARSE_INT_RADIX = 10 as const;

const SEALING_ZONE_ARCHETYPES = [
  'desert_volcanic_boulder',
  'beach_dune_flora',
  'settlement_picket_perimeter',
  'grass_hedge_fence_border'
] as const;
type SealingZoneArchetype = (typeof SEALING_ZONE_ARCHETYPES)[number];

export interface WildernessSealingContext {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly transitableGrid: readonly (readonly boolean[])[];
  readonly tallGrassGrid: readonly (readonly boolean[])[];
  readonly trees: TreePlacement[];
  readonly props: WildernessPropPlacement[];
  readonly reservedEntityCells?: ReadonlySet<string>;
}

export function isMountainCliffCell(
  continent: ContinentMapResult,
  x: number,
  y: number,
  isStair: boolean
): boolean {
  if (isStair) return false;
  if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return true;
  const elev = continent.heightmap[y]?.[x] ?? 0;
  if (elev <= 0) return false;
  const role = continent.resolvedMountain.cellDetails[y]?.[x]?.role;
  if (!role) return false;
  return role === 'peak_isolated' || role.startsWith('edge_') || role.startsWith('corner_outer_');
}

function markPoiStructuresBlocked(
  poi: POINode,
  solidBlocked: boolean[][],
  propCells: Set<string>,
  width: number,
  height: number
): void {
  for (const b of poi.urbanLayout?.buildings ?? []) {
    const maxY = Math.min(height - 1, b.y + b.height - 1);
    const maxX = Math.min(width - 1, b.x + b.width - 1);
    for (let by = Math.max(0, b.y); by <= maxY; by++) {
      for (let bx = Math.max(0, b.x); bx <= maxX; bx++) {
        solidBlocked[by]![bx] = true;
        propCells.add(`${bx}_${by}`);
      }
    }
  }

  for (const prop of poi.urbanLayout?.props ?? []) {
    if (prop.y < 0 || prop.y >= height || prop.x < 0 || prop.x >= width) continue;
    propCells.add(`${prop.x}_${prop.y}`);
    if (IMPASSABLE_WILDERNESS_PROP_TYPES.has(prop.type) || prop.prefabFile.includes('fence')) {
      solidBlocked[prop.y]![prop.x] = true;
    }
  }
}

function markGateRoadwayClearance(
  poi: POINode,
  gateRoadwayReserved: boolean[][],
  width: number,
  height: number
): void {
  const isHorizontal = poi.facing === 'east' || poi.facing === 'west';
  if (isHorizontal) {
    const doorY = poi.gridY + HORIZONTAL_GATE_DOOR_OFFSET_Y;
    const minX = Math.max(0, poi.gridX - GATE_ROADWAY_CLEAR_EXTENT);
    const maxX = Math.min(width - 1, poi.gridX + poi.footprint.width + GATE_ROADWAY_CLEAR_EXTENT);
    for (let x = minX; x <= maxX; x++) {
      if (doorY - 1 >= 0 && doorY - 1 < height) gateRoadwayReserved[doorY - 1]![x] = true;
      if (doorY >= 0 && doorY < height) gateRoadwayReserved[doorY]![x] = true;
    }
    return;
  }

  const midX = poi.gridX + Math.floor(poi.footprint.width / 2);
  const minY = Math.max(0, poi.gridY - GATE_ROADWAY_CLEAR_EXTENT);
  const maxY = Math.min(height - 1, poi.gridY + poi.footprint.height + GATE_ROADWAY_CLEAR_EXTENT);
  for (let y = minY; y <= maxY; y++) {
    if (midX - 1 >= 0 && midX - 1 < width) gateRoadwayReserved[y]![midX - 1] = true;
    if (midX >= 0 && midX < width) gateRoadwayReserved[y]![midX] = true;
  }
}

function markCliffRadius(
  cliffProximity: boolean[][],
  cx: number,
  cy: number,
  width: number,
  height: number
): void {
  const minY = Math.max(0, cy - CLIFF_PROXIMITY_RADIUS);
  const maxY = Math.min(height - 1, cy + CLIFF_PROXIMITY_RADIUS);
  const minX = Math.max(0, cx - CLIFF_PROXIMITY_RADIUS);
  const maxX = Math.min(width - 1, cx + CLIFF_PROXIMITY_RADIUS);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      cliffProximity[y]![x] = true;
    }
  }
}

function recordTreeOccupancy(
  tree: TreePlacement,
  solidBlocked: boolean[][],
  propCells: Set<string>,
  treeCanopyKeys: Set<string>,
  width: number,
  height: number
): void {
  const trunkRows = Math.min(TRUNK_DEPTH_ROWS, tree.height);
  const overhang = Math.max(0, tree.height - TRUNK_DEPTH_ROWS);
  const maxY = Math.min(height - 1, tree.y + trunkRows - 1);
  const maxX = Math.min(width - 1, tree.x + tree.width - 1);
  const minCanopyY = Math.max(0, tree.y - overhang);

  for (let cy = minCanopyY; cy <= maxY; cy++) {
    for (let cx = Math.max(0, tree.x); cx <= maxX; cx++) {
      treeCanopyKeys.add(`${cx}_${cy}`);
      if (cy >= tree.y) {
        solidBlocked[cy]![cx] = true;
        propCells.add(`${cx}_${cy}`);
      }
    }
  }
}

function buildInitialCollisionState(ctx: WildernessSealingContext): {
  readonly solidBlocked: boolean[][];
  readonly propCells: Set<string>;
  readonly walkableWildernessPropIndices: Map<string, number>;
  readonly settlementInterior: boolean[][];
  readonly gateRoadwayReserved: boolean[][];
  readonly treeCanopyKeys: Set<string>;
  readonly fenceKeys: Set<string>;
  readonly settlementRimKeys: Set<string>;
  readonly dungeonForestMarginKeys: Set<string>;
  readonly cliffProximity: boolean[][];
  readonly reservedEntityKeys: Set<string>;
} {
  const { continent, pois, trees, props, reservedEntityCells } = ctx;
  const W = continent.width;
  const H = continent.height;

  const solidBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const settlementInterior: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const gateRoadwayReserved: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const cliffProximity: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const propCells = new Set<string>();
  const treeCanopyKeys = new Set<string>();
  const fenceKeys = new Set<string>();
  const settlementRimKeys = new Set<string>();
  const dungeonForestMarginKeys = new Set<string>();
  const reservedEntityKeys = new Set<string>();
  const walkableWildernessPropIndices = new Map<string, number>();
  const stairSet = new Set(continent.placedStairs.map((s) => `${s.x}_${s.y}`));

  if (reservedEntityCells) {
    for (const raw of reservedEntityCells) {
      const comma = raw.indexOf(',');
      if (comma !== -1) {
        const rx = parseInt(raw.slice(0, comma), PARSE_INT_RADIX);
        const ry = parseInt(raw.slice(comma + 1), PARSE_INT_RADIX);
        reservedEntityKeys.add(`${rx}_${ry}`);
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = continent.terrainMatrix[y]![x];
      const elev = continent.heightmap[y]?.[x] ?? 0;
      const isFoot = Boolean(continent.resolvedMountain.occupiedFootCells[y]?.[x]);
      if (elev > 0 || isFoot) {
        markCliffRadius(cliffProximity, x, y, W, H);
      }
      if (t === 'water' || t === 'water_deep') {
        solidBlocked[y]![x] = true;
      } else if (isMountainCliffCell(continent, x, y, stairSet.has(`${x}_${y}`))) {
        solidBlocked[y]![x] = true;
      }
    }
  }

  for (const poi of pois) {
    const isSettlement = poi.type === 'town' || poi.type === 'city' || poi.type === 'metropolis';
    const isForest = poi.type === 'dungeon_forest';
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height - 1);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width - 1);
    for (let y = Math.max(0, poi.gridY - 2); y <= Math.min(H - 1, maxY + 2); y++) {
      for (let x = Math.max(0, poi.gridX - 2); x <= Math.min(W - 1, maxX + 2); x++) {
        if (isSettlement) settlementRimKeys.add(`${x}_${y}`);
        if (isForest) dungeonForestMarginKeys.add(`${x}_${y}`);
        if (
          x >= poi.gridX &&
          x <= maxX &&
          y >= poi.gridY &&
          y <= maxY &&
          ctx.transitableGrid[y]?.[x]
        ) {
          settlementInterior[y]![x] = true;
        }
      }
    }
    markPoiStructuresBlocked(poi, solidBlocked, propCells, W, H);
    if (poi.type === 'route_gate') {
      markGateRoadwayClearance(poi, gateRoadwayReserved, W, H);
    }
  }

  for (const tree of trees) {
    recordTreeOccupancy(tree, solidBlocked, propCells, treeCanopyKeys, W, H);
  }

  for (let i = 0; i < props.length; i++) {
    const prop = props[i]!;
    if (prop.y < 0 || prop.y >= H || prop.x < 0 || prop.x >= W) continue;
    const key = `${prop.x}_${prop.y}`;
    propCells.add(key);
    if (prop.prefabFile.includes('fence')) fenceKeys.add(key);
    if (IMPASSABLE_WILDERNESS_PROP_TYPES.has(prop.type) || prop.prefabFile.includes('fence')) {
      solidBlocked[prop.y]![prop.x] = true;
    } else {
      walkableWildernessPropIndices.set(key, i);
    }
  }

  return {
    solidBlocked,
    propCells,
    walkableWildernessPropIndices,
    settlementInterior,
    gateRoadwayReserved,
    treeCanopyKeys,
    fenceKeys,
    settlementRimKeys,
    dungeonForestMarginKeys,
    cliffProximity,
    reservedEntityKeys
  };
}

function hasWaterMarginForSealingTree(
  tx: number,
  ty: number,
  treeW: number,
  overhang: number,
  continent: ContinentMapResult
): boolean {
  const minX = Math.max(0, tx - 1);
  const maxX = Math.min(continent.width - 1, tx + treeW);
  const minY = Math.max(0, ty - overhang - 1);
  const maxY = Math.min(continent.height - 1, ty + TRUNK_DEPTH_ROWS);
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      const terr = continent.terrainMatrix[cy]?.[cx];
      if (terr === 'water' || terr === 'water_deep') return true;
    }
  }
  return false;
}

interface SealingTreeCanopyContext {
  readonly tx: number;
  readonly ty: number;
  readonly treeW: number;
  readonly overhang: number;
  readonly ctx: WildernessSealingContext;
  readonly solidBlocked: readonly (readonly boolean[])[];
  readonly propCells: ReadonlySet<string>;
  readonly settlementInterior: readonly (readonly boolean[])[];
  readonly gateRoadwayReserved: readonly (readonly boolean[])[];
  readonly fenceKeys: ReadonlySet<string>;
  readonly reservedEntityKeys: ReadonlySet<string>;
}

function canPlaceSealingTreeFootprint(params: SealingTreeCanopyContext): boolean {
  const {
    tx,
    ty,
    treeW,
    overhang,
    ctx,
    solidBlocked,
    propCells,
    settlementInterior,
    gateRoadwayReserved,
    fenceKeys,
    reservedEntityKeys
  } = params;
  const { continent, pathGrid, transitableGrid, tallGrassGrid } = ctx;
  if (hasWaterMarginForSealingTree(tx, ty, treeW, overhang, continent)) return false;

  for (let dy = -overhang; dy <= 1; dy++) {
    for (let dx = 0; dx < treeW; dx++) {
      const cx = tx + dx;
      const cy = ty + dy;
      const cellKey = `${cx}_${cy}`;
      if (
        gateRoadwayReserved[cy]?.[cx] ||
        propCells.has(cellKey) ||
        fenceKeys.has(cellKey) ||
        reservedEntityKeys.has(cellKey) ||
        tallGrassGrid[cy]?.[cx]
      ) {
        return false;
      }
      if (dy < 0) continue;

      if (
        settlementInterior[cy]?.[cx] ||
        continent.terrainMatrix[cy]?.[cx] !== 'grass' ||
        (continent.heightmap[cy]?.[cx] ?? 0) !== 0 ||
        transitableGrid[cy]?.[cx] ||
        pathGrid[cy]?.[cx] ||
        solidBlocked[cy]?.[cx]
      ) {
        return false;
      }
    }
  }
  return true;
}

interface TreeCandidateSpec {
  readonly prefabFile: string;
  readonly treeW: number;
  readonly treeH: number;
}

function resolveSealingTreeCandidates(
  x: number,
  y: number,
  mBiome: MacroBiome,
  trees: readonly TreePlacement[]
): readonly TreeCandidateSpec[] {
  if (mBiome === 'mint_highland') {
    return [{ prefabFile: 'poke_tree_pine_small.png', treeW: PINE_WIDTH, treeH: PINE_HEIGHT }];
  }
  if (mBiome === 'viridian_forest') {
    return [{ prefabFile: 'poke_tree_oak_clean.png', treeW: OAK_WIDTH, treeH: OAK_HEIGHT }];
  }
  const nearAutumnOak = trees.some(
    (tr) =>
      tr.prefabFile === 'poke_tree_oak_yellow.png' &&
      Math.hypot(tr.x - x, tr.y - y) < AUTUMN_OAK_SEGREGATION_RADIUS
  );
  const oakFile = nearAutumnOak ? 'poke_tree_oak_yellow.png' : 'poke_tree_oak_clean.png';
  return [
    { prefabFile: oakFile, treeW: OAK_WIDTH, treeH: OAK_HEIGHT },
    { prefabFile: 'tree_viridian_forest.png', treeW: PINE_WIDTH, treeH: PINE_HEIGHT }
  ];
}

function tryPlaceCompactSealingTree(
  x: number,
  y: number,
  ctx: WildernessSealingContext,
  solidBlocked: boolean[][],
  propCells: Set<string>,
  treeCanopyKeys: Set<string>,
  fenceKeys: ReadonlySet<string>,
  reservedEntityKeys: ReadonlySet<string>,
  settlementInterior: readonly (readonly boolean[])[],
  gateRoadwayReserved: readonly (readonly boolean[])[]
): boolean {
  const { continent, trees } = ctx;
  const W = continent.width;
  const H = continent.height;
  const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
  if (mBiome === 'arid_desert') return false;
  if (continent.terrainMatrix[y]?.[x] !== 'grass' || (continent.heightmap[y]?.[x] ?? 0) !== 0) {
    return false;
  }

  const candidates = resolveSealingTreeCandidates(x, y, mBiome, trees);
  const yOffsets = [0, -1] as const;

  for (const cand of candidates) {
    const overhang = cand.treeH - TRUNK_DEPTH_ROWS;
    const xOffsets = cand.treeW === PINE_WIDTH ? ([0, -1] as const) : ([0, -1, -2] as const);

    for (const oy of yOffsets) {
      const ty = y + oy;
      if (ty - overhang < 1 || ty + 1 >= H - 1) continue;
      for (const ox of xOffsets) {
        const tx = x + ox;
        if (tx < 1 || tx + cand.treeW >= W - 1) continue;
        if (
          !canPlaceSealingTreeFootprint({
            tx,
            ty,
            treeW: cand.treeW,
            overhang,
            ctx,
            solidBlocked,
            propCells,
            settlementInterior,
            gateRoadwayReserved,
            fenceKeys,
            reservedEntityKeys
          })
        ) {
          continue;
        }
        const overlapsExisting = trees.some(
          (tr) => tx < tr.x + tr.width && tx + cand.treeW > tr.x && Math.abs(ty - tr.y) <= 1
        );
        if (overlapsExisting) continue;

        const placed: TreePlacement = {
          x: tx,
          y: ty,
          width: cand.treeW,
          height: cand.treeH,
          prefabFile: cand.prefabFile
        };
        trees.push(placed);
        recordTreeOccupancy(placed, solidBlocked, propCells, treeCanopyKeys, W, H);
        return true;
      }
    }
  }
  return false;
}

const ROCK_VARIETY_COASTAL = [
  'poke_rock_boulder_mossy_1.png',
  'poke_rock_boulder_mossy_2.png',
  'poke_rock_boulder_brown_large.png',
  'poke_rock_boulder.png'
] as const;

const SAND_DUNE_EDGE_FLORA = [
  { type: 'bush', prefabFile: 'poke_fern_wild_bush.png' },
  { type: 'bush', prefabFile: 'poke_bush_round.png' }
] as const;

const SEAL_CLUSTER_CELL_SPAN = 6 as const;
const SEAL_WARP_AMPLITUDE = 1 as const;
const SEAL_HASH_PRIME_X = 73856093 as const;
const SEAL_HASH_PRIME_Y = 19349663 as const;
const SEAL_HASH_PRIME_SEED = 2654435761 as const;
const SEAL_HASH_MODULO = 100 as const;

function sealClusterHash(x: number, y: number, seed: number): number {
  const warpX = (x + Math.floor(y / 2)) % 3 === 0 ? SEAL_WARP_AMPLITUDE : 0;
  const warpY = (y + Math.floor(x / 2)) % 3 === 0 ? SEAL_WARP_AMPLITUDE : 0;
  const clusterX = Math.floor((x + warpX) / SEAL_CLUSTER_CELL_SPAN);
  const clusterY = Math.floor((y + warpY) / SEAL_CLUSTER_CELL_SPAN);
  const raw = Math.abs(
    clusterX * SEAL_HASH_PRIME_X + clusterY * SEAL_HASH_PRIME_Y + seed * SEAL_HASH_PRIME_SEED
  );
  return raw % SEAL_HASH_MODULO;
}

const SEAL_PROP_THRESHOLDS = {
  SAND_FLORA_MAX: 42
} as const;

function hasVerticalTransitableNeighbor(
  transitableGrid: readonly (readonly boolean[])[],
  x: number,
  y: number
): boolean {
  return Boolean(transitableGrid[y - 1]?.[x] || transitableGrid[y + 1]?.[x]);
}

function canPlaceFenceSafely(
  continent: ContinentMapResult,
  x: number,
  y: number,
  treeCanopyKeys: ReadonlySet<string>,
  dungeonForestMarginKeys: ReadonlySet<string>,
  stairSet: ReadonlySet<string>
): boolean {
  const key = `${x}_${y}`;
  if (treeCanopyKeys.has(key) || dungeonForestMarginKeys.has(key)) return false;
  if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
  if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
  if (continent.resolvedMountain.cellDetails[y]?.[x]) return false;

  for (let dy = -FENCE_MOUNTAIN_SAFETY_RADIUS; dy <= FENCE_MOUNTAIN_SAFETY_RADIUS; dy++) {
    for (let dx = -FENCE_MOUNTAIN_SAFETY_RADIUS; dx <= FENCE_MOUNTAIN_SAFETY_RADIUS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= continent.width || ny < 0 || ny >= continent.height) continue;
      if (stairSet.has(`${nx}_${ny}`)) return false;
      const mCell = continent.resolvedMountain.cellDetails[ny]?.[nx];
      if (
        mCell?.role.includes('stairs') ||
        mCell?.role.includes('cliff') ||
        mCell?.role.includes('edge_south')
      ) {
        return false;
      }
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (continent.heightmap[ny]?.[nx] ?? 0) > 0) {
        return false;
      }
    }
  }
  return true;
}

function classifySealingZoneArchetype(
  continent: ContinentMapResult,
  x: number,
  y: number,
  settlementRimKeys: ReadonlySet<string>
): SealingZoneArchetype {
  const terrain = continent.terrainMatrix[y]?.[x];
  const elev = continent.heightmap[y]?.[x] ?? 0;
  const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x];

  if (elev > 0 && (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau')) {
    return 'desert_volcanic_boulder';
  }
  if (terrain === 'sand') {
    return 'beach_dune_flora';
  }
  if (settlementRimKeys.has(`${x}_${y}`)) {
    return 'settlement_picket_perimeter';
  }
  return 'grass_hedge_fence_border';
}

interface ResolveSealPropInput {
  readonly continent: ContinentMapResult;
  readonly transitableGrid: readonly (readonly boolean[])[];
  readonly cliffProximity: readonly (readonly boolean[])[];
  readonly settlementRimKeys: ReadonlySet<string>;
  readonly dungeonForestMarginKeys: ReadonlySet<string>;
  readonly treeCanopyKeys: ReadonlySet<string>;
  readonly stairSet: ReadonlySet<string>;
  readonly x: number;
  readonly y: number;
}

function resolveNaturalSealProp(input: ResolveSealPropInput): {
  readonly type: WildernessPropPlacement['type'];
  readonly prefabFile: string;
} {
  const {
    continent,
    transitableGrid,
    cliffProximity,
    settlementRimKeys,
    dungeonForestMarginKeys,
    treeCanopyKeys,
    stairSet,
    x,
    y
  } = input;
  const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
  const roll = sealClusterHash(x, y, continent.seed);
  const archetype = classifySealingZoneArchetype(continent, x, y, settlementRimKeys);
  const horizontalEdge = hasVerticalTransitableNeighbor(transitableGrid, x, y);
  const fenceSafe = canPlaceFenceSafely(
    continent,
    x,
    y,
    treeCanopyKeys,
    dungeonForestMarginKeys,
    stairSet
  );

  if (archetype === 'desert_volcanic_boulder') {
    return {
      type: 'boulder',
      prefabFile: ROCK_VARIETY_COASTAL[roll % ROCK_VARIETY_COASTAL.length]!
    };
  }

  const naturalBushPrefab = resolveNaturalBushPrefab(mBiome, x, y, roll);

  if (archetype === 'beach_dune_flora') {
    const touchesGrass = EIGHT_DIRECTION_OFFSETS.some(
      ([dx, dy]) => continent.terrainMatrix[y + dy]?.[x + dx] === 'grass'
    );
    if (touchesGrass && roll < SEAL_PROP_THRESHOLDS.SAND_FLORA_MAX) {
      const def = SAND_DUNE_EDGE_FLORA[roll % SAND_DUNE_EDGE_FLORA.length]!;
      return { type: def.type, prefabFile: def.prefabFile };
    }
    return {
      type: 'bush',
      prefabFile: naturalBushPrefab
    };
  }

  if (archetype === 'settlement_picket_perimeter') {
    if (fenceSafe && !cliffProximity[y]?.[x]) {
      const prefabFile = horizontalEdge
        ? roll % 2 === 0
          ? 'poke_fence_picket.png'
          : 'poke_fence_white_h_mid.png'
        : 'poke_fence_white_v_left.png';
      return { type: horizontalEdge ? 'fence_h' : 'fence_v', prefabFile };
    }
    return { type: 'bush', prefabFile: 'poke_bush_round.png' };
  }

  // Flat grass route enclosure: continuous alternating green hedges and ferns (never random mid-route fences or boulder walls)
  return { type: 'bush', prefabFile: naturalBushPrefab };
}

function downgradeIsolatedSealingFences(
  props: WildernessPropPlacement[],
  sealingIndices: readonly number[],
  fenceKeys: Set<string>
): void {
  const CARDINAL_OFFSETS: readonly (readonly [number, number])[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  for (const idx of sealingIndices) {
    const p = props[idx];
    if (!p || !p.prefabFile.includes('fence')) continue;
    const hasFenceNeighbor = CARDINAL_OFFSETS.some(([dx, dy]) =>
      fenceKeys.has(`${p.x + dx}_${p.y + dy}`)
    );
    if (hasFenceNeighbor) continue;
    fenceKeys.delete(`${p.x}_${p.y}`);
    props[idx] = {
      type: 'bush',
      x: p.x,
      y: p.y,
      prefabFile: 'poke_bush_round.png'
    };
  }
}

/**
 * Seals every 8-connected outer boundary tile around transitableGrid (plus map land edges)
 * so beaches, deserts, cliffs, and city perimeters never leak players across disconnected routes.
 */
export function sealNonTransitableWildernessBoundary(ctx: WildernessSealingContext): void {
  const { continent, pathGrid, transitableGrid, props } = ctx;
  const W = continent.width;
  const H = continent.height;
  const {
    solidBlocked,
    propCells,
    walkableWildernessPropIndices,
    settlementInterior,
    gateRoadwayReserved,
    treeCanopyKeys,
    fenceKeys,
    settlementRimKeys,
    dungeonForestMarginKeys,
    cliffProximity,
    reservedEntityKeys
  } = buildInitialCollisionState(ctx);
  const stairSet = new Set(continent.placedStairs.map((s) => `${s.x}_${s.y}`));
  const sealingFenceIndices: number[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const key = `${x}_${y}`;
      if (transitableGrid[y]?.[x] || solidBlocked[y]![x] || pathGrid[y]?.[x]) continue;
      if (stairSet.has(key) || settlementInterior[y]![x] || gateRoadwayReserved[y]![x]) continue;

      const isOuterLandRim = x <= 1 || x >= W - 2 || y <= 1 || y >= H - 2;
      if (!isOuterLandRim && reservedEntityKeys.has(key)) continue;

      const bordersTransitable = EIGHT_DIRECTION_OFFSETS.some(([dx, dy]) =>
        Boolean(transitableGrid[y + dy]?.[x + dx])
      );
      if (!bordersTransitable && !isOuterLandRim) continue;

      if (
        tryPlaceCompactSealingTree(
          x,
          y,
          ctx,
          solidBlocked,
          propCells,
          treeCanopyKeys,
          fenceKeys,
          reservedEntityKeys,
          settlementInterior,
          gateRoadwayReserved
        )
      ) {
        continue;
      }

      const propDef = resolveNaturalSealProp({
        continent,
        transitableGrid,
        cliffProximity,
        settlementRimKeys,
        dungeonForestMarginKeys,
        treeCanopyKeys,
        stairSet,
        x,
        y
      });
      const walkableIdx = walkableWildernessPropIndices.get(key);
      let writtenIdx: number;
      if (walkableIdx !== undefined) {
        props[walkableIdx] = {
          type: propDef.type,
          x,
          y,
          prefabFile: propDef.prefabFile
        };
        writtenIdx = walkableIdx;
      } else {
        writtenIdx = props.length;
        props.push({
          type: propDef.type,
          x,
          y,
          prefabFile: propDef.prefabFile
        });
      }
      if (propDef.prefabFile.includes('fence')) {
        fenceKeys.add(key);
        sealingFenceIndices.push(writtenIdx);
      }
      solidBlocked[y]![x] = true;
      propCells.add(key);
    }
  }

  downgradeIsolatedSealingFences(props, sealingFenceIndices, fenceKeys);
}
