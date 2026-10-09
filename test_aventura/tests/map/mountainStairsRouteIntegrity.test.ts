/**
 * tests/node/map/mountainStairsRouteIntegrity.test.ts
 *
 * TIER 1 BUG-FIXING REPRODUCTION TEST: MOUNTAIN STAIRS & ROUTE INTEGRITY
 *
 * Validates:
 *   1. Stair cells have isStair: true and isWalkable: true across both tiers.
 *   2. Stair corridor clearance: 0 props, 0 trees, 0 tall grass blocking upper or lower landings.
 *   3. Route connectivity: Lower landing (stair.y + 2) and upper landing (stair.y - 1) connect to the pathGrid.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../logic/map/continentGenerator';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine';
import { generateRouteNetwork } from '../../logic/map/routeNetworkEngine';
import { generateWildernessLayer } from '../../logic/map/wildernessVegetationEngine';

describe('Mountain Stairs & Route Network Integrity (Paso 4 / Error 4)', () => {
  const continent = generateContinentMap({
    width: 128,
    height: 128,
    seed: 42,
    oceanWaterPercentage: 0.35,
    beachWidth: 3,
    lakeCount: 3,
    mountainPercentage: 0.22,
    mountainPalette: 'brown',
    withStairs: true
  });

  const pois = placeRegionalPOIs(continent, { targetCount: 18 });
  const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
  const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);

  it('verifies all placed stairs have isStair and isWalkable set on all 4 stair tiles', () => {
    expect(continent.placedStairs.length).toBeGreaterThan(0);

    for (const stair of continent.placedStairs) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
          const cell = continent.cells[stair.y + dy]?.[stair.x + dx];
          expect(cell, `Cell at (${stair.x + dx}, ${stair.y + dy}) must exist`).toBeDefined();
          expect(cell?.isStair, `Cell at (${stair.x + dx}, ${stair.y + dy}) must have isStair=true`).toBe(true);
          expect(cell?.isWalkable, `Cell at (${stair.x + dx}, ${stair.y + dy}) must have isWalkable=true`).toBe(true);
        }
      }
    }
  });

  it('guarantees zero props or vegetation blocking stair corridors (clear landings)', () => {
    const blockedLandings: Array<{ stair: { x: number; y: number }; prop: { x: number; y: number; type: string } }> = [];

    for (const stair of continent.placedStairs) {
      for (const prop of wilderness.props) {
        if (
          prop.x >= stair.x - 1 &&
          prop.x <= stair.x + 2 &&
          prop.y >= stair.y - 1 &&
          prop.y <= stair.y + 2
        ) {
          blockedLandings.push({ stair, prop: { x: prop.x, y: prop.y, type: prop.type } });
        }
      }

      for (const tree of wilderness.trees) {
        if (
          tree.x >= stair.x - 1 &&
          tree.x <= stair.x + 1 &&
          tree.y >= stair.y - 2 &&
          tree.y <= stair.y + 2
        ) {
          blockedLandings.push({ stair, prop: { x: tree.x, y: tree.y, type: 'tree' } });
        }
      }
    }

    expect(
      blockedLandings.length,
      `Found ${blockedLandings.length} props/trees blocking stair corridors: ${JSON.stringify(blockedLandings)}`
    ).toBe(0);
  });

  it('ensures every mountain stair connects its lower and upper landings to the pathGrid', () => {
    const disconnectedStairs: Array<{ x: number; y: number; lowerConnected: boolean; upperConnected: boolean }> = [];

    for (const stair of continent.placedStairs) {
      const lowerConnected =
        routeResult.pathGrid[stair.y + 2]?.[stair.x] === true ||
        routeResult.pathGrid[stair.y + 2]?.[stair.x + 1] === true ||
        routeResult.pathGrid[stair.y + 1]?.[stair.x] === true ||
        routeResult.pathGrid[stair.y + 1]?.[stair.x + 1] === true;

      const upperConnected =
        routeResult.pathGrid[stair.y - 1]?.[stair.x] === true ||
        routeResult.pathGrid[stair.y - 1]?.[stair.x + 1] === true ||
        routeResult.pathGrid[stair.y]?.[stair.x] === true ||
        routeResult.pathGrid[stair.y]?.[stair.x + 1] === true;

      if (!lowerConnected || !upperConnected) {
        disconnectedStairs.push({
          x: stair.x,
          y: stair.y,
          lowerConnected,
          upperConnected
        });
      }
    }

    expect(
      disconnectedStairs.length,
      `Found ${disconnectedStairs.length} stairs not connected to route network: ${JSON.stringify(disconnectedStairs)}`
    ).toBe(0);
  });
});
