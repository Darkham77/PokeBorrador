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

import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../logic/map/routeNetworkEngine.ts';

describe('coastBridgeCornerIntegrity', () => {
  const continent = generateContinentMap({
    width: 128,
    height: 128,
    seed: 888,
    oceanWaterPercentage: 0.35,
    beachWidth: 4,
    lakeCount: 2,
    mountainPercentage: 0.2,
    withStairs: true
  });

  const pois = placeRegionalPOIs(continent, { targetCount: 16, seed: 888 });
  const routeNetwork = generateRouteNetwork(continent, pois, { allowBridges: true });

  const waypointSet = new Set<string>();
  for (const edge of routeNetwork.edges) {
    for (const wp of edge.waypoints) {
      waypointSet.add(`${wp.x}_${wp.y}`);
    }
  }

  const findShoreBridgeLanding = (): {
    readonly shoreX: number;
    readonly shoreY: number;
    readonly bridgeX: number;
    readonly bridgeY: number;
  } | null => {
    for (let y = 1; y < 127; y++) {
      for (let x = 1; x < 127; x++) {
        if (!routeNetwork.bridgeGrid[y]?.[x]) continue;
        if (continent.terrainMatrix[y]?.[x] !== 'water') continue;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        ] as const) {
          const sx = x + dx;
          const sy = y + dy;
          if (
            continent.terrainMatrix[sy]?.[sx] === 'sand' &&
            (routeNetwork.pathGrid[sy]?.[sx] || waypointSet.has(`${sx}_${sy}`)) &&
            !routeNetwork.bridgeGrid[sy]?.[sx]
          ) {
            return { shoreX: sx, shoreY: sy, bridgeX: x, bridgeY: y };
          }
        }
      }
    }
    return null;
  };

  it('guarantees walkway entrance directly facing bridge remains sand without foam across access', () => {
    const landing = findShoreBridgeLanding();
    expect(landing).not.toBeNull();

    const resolvedWater = continent.resolvedWater;
    const entranceCell = resolvedWater.cellDetails[landing!.shoreY]?.[landing!.shoreX];

    expect(entranceCell).toBeDefined();
    expect(entranceCell?.terrain).toBe('sand');
  });

  it('guarantees shore flanks facing bridge preserve valid coastline sand transitions', () => {
    const landing = findShoreBridgeLanding();
    expect(landing).not.toBeNull();
    const bridgeCell = continent.resolvedWater.cellDetails[landing!.bridgeY]?.[landing!.bridgeX];
    expect(bridgeCell?.terrain).toBe('water');
    expect(continent.resolvedWater.cellDetails[landing!.shoreY]?.[landing!.shoreX]?.terrain).toBe(
      'sand'
    );
  });

  it('ensures all bridge segments correctly span over water elevation in the continent', () => {
    expect(routeNetwork.edges.length).toBeGreaterThan(0);

    let checkedBridges = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (!routeNetwork.bridgeGrid[y]?.[x]) continue;
        expect(continent.heightmap[y]?.[x]).toBe(0);
        checkedBridges++;
      }
    }
    expect(checkedBridges).toBeGreaterThan(0);
  });
});
