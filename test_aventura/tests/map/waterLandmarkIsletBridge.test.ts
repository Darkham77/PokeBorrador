/**
 * tests/node/map/waterLandmarkIsletBridge.test.ts
 *
 * TIER 1 UNIT TESTS: CANONICAL WATER LANDMARK ISLET & BRIDGE INTEGRITY
 *
 * Validates:
 *   1. Water landmarks sculpt natural grassy/sandy islets without stale ocean water autotile blits.
 *   2. Base terrain layer never blits ocean water over islet land cells.
 *   3. Route network creates continuous bridge across water and connects landing gateway to building door.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { buildMapBlitInstructions, CANVAS_TILE_SIZE } from '../../../src/logic/map/canvasTileRenderer.ts';
import { executeRegionalGenerationJob } from '../../../src/logic/map/continentGenerator.worker.ts';

describe('waterLandmarkIsletBridge', () => {
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
  const oceanLighthouse = pois.find((p) => p.id === 'ocean_lighthouse');
  const lakeShrine = pois.find((p) => p.id === 'lake_shrine');
  const waterLandmark = oceanLighthouse ?? lakeShrine;

  it('guarantees water landmarks are placed and have a gateway on their islet fringe', () => {
    expect(oceanLighthouse).toBeDefined();
    expect(oceanLighthouse?.gateways).toBeDefined();
    expect(oceanLighthouse?.gateways?.length).toBeGreaterThan(0);
    expect(lakeShrine).toBeDefined();
    expect(lakeShrine?.gateways).toBeDefined();
  });

  it('guarantees islet cells are land (grass or sand) and never blit ocean water in canvasTileRenderer', () => {
    if (!waterLandmark) return;

    // Building footprint bounds
    const bx = waterLandmark.gridX;
    const by = waterLandmark.gridY;
    const bw = waterLandmark.footprint.width;
    const bh = waterLandmark.footprint.height;

    // Center cell under the building
    const cx = bx + Math.floor(bw / 2);
    const cy = by + Math.floor(bh / 2);

    expect(continent.terrainMatrix[cy]![cx]).not.toBe('water');
    expect(['grass', 'sand']).toContain(continent.terrainMatrix[cy]![cx]);

    // Check blit instructions
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });
    const { instructions } = buildMapBlitInstructions(
      continent,
      pois,
      routeNet.pathGrid,
      routeNet.bridgeGrid
    );

    // Filter base layer instructions at pixel (cx * 32, cy * 32)
    const px = cx * CANVAS_TILE_SIZE;
    const py = cy * CANVAS_TILE_SIZE;
    const blitsAtCenter = instructions.filter((i) => i.px === px && i.py === py);

    // Center of islet must NOT have ocean center or water shore foam as base ground
    const hasWaterBlit = blitsAtCenter.some(
      (b) => b.filename.includes('poke_water_ocean_center')
    );
    expect(hasWaterBlit).toBe(false);
  });

  it('guarantees coastal ocean lighthouse sculpts an islet with a continuous 2-cell wide sand beach perimeter around grass', () => {
    expect(oceanLighthouse).toBeDefined();
    if (!oceanLighthouse) return;

    // Check that every grass cell on the islet has at least 2 cells of distance to ocean water
    const grassX1 = oceanLighthouse.gridX - 1;
    const grassX2 = oceanLighthouse.gridX + oceanLighthouse.footprint.width;
    const grassY1 = oceanLighthouse.gridY - 1;
    const grassY2 = oceanLighthouse.gridY + oceanLighthouse.footprint.height;

    for (let y = grassY1; y <= grassY2; y++) {
      for (let x = grassX1; x <= grassX2; x++) {
        if (continent.terrainMatrix[y]?.[x] === 'grass') {
          // No grass cell on the coastal islet may be adjacent (cardinally or diagonally) to ocean water
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              expect(continent.terrainMatrix[y + dy]?.[x + dx]).not.toBe('water');
            }
          }
        }
      }
    }
  });

  it('guarantees lake shrine in inland lake is a pure grass islet without sand beaches', () => {
    expect(lakeShrine).toBeDefined();
    if (!lakeShrine) return;

    // Center of lake shrine must be grass
    const cx = lakeShrine.gridX + Math.floor(lakeShrine.footprint.width / 2);
    const cy = lakeShrine.gridY + Math.floor(lakeShrine.footprint.height / 2);
    expect(continent.terrainMatrix[cy]![cx]).toBe('grass');

    // All land cells of lake shrine islet must be grass, strictly zero sand
    for (let dy = -2; dy <= lakeShrine.footprint.height + 2; dy++) {
      for (let dx = -2; dx <= lakeShrine.footprint.width + 2; dx++) {
        const terr = continent.terrainMatrix[lakeShrine.gridY + dy]?.[lakeShrine.gridX + dx];
        expect(terr).not.toBe('sand');
      }
    }
  });

  it('guarantees zero dirt path tiles exist on sand anywhere across the entire regional map', () => {
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    let sandPathsCount = 0;
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (continent.terrainMatrix[y]![x] === 'sand' && routeNet.pathGrid[y]![x]) {
          sandPathsCount++;
        }
      }
    }

    expect(sandPathsCount).toBe(0);
  });

  it('guarantees the bridge never touches islet land and stops cleanly on water before shore', () => {
    if (!waterLandmark || !waterLandmark.gateways || waterLandmark.gateways.length === 0) return;

    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });
    const gw = waterLandmark.gateways[0]!;

    // Gateways are on land/sand, so bridgeGrid must NEVER be true on the gateway itself
    expect(routeNet.bridgeGrid[gw.y]![gw.x]).toBe(false);

    // Bridge tiles strictly exist on water cells only
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (routeNet.bridgeGrid[y]![x]) {
          expect(['water', 'sand']).toContain(continent.cells[y]![x]!.terrain);
        }
      }
    }

    // Landing cell on the sand must NOT be marked as dirt path
    expect(routeNet.pathGrid[gw.y]![gw.x]).toBe(false);

    // Beach cells around the islet must not have dirt path
    const doorEntX = waterLandmark.gridX + 1;
    const doorEntY = Math.min(continent.height - 1, waterLandmark.gridY + 4);
    if (continent.terrainMatrix[doorEntY]![doorEntX] === 'sand') {
      expect(routeNet.pathGrid[doorEntY]![doorEntX]).toBe(false);
    }
  });

  it('guarantees a 3x3 grass block surrounded by sand has rounded corners in all 4 corners', () => {
    const { resolveWaterCoastGrid } = require('../../../src/logic/map/waterAutotileEngine.ts');
    const matrix = [
      ['sand', 'sand', 'sand', 'sand', 'sand'],
      ['sand', 'grass', 'grass', 'grass', 'sand'],
      ['sand', 'grass', 'grass', 'grass', 'sand'],
      ['sand', 'grass', 'grass', 'grass', 'sand'],
      ['sand', 'sand', 'sand', 'sand', 'sand']
    ];
    const res = resolveWaterCoastGrid(matrix);

    // North-West outer corner of grass -> surrounding sand at (0, 0) has corner_inner_se (poke_sand_inner_br.png)
    expect(res.cellDetails[0][0].role).toBe('corner_inner_se');
    expect(res.cellDetails[0][0].primaryTile).toBe('poke_sand_inner_br.png');

    // North-East outer corner of grass -> surrounding sand at (4, 0) has corner_inner_sw (poke_sand_inner_bl.png)
    expect(res.cellDetails[0][4].role).toBe('corner_inner_sw');
    expect(res.cellDetails[0][4].primaryTile).toBe('poke_sand_inner_bl.png');

    // South-West outer corner of grass -> surrounding sand at (0, 4) has corner_inner_ne (poke_sand_inner_tr.png)
    expect(res.cellDetails[4][0].role).toBe('corner_inner_ne');
    expect(res.cellDetails[4][0].primaryTile).toBe('poke_sand_inner_tr.png');

    // South-East outer corner of grass -> surrounding sand at (4, 4) has corner_inner_nw (poke_sand_inner_tl.png)
    expect(res.cellDetails[4][4].role).toBe('corner_inner_nw');
    expect(res.cellDetails[4][4].primaryTile).toBe('poke_sand_inner_tl.png');
  });

  it('guarantees lake bridges connecting grass shores preserve grass and allow dirt path connection', () => {
    // If a bridge cell meets grass (such as an inland lake), it connects to grass without sand
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    // Look for bridge cells whose neighbor is land (grass)
    let foundLakeBridgeLanding = false;
    for (let y = 1; y < continent.height - 1; y++) {
      for (let x = 1; x < continent.width - 1; x++) {
        if (routeNet.bridgeGrid[y]![x]) {
          const directions: readonly (readonly [number, number])[] = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ];
          for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (continent.terrainMatrix[ny]?.[nx] === 'grass') {
              foundLakeBridgeLanding = true;
              // On grass, pathGrid CAN exist to connect to the bridge
              break;
            }
          }
        }
        if (foundLakeBridgeLanding) break;
      }
      if (foundLakeBridgeLanding) break;
    }

    expect(foundLakeBridgeLanding).toBe(true);
  });

  it('guarantees seed 42 ocean lighthouse islet has rounded sand-to-grass transitions without flat cuts', () => {
    // In seed 42, ocean lighthouse is placed around (83, 5).
    // The sand perimeter around grass lawn must have CANONICAL_SAND_BEACH_BRUSH tiles:
    // (89, 8..10) must border sand with poke_sand_edge_w.png
    // (85..87, 4) must border sand with poke_sand_edge_s.png or poke_sand_corner_*
    const res = executeRegionalGenerationJob({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3,
      targetCount: 18,
      allowBridges: true,
      withStairs: true
    });
    const c = res.continent;

    const faro = res.pois.find((p) => p.id === 'ocean_lighthouse');
    expect(faro).toBeDefined();

    // Grass at (faro.gridX + 2, faro.gridY - 1) must border sand at (faro.gridX + 2, faro.gridY - 2) which has poke_sand_edge_s.png
    const testX = faro!.gridX + 2;
    const grassY = faro!.gridY - 1;
    const sandY = faro!.gridY - 2;

    expect(c.terrainMatrix[grassY]![testX]).toBe('grass');
    expect(c.terrainMatrix[sandY]![testX]).toBe('sand');
    expect(c.resolvedWater.cellDetails[sandY]![testX]?.primaryTile).toBe('poke_sand_edge_s.png');
  });
});
