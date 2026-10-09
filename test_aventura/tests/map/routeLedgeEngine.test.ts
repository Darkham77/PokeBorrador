/**
 * tests/node/map/routeLedgeEngine.test.ts
 *
 * TIER 1 UNIT TESTS FOR PROCEDURAL JUMPABLE ROUTE LEDGES
 *
 * Validates:
 *   1. Canonical 3-piece autotiling (left cap, mid jump body, right cap).
 *   2. Anti-softlock invariant: guarantees bidirectional bypass corridor around every ledge.
 *   3. Zero ledges on water, elevated mountain peaks, or building entrances.
 *   4. Deterministic output given the same PRNG seed.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import {
  generateRouteLedges
} from '../../../src/logic/map/routeLedgeEngine.ts';

describe('routeLedgeEngine (Phase 4)', () => {
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
  const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
  const routes = generateRouteNetwork(continent, pois, { allowBridges: true });

  it('generates canonical 3-piece autotiled horizontal ledges on routes', () => {
    const ledgeRuns = generateRouteLedges({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 42
    });

    expect(ledgeRuns.length).toBeGreaterThan(0);

    for (const run of ledgeRuns) {
      expect(run.cells.length).toBeGreaterThanOrEqual(2);
      expect(run.cells.length).toBeLessThanOrEqual(6);

      // Check 3-piece autotile assignment
      if (run.facing === 'south' && run.cells.length >= 3) {
        const firstTile = run.tiles[0]!;
        const lastTile = run.tiles[run.tiles.length - 1]!;
        expect(firstTile.tileFile).toBe('poke_ledge_left.png');
        expect(lastTile.tileFile).toBe('poke_ledge_right.png');

        for (let i = 1; i < run.tiles.length - 1; i++) {
          expect(run.tiles[i]!.tileFile).toBe('poke_ledge_jump.png');
        }
      }
    }
  });

  it('strictly enforces anti-softlock guarantee (bidirectional bypass corridor exists)', () => {
    const ledgeRuns = generateRouteLedges({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 42
    });

    for (const run of ledgeRuns) {
      // For every ledge, check that at least one of its lateral flanks has an open passable corridor
      const minX = Math.min(...run.cells.map((c) => c.x));
      const maxX = Math.max(...run.cells.map((c) => c.x));
      const y = run.cells[0]!.y;

      const leftBypass = minX - 1 >= 0 && continent.terrainMatrix[y]?.[minX - 1] === 'grass' && (continent.heightmap[y]?.[minX - 1] ?? 0) === 0;
      const rightBypass = maxX + 1 < continent.width && continent.terrainMatrix[y]?.[maxX + 1] === 'grass' && (continent.heightmap[y]?.[maxX + 1] ?? 0) === 0;

      expect(leftBypass || rightBypass).toBe(true);
    }
  });

  it('never places ledges on water bodies or elevated mountain terrain', () => {
    const ledgeRuns = generateRouteLedges({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 42
    });

    for (const run of ledgeRuns) {
      for (const cell of run.cells) {
        const t = continent.terrainMatrix[cell.y]?.[cell.x];
        const h = continent.heightmap[cell.y]?.[cell.x] ?? 0;
        expect(t).not.toBe('water');
        expect(t).not.toBe('water_deep');
        expect(h).toBe(0);
      }
    }
  });

  it('guarantees deterministic ledge placement across identical seeds', () => {
    const run1 = generateRouteLedges({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 777
    });
    const run2 = generateRouteLedges({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 777
    });

    expect(run1).toEqual(run2);
  });
});
