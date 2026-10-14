/**
 * src/logic/map/proceduralCityEngine.ts
 *
 * PROCEDURAL URBAN PLANNER & CITY GRAMMAR ENGINE
 *
 * Architectural gateway for procedural settlement layouts. Delegates layout
 * synthesis to the Organic City Engine while maintaining backward-compatible
 * contracts, urban archetypes, and roof palette constants.
 */

import type {
  POINode,
  SettlementLayoutResult,
  SettlementCurbPlacement
} from '../../types/map/poiTypes.ts';
import type { SettlementTerrainContext } from './cityLayoutEngine.ts';
import type { BuildingPrefabMeta } from './canonicalAssetsRegistry.ts';
import {
  generateOrganicCityLayout
} from './organicCityEngine.ts';

export type { BuildingPrefabMeta, SettlementCurbPlacement };



/**
 * Generates a fully procedural urban layout for any settlement node (Metropolis, City, Town).
 */
export function generateProceduralCityLayout(
  node: POINode,
  rngSeed: number = 1337,
  context?: SettlementTerrainContext
): SettlementLayoutResult {
  return generateOrganicCityLayout(node, rngSeed, context);
}
