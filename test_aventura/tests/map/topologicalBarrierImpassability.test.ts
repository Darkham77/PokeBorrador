/**
 * tests/node/map/topologicalBarrierImpassability.test.ts
 *
 * TIER 1 RED TEST: TOPOLOGICAL BARRIER ENCAUZAMIENTO & ROUTE OBLIGATION
 *
 * Verifies the canonical Pokémon world design mandate:
 * 1. The world is a corridor maze: players are physically encauzado within transitableGrid.
 * 2. Every boundary cell where transitableGrid borders wilderness is sealed by impassable barriers
 *    (dense tree trunks, mountain cliffs, water, or buildings).
 * 3. Route Obligation: If Node A is connected to Node B, and Node B is connected to Node C,
 *    blocking Node B makes it 100% impossible to reach Node C from Node A.
 */

import { describe, it, expect } from 'vitest';
import { buildCanonicalRegionMap } from '../../../src/logic/map/continent/canonicalRegionPresets.ts';

describe.skip('Topological Barrier Encauzamiento & Route Obligation', () => {
  it('guarantees that blocking intermediate Node B makes Node C strictly unreachable from Node A', () => {
    const kanto = buildCanonicalRegionMap('kanto');
    const { continent, pois, routeNetwork, wilderness } = kanto;
    const W = continent.width;
    const H = continent.height;
    const transitable = continent.transitableGrid!;
    expect(transitable).toBeDefined();

    // 1. Build an impassable collision grid for the entire map
    // True = blocked (cannot walk), False = walkable
    const blockedGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

    // A) Water & deep water are impassable (unless bridge is present)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = continent.terrainMatrix[y]![x];
        const isBridge = routeNetwork.bridgeGrid[y]?.[x];
        if ((t === 'water' || t === 'water_deep') && !isBridge) {
          blockedGrid[y]![x] = true;
        }
      }
    }

    // B) Cliffs & steep mountain elevations are impassable (unless stair is present)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const elev = continent.heightmap[y]?.[x] ?? 0;
        const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
        const isFoot = continent.resolvedMountain.occupiedFootCells[y]?.[x];
        const isStair = continent.placedStairs.some(s => s.x === x && s.y === y);

        if (elev > 0 && !isStair) {
          // Plateau tops or peaks
          if (mCell?.role === 'peak_isolated' || mCell?.role.startsWith('edge_') || mCell?.role.startsWith('corner_outer_')) {
            blockedGrid[y]![x] = true;
          }
        }
        if (isFoot && !isStair) {
          blockedGrid[y]![x] = true;
        }
      }
    }

    // C) Buildings & gatehouse structures are impassable
    for (const poi of pois) {
      if (poi.urbanLayout?.buildings) {
        for (const b of poi.urbanLayout.buildings) {
          for (let dy = 0; dy < b.height; dy++) {
            for (let dx = 0; dx < b.width; dx++) {
              const by = b.y + dy;
              const bx = b.x + dx;
              if (by >= 0 && by < H && bx >= 0 && bx < W) {
                blockedGrid[by]![bx] = true;
              }
            }
          }
        }
      }
    }

    // D) Tree trunk bases are impassable
    for (const tree of wilderness.trees) {
      // Trunk base occupies bottom 2 rows (or 1 row for 1x1 props)
      const trunkRows = Math.min(2, tree.height);
      const startY = tree.y;
      for (let dy = 0; dy < trunkRows; dy++) {
        for (let dx = 0; dx < tree.width; dx++) {
          const ty = startY + dy;
          const tx = tree.x + dx;
          if (ty >= 0 && ty < H && tx >= 0 && tx < W) {
            blockedGrid[ty]![tx] = true;
          }
        }
      }
    }

    // E) Impassable wilderness props (boulders, fences, cuttable trees, bushes)
    for (const prop of wilderness.props) {
      if (prop.type === 'boulder' || prop.type === 'fence_h' || prop.type === 'bush' || prop.type === 'sapling') {
        if (prop.y >= 0 && prop.y < H && prop.x >= 0 && prop.x < W) {
          blockedGrid[prop.y]![prop.x] = true;
        }
      }
    }

    // Identify Node A (Pallet Town), Node B (Viridian City), and Node C (Pewter City)
    const pallet = pois.find(p => p.id === 'pallet')!;
    const viridian = pois.find(p => p.id === 'viridian')!;
    const pewter = pois.find(p => p.id === 'pewter')!;

    expect(pallet).toBeDefined();
    expect(viridian).toBeDefined();
    expect(pewter).toBeDefined();

    // Helper: BFS reachability check
    const canReach = (startX: number, startY: number, targetX: number, targetY: number, customBlocked: boolean[][]): boolean => {
      const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
      const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
      visited[startY]![startX] = true;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr.x === targetX && curr.y === targetY) return true;

        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = curr.x + dx!;
          const ny = curr.y + dy!;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            if (!visited[ny]![nx] && !customBlocked[ny]![nx]) {
              visited[ny]![nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
      return false;
    };

    // Center of Pallet and Pewter
    const palletCenter = { x: pallet.gridX + Math.floor(pallet.footprint.width / 2), y: pallet.gridY + Math.floor(pallet.footprint.height / 2) };
    const pewterCenter = { x: pewter.gridX + Math.floor(pewter.footprint.width / 2), y: pewter.gridY + Math.floor(pewter.footprint.height / 2) };

    // Baseline: With everything open, Pallet can reach Pewter via Viridian
    const baselineReachable = canReach(palletCenter.x, palletCenter.y, pewterCenter.x, pewterCenter.y, blockedGrid);
    expect(baselineReachable).toBe(true);

    // NOW: Completely seal Viridian City (Node B)
    const blockedWithSealedViridian = blockedGrid.map(row => [...row]);
    for (let y = viridian.gridY - 2; y <= viridian.gridY + viridian.footprint.height + 2; y++) {
      for (let x = viridian.gridX - 2; x <= viridian.gridX + viridian.footprint.width + 2; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) {
          blockedWithSealedViridian[y]![x] = true;
        }
      }
    }

    // MANDATE: With Node B sealed, CAN PALLET REACH PEWTER?
    // In canonical Pokémon, it MUST BE FALSE because you cannot walk through open wilderness around Viridian!
    const shortcutPossible = canReach(palletCenter.x, palletCenter.y, pewterCenter.x, pewterCenter.y, blockedWithSealedViridian);
    expect(shortcutPossible).toBe(false);
  });
});
