import type { MapNode, DijkstraPath } from './mapData.ts';

export function getAdjacentNodes(
  nodeId: string,
  connections: readonly (readonly [string, string])[] | string[][]
): string[] {
  const adj: string[] = []; // domain-ok: Dynamic graph path node identifiers
  connections.forEach(([a, b]) => {
    if (!a || !b) return;
    if (a === nodeId) adj.push(b);
    if (b === nodeId) adj.push(a);
  });
  return adj;
}

export function dijkstra(
  startId: string,
  targetId: string,
  mapNodes: Record<string, MapNode>, // open-record: Node graph adjacency map keyed by node id
  playerInventory: Record<string, boolean>, // open-record: Adventure inventory items and HMs state
  discoveredNodes: string[],
  connections: readonly (readonly [string, string])[] | string[][],
  blockedEdge: string[] | null = null
): DijkstraPath | null {
  const dist: Record<string, number> = {}; // open-record: Node distance lookup table
  const prev: Record<string, string | null> = {}; // open-record: Preceding node path lookup table
  const pq = new Set(Object.keys(mapNodes));

  Object.keys(mapNodes).forEach((id) => {
    dist[id] = Infinity;
    prev[id] = null;
  });
  dist[startId] = 0;

  while (pq.size > 0) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const id of pq) {
      const d = dist[id] ?? Infinity;
      if (d < minDist) {
        minDist = d;
        u = id;
      }
    }
    if (u === null || u === targetId) break;
    pq.delete(u);

    const neighbors = getAdjacentNodes(u, connections);
    for (const v of neighbors) {
      const nodeData = mapNodes[v];
      const nodeU = mapNodes[u];
      if (!nodeData || !nodeU) continue;
      const reqMO = nodeData.requiresMO;
      if (reqMO && !playerInventory[reqMO]) continue;
      if (
        blockedEdge &&
        ((u === blockedEdge[0] && v === blockedEdge[1]) ||
          (u === blockedEdge[1] && v === blockedEdge[0]))
      )
        continue;
      if (!discoveredNodes.includes(v) && v !== targetId) continue;

      const dx = nodeU.x - nodeData.x;
      const dy = nodeU.y - nodeData.y;
      const weight = Math.sqrt(dx * dx + dy * dy);
      const distU = dist[u] ?? Infinity;
      const alt = distU + weight;
      if (alt < (dist[v] ?? Infinity)) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  if (prev[targetId] === null && startId !== targetId) return null;

  const path: string[] = []; // domain-ok: Dynamic graph path node identifiers
  let curr: string | null = targetId;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr] ?? null;
  }
  return { nodes: path, cost: dist[targetId] ?? 0 };
}

export function getAlternativePaths(
  startId: string,
  targetId: string,
  mapNodes: Record<string, MapNode>, // open-record: Node graph adjacency map keyed by node id
  playerInventory: Record<string, boolean>, // open-record: Adventure inventory items and HMs state
  discoveredNodes: string[],
  connections: readonly (readonly [string, string])[] | string[][]
): DijkstraPath[] {
  const paths: DijkstraPath[] = [];
  const p1 = dijkstra(startId, targetId, mapNodes, playerInventory, discoveredNodes, connections);
  if (!p1) return [];
  paths.push(p1);

  for (let i = 0; i < p1.nodes.length - 1; i++) {
    const nodeA = p1.nodes[i];
    const nodeB = p1.nodes[i + 1];
    if (!nodeA || !nodeB) continue;
    const pAlt = dijkstra(
      startId,
      targetId,
      mapNodes,
      playerInventory,
      discoveredNodes,
      connections,
      [nodeA, nodeB]
    );
    if (pAlt) {
      const isNew = !paths.some((p) => p.nodes.join(',') === pAlt.nodes.join(','));
      if (isNew) paths.push(pAlt);
    }
  }
  paths.sort((a, b) => a.cost - b.cost);
  return paths.slice(0, 3);
}
