/**
 * test_aventura/tests/map/continentalBlockAIntegrity.test.ts
 *
 * TIER 1 & TIER 2 VERIFICATION SUITE (BLOCK A):
 *   1. Zero fences (route_gate or dungeon_forest) overlapping any tree footprint/canopy.
 *   2. Zero dead-end road stubs or orphan path fragments disconnected from gateways/stairs/bridges.
 *   3. Zero thin mountain needles/slivers (width <= 2 tiles across >= 3 consecutive rows/cols).
 *   4. Zero settlement nodes trapped on isolated inland lake islets and zero orphan signposts/cities on disconnected archipelago islets.
 */

import { describe, it, expect } from 'vitest';

import { buildBuildingProtectionMask } from '../../logic/map/autotileDefectScanner.ts';
import { collectStandingDepthEntities } from '../../logic/map/canvasDepthEntityCollector.ts';
import { generatePokemonContinentalWorld } from '../../logic/map/continent/continentalEngine.ts';
import { pruneSlicedMountainArtifactsAfterZones } from '../../logic/map/continentMountainEngine.ts';
import type {
  TreePlacement,
  WildernessPropPlacement
} from '../../logic/map/wildernessVegetationEngine.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

function doesFenceOverlapTree(
  fence: { readonly x: number; readonly y: number },
  tree: TreePlacement
): boolean {
  const canopyOverhang = Math.max(0, tree.height - 2);
  const minY = tree.y - canopyOverhang;
  const maxY = tree.y + 1;
  return fence.x >= tree.x && fence.x < tree.x + tree.width && fence.y >= minY && fence.y <= maxY;
}

function collectAllFences(
  pois: readonly POINode[],
  wildernessProps: readonly WildernessPropPlacement[]
): { readonly x: number; readonly y: number; readonly source: string }[] {
  const fences: { x: number; y: number; source: string }[] = [];
  for (const poi of pois) {
    for (const prop of poi.urbanLayout?.props ?? []) {
      if (prop.type === 'fence_h' || prop.type === 'fence_v' || prop.prefabFile.includes('fence')) {
        fences.push({ x: prop.x, y: prop.y, source: `poi:${poi.id}` });
      }
    }
  }
  for (const prop of wildernessProps) {
    if (prop.type === 'fence_h' || prop.type === 'fence_v' || prop.prefabFile.includes('fence')) {
      fences.push({ x: prop.x, y: prop.y, source: 'wilderness' });
    }
  }
  return fences;
}

function isNearGatewayStairOrBridge(
  x: number,
  y: number,
  world: ReturnType<typeof generatePokemonContinentalWorld>
): boolean {
  if (world.bridgeGrid) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (world.bridgeGrid[y + dy]?.[x + dx]) return true;
      }
    }
  }

  for (const stair of world.continent.placedStairs) {
    if (Math.abs(stair.x - x) <= 2 && Math.abs(stair.y - y) <= 3) return true;
  }

  for (const poi of world.pois) {
    if (
      x >= poi.gridX - 1 &&
      x <= poi.gridX + poi.footprint.width &&
      y >= poi.gridY - 1 &&
      y <= poi.gridY + poi.footprint.height
    ) {
      return true;
    }
    for (const gw of poi.gateways ?? []) {
      if (Math.abs(gw.x - x) <= 2 && Math.abs(gw.y - y) <= 2) return true;
    }
  }

  return false;
}

describe('Continental World Block A Mountain Sliver Unit Check', () => {
  it('prunes 2-tile thin vertical/horizontal mountain spires in isolated heightmaps', () => {
    const H = 16;
    const W = 16;
    const terrain: ReturnType<
      typeof generatePokemonContinentalWorld
    >['continent']['terrainMatrix'] = Array.from({ length: H }, () =>
      Array<'grass'>(W).fill('grass')
    );
    const hmap: number[][] = Array.from({ length: H }, () => Array<number>(W).fill(0));
    for (let y = 9; y <= 13; y++) {
      for (let x = 4; x <= 10; x++) {
        hmap[y]![x] = 1;
      }
    }
    for (let y = 4; y <= 8; y++) {
      hmap[y]![6] = 1;
      hmap[y]![7] = 1;
    }

    pruneSlicedMountainArtifactsAfterZones(hmap, terrain, W, H);
    expect(hmap[5]![6]).toBe(0);
    expect(hmap[5]![7]).toBe(0);
  });
});

describe.each([42, 100, 7741])('Continental World Block A Integrity (400x400, seed %i)', (seed) => {
  const world = generatePokemonContinentalWorld({
    seed,
    width: 400,
    height: 400
  });

  it('prevents any fence (urban or wilderness) from overlapping any tree trunk or canopy', () => {
    const fences = collectAllFences(world.pois, world.wilderness.props);
    const collisions: string[] = [];

    for (const fence of fences) {
      for (const tree of world.wilderness.trees) {
        if (doesFenceOverlapTree(fence, tree)) {
          collisions.push(
            `Fence (${fence.source}) at (${fence.x},${fence.y}) collides with tree (${tree.prefabFile}) at (${tree.x},${tree.y})`
          );
        }
      }
    }

    expect(collisions).toEqual([]);
  });

  it('prevents dungeon_forest or wilderness rendered standing trees from colliding with rendered fences', () => {
    const H = world.continent.height;
    const W = world.continent.width;
    const buildingMask = buildBuildingProtectionMask(W, H, world.pois);
    const entities = collectStandingDepthEntities({
      continent: world.continent,
      pois: world.pois,
      buildingFootprintMask: buildingMask,
      unifiedPathGrid: world.pathGrid,
      bridgeGrid: world.bridgeGrid,
      wilderness: world.wilderness
    });

    const renderedFenceTiles = new Set<string>();
    for (const e of entities) {
      if (e.file.includes('fence')) {
        renderedFenceTiles.add(`${Math.round(e.px / 32)}_${Math.round(e.py / 32)}`);
      }
    }

    const renderedCollisions: string[] = [];
    for (const e of entities) {
      if (!e.file.includes('tree_')) continue;
      const gx = Math.round(e.px / 32);
      const gy = Math.round(e.py / 32);
      // Tree sprite px/py is top-left draw coordinate: spans 2..3 tiles wide and 3..4 tiles tall downward
      const wTiles = e.file.includes('oak') ? 3 : 2;
      const hTiles = e.file.includes('oak') ? 4 : 3;
      for (let dy = 0; dy < hTiles; dy++) {
        for (let dx = 0; dx < wTiles; dx++) {
          const key = `${gx + dx}_${gy + dy}`;
          if (renderedFenceTiles.has(key)) {
            renderedCollisions.push(
              `Rendered tree ${e.file} at (${gx},${gy}) overlaps fence at ${key}`
            );
          }
        }
      }
    }

    expect(renderedCollisions).toEqual([]);
  });

  it('guarantees zero dead-end road stubs or orphan path tiles in the carved pathGrid', () => {
    const { pathGrid, bridgeGrid, continent } = world;
    const H = continent.height;
    const W = continent.width;
    const deadEnds: string[] = [];

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (!pathGrid[y]?.[x]) continue;
        if (isNearGatewayStairOrBridge(x, y, world)) continue;

        let cardinalNeighbors = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ] as const) {
          if (pathGrid[y + dy]?.[x + dx] || bridgeGrid[y + dy]?.[x + dx]) {
            cardinalNeighbors++;
          }
        }
        if (cardinalNeighbors <= 1) {
          deadEnds.push(`(${x},${y}) neighbors=${cardinalNeighbors}`);
        }
      }
    }

    expect(deadEnds).toEqual([]);
  });

  it('ensures zero 2-tile thin vertical/horizontal mountain spires or slivers survive', () => {
    const realHmap = world.continent.heightmap;
    const slivers: string[] = [];
    for (let y = 2; y < world.continent.height - 2; y++) {
      for (let x = 2; x < world.continent.width - 2; x++) {
        const z = realHmap[y]?.[x] ?? 0;
        if (z <= 0) continue;

        const hasW = (realHmap[y]?.[x - 1] ?? 0) >= z;
        const hasE1 = (realHmap[y]?.[x + 1] ?? 0) >= z;
        const hasE2 = (realHmap[y]?.[x + 2] ?? 0) >= z;
        const hasN1 = (realHmap[y - 1]?.[x] ?? 0) >= z;
        const hasS1 = (realHmap[y + 1]?.[x] ?? 0) >= z;
        const hasS2 = (realHmap[y + 2]?.[x] ?? 0) >= z;

        // Vertical 2-wide spire (>= 3 rows tall, <= 2 cols wide throughout)
        if (!hasW && hasE1 && !hasE2 && hasN1 && hasS1) {
          const wN1 = (realHmap[y - 1]?.[x - 1] ?? 0) < z && (realHmap[y - 1]?.[x + 2] ?? 0) < z;
          const wS1 = (realHmap[y + 1]?.[x - 1] ?? 0) < z && (realHmap[y + 1]?.[x + 2] ?? 0) < z;
          if (wN1 && wS1) {
            slivers.push(`vertical_sliver_2w at (${x},${y}) z=${z}`);
          }
        }
        // Horizontal 2-tall sliver (>= 3 cols wide, <= 2 rows tall throughout)
        if (!hasN1 && hasS1 && !hasS2 && (realHmap[y]?.[x - 1] ?? 0) >= z && hasE1) {
          const hW1 = (realHmap[y - 1]?.[x - 1] ?? 0) < z && (realHmap[y + 2]?.[x - 1] ?? 0) < z;
          const hE1 = (realHmap[y - 1]?.[x + 1] ?? 0) < z && (realHmap[y + 2]?.[x + 1] ?? 0) < z;
          if (hW1 && hE1) {
            slivers.push(`horizontal_sliver_2h at (${x},${y}) z=${z}`);
          }
        }
      }
    }

    expect(slivers).toEqual([]);
  });

  it('prevents mainland nodes from being marooned in crater lakes and avoids orphan unreachable archipelago POIs', () => {
    // 1. Every mainland settlement/cave node in embedded topology must reach Starter via walkable land (or bridges)
    const starter =
      world.pois.find((p) => p.type === 'town' || p.id.includes('starter')) ?? world.pois[0]!;
    const visited = new Set<string>();
    const queue: { x: number; y: number }[] = [];
    const sx = starter.gridX + Math.floor(starter.footprint.width / 2);
    const sy = starter.gridY + starter.footprint.height - 1;
    queue.push({ x: sx, y: sy });
    visited.add(`${sx}_${sy}`);

    const W = world.continent.width;
    const H = world.continent.height;
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++]!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ] as const) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const key = `${nx}_${ny}`;
        if (visited.has(key)) continue;
        const t = world.continent.terrainMatrix[ny]?.[nx];
        const isWater = t === 'water' || t === 'water_deep';
        if (isWater && !world.bridgeGrid[ny]?.[nx]) continue;
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }

    const maroonedPois: string[] = [];
    for (const poi of world.pois) {
      if (poi.type === 'water_landmark') continue;
      // Check if any gateway or fringe tile is reachable from mainland BFS
      const sampleX = poi.gridX + Math.floor(poi.footprint.width / 2);
      const sampleY = Math.min(H - 1, poi.gridY + poi.footprint.height);
      const anyReachable =
        visited.has(`${sampleX}_${sampleY}`) ||
        (poi.gateways ?? []).some((gw) => visited.has(`${gw.x}_${gw.y}`));
      if (!anyReachable) {
        maroonedPois.push(`${poi.id}(${poi.type}) at (${poi.gridX},${poi.gridY})`);
      }
    }

    expect(maroonedPois).toEqual([]);

    // 2. Zero orphan signposts on archipelago islands
    const orphanSigns = world.pois.filter(
      (p) => p.type === 'water_landmark' && p.buildingFile === 'poke_signpost.png'
    );
    expect(orphanSigns).toEqual([]);
  });
});
