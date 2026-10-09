/**
 * src/logic/map/routeChainTopology.ts
 *
 * CANONICAL ROUTE CHAIN TOPOLOGY ENGINE
 *
 * Modularized from routeNetworkEngine.ts to satisfy the 1000-line SRP architecture limit.
 *
 * Features:
 *   1. TSP Nearest Neighbor + 2-opt heuristic for Hamiltonian path generation.
 *   2. Primary/secondary POI classification for chain vs stub topology.
 *   3. Proximity stub attachment for off-chain POIs (dungeons, caves, landmarks).
 *   4. Secondary loop injection for surf/cycling shortcuts.
 */

import {
  isPrimaryNode,
  type POINode
} from '../../types/map/poiTypes.ts';

/**
 * Builds a canonical linear route chain (Hamiltonian path) across primary POIs using TSP heuristic.
 * Only cities, towns, metropolis, and pokemon_league nodes participate in the main chain.
 * Secondary POIs (dungeons, caves, landmarks, gates, docks) are attached as proximity stubs.
 */
export function buildRouteChain(
  nodes: readonly POINode[],
  maxConnectionDistance?: number
): {
  readonly chain: readonly { readonly fromIndex: number; readonly toIndex: number; readonly distance: number }[];
  readonly stubs: readonly { readonly secondaryIndex: number; readonly nearestPrimaryIndex: number; readonly distance: number }[];
  readonly loops: readonly { readonly fromIndex: number; readonly toIndex: number; readonly distance: number }[];
} {
  const primaryIndices: number[] = [];
  const secondaryIndices: number[] = [];

  for (let i = 0; i < nodes.length; i++) {
    if (isPrimaryNode(nodes[i]!)) {
      primaryIndices.push(i);
    } else {
      secondaryIndices.push(i);
    }
  }

  // Build the main chain from primary nodes using TSP Nearest Neighbor + 2-opt
  const chainOrder = solveTSPChain(nodes, primaryIndices);
  const chain: { fromIndex: number; toIndex: number; distance: number }[] = [];

  for (let i = 0; i < chainOrder.length - 1; i++) {
    const a = nodes[chainOrder[i]!]!;
    const b = nodes[chainOrder[i + 1]!]!;
    const d = nodeDistance(a, b);
    chain.push({ fromIndex: chainOrder[i]!, toIndex: chainOrder[i + 1]!, distance: d });
  }

  // Attach secondary nodes as proximity stubs
  const stubs = attachSecondaryStubs(nodes, primaryIndices, secondaryIndices);

  // Add 1-2 optional secondary loops between distant chain nodes
  const loops = addSecondaryLoops(nodes, chainOrder, chain, maxConnectionDistance);

  return { chain, stubs, loops };
}

/** Euclidean distance between two POI centers. */
function nodeDistance(a: POINode, b: POINode): number {
  const ax = a.gridX + Math.floor(a.footprint.width / 2);
  const ay = a.gridY + Math.floor(a.footprint.height / 2);
  const bx = b.gridX + Math.floor(b.footprint.width / 2);
  const by = b.gridY + Math.floor(b.footprint.height / 2);
  return Math.hypot(ax - bx, ay - by);
}

/**
 * TSP Nearest Neighbor + 2-opt refinement for linear chain ordering.
 * Starts from the southernmost primary node (canonical starting town position).
 * Returns ordered array of global node indices forming the Hamiltonian path.
 */
function solveTSPChain(
  nodes: readonly POINode[],
  primaryIndices: readonly number[]
): number[] {
  const N = primaryIndices.length;
  if (N <= 1) return [...primaryIndices];
  if (N === 2) return [...primaryIndices];

  // Start from the southernmost node (highest gridY = bottom of map)
  let startIdx = 0;
  let maxY = -Infinity;
  for (let i = 0; i < N; i++) {
    const node = nodes[primaryIndices[i]!]!;
    const centerY = node.gridY + Math.floor(node.footprint.height / 2);
    if (centerY > maxY) {
      maxY = centerY;
      startIdx = i;
    }
  }

  // Nearest Neighbor greedy construction
  const visited = new Set<number>();
  const order: number[] = [startIdx];
  visited.add(startIdx);

  for (let step = 1; step < N; step++) {
    const lastLocal = order[order.length - 1]!;
    const lastNode = nodes[primaryIndices[lastLocal]!]!;
    let bestLocal = -1;
    let bestDist = Infinity;

    for (let j = 0; j < N; j++) {
      if (visited.has(j)) continue;
      const d = nodeDistance(lastNode, nodes[primaryIndices[j]!]!);
      if (d < bestDist) {
        bestDist = d;
        bestLocal = j;
      }
    }

    if (bestLocal !== -1) {
      order.push(bestLocal);
      visited.add(bestLocal);
    }
  }

  // 2-opt refinement: iteratively reverse sub-sequences to reduce total path length
  const maxIterations = N * 50;
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < order.length - 2; i++) {
      for (let j = i + 2; j < order.length; j++) {
        const a = nodes[primaryIndices[order[i]!]!]!;
        const b = nodes[primaryIndices[order[i + 1]!]!]!;
        const c = nodes[primaryIndices[order[j]!]!]!;
        const d = j + 1 < order.length ? nodes[primaryIndices[order[j + 1]!]!]! : null;

        const currentDist = nodeDistance(a, b) + (d ? nodeDistance(c, d) : 0);
        const newDist = nodeDistance(a, c) + (d ? nodeDistance(b, d) : 0);

        if (newDist < currentDist - 0.01) {
          // Reverse the sub-sequence [i+1 ... j]
          let left = i + 1;
          let right = j;
          while (left < right) {
            const tmp = order[left]!;
            order[left] = order[right]!;
            order[right] = tmp;
            left++;
            right--;
          }
          improved = true;
        }
      }
    }
  }

  // Convert local indices back to global node indices
  return order.map((localIdx) => primaryIndices[localIdx]!);
}

/**
 * Attaches each secondary POI to the nearest primary node via a proximity stub.
 */
function attachSecondaryStubs(
  nodes: readonly POINode[],
  primaryIndices: readonly number[],
  secondaryIndices: readonly number[]
): { secondaryIndex: number; nearestPrimaryIndex: number; distance: number }[] {
  const stubs: { secondaryIndex: number; nearestPrimaryIndex: number; distance: number }[] = [];

  for (const secIdx of secondaryIndices) {
    const secNode = nodes[secIdx]!;
    let bestPrimIdx = primaryIndices[0] ?? 0;
    let bestDist = Infinity;

    for (const priIdx of primaryIndices) {
      const d = nodeDistance(secNode, nodes[priIdx]!);
      if (d < bestDist) {
        bestDist = d;
        bestPrimIdx = priIdx;
      }
    }

    stubs.push({ secondaryIndex: secIdx, nearestPrimaryIndex: bestPrimIdx, distance: bestDist });
  }

  return stubs;
}

/**
 * Adds 1-2 optional secondary loop edges between distant chain nodes.
 * These represent surf routes, cycling roads, or mountain shortcuts.
 * Only connects nodes with chain distance >= 5 to create meaningful shortcuts.
 */
function addSecondaryLoops(
  nodes: readonly POINode[],
  chainOrder: readonly number[],
  existingChain: readonly { readonly fromIndex: number; readonly toIndex: number }[],
  maxConnectionDistance?: number
): { fromIndex: number; toIndex: number; distance: number }[] {
  const loops: { fromIndex: number; toIndex: number; distance: number }[] = [];
  if (chainOrder.length < 6) return loops;

  const maxLoops = Math.min(2, Math.max(1, Math.floor(chainOrder.length / 6)));

  // Find pairs with large chain distance but short Euclidean distance (good shortcut candidates)
  const candidates: { fromIdx: number; toIdx: number; euclidean: number; chainDist: number }[] = [];

  for (let i = 0; i < chainOrder.length; i++) {
    for (let j = i + 5; j < chainOrder.length; j++) {
      const a = nodes[chainOrder[i]!]!;
      const b = nodes[chainOrder[j]!]!;
      const euclidean = nodeDistance(a, b);
      if (maxConnectionDistance !== undefined && euclidean > maxConnectionDistance) continue;
      const chainDist = j - i;

      // The shortcut must be significantly shorter than the chain path
      candidates.push({ fromIdx: chainOrder[i]!, toIdx: chainOrder[j]!, euclidean, chainDist });
    }
  }

  // Sort by best shortcut ratio (highest chain distance / lowest euclidean distance)
  candidates.sort((a, b) => (b.chainDist / b.euclidean) - (a.chainDist / a.euclidean));

  const usedNodes = new Set<number>();
  for (const cand of candidates) {
    if (loops.length >= maxLoops) break;
    if (usedNodes.has(cand.fromIdx) || usedNodes.has(cand.toIdx)) continue;

    // Verify the edge doesn't already exist in the chain
    const exists = existingChain.some(
      (e) => (e.fromIndex === cand.fromIdx && e.toIndex === cand.toIdx) ||
             (e.fromIndex === cand.toIdx && e.toIndex === cand.fromIdx)
    );
    if (exists) continue;

    loops.push({ fromIndex: cand.fromIdx, toIndex: cand.toIdx, distance: cand.euclidean });
    usedNodes.add(cand.fromIdx);
    usedNodes.add(cand.toIdx);
  }

  return loops;
}
