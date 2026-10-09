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

import type { POIType, SettlementCurbPlacement } from '../../types/map/poiTypes.ts';
import { getAssetFilename } from './canonicalAssetsRegistry.ts';

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
 * Returns the primary sprite filename for pedestrian sidewalks, plazas, and concourses.
 */
export function getCanonicalUrbanSidewalkTile(type: POIType): string {
  if (type === 'town') {
    return 'poke_dirt_path.png';
  }
  return getAssetFilename('poke_stone_plaza_center');
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
