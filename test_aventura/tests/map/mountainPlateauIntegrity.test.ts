import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../logic/map/continentGenerator';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine';
import { generateRouteNetwork } from '../../logic/map/routeNetworkEngine';
import { generateWildernessLayer } from '../../logic/map/wildernessVegetationEngine';
import { buildMapBlitInstructions } from '../../logic/map/canvasTileRenderer';

describe('Mountain Plateau Integrity & Consolidation (Elimination of Grass Holes)', () => {
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
  const blitPlan = buildMapBlitInstructions(
    continent,
    pois,
    routeResult.pathGrid,
    routeResult.bridgeGrid,
    wilderness
  );

  it('ensures no internal mountain cell with elevation > 0 has poke_grass_plain as base ground (excluding outer corners bordering elevation 0)', () => {
    // Collect all base layer blits (layer 1)
    const baseBlitsByCell = new Map<string, string>();
    for (const inst of blitPlan.instructions) {
      const key = `${inst.px}_${inst.py}`;
      if (!baseBlitsByCell.has(key)) {
        baseBlitsByCell.set(key, inst.filename);
      }
    }

    const violations: Array<{ x: number; y: number; base: string; elev: number }> = [];

    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        const elev = continent.heightmap[y]![x]!;
        if (elev > 0) {
          const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
          const isOuterCornerBorderingGround = Boolean(
            mCell &&
            (mCell.role.includes('corner_outer') || mCell.role === 'peak_isolated') &&
            (
              (continent.heightmap[y - 1]?.[x] ?? 0) === 0 ||
              (continent.heightmap[y + 1]?.[x] ?? 0) === 0 ||
              (continent.heightmap[y]?.[x - 1] ?? 0) === 0 ||
              (continent.heightmap[y]?.[x + 1] ?? 0) === 0
            )
          );
          if (isOuterCornerBorderingGround) continue;

          const px = x * 32;
          const py = y * 32;
          const base = baseBlitsByCell.get(`${px}_${py}`);
          if (base === 'poke_grass_plain.png') {
            violations.push({ x, y, base, elev });
          }
        }
      }
    }

    expect(
      violations.length,
      `Found ${violations.length} elevated cells with poke_grass_plain base ground! Examples: ${JSON.stringify(violations.slice(0, 5))}`
    ).toBe(0);
  });

  it('ensures gray massifs never contain brown plateau rock variation tiles', () => {
    const grayMassifViolations: Array<{ x: number; y: number; file: string }> = [];

    for (const inst of blitPlan.instructions) {
      const gx = inst.px / 32;
      const gy = inst.py / 32;
      const pal = continent.geologicalClusters?.paletteMatrix[gy]?.[gx];

      if (pal === 'gray' && inst.filename === 'poke_cliff_brown_plateau_rock.png') {
        grayMassifViolations.push({ x: gx, y: gy, file: inst.filename });
      }
    }

    expect(
      grayMassifViolations.length,
      `Found ${grayMassifViolations.length} brown rock tiles inside gray massifs! Examples: ${JSON.stringify(grayMassifViolations.slice(0, 5))}`
    ).toBe(0);
  });

  it('ensures cave entrance POIs cover their entire footprint without exposing base ground gaps', () => {
    const caves = pois.filter((p) => p.type === 'cave_entrance');
    expect(caves.length).toBeGreaterThan(0);

    const footprintGaps: Array<{ caveId: string; x: number; y: number }> = [];

    for (const cave of caves) {
      for (let dy = 0; dy < cave.footprint.height; dy++) {
        for (let dx = 0; dx < cave.footprint.width; dx++) {
          const gx = cave.gridX + dx;
          const gy = cave.gridY + dy;
          const px = gx * 32;
          const py = gy * 32;

          // Check all blits covering (px, py)
          // 64x64 cave prefabs stamped at (cave.gridX*32, cave.gridY*32) cover the full 2x2 footprint
          const isCoveredByCave =
            px >= cave.gridX * 32 &&
            px < (cave.gridX + cave.footprint.width) * 32 &&
            py >= cave.gridY * 32 &&
            py < (cave.gridY + cave.footprint.height) * 32;

          const blitsAtCell = blitPlan.instructions.filter((i) => i.px === px && i.py === py);
          const filenames = blitsAtCell.map((i) => i.filename);

          const hasStructureOrMountain =
            isCoveredByCave ||
            filenames.some((f) => f.includes('cave') || f.includes('cliff') || f.includes('stairs') || f.includes('rock'));

          if (!hasStructureOrMountain) {
            footprintGaps.push({ caveId: cave.id, x: gx, y: gy });
          }
        }
      }
    }

    expect(
      footprintGaps.length,
      `Found ${footprintGaps.length} exposed footprint gap cells next to caves! Examples: ${JSON.stringify(footprintGaps)}`
    ).toBe(0);
  });

  it('ensures no elevated mountain cell has grass_top or pure grass tiles stamped on it (excluding outer corners bordering elevation 0)', () => {
    const grassOnMountain: Array<{ x: number; y: number; file: string }> = [];

    for (const inst of blitPlan.instructions) {
      const gx = inst.px / 32;
      const gy = inst.py / 32;
      const elev = continent.heightmap[gy]?.[gx] ?? 0;

      if (elev > 0 && (inst.filename.includes('grass_top') || inst.filename === 'poke_grass_plain.png')) {
        const mCell = continent.resolvedMountain.cellDetails[gy]?.[gx];
        const isOuterCornerBorderingGround = Boolean(
          mCell &&
          (mCell.role.includes('corner_outer') || mCell.role === 'peak_isolated') &&
          (
            (continent.heightmap[gy - 1]?.[gx] ?? 0) === 0 ||
            (continent.heightmap[gy + 1]?.[gx] ?? 0) === 0 ||
            (continent.heightmap[gy]?.[gx - 1] ?? 0) === 0 ||
            (continent.heightmap[gy]?.[gx + 1] ?? 0) === 0
          )
        );
        if (isOuterCornerBorderingGround && inst.filename === 'poke_grass_plain.png') {
          continue;
        }

        grassOnMountain.push({ x: gx, y: gy, file: inst.filename });
      }
    }

    expect(
      grassOnMountain.length,
      `Found ${grassOnMountain.length} grass tiles on elevated mountain massif! Examples: ${JSON.stringify(grassOnMountain.slice(0, 5))}`
    ).toBe(0);
  });
});
