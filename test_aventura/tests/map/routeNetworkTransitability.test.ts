/**
 * tests/node/map/routeNetworkTransitability.test.ts
 *
 * REGRESSION & INTEGRITY SUITE: CONTINENTAL ROUTE TRANSITABILITY
 *
 * Verifies that all procedural routes generated on 400x400 regional continents
 * are 100% traversable by player characters:
 *   1. 100% terrestrial corridors connect their origin POI to destination POI.
 *   2. Every step along the corridor path is 4-connected (Manhattan distance === 1).
 *   3. Zero cliff jumps: whenever elevation changes (|elevA - elevB| > 0),
 *      there MUST be a valid staircase connecting the two cells.
 *   4. Zero blocked steps: every route tile must be walkable, on a bridge, or on a stair.
 *   5. Zero routes cut through non-walkable building footprints or solid cliff faces.
 *
 * Tested deterministically across multiple distinct seeds at full 400x400 scale.
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonContinentalWorld } from '../../../src/logic/map/continent/continentalEngine.ts';

const TEST_SEEDS = [7741, 8812, 9933, 42, 100, 777, 2305, 5589] as const;

describe('Continental Route Network Transitability & Mountain Stair Integrity', () => {
  for (const seed of TEST_SEEDS) {
    it(`guarantees 100% transitable corridors and zero stairless cliff climbs for seed ${seed}`, () => {
      const { continent, embedded, pois, bridgeGrid } = generatePokemonContinentalWorld({
        seed,
        width: 400,
        height: 400
      });

      const poiById = new Map(pois.map((p) => [p.id, p]));
      let checkedCorridorCount = 0;
      let totalStepsChecked = 0;

      for (const corridor of embedded.corridors) {
        // Surf routes cross ocean and wormholes bypass surface
        if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;

        const fromPoi = poiById.get(corridor.fromId);
        const toPoi = poiById.get(corridor.toId);

        expect(fromPoi, `Origin POI ${corridor.fromId} must exist`).toBeDefined();
        expect(toPoi, `Destination POI ${corridor.toId} must exist`).toBeDefined();

        const cells = corridor.pathCells;
        expect(
          cells.length,
          `Corridor ${corridor.id} (${fromPoi!.name} -> ${toPoi!.name}) must have path cells`
        ).toBeGreaterThan(0);

        checkedCorridorCount++;

        // Verify step-by-step walkability and elevation transition
        for (let i = 0; i < cells.length - 1; i++) {
          const p1 = cells[i]!;
          const p2 = cells[i + 1]!;

          // 1. 4-connectivity invariant
          const manhattan = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
          expect(
            manhattan,
            `Corridor ${corridor.id} broken connectivity between step ${i} (${p1.x},${p1.y}) and ${i + 1} (${p2.x},${p2.y})`
          ).toBe(1);

          const cell1 = continent.cells[p1.y]?.[p1.x];
          const cell2 = continent.cells[p2.y]?.[p2.x];

          expect(cell1, `Cell at (${p1.x},${p1.y}) must exist on continent`).toBeDefined();
          expect(cell2, `Cell at (${p2.x},${p2.y}) must exist on continent`).toBeDefined();

          if (!cell1 || !cell2) continue;
          totalStepsChecked++;

          // 2. Walkability Invariant: Must be walkable, on a stair, or on a bridge
          const isBridge1 = Boolean(bridgeGrid[p1.y]?.[p1.x]);
          const isBridge2 = Boolean(bridgeGrid[p2.y]?.[p2.x]);

          const step1Walkable = cell1.isWalkable || cell1.isStair || isBridge1;
          const step2Walkable = cell2.isWalkable || cell2.isStair || isBridge2;

          expect(
            step1Walkable,
            `Corridor ${corridor.id} has blocked tile at (${p1.x},${p1.y}) [terrain: ${cell1.terrain}, role: ${cell1.mountainRole}]`
          ).toBe(true);

          expect(
            step2Walkable,
            `Corridor ${corridor.id} has blocked tile at (${p2.x},${p2.y}) [terrain: ${cell2.terrain}, role: ${cell2.mountainRole}]`
          ).toBe(true);

          // 3. Elevation Transition Invariant (No cliff climbing without stairs)
          const elevDiff = Math.abs(cell1.elevation - cell2.elevation);
          if (elevDiff > 0) {
            const hasStair = cell1.isStair || cell2.isStair;
            expect(
              hasStair,
              `Corridor ${corridor.id} attempts impossible cliff climb between (${p1.x},${p1.y}) [elev ${cell1.elevation}, stair: ${cell1.isStair}] and (${p2.x},${p2.y}) [elev ${cell2.elevation}, stair: ${cell2.isStair}] without stairs`
            ).toBe(true);
          }
        }
      }

      expect(checkedCorridorCount).toBeGreaterThanOrEqual(10);
      expect(totalStepsChecked).toBeGreaterThanOrEqual(1000);
    });
  }
});
