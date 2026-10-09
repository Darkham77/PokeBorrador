/**
 * tests/node/map/worldGeometryIntegrity.test.ts
 *
 * REGRESSION & INTEGRITY SUITE FOR PROCEDURAL WORLD GEOMETRIES
 *
 * Verifies:
 *   1. Zero buildings with mixed elevation across their footprints.
 *   2. Zero buildings overlapping cliff edges or occupied cliff foot cells.
 *   3. Zero buildings overlapping each other within any settlement.
 *   4. Zero urban props overlapping building footprints or monumental fountains.
 *   5. 100% cave entrances anchored strictly to south cliff walls with transitable front ground.
 *   6. Zero duplicate POI names within each generated region.
 *
 * Tested deterministically across 8 distinct seeds (400x400 full scale).
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonContinentalWorld } from '../../../src/logic/map/continent/continentalEngine.ts';
import { VIGNETTE_BLUEPRINTS_BY_ID } from '../../../src/logic/map/cityVignetteRegistry.ts';

const TEST_SEEDS = [7741, 2305, 5589, 42, 100, 777, 1234, 9999] as const;

describe('World Geometry & Settlement Structural Integrity', () => {
  it('civic_fountain_square vignette blueprint has zero prop overlaps with 3x3 fountain', () => {
    const blueprint = VIGNETTE_BLUEPRINTS_BY_ID.civic_fountain_square;
    expect(blueprint).toBeDefined();

    const built = blueprint.build(0, 0, 42);
    const fountain = built.props.find((p) => p.type === 'fountain');
    expect(fountain).toBeDefined();

    // 3x3 fountain occupies x: [fx .. fx + 2], y: [fy .. fy + 2]
    const fx = fountain!.x;
    const fy = fountain!.y;
    const fCells = new Set<string>();
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        fCells.add(`${fx + dx}_${fy + dy}`);
      }
    }

    for (const prop of built.props) {
      if (prop === fountain) continue;
      const key = `${prop.x}_${prop.y}`;
      expect(fCells.has(key), `Prop ${prop.type} at (${prop.x},${prop.y}) overlaps 3x3 fountain`).toBe(false);
    }
  });

  for (const seed of TEST_SEEDS) {
    it(`guarantees zero geometrical defects and zero name collisions for seed ${seed}`, () => {
      const { continent, pois } = generatePokemonContinentalWorld({
        seed,
        width: 400,
        height: 400
      });

      const seenPoiNames = new Set<string>();
      let mixedElevationBuildingCount = 0;
      let cliffOverlappingBuildingCount = 0;
      let overlappingBuildingCount = 0;
      let propOverlappingBuildingCount = 0;
      let invalidCaveCount = 0;

      for (const poi of pois) {
        // 1. POI Name Uniqueness Invariant
        expect(seenPoiNames.has(poi.name), `Duplicate POI name "${poi.name}" detected in seed ${seed}`).toBe(false);
        seenPoiNames.add(poi.name);

        // 2. Cave Entrance Placement Invariant
        if (poi.type === 'cave_entrance') {
          const mCell = continent.resolvedMountain.cellDetails[poi.gridY]?.[poi.gridX];
          const isSouthWall = mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'));
          const frontElev = continent.heightmap[poi.gridY + 1]?.[poi.gridX] ?? 0;
          const frontTerrain = continent.terrainMatrix[poi.gridY + 1]?.[poi.gridX];
          const frontIsGround = frontElev === 0 && frontTerrain !== 'water' && frontTerrain !== 'water_deep';

          if (!isSouthWall || !frontIsGround) {
            invalidCaveCount++;
          }
        }

        // 3. Urban Buildings Elevation Uniformity & Cliff Overlap Invariants
        if (poi.urbanLayout) {
          const buildings = poi.urbanLayout.buildings;

          for (const b of buildings) {
            const baseElev = continent.heightmap[b.y]?.[b.x] ?? 0;
            let mixedElev = false;
            let onCliff = false;

            for (let dy = 0; dy < b.height; dy++) {
              for (let dx = 0; dx < b.width; dx++) {
                const by = b.y + dy;
                const bx = b.x + dx;
                const e = continent.heightmap[by]?.[bx] ?? 0;
                if (e !== baseElev) mixedElev = true;

                const mCell = continent.resolvedMountain.cellDetails[by]?.[bx];
                if (mCell && mCell.role !== 'floor_center') onCliff = true;
                if (continent.resolvedMountain.occupiedFootCells[by]?.[bx]) onCliff = true;
              }
            }

            if (mixedElev) mixedElevationBuildingCount++;
            if (onCliff) cliffOverlappingBuildingCount++;
          }

          // 4. Zero Inter-Building Overlaps
          for (let i = 0; i < buildings.length; i++) {
            for (let j = i + 1; j < buildings.length; j++) {
              const b1 = buildings[i]!;
              const b2 = buildings[j]!;
              const overlap = !(
                b1.x + b1.width <= b2.x ||
                b2.x + b2.width <= b1.x ||
                b1.y + b1.height <= b2.y ||
                b2.y + b2.height <= b1.y
              );
              if (overlap) overlappingBuildingCount++;
            }
          }

          // 5. Zero Urban Props on Buildings
          if (poi.urbanLayout.props) {
            for (const p of poi.urbanLayout.props) {
              for (const b of buildings) {
                if (p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height) {
                  propOverlappingBuildingCount++;
                }
              }
            }
          }
        }
      }

      expect(mixedElevationBuildingCount, `Seed ${seed} has buildings with mixed elevation`).toBe(0);
      expect(cliffOverlappingBuildingCount, `Seed ${seed} has buildings overlapping cliff edges or foot cells`).toBe(0);
      expect(overlappingBuildingCount, `Seed ${seed} has mutually overlapping buildings`).toBe(0);
      expect(propOverlappingBuildingCount, `Seed ${seed} has props overlapping buildings`).toBe(0);
      expect(invalidCaveCount, `Seed ${seed} has caves not anchored to south cliff wall`).toBe(0);
    });
  }
});
