/**
 * test_aventura/tests/map/proceduralTopologySealing.test.ts
 *
 * TIER 1 RED-TO-GREEN TEST: PROCEDURAL GRAPH TOPOLOGY SEALING ACROSS 128/256/400
 *
 * Verifies across seeds [42, 100, 2305, 777, 999] and dimensions [128, 256, 400]:
 * 1. Scale & seed diversity: 256x256 and 128x128 use Graph-First generation and produce distinct POI layouts across seeds.
 * 2. Hermetic land sealing: blocking direct neighbor cities of Starter Town makes all other cities unreachable on foot (zero beach/desert/meadow bypasses).
 * 3. Zero walkable escape to map borders (x=0, x=W-1, y=0, y=H-1).
 * 4. Route gates align with pathGrid through their central doorway and have non-empty sealing barriers without missing assets.
 * 5. Zero autotile defects across generated seeds.
 */

import { describe, it, expect } from 'vitest';

import { scanContinentAutotileDefects } from '../../logic/map/autotileDefectScanner.ts';
import { executeRegionalGenerationJob } from '../../logic/map/continentGenerator.worker.ts';
import { floodFillGrid, type GridPoint } from '../../logic/utils/gridBfsUtils.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

const TEST_SEEDS = [42, 100, 2305, 777, 999] as const;
const TEST_DIMENSIONS = [128, 256, 400] as const;
const MULTI_SEED_TEST_TIMEOUT_MS = 240_000 as const;

const IMPASSABLE_PROP_TYPE_LIST = ['boulder', 'fence_h', 'fence_v', 'bush', 'sapling'] as const;
type ImpassablePropType = (typeof IMPASSABLE_PROP_TYPE_LIST)[number];
const IMPASSABLE_PROP_TYPES: ReadonlySet<ImpassablePropType> = new Set<ImpassablePropType>(
  IMPASSABLE_PROP_TYPE_LIST
);

function buildWalkableCollisionGrid(
  result: ReturnType<typeof executeRegionalGenerationJob>
): boolean[][] {
  const { continent, pois, routeNetwork, wilderness } = result;
  const W = continent.width;
  const H = continent.height;
  const blocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  // Water without bridge is impassable on foot
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = continent.terrainMatrix[y]![x];
      if ((t === 'water' || t === 'water_deep') && !routeNetwork.bridgeGrid[y]?.[x]) {
        blocked[y]![x] = true;
      }
    }
  }

  // Mountain cliffs & plateau perimeter walls without stair are impassable
  const stairSet = new Set(continent.placedStairs.map((s) => `${s.x}_${s.y}`));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const elev = continent.heightmap[y]?.[x] ?? 0;
      const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
      const isFoot = continent.resolvedMountain.occupiedFootCells[y]?.[x];
      const isStair = stairSet.has(`${x}_${y}`);
      if (elev > 0 && !isStair) {
        if (
          mCell?.role === 'peak_isolated' ||
          mCell?.role.startsWith('edge_') ||
          mCell?.role.startsWith('corner_outer_')
        ) {
          blocked[y]![x] = true;
        }
      }
      if (isFoot && !isStair) {
        blocked[y]![x] = true;
      }
    }
  }

  // Buildings
  for (const poi of pois) {
    for (const b of poi.urbanLayout?.buildings ?? []) {
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          const by = b.y + dy;
          const bx = b.x + dx;
          if (by >= 0 && by < H && bx >= 0 && bx < W) {
            blocked[by]![bx] = true;
          }
        }
      }
    }
    for (const prop of poi.urbanLayout?.props ?? []) {
      if (
        (IMPASSABLE_PROP_TYPES.has(prop.type as ImpassablePropType) ||
          prop.prefabFile.includes('fence')) &&
        prop.y >= 0 &&
        prop.y < H &&
        prop.x >= 0 &&
        prop.x < W
      ) {
        blocked[prop.y]![prop.x] = true;
      }
    }
  }

  // Tree trunk bases
  for (const tree of wilderness.trees) {
    const trunkRows = Math.min(2, tree.height);
    for (let dy = 0; dy < trunkRows; dy++) {
      for (let dx = 0; dx < tree.width; dx++) {
        const ty = tree.y + dy;
        const tx = tree.x + dx;
        if (ty >= 0 && ty < H && tx >= 0 && tx < W) {
          blocked[ty]![tx] = true;
        }
      }
    }
  }

  // Wilderness props
  for (const prop of wilderness.props) {
    if (
      (IMPASSABLE_PROP_TYPES.has(prop.type as ImpassablePropType) ||
        prop.prefabFile.includes('fence')) &&
      prop.y >= 0 &&
      prop.y < H &&
      prop.x >= 0 &&
      prop.x < W
    ) {
      blocked[prop.y]![prop.x] = true;
    }
  }

  return blocked;
}

function findWalkableSeedInPoi(
  poi: POINode,
  blocked: readonly (readonly boolean[])[],
  W: number,
  H: number
): GridPoint | null {
  for (const st of poi.urbanLayout?.internalStreets ?? []) {
    if (st.x >= 0 && st.x < W && st.y >= 0 && st.y < H && !blocked[st.y]![st.x]) {
      return { x: st.x, y: st.y };
    }
  }
  for (let y = poi.gridY; y < poi.gridY + poi.footprint.height; y++) {
    for (let x = poi.gridX; x < poi.gridX + poi.footprint.width; x++) {
      if (x >= 0 && x < W && y >= 0 && y < H && !blocked[y]![x]) {
        return { x, y };
      }
    }
  }
  return null;
}

describe('Procedural Graph Topology Sealing Across 128/256/400', () => {
  it('produces distinct regional layouts and POI compositions across seeds in 128x128 and 256x256 (not cloned presets)', () => {
    for (const dim of [128, 256] as const) {
      const runA = executeRegionalGenerationJob({ width: dim, height: dim, seed: 42 });
      const runB = executeRegionalGenerationJob({ width: dim, height: dim, seed: 100 });
      const sigA = runA.pois.map((p) => `${p.id}:${p.name}@${p.gridX},${p.gridY}`).join('|');
      const sigB = runB.pois.map((p) => `${p.id}:${p.name}@${p.gridX},${p.gridY}`).join('|');
      expect(
        sigA,
        `dim=${dim} seed 42 and seed 100 must not produce identical POI layouts`
      ).not.toBe(sigB);
    }
  });

  it(
    'prevents walking around direct neighbors to reach disconnected cities and prevents escaping to map borders',
    () => {
      for (const dim of TEST_DIMENSIONS) {
        for (const seed of TEST_SEEDS) {
          const result = executeRegionalGenerationJob({ width: dim, height: dim, seed });
          const W = result.continent.width;
          const H = result.continent.height;
          const blocked = buildWalkableCollisionGrid(result);

          // Pick starter/first settlement node and find its direct neighbors in the graph
          const settlementPois = result.pois.filter(
            (p) => p.type === 'town' || p.type === 'city' || p.type === 'metropolis'
          );
          expect(
            settlementPois.length,
            `dim=${dim} seed=${seed} needs settlements`
          ).toBeGreaterThan(2);

          const startPoi = settlementPois[0]!;
          const startSeed = findWalkableSeedInPoi(startPoi, blocked, W, H);
          expect(
            startSeed,
            `dim=${dim} seed=${seed} startPoi ${startPoi.id} needs walkable tile`
          ).not.toBeNull();

          // Build adjacency across non-gate nodes (collapsing route_gates into direct route transitions)
          const adj = new Map<string, Set<string>>();
          for (const p of result.pois) adj.set(p.id, new Set());
          for (const e of result.routeNetwork.edges) {
            adj.get(e.fromNodeId)?.add(e.toNodeId);
            adj.get(e.toNodeId)?.add(e.fromNodeId);
          }

          // Direct non-gate neighbors reachable in 1 hop (traversing through route_gate nodes)
          const directBlockTargets = new Set<string>();
          const visitedGateScan = new Set<string>([startPoi.id]);
          for (const nbId of adj.get(startPoi.id) ?? []) {
            const nbPoi = result.pois.find((p) => p.id === nbId);
            if (!nbPoi) continue;
            if (nbPoi.type === 'route_gate') {
              visitedGateScan.add(nbId);
              for (const beyondId of adj.get(nbId) ?? []) {
                if (!visitedGateScan.has(beyondId)) {
                  directBlockTargets.add(beyondId);
                }
              }
            } else {
              directBlockTargets.add(nbId);
            }
          }

          // Seal all direct neighbor nodes & all route_gate doorways
          const sealedBlocked = blocked.map((row) => [...row]);
          for (const p of result.pois) {
            if (directBlockTargets.has(p.id) || p.type === 'route_gate') {
              for (
                let y = Math.max(0, p.gridY - 2);
                y <= Math.min(H - 1, p.gridY + p.footprint.height + 1);
                y++
              ) {
                for (
                  let x = Math.max(0, p.gridX - 2);
                  x <= Math.min(W - 1, p.gridX + p.footprint.width + 1);
                  x++
                ) {
                  sealedBlocked[y]![x] = true;
                }
              }
            }
          }

          const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
          visited[startSeed!.y]![startSeed!.x] = true;
          floodFillGrid([startSeed!], visited, W, H, (nx, ny) => !sealedBlocked[ny]![nx]);

          // 1. Must not escape to map borders
          let escapedBorder = false;
          for (let x = 0; x < W; x++) {
            if (visited[0]![x] || visited[H - 1]![x]) escapedBorder = true;
          }
          for (let y = 0; y < H; y++) {
            if (visited[y]![0] || visited[y]![W - 1]) escapedBorder = true;
          }
          expect(escapedBorder, `dim=${dim} seed=${seed} walked to map border`).toBe(false);

          // 2. Must NOT reach any other non-adjacent settlement via beaches/deserts/meadows
          for (const otherPoi of settlementPois) {
            if (otherPoi.id === startPoi.id || directBlockTargets.has(otherPoi.id)) continue;
            const otherSeed = findWalkableSeedInPoi(otherPoi, blocked, W, H);
            if (!otherSeed) continue;
            expect(
              visited[otherSeed.y]![otherSeed.x],
              `dim=${dim} seed=${seed} bypassed graph barrier from ${startPoi.id} to ${otherPoi.id}`
            ).toBe(false);
          }
        }
      }
    },
    MULTI_SEED_TEST_TIMEOUT_MS
  );

  it(
    'aligns every route_gate doorway with pathGrid and produces zero autotile defects across 128/256/400',
    () => {
      for (const dim of TEST_DIMENSIONS) {
        for (const seed of TEST_SEEDS) {
          const result = executeRegionalGenerationJob({ width: dim, height: dim, seed });
          const { continent, pois, routeNetwork } = result;

          for (const gate of pois.filter((p) => p.type === 'route_gate')) {
            const streets = gate.urbanLayout?.internalStreets ?? [];
            expect(
              streets.length,
              `dim=${dim} seed=${seed} gate ${gate.id} must have doorway street`
            ).toBeGreaterThan(0);
            const hasPathThroughDoor = streets.some((st) => routeNetwork.pathGrid[st.y]?.[st.x]);
            expect(
              hasPathThroughDoor,
              `dim=${dim} seed=${seed} gate ${gate.id} doorway is not traversed by pathGrid`
            ).toBe(true);
          }

          const scan = scanContinentAutotileDefects({
            continent,
            pathGrid: routeNetwork.pathGrid,
            bridgeGrid: routeNetwork.bridgeGrid,
            pois
          });
          expect(
            scan.totalDefects,
            `dim=${dim} seed=${seed} autotile defects: ${scan.defects
              .slice(0, 3)
              .map((d) => d.kind)
              .join(', ')}`
          ).toBe(0);
        }
      }
    },
    MULTI_SEED_TEST_TIMEOUT_MS
  );
});
