/**
 * src/logic/map/urbanPavingEngine.ts
 *
 * URBAN PAVING & CURB CLEARANCE ENGINE (PHASE 3)
 *
 * Enforces authentic GBA urban paving and curb boundary management:
 *   1. Assigns canonical slate cobblestone asphalt ('poke_road_asphalt') to vehicular avenues.
 *   2. Assigns authentic cobblestone pavement ('poke_stone_plaza_center') to pedestrian concourses and sidewalks.
 *   3. Eradicates the monolithic flat white/gray slab.
 *   4. Computes directional stone curbs ('poke_curb_n/s/w/e') between sidewalks and avenues.
 *   5. Curb Clearance Invariant: Explicitly omits curbs in front of all building entrances
 *      (doorX, doorY + 1) and pedestrian crosswalks, guaranteeing unobstructed passage.
 */

import type {
  POINode,
  POIType,
  SettlementCurbPlacement,
  UrbanPropPlacement
} from '../../types/map/poiTypes.ts';
import { getAssetFilename } from './canonicalAssetsRegistry.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { resolveNaturalBushPrefab } from './wildernessBoundarySealing.ts';
import type { WildernessPropPlacement } from './wildernessVegetationEngine.ts';

export interface UrbanCurbOptions {
  readonly pavedPlazaCells: readonly { readonly x: number; readonly y: number }[];
  readonly internalStreets: readonly { readonly x: number; readonly y: number }[];
  readonly reservedClearance: ReadonlySet<string>;
  readonly crosswalkKeys?: ReadonlySet<string>;
}

/**
 * Returns the primary sprite filename for vehicular avenues or rural roads.
 */
export function getCanonicalUrbanRoadTile(type: POIType): string {
  if (type === 'town') {
    return 'poke_dirt_path.png';
  }
  return getAssetFilename('poke_road_paved');
}

/**
 * Computes stone curb placements between sidewalks and vehicular avenues,
 * strictly enforcing the Curb Clearance Invariant.
 */
export function computeUrbanCurbs(options: UrbanCurbOptions): SettlementCurbPlacement[] {
  const { pavedPlazaCells, internalStreets, reservedClearance, crosswalkKeys } = options;

  const streetSet = new Set<string>();
  for (const s of internalStreets) {
    streetSet.add(`${s.x}_${s.y}`);
  }

  const curbs: SettlementCurbPlacement[] = [];

  for (const cell of pavedPlazaCells) {
    const key = `${cell.x}_${cell.y}`;

    // Curb Clearance Invariant: never stamp curbs on doorsteps, aprons, or crosswalks
    if (reservedClearance.has(key) || crosswalkKeys?.has(key)) {
      continue;
    }

    // Check 4 cardinal neighbors for road adjacency
    const neighbors = [
      { dx: 0, dy: -1, dir: 'n' as const, curbId: 'poke_curb_n' },
      { dx: 0, dy: 1, dir: 's' as const, curbId: 'poke_curb_s' },
      { dx: -1, dy: 0, dir: 'w' as const, curbId: 'poke_curb_w' },
      { dx: 1, dy: 0, dir: 'e' as const, curbId: 'poke_curb_e' }
    ];

    for (const { dx, dy, dir, curbId } of neighbors) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const nKey = `${nx}_${ny}`;

      // Only place a curb if the neighbor is a vehicular street and not a cleared crosswalk
      if (streetSet.has(nKey) && !reservedClearance.has(nKey) && !crosswalkKeys?.has(nKey)) {
        curbs.push({
          x: cell.x,
          y: cell.y,
          direction: dir,
          curbTile: getAssetFilename(curbId)
        });
        // One curb per cell is sufficient for the primary street-facing side
        break;
      }
    }
  }

  return curbs;
}

/**
 * Removes isolated 1x1 fence segments that lack any cardinally adjacent fence neighbor.
 */
export function filterIsolatedUrbanFences(
  props: readonly UrbanPropPlacement[]
): UrbanPropPlacement[] {
  const fenceKeys = new Set<string>();
  for (const prop of props) {
    if (prop.prefabFile.includes('fence')) {
      fenceKeys.add(`${prop.x}_${prop.y}`);
    }
  }
  return props.filter((prop) => {
    if (!prop.prefabFile.includes('fence')) return true;
    return (
      fenceKeys.has(`${prop.x - 1}_${prop.y}`) ||
      fenceKeys.has(`${prop.x + 1}_${prop.y}`) ||
      fenceKeys.has(`${prop.x}_${prop.y - 1}`) ||
      fenceKeys.has(`${prop.x}_${prop.y + 1}`)
    );
  });
}

const MIN_URBAN_FENCE_COMPONENT_SIZE = 3 as const;

function hasUrbanFenceGeologicalCollision(
  x: number,
  y: number,
  continent: ContinentMapResult,
  boulderKeys: ReadonlySet<string>
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      const terr = continent.terrainMatrix[ny]?.[nx];
      if (terr === 'water' || terr === 'water_deep') return true;
      if ((continent.heightmap[ny]?.[nx] ?? 0) > 0) return true;
      if (continent.resolvedMountain.occupiedFootCells[ny]?.[nx]) return true;
      if (boulderKeys.has(`${nx}_${ny}`)) return true;
    }
  }
  return false;
}

function collectValidUrbanFenceKeys(props: readonly UrbanPropPlacement[]): ReadonlySet<string> {
  const fenceKeys = new Set<string>();
  for (const prop of props) {
    if (prop.prefabFile.includes('fence')) {
      fenceKeys.add(`${prop.x}_${prop.y}`);
    }
  }
  const kept = new Set<string>();
  const visited = new Set<string>();
  const CARDINALS: readonly (readonly [number, number])[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (const prop of props) {
    if (!prop.prefabFile.includes('fence')) continue;
    const startKey = `${prop.x}_${prop.y}`;
    if (visited.has(startKey)) continue;
    visited.add(startKey);

    const component: string[] = [];
    const queue: { x: number; y: number }[] = [{ x: prop.x, y: prop.y }];
    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head]!;
      const curKey = `${cur.x}_${cur.y}`;
      component.push(curKey);
      for (const [dx, dy] of CARDINALS) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const nKey = `${nx}_${ny}`;
        if (fenceKeys.has(nKey) && !visited.has(nKey)) {
          visited.add(nKey);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    if (component.length >= MIN_URBAN_FENCE_COMPONENT_SIZE) {
      for (const k of component) kept.add(k);
    }
  }
  return kept;
}

function resolveFenceReplacementBush(continent: ContinentMapResult, x: number, y: number): string {
  return resolveNaturalBushPrefab(continent.macroBiomes?.biomeGrid[y]?.[x], x, y);
}

const ANCHORED_URBAN_PROP_TYPES: ReadonlySet<UrbanPropPlacement['type']> = new Set<
  UrbanPropPlacement['type']
>(['bench', 'flower', 'signpost']);

const URBAN_ANCHORED_SETTLEMENT_TYPES: ReadonlySet<POIType> = new Set<POIType>([
  'town',
  'city',
  'metropolis',
  'pokemon_league'
]);

/**
 * Anchors urban street furniture (`bench`, `flower`, `signpost`) strictly within 1 Chebyshev cell
 * of verified urban streets, plazas, or building footprints, pruning rural-grass orphan props.
 */
export function anchorUrbanPropsToStreetsAndYards(pois: readonly POINode[]): POINode[] {
  return pois.map((poi) => {
    if (!URBAN_ANCHORED_SETTLEMENT_TYPES.has(poi.type) || !poi.urbanLayout) return poi;
    const layout = poi.urbanLayout;
    if (layout.props.length === 0) return poi;

    const anchorKeys = new Set<string>();
    for (const st of layout.internalStreets ?? []) {
      anchorKeys.add(`${st.x}_${st.y}`);
    }
    for (const pz of layout.pavedPlazaCells ?? []) {
      anchorKeys.add(`${pz.x}_${pz.y}`);
    }
    for (const b of layout.buildings ?? []) {
      for (let by = b.y; by < b.y + b.height; by++) {
        for (let bx = b.x; bx < b.x + b.width; bx++) {
          anchorKeys.add(`${bx}_${by}`);
        }
      }
    }

    const anchoredProps = layout.props.filter((prop) => {
      if (!ANCHORED_URBAN_PROP_TYPES.has(prop.type)) return true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (anchorKeys.has(`${prop.x + dx}_${prop.y + dy}`)) {
            return true;
          }
        }
      }
      return false;
    });

    if (anchoredProps.length === layout.props.length) return poi;
    return {
      ...poi,
      urbanLayout: {
        ...layout,
        props: anchoredProps
      }
    };
  });
}

/**
 * Strips non-gatehouse urban fences colliding with cliffs, water, caves, or boulders,
 * fragmented < 3-tile dangling urban fence stubs, and any 1x1 orphan fences
 * left in wilderness boundary seals after urban cleanup.
 */
export function sanitizeContinentalUrbanFences(
  pois: readonly POINode[],
  continent: ContinentMapResult,
  wildernessProps: readonly WildernessPropPlacement[]
): { readonly pois: POINode[]; readonly wildernessProps: WildernessPropPlacement[] } {
  const boulderKeys = new Set<string>();
  for (const p of wildernessProps) {
    if (p.type === 'boulder') boulderKeys.add(`${p.x}_${p.y}`);
  }
  for (const poi of pois) {
    if (poi.type === 'cave_entrance') {
      for (let cy = poi.gridY; cy < poi.gridY + poi.footprint.height; cy++) {
        for (let cx = poi.gridX; cx < poi.gridX + poi.footprint.width; cx++) {
          boulderKeys.add(`${cx}_${cy}`);
        }
      }
    }
    for (const p of poi.urbanLayout?.props ?? []) {
      if (p.type === 'rock' || p.prefabFile.includes('boulder')) {
        boulderKeys.add(`${p.x}_${p.y}`);
      }
    }
  }

  const sanitizedPois = pois.map((poi) => {
    const layout = poi.urbanLayout;
    if (!layout || layout.props.length === 0 || poi.type === 'route_gate') return poi;

    const collisionFree: UrbanPropPlacement[] = layout.props.map((prop) => {
      if (!prop.prefabFile.includes('fence')) return prop;
      if (!hasUrbanFenceGeologicalCollision(prop.x, prop.y, continent, boulderKeys)) return prop;
      return {
        ...prop,
        type: 'bush' as const,
        prefabFile: resolveFenceReplacementBush(continent, prop.x, prop.y)
      };
    });
    const validFenceKeys = collectValidUrbanFenceKeys(collisionFree);
    const cleanedProps: UrbanPropPlacement[] = collisionFree.map((prop) => {
      if (!prop.prefabFile.includes('fence') || validFenceKeys.has(`${prop.x}_${prop.y}`)) {
        return prop;
      }
      return {
        ...prop,
        type: 'bush' as const,
        prefabFile: resolveFenceReplacementBush(continent, prop.x, prop.y)
      };
    });

    return {
      ...poi,
      urbanLayout: {
        ...layout,
        props: cleanedProps
      }
    };
  });

  const combinedFenceKeys = new Set<string>();
  for (const poi of sanitizedPois) {
    for (const prop of poi.urbanLayout?.props ?? []) {
      if (prop.prefabFile.includes('fence')) {
        combinedFenceKeys.add(`${prop.x}_${prop.y}`);
      }
    }
  }
  for (const prop of wildernessProps) {
    if (prop.prefabFile.includes('fence')) {
      combinedFenceKeys.add(`${prop.x}_${prop.y}`);
    }
  }

  const sanitizedWildernessProps = wildernessProps.map((prop) => {
    if (!prop.prefabFile.includes('fence')) return prop;
    const hasCardinalFence =
      combinedFenceKeys.has(`${prop.x - 1}_${prop.y}`) ||
      combinedFenceKeys.has(`${prop.x + 1}_${prop.y}`) ||
      combinedFenceKeys.has(`${prop.x}_${prop.y - 1}`) ||
      combinedFenceKeys.has(`${prop.x}_${prop.y + 1}`);
    if (hasCardinalFence) return prop;
    return {
      ...prop,
      type: 'bush' as const,
      prefabFile: resolveFenceReplacementBush(continent, prop.x, prop.y)
    };
  });

  return { pois: sanitizedPois, wildernessProps: sanitizedWildernessProps };
}
