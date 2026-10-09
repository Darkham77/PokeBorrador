import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sharp from 'sharp';
import { generateContinentMap } from '../../logic/map/continentGenerator';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine';
import { generateRouteNetwork } from '../../logic/map/routeNetworkEngine';
import { generateWildernessLayer } from '../../logic/map/wildernessVegetationEngine';
import { buildMapBlitInstructions } from '../../logic/map/canvasTileRenderer';
import { extractRealContinentPatches } from '../../logic/map/realContinentPatchExtractor';

const ROOT_DIR = process.cwd();

describe('Cave Entrance Mountain Integration & Plateau Integrity (Seed #777480)', () => {
  const continent = generateContinentMap({
    width: 128,
    height: 128,
    seed: 777480,
    oceanWaterPercentage: 0.35,
    mountainPercentage: 0.22,
    lakeCount: 3,
    withStairs: true
  });

  const pois = placeRegionalPOIs(continent, { targetCount: 18 });
  const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
  const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);
  const { instructions } = buildMapBlitInstructions(
    continent,
    pois,
    routeResult.pathGrid,
    routeResult.bridgeGrid,
    wilderness
  );

  it('guarantees cave entrance prefabs have plateau rock on top, avoiding loose wall tiles on the 2nd floor', async () => {
    // Top 32x32 of gray cave entrance must match gray plateau rock
    const grayCaveBuf = await sharp(path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation/poke_cave_entrance_gray.png')).raw().toBuffer();
    const grayPlateauBuf = await sharp(path.resolve(ROOT_DIR, 'public/assets/tiles/poke_cliff_gray_plateau_rock.png')).raw().toBuffer();

    let diffGray = 0;
    for (let i = 0; i < 32 * 32 * 4; i++) {
      diffGray += Math.abs(grayCaveBuf[i]! - grayPlateauBuf[i]!);
    }
    expect(diffGray, 'Top 32x32 of poke_cave_entrance_gray must match poke_cliff_gray_plateau_rock').toBe(0);

    // Top 32x32 of brown cave entrance must match brown plateau rock
    const brownCaveBuf = await sharp(path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation/poke_cave_entrance_brown.png')).raw().toBuffer();
    const brownPlateauBuf = await sharp(path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation/poke_cliff_brown_plateau_rock.png')).raw().toBuffer();

    let diffBrown = 0;
    for (let i = 0; i < 32 * 32 * 4; i++) {
      diffBrown += Math.abs(brownCaveBuf[i]! - brownPlateauBuf[i]!);
    }
    expect(diffBrown, 'Top 32x32 of poke_cave_entrance_brown must match poke_cliff_brown_plateau_rock').toBe(0);
  });

  it('ensures no summit boulders or rubble bleed into cave entrance footprints (Seed #777480)', () => {
    const patches = extractRealContinentPatches(
      continent,
      pois,
      routeResult.pathGrid,
      routeResult.bridgeGrid,
      wilderness,
      { mountainLimit: 128 }
    );

    const caves = pois.filter((p) => p.type === 'cave_entrance');
    const caveCells = new Set<string>();
    for (const c of caves) {
      for (let dy = 0; dy < c.footprint.height; dy++) {
        for (let dx = 0; dx < c.footprint.width; dx++) {
          caveCells.add(`${c.gridX + dx}_${c.gridY + dy}`);
        }
      }
    }

    const violations: Array<{ x?: number; y?: number; stack: readonly string[] }> = [];

    for (const p of patches) {
      for (const row of p.cells) {
        for (const cell of row) {
          if (caveCells.has(`${cell.x}_${cell.y}`)) {
            const hasBoulderOrRubble = cell.layerStack.some((f) => f.includes('boulder') || f.includes('rubble'));
            if (hasBoulderOrRubble) {
              violations.push({ x: cell.x, y: cell.y, stack: cell.layerStack });
            }
          }
        }
      }
    }

    expect(
      violations.length,
      `Found boulder/rubble bleeding into cave entrance cells! Violations: ${JSON.stringify(violations)}`
    ).toBe(0);
  });

  it('guarantees stairs inside gray mountain massifs use gray stair tiles instead of brown (Seed #777480)', () => {
    // At (82, 79) and (86, 79), the massif palette is gray.
    const palAtStairs = continent.geologicalClusters?.paletteMatrix?.[79]?.[82] ?? continent.mountainPalette;
    expect(palAtStairs).toBe('gray');

    const blitsAtStairs = instructions.filter(
      (i) => (i.px === 82 * 32 || i.px === 86 * 32) && (i.py === 79 * 32 || i.py === 80 * 32)
    );

    const brownStairsBlits = blitsAtStairs.filter((i) => i.filename.includes('brown'));
    expect(
      brownStairsBlits.length,
      `Found brown stairs inside gray massif: ${JSON.stringify(brownStairsBlits)}`
    ).toBe(0);
  });
});
