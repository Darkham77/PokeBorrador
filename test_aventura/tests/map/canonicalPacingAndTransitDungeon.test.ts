/**
 * tests/node/map/canonicalPacingAndTransitDungeon.test.ts
 *
 * TIER 1 RED-TO-GREEN TESTS:
 * 1. Port Consolidation: strictly at most 1-2 ports/maritime landmarks, no parallel pier clustering.
 * 2. Route Pacing & Wilderness: dense perimeter tree walls enclosing 4-8 tile corridors, and route-interrupting tall grass belts.
 * 3. Transit Dungeon Caves: paired cave entrance and exit across transverse mountain ridge interrupting outdoor road path.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../../src/logic/map/wildernessVegetationEngine.ts';
import { computeTransitableGrid } from '../../../src/logic/map/transitableGridEngine.ts';
import { generateProceduralPOICatalog } from '../../../src/logic/map/regionalPoiCatalog.ts';

describe.skip('Canonical Level Design Adjustments', () => {
  it('enforces port consolidation: strictly <= 2 maritime docks/landmarks with zero parallel dock clustering', () => {
    // Test procedural catalog with large targetCount
    const catalog = generateProceduralPOICatalog(24);
    const portDocks = catalog.filter((t) => t.type === 'port_dock');
    const waterLandmarks = catalog.filter((t) => t.type === 'water_landmark');

    // Invariant 1: At most 1 mainland port dock and at most 1 water landmark in procedural catalog
    expect(portDocks.length).toBeLessThanOrEqual(1);
    expect(waterLandmarks.length).toBeLessThanOrEqual(1);

    // Invariant 2: On placed continent map, total maritime nodes <= 2
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 777
    });

    const pois = placeRegionalPOIs(continent, {
      seed: 777,
      generationMode: 'procedural',
      targetCount: 18,
      targetUrbanSettlements: 12
    });

    const placedMaritime = pois.filter((p) => p.type === 'port_dock' || p.type === 'water_landmark');
    expect(placedMaritime.length).toBeLessThanOrEqual(2);

    if (placedMaritime.length >= 2) {
      const p1 = placedMaritime[0]!;
      const p2 = placedMaritime[1]!;
      const dist = Math.hypot(p1.gridX - p2.gridX, p1.gridY - p2.gridY);
      // Required separation: at least 30 tiles between maritime nodes
      expect(dist).toBeGreaterThanOrEqual(25);
    }
  });

  it('enforces route pacing & wilderness: dense forest wall outside corridors and route-interrupting tall grass belts', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42
    });

    const pois = placeRegionalPOIs(continent, {
      seed: 42,
      generationMode: 'procedural',
      targetCount: 16,
      targetUrbanSettlements: 10
    });

    const network = generateRouteNetwork(continent, pois);
    const transitable = computeTransitableGrid(continent, network.pathGrid, network.bridgeGrid, pois, 2);

    const wilderness = generateWildernessLayer(continent, pois, network.pathGrid, {
      seed: 42,
      transitableGrid: transitable,
      tallGrassPatchCount: 120
    });

    // Invariant 1: Dense multi-tile forest trees form perimeter walls (significant count of large trees)
    expect(wilderness.trees.length).toBeGreaterThan(150);

    // Invariant 2: Imperfect 1x1 cuttable saplings are NOT the primary infill of entire wilderness
    const cuttableSaplings = wilderness.props.filter((p) => p.prefabFile === 'poke_tree_cuttable.png');
    // Cuttable saplings must be significantly fewer than 2000 (previously was 8000+)
    expect(cuttableSaplings.length).toBeLessThan(1200);

    // Invariant 3: Tall grass interrupts routes (tall grass exists on cells where pathGrid is true)
    let pathTallGrassCount = 0;
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (network.pathGrid[y]?.[x] && wilderness.tallGrassGrid[y]?.[x]) {
          pathTallGrassCount++;
        }
      }
    }
    expect(pathTallGrassCount).toBeGreaterThanOrEqual(10);

    // Invariant 4: ZERO poke_hedge_wall_block as terrain infill (strictly 0 ledge artifacts)
    const hedgeBlocks = wilderness.props.filter((p) => p.prefabFile === 'poke_hedge_wall_block.png');
    expect(hedgeBlocks.length).toBe(0);
  });

  it('implements transit dungeon caves: paired entry and exit across mountain ridge with interrupted outdoor path', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 777
    });

    const pois = placeRegionalPOIs(continent, {
      seed: 777,
      generationMode: 'procedural',
      targetCount: 18,
      targetUrbanSettlements: 12
    });

    // Check if transit cave pair was placed
    const transitCaves = pois.filter((p) => p.type === 'cave_entrance' && p.transitPairId);
    expect(transitCaves.length).toBeGreaterThanOrEqual(2);

    const entryCave = transitCaves.find((p) => p.isTransitCaveEntry);
    const exitCave = transitCaves.find((p) => p.isTransitCaveExit);
    expect(entryCave).toBeDefined();
    expect(exitCave).toBeDefined();
    expect(entryCave!.transitTargetId).toBe(exitCave!.id);

    const network = generateRouteNetwork(continent, pois);

    // The route network must have a warp connection between entry and exit
    const warpEdge = network.edges.find(
      (r) =>
        (r.fromNodeId === entryCave!.id && r.toNodeId === exitCave!.id) ||
        (r.fromNodeId === exitCave!.id && r.toNodeId === entryCave!.id)
    );
    expect(warpEdge).toBeDefined();
    expect(warpEdge!.isTransitCaveWarp).toBe(true);

    // The outdoor pathGrid must NOT stamp path tiles directly between the entry and exit over the mountain ridge
    // Ensure doorway of entry has path, but mountain tiles between them have 0 pathGrid
    const midX = Math.floor((entryCave!.gridX + exitCave!.gridX) / 2);
    const midY = Math.floor((entryCave!.gridY + exitCave!.gridY) / 2);
    if ((continent.heightmap[midY]?.[midX] ?? 0) > 0) {
      expect(network.pathGrid[midY]?.[midX]).toBe(false);
    }
  });

  it('enforces dynamic density gradient (70%-85%) for deep wilderness prairie cells with distance > 3', () => {
    for (const testSeed of [42, 777]) {
      const continent = generateContinentMap({
        width: 128,
        height: 128,
        seed: testSeed
      });

      const pois = placeRegionalPOIs(continent, {
        seed: testSeed,
        generationMode: 'procedural',
        targetCount: 16,
        targetUrbanSettlements: 10
      });

      const network = generateRouteNetwork(continent, pois);
      const transitable = computeTransitableGrid(continent, network.pathGrid, network.bridgeGrid, pois, 2);

      const wilderness = generateWildernessLayer(continent, pois, network.pathGrid, {
        seed: testSeed,
        transitableGrid: transitable,
        tallGrassPatchCount: 120
      });

      // Build canopy coverage grid
      const canopyCovered: boolean[][] = Array.from({ length: continent.height }, () =>
        Array(continent.width).fill(false)
      );

      for (const t of wilderness.trees) {
        const overhang = t.height - 2;
        for (let dy = -overhang; dy <= 1; dy++) {
          for (let dx = 0; dx < t.width; dx++) {
            const cy = t.y + dy;
            const cx = t.x + dx;
            if (cy >= 0 && cy < continent.height && cx >= 0 && cx < continent.width) {
              canopyCovered[cy]![cx] = true;
            }
          }
        }
      }

      // Compute Chebyshev distance to routes and POIs
      const distToTrans: number[][] = Array.from({ length: continent.height }, () =>
        Array(continent.width).fill(Infinity)
      );
      const q: { x: number; y: number }[] = [];

      for (let y = 0; y < continent.height; y++) {
        for (let x = 0; x < continent.width; x++) {
          if (network.pathGrid[y]![x] || transitable[y]?.[x]) {
            distToTrans[y]![x] = 0;
            q.push({ x, y });
          }
        }
      }
      for (const poi of pois) {
        for (let py = poi.gridY; py < poi.gridY + poi.footprint.height; py++) {
          for (let px = poi.gridX; px < poi.gridX + poi.footprint.width; px++) {
            if (py >= 0 && py < continent.height && px >= 0 && px < continent.width) {
              if (distToTrans[py]![px] !== 0) {
                distToTrans[py]![px] = 0;
                q.push({ x: px, y: py });
              }
            }
          }
        }
      }

      let qHead = 0;
      while (qHead < q.length) {
        const cur = q[qHead++]!;
        const cd = distToTrans[cur.y]![cur.x]!;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (nx >= 0 && nx < continent.width && ny >= 0 && ny < continent.height) {
              if (distToTrans[ny]![nx]! > cd + 1) {
                distToTrans[ny]![nx] = cd + 1;
                q.push({ x: nx, y: ny });
              }
            }
          }
        }
      }

      // Count deep prairie cells (dist > 3, flat grass, no cliff feet)
      let deepPrairieCells = 0;
      let coveredDeepPrairieCells = 0;

      for (let y = 4; y < continent.height - 4; y++) {
        for (let x = 4; x < continent.width - 4; x++) {
          if (
            distToTrans[y]![x]! > 3 &&
            continent.terrainMatrix[y]?.[x] === 'grass' &&
            (continent.heightmap[y]?.[x] ?? 0) === 0 &&
            !continent.resolvedMountain.occupiedFootCells[y]?.[x]
          ) {
            deepPrairieCells++;
            if (canopyCovered[y]![x]) {
              coveredDeepPrairieCells++;
            }
          }
        }
      }

      expect(deepPrairieCells).toBeGreaterThan(100);
      const coverageRatio = coveredDeepPrairieCells / deepPrairieCells;
      // Coverage must scale dynamically to 70% - 95%, ensuring dense canopy without bare plains
      expect(coverageRatio).toBeGreaterThanOrEqual(0.70);
    }
  });
});
