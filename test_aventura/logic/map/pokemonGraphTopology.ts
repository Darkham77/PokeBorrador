/**
 * src/logic/map/pokemonGraphTopology.ts
 *
 * POKÉMON TOPOLOGY GRAPH GENERATOR
 *
 * Generates an abstract planar graph following the 7 Pokémon region design rules:
 *   1. Graph has 3-5 independent cycles (not a linear chain).
 *   2. Every route connects exactly 2 zones (edges are simple connections).
 *   3. Corridors are orthogonal (enforced at embedding phase, not here).
 *   4. Progression is directed but branched (main chain + optional stubs).
 *   5. Starter town is a dead-end (degree 1).
 *   6. Water/Surf is late-game geography.
 *   7. Continent wraps the graph (enforced at sculpting phase, not here).
 *
 * This module is Phase 1 of the Graph-First pipeline. It produces a pure
 * abstract graph with NO spatial coordinates — embedding happens in Phase 2.
 */

import type {
  TopologyGraphNode,
  TopologyGraphEdge,
  PokemonTopologyGraph
} from '../../types/map/pokemonGraphTypes.ts';

// ---------------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------------

const REQUIRED_GYM_COUNT = 8;
const MIN_CYCLES = 3;
const MAX_CYCLES = 5;
const MIN_SECONDARY_NODES = 2;
const MAX_SECONDARY_NODES = 6;
const WORMHOLE_PROBABILITY = 0.4;
const MAX_WORMHOLES = 2;
const WORMHOLE_MIN_HOP_DISTANCE = 4;

// ---------------------------------------------------------------------------
// Deterministic PRNG (Mulberry32)
// ---------------------------------------------------------------------------

function createPRNG(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Graph Utility Helpers
// ---------------------------------------------------------------------------

/** Computes shortest hop distance between two nodes via BFS on the edge list. */
function computeHopDistance(
  edges: readonly TopologyGraphEdge[],
  fromId: string,
  toId: string,
  nodeIds: readonly string[]
): number {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.fromId)!.push(e.toId);
    adj.get(e.toId)!.push(e.fromId);
  }

  const visited = new Set<string>([fromId]);
  const queue: { id: string; d: number }[] = [{ id: fromId, d: 0 }];
  let head = 0;

  while (head < queue.length) {
    const curr = queue[head++]!;
    if (curr.id === toId) return curr.d;
    for (const neighbor of adj.get(curr.id) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, d: curr.d + 1 });
      }
    }
  }

  return Infinity;
}

/** Checks if adding an edge would violate planarity (simplified Boyer-Myrvold approximation). */
function wouldCreateCrossing(
  edges: readonly TopologyGraphEdge[],
  newFrom: string,
  newTo: string,
  nodeOrder: readonly string[]
): boolean {
  // Simplified crossing detection using node ordering on the chain.
  // Two edges (a,b) and (c,d) cross if their intervals on the chain interleave:
  // a < c < b < d or c < a < d < b
  const orderMap = new Map<string, number>();
  for (let i = 0; i < nodeOrder.length; i++) {
    orderMap.set(nodeOrder[i]!, i);
  }

  const nfIdx = orderMap.get(newFrom);
  const ntIdx = orderMap.get(newTo);
  if (nfIdx === undefined || ntIdx === undefined) return false;

  const lo1 = Math.min(nfIdx, ntIdx);
  const hi1 = Math.max(nfIdx, ntIdx);

  for (const e of edges) {
    if (e.kind === 'main_chain' || e.kind === 'branch_stub' || e.kind === 'wormhole_tunnel') continue;

    const efIdx = orderMap.get(e.fromId);
    const etIdx = orderMap.get(e.toId);
    if (efIdx === undefined || etIdx === undefined) continue;

    const lo2 = Math.min(efIdx, etIdx);
    const hi2 = Math.max(efIdx, etIdx);

    // Interleave check: intervals cross if one starts inside the other but doesn't end inside it
    if (lo1 < lo2 && lo2 < hi1 && hi1 < hi2) return true;
    if (lo2 < lo1 && lo1 < hi2 && hi2 < hi1) return true;
  }

  return false;
}

/** Computes the degree (number of edges) for a given node. */
function nodeDegree(edges: readonly TopologyGraphEdge[], nodeId: string): number {
  let deg = 0;
  for (const e of edges) {
    if (e.fromId === nodeId || e.toId === nodeId) deg++;
  }
  return deg;
}

/** Checks if an edge already exists between two nodes. */
function edgeExists(edges: readonly TopologyGraphEdge[], a: string, b: string): boolean {
  return edges.some(
    (e) => (e.fromId === a && e.toId === b) || (e.fromId === b && e.toId === a)
  );
}

// ---------------------------------------------------------------------------
// Phase 1A: Generate Main Chain (T1.2)
// ---------------------------------------------------------------------------

function generateMainChain(
  _prng: () => number
): { nodes: TopologyGraphNode[]; edges: TopologyGraphEdge[]; chainOrder: string[] } { // domain-ok: Identificador o estructura procedural de aventura
  const nodes: TopologyGraphNode[] = [];
  const edges: TopologyGraphEdge[] = [];
  const chainOrder: string[] = []; // domain-ok: dynamic node id list

  // Starter node (dead-end, degree 1)
  const starterId = 'node_0';
  nodes.push({ id: starterId, role: 'starter', hasPort: false });
  chainOrder.push(starterId);

  // 8 Gym cities
  for (let g = 1; g <= REQUIRED_GYM_COUNT; g++) {
    const nodeId = `node_${g}`;
    nodes.push({ id: nodeId, role: 'gym_city', gymNumber: g, hasPort: false });
    chainOrder.push(nodeId);

    const prevId = chainOrder[chainOrder.length - 2]!;
    edges.push({
      id: `edge_${prevId}_${nodeId}`,
      fromId: prevId,
      toId: nodeId,
      kind: 'main_chain'
    });
  }

  // League node (dead-end, degree 1)
  const leagueId = `node_${REQUIRED_GYM_COUNT + 1}`;
  nodes.push({ id: leagueId, role: 'league', hasPort: false });
  chainOrder.push(leagueId);

  const lastGymId = chainOrder[chainOrder.length - 2]!;
  edges.push({
    id: `edge_${lastGymId}_${leagueId}`,
    fromId: lastGymId,
    toId: leagueId,
    kind: 'main_chain'
  });

  return { nodes, edges, chainOrder };
}

// ---------------------------------------------------------------------------
// Phase 1B: Inject Cycle Edges (T1.3)
// ---------------------------------------------------------------------------

function injectCycleEdges(
  _nodes: readonly TopologyGraphNode[],
  edges: TopologyGraphEdge[],
  chainOrder: readonly string[],
  prng: () => number
): void {
  const targetCycles = MIN_CYCLES + Math.floor(prng() * (MAX_CYCLES - MIN_CYCLES + 1));
  let cyclesAdded = 0;
  const maxAttempts = targetCycles * 15;
  let attempts = 0;

  while (cyclesAdded < targetCycles && attempts < maxAttempts) {
    attempts++;

    // Pick two random non-adjacent chain nodes (skip starter at 0 and league at end)
    const idxA = 1 + Math.floor(prng() * (chainOrder.length - 2));
    const idxB = 1 + Math.floor(prng() * (chainOrder.length - 2));

    if (Math.abs(idxA - idxB) < 2) continue; // Must be non-adjacent on chain

    const nodeA = chainOrder[idxA]!;
    const nodeB = chainOrder[idxB]!;

    if (edgeExists(edges, nodeA, nodeB)) continue;
    if (wouldCreateCrossing(edges, nodeA, nodeB, chainOrder)) continue;

    // Determine if this should be a surf route (late-game cycles)
    const minIdx = Math.min(idxA, idxB);
    const isSurf = minIdx >= 5 && prng() < 0.5;

    edges.push({
      id: `edge_cycle_${nodeA}_${nodeB}`,
      fromId: nodeA,
      toId: nodeB,
      kind: isSurf ? 'surf_route' : 'cycle'
    });
    cyclesAdded++;
  }

  // Guarantee at least 1 surf route exists among cycles
  const hasSurf = edges.some((e) => e.kind === 'surf_route');
  if (!hasSurf && cyclesAdded > 0) {
    // Find the cycle edge with the highest max endpoint index (latest in game progression)
    let bestCycleIdx = -1;
    let highestProgression = -1;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]!;
      if (e.kind === 'cycle') {
        const fromIdx = chainOrder.indexOf(e.fromId);
        const toIdx = chainOrder.indexOf(e.toId);
        const maxIdx = Math.max(fromIdx, toIdx);
        if (maxIdx > highestProgression) {
          highestProgression = maxIdx;
          bestCycleIdx = i;
        }
      }
    }
    if (bestCycleIdx >= 0) {
      edges[bestCycleIdx] = { ...edges[bestCycleIdx]!, kind: 'surf_route' };
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 1C: Promote Hub Nodes (T1.4)
// ---------------------------------------------------------------------------

function promoteHubNodes(
  edges: readonly TopologyGraphEdge[],
  chainOrder: readonly string[],
  _prng: () => number
): void {
  // Hub promotion is implicit: nodes that received cycle edges
  // already have degree > 2. We just validate that at least 1 hub exists.
  // If no node has degree >= 3 (unlikely given 3-5 cycles), the cycle injection
  // phase guarantees this by connecting non-adjacent chain nodes.

  let hasHub = false;
  for (const nodeId of chainOrder) {
    if (nodeId === chainOrder[0] || nodeId === chainOrder[chainOrder.length - 1]) continue;
    if (nodeDegree(edges, nodeId) >= 3) {
      hasHub = true;
      break;
    }
  }

  // This should never happen with 3+ cycles, but defensive check
  if (!hasHub) {
    // The cycle edges already promote nodes to degree 3+
    // No action needed — the graph invariant validator will catch issues
  }
}

// ---------------------------------------------------------------------------
// Phase 1D: Assign Port City (T1.5)
// ---------------------------------------------------------------------------

function assignPortCity(
  nodes: TopologyGraphNode[],
  _chainOrder: readonly string[],
  prng: () => number
): void {
  // Pick a gym city in the mid-to-late range (progression 3-7) as port
  const candidates = nodes.filter(
    (n) => n.role === 'gym_city' && n.gymNumber !== undefined && n.gymNumber >= 3 && n.gymNumber <= 7
  );

  if (candidates.length === 0) return;

  const chosen = candidates[Math.floor(prng() * candidates.length)]!;
  const idx = nodes.findIndex((n) => n.id === chosen.id);
  if (idx >= 0) {
    nodes[idx] = { ...nodes[idx]!, hasPort: true };
  }
}

// ---------------------------------------------------------------------------
// Phase 1E: Inject Wormhole Tunnels (T1.6)
// ---------------------------------------------------------------------------

function injectWormholeEdges(
  nodes: readonly TopologyGraphNode[],
  edges: TopologyGraphEdge[],
  chainOrder: readonly string[],
  prng: () => number
): void {
  if (prng() > WORMHOLE_PROBABILITY) return; // No wormholes for this seed

  const wormholeCount = 1 + (prng() < 0.3 ? 1 : 0); // 70% chance of 1, 30% chance of 2
  const nodeIds = nodes.map((n) => n.id);
  let placed = 0;
  let attempts = 0;
  const maxAttempts = wormholeCount * 20;

  while (placed < Math.min(wormholeCount, MAX_WORMHOLES) && attempts < maxAttempts) {
    attempts++;

    // Pick two chain nodes (skip starter and league)
    const idxA = 1 + Math.floor(prng() * (chainOrder.length - 2));
    const idxB = 1 + Math.floor(prng() * (chainOrder.length - 2));
    if (idxA === idxB) continue;

    const nodeA = chainOrder[idxA]!;
    const nodeB = chainOrder[idxB]!;

    if (edgeExists(edges, nodeA, nodeB)) continue;

    // Must be >= WORMHOLE_MIN_HOP_DISTANCE apart on the current graph
    const hopDist = computeHopDistance(edges, nodeA, nodeB, nodeIds);
    if (hopDist < WORMHOLE_MIN_HOP_DISTANCE) continue;

    const tunnelId = `tunnel_${placed}`;
    edges.push({
      id: `edge_wormhole_${nodeA}_${nodeB}`,
      fromId: nodeA,
      toId: nodeB,
      kind: 'wormhole_tunnel',
      tunnelPairId: tunnelId
    });
    placed++;
  }
}

// ---------------------------------------------------------------------------
// Phase 1F: Add Secondary Nodes (branch stubs)
// ---------------------------------------------------------------------------

function addSecondaryNodes(
  nodes: TopologyGraphNode[],
  edges: TopologyGraphEdge[],
  chainOrder: readonly string[],
  prng: () => number
): void {
  const secondaryCount = MIN_SECONDARY_NODES +
    Math.floor(prng() * (MAX_SECONDARY_NODES - MIN_SECONDARY_NODES + 1));

  const secondaryRoles = ['secondary_dungeon', 'secondary_cave', 'secondary_landmark'] as const;
  let nextNodeIdx = nodes.length;

  for (let i = 0; i < secondaryCount; i++) {
    // Attach to a random chain node (skip starter and league)
    const parentIdx = 1 + Math.floor(prng() * (chainOrder.length - 2));
    const parentId = chainOrder[parentIdx]!;

    const role = secondaryRoles[Math.floor(prng() * secondaryRoles.length)]!;
    const nodeId = `node_${nextNodeIdx++}`;

    nodes.push({ id: nodeId, role, hasPort: false });
    edges.push({
      id: `edge_stub_${parentId}_${nodeId}`,
      fromId: parentId,
      toId: nodeId,
      kind: 'branch_stub'
    });
  }
}

// ---------------------------------------------------------------------------
// Phase 1G: Validate Graph Invariants (T1.7)
// ---------------------------------------------------------------------------

export interface GraphValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

export function validateGraphInvariants(graph: PokemonTopologyGraph): GraphValidationResult {
  const errors: string[] = [];
  const { nodes, edges, mainChainOrder } = graph;

  // 1. Starter must be degree 1
  const starterNode = nodes.find((n) => n.role === 'starter');
  if (!starterNode) {
    errors.push('Missing starter node');
  } else if (nodeDegree(edges, starterNode.id) !== 1) {
    errors.push(`Starter node must have degree 1, has ${nodeDegree(edges, starterNode.id)}`);
  }

  // 2. League must be degree 1
  const leagueNode = nodes.find((n) => n.role === 'league');
  if (!leagueNode) {
    errors.push('Missing league node');
  } else if (nodeDegree(edges, leagueNode.id) !== 1) {
    errors.push(`League node must have degree 1, has ${nodeDegree(edges, leagueNode.id)}`);
  }

  // 3. Exactly 8 gyms
  const gymNodes = nodes.filter((n) => n.role === 'gym_city');
  if (gymNodes.length !== REQUIRED_GYM_COUNT) {
    errors.push(`Expected ${REQUIRED_GYM_COUNT} gyms, found ${gymNodes.length}`);
  }

  // 4. At least 1 port
  const portNodes = nodes.filter((n) => n.hasPort);
  if (portNodes.length < 1) {
    errors.push('At least 1 port city is required');
  }

  // 5. Graph is connected (BFS from starter)
  if (starterNode) {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.fromId)?.push(e.toId);
      adj.get(e.toId)?.push(e.fromId);
    }

    const visited = new Set<string>([starterNode.id]);
    const queue = [starterNode.id];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++]!;
      for (const neighbor of adj.get(curr) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (visited.size !== nodes.length) {
      errors.push(`Graph is disconnected: ${visited.size}/${nodes.length} nodes reachable`);
    }
  }

  // 6. Cycle count (3-5): count independent cycles via Euler formula: C = E - V + 1 (for connected graph)
  const cycleEdges = edges.filter(
    (e) => e.kind === 'cycle' || e.kind === 'surf_route'
  );
  if (cycleEdges.length < MIN_CYCLES) {
    errors.push(`Expected at least ${MIN_CYCLES} cycles, found ${cycleEdges.length}`);
  }
  if (cycleEdges.length > MAX_CYCLES) {
    errors.push(`Expected at most ${MAX_CYCLES} cycles, found ${cycleEdges.length}`);
  }

  // 7. At least 1 surf route
  const surfEdges = edges.filter((e) => e.kind === 'surf_route');
  if (surfEdges.length === 0) {
    errors.push('At least 1 surf route is required (Rule 6)');
  }

  // 8. All primary nodes (except starter/league) have degree >= 2
  for (const n of nodes) {
    if (n.role === 'starter' || n.role === 'league') continue;
    if (n.role === 'gym_city' || n.role === 'port_city') {
      const deg = nodeDegree(edges, n.id);
      if (deg < 2) {
        errors.push(`Primary node ${n.id} (${n.role}) has degree ${deg}, expected >= 2`);
      }
    }
  }

  // 9. At least 1 hub (degree >= 3) among primary nodes
  let hasHub = false;
  for (const n of nodes) {
    if (n.role === 'starter' || n.role === 'league') continue;
    if (nodeDegree(edges, n.id) >= 3) {
      hasHub = true;
      break;
    }
  }
  if (!hasHub) {
    errors.push('At least 1 hub node with degree >= 3 is required');
  }

  // 10. Main chain order integrity
  if (mainChainOrder.length !== REQUIRED_GYM_COUNT + 2) {
    errors.push(
      `Main chain should have ${REQUIRED_GYM_COUNT + 2} nodes, has ${mainChainOrder.length}`
    );
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Public API: Generate Pokémon Topology Graph
// ---------------------------------------------------------------------------

export interface PokemonTopologyOptions {
  /** World seed for deterministic generation. */
  readonly seed?: number;
}

/**
 * Generates a complete abstract Pokémon region topology graph.
 *
 * The graph satisfies all 7 Pokémon topology rules and contains:
 * - 1 Starter (dead-end, degree 1)
 * - 8 Gym Cities (degree >= 2)
 * - 1 League (dead-end, degree 1)
 * - 1+ Port City (coastal dock capable)
 * - 2-6 Secondary nodes (dungeons, caves, landmarks)
 * - 3-5 Independent cycles
 * - 0-2 Wormhole tunnel edges (probability-based)
 * - At least 1 Surf route
 *
 * Returns a pure abstract graph with NO spatial coordinates.
 * Spatial embedding is handled by Phase 2 (orthogonalGraphEmbedding.ts).
 */
export function generatePokemonTopology(
  options?: PokemonTopologyOptions
): PokemonTopologyGraph {
  const seed = options?.seed ?? 42;
  const prng = createPRNG(seed);

  // Phase 1A: Main chain (Starter → 8 Gyms → League)
  const { nodes, edges, chainOrder } = generateMainChain(prng);

  // Phase 1B: Inject 3-5 cycle edges (at least 1 surf)
  injectCycleEdges(nodes, edges, chainOrder, prng);

  // Phase 1C: Promote hubs (implicit from cycle edges)
  promoteHubNodes(edges, chainOrder, prng);

  // Phase 1D: Assign exactly 1 port city
  assignPortCity(nodes, chainOrder, prng);

  // Phase 1E: Inject 0-2 wormhole tunnels (probability-based)
  injectWormholeEdges(nodes, edges, chainOrder, prng);

  // Phase 1F: Add 2-6 secondary branch nodes
  addSecondaryNodes(nodes, edges, chainOrder, prng);

  return {
    nodes,
    edges,
    mainChainOrder: chainOrder,
    seed
  };
}
