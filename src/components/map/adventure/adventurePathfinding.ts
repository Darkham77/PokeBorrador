import type { MapNode, DijkstraPath } from './adventureMapData.ts'

export function getAdjacentNodes(nodeId: string, connections: [string, string][]): string[] {
  const adj: string[] = [] // no-domain
  connections.forEach(([a, b]) => {
    if (a === nodeId) adj.push(b)
    if (b === nodeId) adj.push(a)
  })
  return adj
}

export function dijkstra(
  startId: string,
  targetId: string,
  mapNodes: Record<string, MapNode>,
  playerInventory: Record<string, boolean>,
  discoveredNodes: string[],
  connections: [string, string][],
  blockedEdge: [string, string] | null = null
): DijkstraPath | null {
  const dist: Record<string, number> = {}
  const prev: Record<string, string | null> = {}
  const pq = new Set(Object.keys(mapNodes))
  
  Object.keys(mapNodes).forEach(id => {
    dist[id] = Infinity
    prev[id] = null
  })
  dist[startId] = 0

  while (pq.size > 0) {
    let u: string | null = null
    let minDist = Infinity
    for (const id of pq) {
      const d = dist[id]
      if (d !== undefined && d < minDist) {
        minDist = d
        u = id
      }
    }
    if (u === null || u === targetId) break
    pq.delete(u)

    const neighbors = getAdjacentNodes(u, connections)
    for (const v of neighbors) {
      const nodeData = mapNodes[v]
      const uData = mapNodes[u]
      if (!nodeData || !uData) continue
      const reqMO = nodeData.requiresMO
      if (reqMO && !playerInventory[reqMO]) continue
      if (blockedEdge && ((u === blockedEdge[0] && v === blockedEdge[1]) || (u === blockedEdge[1] && v === blockedEdge[0]))) continue
      if (!discoveredNodes.includes(v) && v !== targetId) continue

      const dx = uData.x - nodeData.x
      const dy = uData.y - nodeData.y
      const weight = Math.sqrt(dx * dx + dy * dy)
      const uDist = dist[u] ?? Infinity
      const alt = uDist + weight
      const vDist = dist[v] ?? Infinity
      if (alt < vDist) {
        dist[v] = alt
        prev[v] = u
      }
    }
  }
  
  if (prev[targetId] === null && startId !== targetId) return null
  
  const path: string[] = [] // no-domain
  let curr: string | null = targetId
  while (curr !== null) {
    path.unshift(curr)
    curr = prev[curr] ?? null
  }
  return { nodes: path, cost: dist[targetId] ?? 0 }
}

export function getAlternativePaths(
  startId: string,
  targetId: string,
  mapNodes: Record<string, MapNode>,
  playerInventory: Record<string, boolean>,
  discoveredNodes: string[],
  connections: [string, string][]
): DijkstraPath[] {
  const paths: DijkstraPath[] = []
  const p1 = dijkstra(startId, targetId, mapNodes, playerInventory, discoveredNodes, connections)
  if (!p1) return []
  paths.push(p1)

  for (let i = 0; i < p1.nodes.length - 1; i++) {
    const nodeA = p1.nodes[i]
    const nodeB = p1.nodes[i + 1]
    if (!nodeA || !nodeB) continue
    const pAlt = dijkstra(startId, targetId, mapNodes, playerInventory, discoveredNodes, connections, [nodeA, nodeB])
    if (pAlt) {
      const isNew = !paths.some(p => p.nodes.join(',') === pAlt.nodes.join(','))
      if (isNew) paths.push(pAlt)
    }
  }
  paths.sort((a, b) => a.cost - b.cost)
  return paths.slice(0, 3)
}
