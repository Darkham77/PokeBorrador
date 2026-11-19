/**
 * test_aventura/tests/map/continentalBlockDIntegrity.test.ts
 *
 * TIER 1 & TIER 2 BLOCK D INTEGRATION SUITE
 *
 * Validates across 128x128, 256x256, and 400x400:
 *   D1: Organic coastal sculpting around waterfront settlements (no square 90-degree grass bricks)
 *   D2: Balanced 2D archetype silhouettes & northern/culminating League apex
 *   D3: Organic terrestrial A* meandering (eliminates 60+ tile dead-straight highway runs)
 *   D4: Asymmetric inland lakes & coastal FireRed marine reefs across all archetypes/scales
 */

import { describe, expect, it } from 'vitest';

import { resolveTileUrl } from '../../logic/map/canvasImageLoader.ts';
import { generatePokemonContinentalWorld } from '../../logic/map/continent/continentalEngine.ts';
import { executeFullWorkerGeneration } from '../../logic/map/continentGenerator.worker.ts';
import {
  carveInlandLakes,
  sculptContinentFromGraph
} from '../../logic/map/continentSculptingEngine.ts';
import { embedPokemonTopology } from '../../logic/map/orthogonalGraphEmbedding.ts';
import { generatePokemonTopology } from '../../logic/map/pokemonGraphTopology.ts';
import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import type { EmbeddedTopologyGraph } from '../../types/map/pokemonGraphTypes.ts';

const SYNTHETIC_WORLD_SIZE = 96 as const;
const CANTILEVER_NODE_X = 64 as const;
const CANTILEVER_NODE_Y = 38 as const;
const CANTILEVER_NODE_W = 14 as const;
const CANTILEVER_NODE_H = 12 as const;
const MAX_STRAIGHT_TERRESTRIAL_RUN = 44 as const;
const LAKE_TEST_GRID_SIZE = 160 as const;
const MIN_ORGANIC_LAKE_TILES = 16 as const;
const MULTI_SCALE_DIMS = [128, 256, 400] as const;

describe('Block D: Organic Coastal Sculpting, League Apex, Route Meanders & Marine Life', () => {
  it('D1: rounds waterfront settlement pads organically instead of stamping flat square corners', () => {
    const syntheticEmbedded: EmbeddedTopologyGraph = {
      seed: 901,
      width: SYNTHETIC_WORLD_SIZE,
      height: SYNTHETIC_WORLD_SIZE,
      macroArchetype: 'classic_bay',
      mainChainOrder: ['starter', 'bay_town'],
      gridCols: 2,
      gridRows: 1,
      nodes: [
        {
          id: 'starter',
          role: 'starter',
          hasPort: true,
          gridX: 16,
          gridY: 38,
          width: 16,
          height: 12,
          centerX: 24,
          centerY: 44,
          bandCol: 0,
          bandRow: 0
        },
        {
          id: 'bay_town',
          role: 'secondary_landmark',
          hasPort: false,
          gridX: CANTILEVER_NODE_X,
          gridY: CANTILEVER_NODE_Y,
          width: CANTILEVER_NODE_W,
          height: CANTILEVER_NODE_H,
          centerX: CANTILEVER_NODE_X + Math.floor(CANTILEVER_NODE_W / 2),
          centerY: CANTILEVER_NODE_Y + Math.floor(CANTILEVER_NODE_H / 2),
          bandCol: 1,
          bandRow: 0
        }
      ],
      corridors: [
        {
          id: 'edge_bay_bridge',
          fromId: 'starter',
          toId: 'bay_town',
          kind: 'main_chain',
          barrier: undefined,
          waypoints: [
            { x: 32, y: 44 },
            { x: CANTILEVER_NODE_X, y: 44 }
          ],
          pathCells: [
            { x: 32, y: 44 },
            { x: CANTILEVER_NODE_X, y: 44 }
          ]
        },
        {
          id: 'edge_bay_surf',
          fromId: 'starter',
          toId: 'bay_town',
          kind: 'surf_route',
          barrier: undefined,
          waypoints: [
            { x: CANTILEVER_NODE_X - 8, y: CANTILEVER_NODE_Y + CANTILEVER_NODE_H + 3 },
            {
              x: CANTILEVER_NODE_X + CANTILEVER_NODE_W + 6,
              y: CANTILEVER_NODE_Y + CANTILEVER_NODE_H + 3
            }
          ],
          pathCells: Array.from({ length: CANTILEVER_NODE_W + 15 }, (_, idx) => ({
            x: CANTILEVER_NODE_X - 8 + idx,
            y: CANTILEVER_NODE_Y + CANTILEVER_NODE_H + 3
          }))
        }
      ]
    };

    const sculpted = sculptContinentFromGraph(syntheticEmbedded, {
      seed: 901,
      width: SYNTHETIC_WORLD_SIZE,
      height: SYNTHETIC_WORLD_SIZE,
      lakeCount: 0
    });

    // Core habitable interior must stay 100% solid dry grass
    for (let y = CANTILEVER_NODE_Y; y < CANTILEVER_NODE_Y + CANTILEVER_NODE_H; y++) {
      for (let x = CANTILEVER_NODE_X; x < CANTILEVER_NODE_X + CANTILEVER_NODE_W; x++) {
        expect(sculpted.terrainMatrix[y]![x]).toBe('grass');
      }
    }

    // Outer 4-tile pad extreme corners must round naturally rather than all 4 outer pad corners being forced to dry grass
    const outerPadCorners = [
      sculpted.terrainMatrix[CANTILEVER_NODE_Y - 4]![CANTILEVER_NODE_X - 4],
      sculpted.terrainMatrix[CANTILEVER_NODE_Y - 4]![CANTILEVER_NODE_X + CANTILEVER_NODE_W + 3],
      sculpted.terrainMatrix[CANTILEVER_NODE_Y + CANTILEVER_NODE_H + 3]![CANTILEVER_NODE_X - 4],
      sculpted.terrainMatrix[CANTILEVER_NODE_Y + CANTILEVER_NODE_H + 3]![
        CANTILEVER_NODE_X + CANTILEVER_NODE_W + 3
      ]
    ];
    expect(outerPadCorners.every((t) => t === 'grass')).toBe(false);
  });

  it('D2: positions the Pokemon League toward northern upper bands on classic_bay without thin chimneys', () => {
    for (const seed of [42, 100, 7741]) {
      const graph = generatePokemonTopology({
        seed,
        macroArchetype: 'classic_bay'
      });
      const embedded = embedPokemonTopology(graph, { width: 400, height: 400 });
      const league = embedded.nodes.find((n) => n.role === 'league');
      const starter = embedded.nodes.find((n) => n.role === 'starter');

      expect(league).toBeDefined();
      expect(starter).toBeDefined();
      expect(league!.centerY).toBeLessThan(embedded.height * 0.55);
      expect(
        Math.hypot(league!.centerX - starter!.centerX, league!.centerY - starter!.centerY)
      ).toBeGreaterThan(140);
    }
  });

  it('D3: eliminates ultra-long dead-straight terrestrial A* highway runs while keeping bridges straight', () => {
    const world = generatePokemonContinentalWorld({
      seed: 42,
      width: 400,
      height: 400,
      macroArchetype: 'classic_bay'
    });

    const W = world.continent.width;
    const H = world.continent.height;
    let maxHorizTerrestrial = 0;
    let maxHorizLoc = '';
    let maxVertTerrestrial = 0;
    let maxVertLoc = '';

    for (let y = 0; y < H; y++) {
      let run = 0;
      for (let x = 0; x < W; x++) {
        const isRoad = world.pathGrid[y]?.[x] && !world.bridgeGrid[y]?.[x];
        run = isRoad ? run + 1 : 0;
        if (run > maxHorizTerrestrial) {
          maxHorizTerrestrial = run;
          maxHorizLoc = `y=${y} x=${x - run + 1}..${x}`;
        }
      }
    }

    for (let x = 0; x < W; x++) {
      let run = 0;
      for (let y = 0; y < H; y++) {
        const isRoad = world.pathGrid[y]?.[x] && !world.bridgeGrid[y]?.[x];
        run = isRoad ? run + 1 : 0;
        if (run > maxVertTerrestrial) {
          maxVertTerrestrial = run;
          maxVertLoc = `x=${x} y=${y - run + 1}..${y}`;
        }
      }
    }

    expect(maxHorizTerrestrial, `Longest horiz run at ${maxHorizLoc}`).toBeLessThanOrEqual(
      MAX_STRAIGHT_TERRESTRIAL_RUN
    );
    expect(maxVertTerrestrial, `Longest vert run at ${maxVertLoc}`).toBeLessThanOrEqual(
      MAX_STRAIGHT_TERRESTRIAL_RUN
    );
  });

  it('D4: carves asymmetric inland lakes without twin circles and populates FireRed coastal reefs across all scales', () => {
    const matrix: WaterTerrainKind[][] = Array.from({ length: LAKE_TEST_GRID_SIZE }, () =>
      Array<WaterTerrainKind>(LAKE_TEST_GRID_SIZE).fill('grass')
    );
    carveInlandLakes(matrix, 3, 4242);

    // Measure lake bounding boxes via flood-fill
    const visited: boolean[][] = Array.from({ length: LAKE_TEST_GRID_SIZE }, () =>
      Array<boolean>(LAKE_TEST_GRID_SIZE).fill(false)
    );
    const lakeShapes: { area: number; w: number; h: number }[] = [];

    for (let y = 0; y < LAKE_TEST_GRID_SIZE; y++) {
      for (let x = 0; x < LAKE_TEST_GRID_SIZE; x++) {
        if (matrix[y]![x] !== 'water' || visited[y]![x]) continue;
        const queue = [{ x, y }];
        visited[y]![x] = true;
        let area = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        while (queue.length > 0) {
          const pt = queue.shift()!;
          area++;
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ] as const) {
            const nx = pt.x + dx;
            const ny = pt.y + dy;
            if (
              nx >= 0 &&
              nx < LAKE_TEST_GRID_SIZE &&
              ny >= 0 &&
              ny < LAKE_TEST_GRID_SIZE &&
              !visited[ny]![nx] &&
              matrix[ny]![nx] === 'water'
            ) {
              visited[ny]![nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
        lakeShapes.push({ area, w: maxX - minX + 1, h: maxY - minY + 1 });
      }
    }

    expect(lakeShapes.length).toBeGreaterThanOrEqual(2);
    for (const shape of lakeShapes) {
      expect(shape.area).toBeGreaterThanOrEqual(MIN_ORGANIC_LAKE_TILES);
    }
    const aspectRatios = lakeShapes.map((s) => Number((s.w / s.h).toFixed(2)));
    expect(new Set(aspectRatios).size).toBeGreaterThan(1);

    // Coastal marine reefs must populate even on pure continental classic_bay across 128, 256, and 400
    for (const size of MULTI_SCALE_DIMS) {
      const world = generatePokemonContinentalWorld({
        seed: 7741,
        width: size,
        height: size,
        macroArchetype: 'classic_bay'
      });
      const rocks = world.maritimeRockObstacles ?? [];
      expect(rocks.length).toBeGreaterThan(0);

      for (const rock of rocks) {
        const t = world.continent.terrainMatrix[rock.y]?.[rock.x];
        expect(t === 'water' || t === 'water_deep').toBe(true);
        expect(world.bridgeGrid[rock.y]?.[rock.x]).toBe(false);
        expect(world.pathGrid[rock.y]?.[rock.x]).toBe(false);
      }
    }
  });

  it('D5: resolves sea-rock URLs cleanly and compiles maritime rocks into worker packedBlit + mainland port', () => {
    expect(resolveTileUrl('poke_water_rocks_calm.png')).toBe(
      '/test_aventura/assets/prefabs/water/poke_water_rocks_calm.png'
    );
    expect(resolveTileUrl('poke_water_rock_foam.png')).toBe(
      '/test_aventura/assets/tiles/elevation/brown/poke_water_rock_foam.png'
    );

    const out = executeFullWorkerGeneration({
      width: 400,
      height: 400,
      seed: 42,
      macroArchetype: 'oceanic_archipelago'
    });

    const hasSeaRocksInBlit =
      out.packedBlit.palette.includes('poke_water_rocks_calm.png') ||
      out.packedBlit.palette.includes('poke_water_rock_foam.png');
    expect(hasSeaRocksInBlit).toBe(true);
    expect((out.result.routeNetwork.maritimeRockObstacles ?? []).length).toBeGreaterThan(0);

    const portNode = out.result.pois.find((p) => p.hasPort);
    expect(portNode).toBeDefined();
  });
});
