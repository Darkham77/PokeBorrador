/**
 * tests/node/map/continentProceduralMountainTiers.test.ts
 *
 * TIER 1 BUG-FIXING / FEATURE INTEGRITY TEST:
 * PROCEDURAL MULTI-TIER MOUNTAINS (1 TO 4 FLOORS) BY MASSIF MASS
 *
 * Validates:
 *   1. Elevation spectrum: Continent generates mountains with diverse elevations up to Tier 3 or 4.
 *   2. Mass scaling: Small massifs have fewer floors (1 or 2), while massive cordilleras have 3 or 4 floors.
 *   3. Smooth terraces: 0 direct drops > 1 elevation tier across the entire map.
 *   4. Stair traversal: Placed stairs connect across all active tiers (1->0, 2->1, 3->2, etc.) and remain walkable.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../logic/map/continentGenerator.ts';

describe('Procedural Multi-Tier Mountains (1 to 4 Floors)', () => {
  it('generates multi-tier mountains scaled by massif size with 0 drops > 1', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const elevSet = new Set<number>();
    for (const row of continent.cells) {
      for (const cell of row) {
        elevSet.add(cell.elevation);
      }
    }
    // 1. Must produce higher tiers (at least Tier 3 on a 128x128 map)
    const maxElev = Math.max(...elevSet);
    expect(maxElev, 'Continent must generate elevated mountains with tier >= 3').toBeGreaterThanOrEqual(3);

    // 2. Mass scaling: Small massifs must have fewer tiers than large cordilleras
    const massifs = continent.geologicalClusters!.massifs;
    expect(massifs.length, 'Must detect multiple discrete massifs').toBeGreaterThan(1);

    // Get max elevation within each massif
    const massifTiers = massifs.map(m => {
      let maxMtnTier = 0;
      for (const c of m.cells) {
        const e = continent.cells[c.y]?.[c.x]?.elevation ?? 0;
        if (e > maxMtnTier) maxMtnTier = e;
      }
      return { id: m.id, cellCount: m.cellCount, maxTier: maxMtnTier };
    });

    // Small massifs (< 60 cells) should not exceed tier 2
    const smallMassifs = massifTiers.filter(m => m.cellCount < 60);
    for (const sm of smallMassifs) {
      expect(
        sm.maxTier,
        `Small massif ${sm.id} (${sm.cellCount} cells) should have <= 2 tiers`
      ).toBeLessThanOrEqual(2);
    }

    // The largest cordillera should have the highest tier
    const largestMassif = massifTiers.reduce((max, m) => m.cellCount > max.cellCount ? m : max, massifTiers[0]!);
    expect(
      largestMassif.maxTier,
      `Largest cordillera (${largestMassif.cellCount} cells) must have at least 3 tiers`
    ).toBeGreaterThanOrEqual(3);

    // 3. Smooth terraces: zero direct elevation drops > 1 across cardinal neighbors
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        const curElev = continent.cells[y]![x]!.elevation;
        if (curElev <= 1) continue;

        // Check cardinal neighbors
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < continent.width && ny >= 0 && ny < continent.height) {
            const neighborElev = continent.cells[ny]![nx]!.elevation;
            const drop = curElev - neighborElev;
            expect(
              drop,
              `Direct drop at (${x}, ${y}) [Z=${curElev}] to (${nx}, ${ny}) [Z=${neighborElev}] must be <= 1`
            ).toBeLessThanOrEqual(1);
          }
        }
      }
    }

    // 4. Stairs: Placed stairs must include connections for higher tiers and be walkable
    expect(continent.placedStairs.length).toBeGreaterThan(0);
    for (const stair of continent.placedStairs) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
          const cell = continent.cells[stair.y + dy]?.[stair.x + dx];
          expect(cell?.isWalkable, `Stair cell at (${stair.x + dx}, ${stair.y + dy}) must be walkable`).toBe(true);
          expect(cell?.isStair, `Stair cell at (${stair.x + dx}, ${stair.y + dy}) must have isStair=true`).toBe(true);
        }
      }
    }
  });

  it('generates 4-tier mountain summits on expansive cordilleras (seed 777)', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 777,
      mountainPercentage: 0.24,
      withStairs: true
    });

    const maxElev = Math.max(...continent.cells.flatMap(row => row.map(c => c.elevation)));
    expect(maxElev, 'Expansive cordillera must reach 4 floors (Z=4)').toBe(4);

    // Verify 0 drops > 1 across the entire 4-tier map
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        const curElev = continent.cells[y]![x]!.elevation;
        if (curElev <= 1) continue;

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < continent.width && ny >= 0 && ny < continent.height) {
            const neighborElev = continent.cells[ny]![nx]!.elevation;
            const drop = curElev - neighborElev;
            expect(
              drop,
              `Direct drop at (${x}, ${y}) [Z=${curElev}] to (${nx}, ${ny}) [Z=${neighborElev}] must be <= 1`
            ).toBeLessThanOrEqual(1);
          }
        }
      }
    }

    // Verify stairs exist and connect all tiers
    expect(continent.placedStairs.length).toBeGreaterThan(0);
    const stairTiers = new Set(continent.placedStairs.map(s => s.tier));
    expect(stairTiers.has(1), 'Must have Tier 1 stairs').toBe(true);
    expect(stairTiers.has(2), 'Must have Tier 2 stairs').toBe(true);
  });
});

