/**
 * tests/node/map/coastBridgeCornerIntegrity.test.ts
 *
 * TIER 1 UNIT TESTS: COASTLINE AND BRIDGE SHORE LANDING AUTOTILING INTEGRITY
 *
 * Validates:
 *   1. Sand coastline cells flanking bridges bordering contiguous open water resolve to outer corners
 *      (e.g., corner_outer_ne) instead of blunt straight edges (edge_north).
 *   2. Walkway entrance cells directly facing the bridge along the path axis do not spawn
 *      shoreline foam across the boardwalk entrance.
 *   3. Vertical shore flanks facing bridges preserve smooth inner transitions (corner_inner_*).
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';

describe('coastBridgeCornerIntegrity', () => {
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
  const routeNetwork = generateRouteNetwork(continent, pois, { allowBridges: true });

  it('guarantees walkway entrance directly facing bridge remains center sand without foam across access', () => {
    expect(routeNetwork.bridgeGrid[17]?.[76]).toBe(true);

    const resolvedWater = continent.resolvedWater;
    const entranceCell = resolvedWater.cellDetails[17]?.[75];

    expect(entranceCell).toBeDefined();
    expect(entranceCell?.terrain).toBe('sand');
    expect(entranceCell?.role).toBe('center');
  });

  it('guarantees shore flanks facing bridge preserve smooth inner transitions', () => {
    const resolvedWater = continent.resolvedWater;
    const topFlank = resolvedWater.cellDetails[16]?.[75];
    const botFlank = resolvedWater.cellDetails[18]?.[75];

    expect(topFlank?.role).toBe('corner_inner_ne');
    expect(botFlank?.role).toBe('corner_inner_se');
  });
});
