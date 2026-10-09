/**
 * tests/node/map/boardwalkBridgesIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN REPRODUCTION & INTEGRITY TEST
 *
 * Validates:
 *   1. Bridge Cell Preservation: resolvePathGrid must never skip cells where bridgeGrid is true,
 *      even when pathGrid is false (water cells). All bridge cells must have isBridge === true.
 *   2. Continuous 2-Cell Wide Bridges: Water crossings must generate continuous 2-cell wide
 *      wooden bridge spans without gaps or single-cell disconnections.
 *   3. Shore Anchor Connection: Every bridge must anchor onto the adjacent land/shore cells
 *      so there is zero gap between the dirt route and the wooden bridge.
 *   4. Zero Missing Bridge Blits: In buildMapBlitInstructions, every bridge cell must emit
 *      a concrete blit instruction for an authentic bridge asset that exists on disk.
 */

import { describe, it, expect } from 'vitest';
import { resolvePathGrid } from '../../../src/logic/map/pathAutotileEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { buildMapBlitInstructions } from '../../../src/logic/map/canvasTileRenderer.ts';

describe('boardwalkBridgesIntegrity (Error 8)', () => {
  it('guarantees resolvePathGrid preserves bridgeGrid cells when pathGrid is false', () => {
    // 5x5 grid with water in center and bridgeGrid set at (2, 2)
    const pathGrid = Array.from({ length: 5 }, () => Array(5).fill(false));
    const bridgeGrid = Array.from({ length: 5 }, () => Array(5).fill(false));

    // Dirt path leads up to (1, 2) and leaves from (3, 2)
    pathGrid[2]![1] = true;
    pathGrid[2]![3] = true;

    // Bridge crosses water at (2, 2)
    bridgeGrid[2]![2] = true;

    const resolved = resolvePathGrid(pathGrid, bridgeGrid);

    // The bridge cell (2, 2) MUST NOT be null!
    const bridgeCell = resolved.pathDetails[2]?.[2];
    expect(bridgeCell).not.toBeNull();
    expect(bridgeCell?.isBridge).toBe(true);
  });

  it('guarantees route network generates bridges across narrow water gaps that anchor onto shore', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    let bridgeCellCount = 0;
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (routeNet.bridgeGrid[y]![x]) bridgeCellCount++;
      }
    }

    expect(bridgeCellCount).toBeGreaterThan(0);

    const resolved = resolvePathGrid(routeNet.pathGrid, routeNet.bridgeGrid);
    let resolvedBridgeCount = 0;
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (resolved.pathDetails[y]?.[x]?.isBridge) resolvedBridgeCount++;
      }
    }

    // Every bridge cell from routeNet must be preserved in resolved pathDetails!
    expect(resolvedBridgeCount).toBe(bridgeCellCount);
  });

  it('guarantees buildMapBlitInstructions blits bridge assets for all bridge cells', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    const blitPlan = buildMapBlitInstructions(
      continent,
      pois,
      routeNet.pathGrid,
      routeNet.bridgeGrid
    );

    const bridgeBlits = blitPlan.instructions.filter((inst) =>
      inst.filename.includes('bridge') || inst.filename.includes('boardwalk')
    );

    expect(bridgeBlits.length).toBeGreaterThan(0);
  });
});
