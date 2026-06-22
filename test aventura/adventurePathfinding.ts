import type { MapNode, DijkstraPath } from './mapData'

export function getAdjacentNodes(nodeId: string, connections: string[][]): string[] {
  const adj: string[] = []
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
  connections: string[][],
  blockedEdge: string[] | null = null
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
      if (dist[id] < minDist) {
        minDist = dist[id]
        u = id
      }
    }
    if (u === null || u === targetId) break
    pq.delete(u)

    const neighbors = getAdjacentNodes(u, connections)
    for (const v of neighbors) {
      const nodeData = mapNodes[v]
      if (!nodeData) continue
      const reqMO = nodeData.requiresMO
      if (reqMO && !playerInventory[reqMO]) continue
      if (blockedEdge && ((u === blockedEdge[0] && v === blockedEdge[1]) || (u === blockedEdge[1] && v === blockedEdge[0]))) continue
      if (!discoveredNodes.includes(v) && v !== targetId) continue

      const dx = mapNodes[u].x - mapNodes[v].x
      const dy = mapNodes[u].y - mapNodes[v].y
      const weight = Math.sqrt(dx * dx + dy * dy)
      const alt = dist[u] + weight
      if (alt < dist[v]) {
        dist[v] = alt
        prev[v] = u
      }
    }
  }
  
  if (prev[targetId] === null && startId !== targetId) return null
  
  const path: string[] = []
  let curr: string | null = targetId
  while (curr !== null) {
    path.unshift(curr)
    curr = prev[curr]
  }
  return { nodes: path, cost: dist[targetId] }
}

export function getAlternativePaths(
  startId: string,
  targetId: string,
  mapNodes: Record<string, MapNode>,
  playerInventory: Record<string, boolean>,
  discoveredNodes: string[],
  connections: string[][]
): DijkstraPath[] {
  const paths: DijkstraPath[] = []
  const p1 = dijkstra(startId, targetId, mapNodes, playerInventory, discoveredNodes, connections)
  if (!p1) return []
  paths.push(p1)

  for (let i = 0; i < p1.nodes.length - 1; i++) {
    const pAlt = dijkstra(startId, targetId, mapNodes, playerInventory, discoveredNodes, connections, [p1.nodes[i], p1.nodes[i + 1]])
    if (pAlt) {
      const isNew = !paths.some(p => p.nodes.join(',') === pAlt.nodes.join(','))
      if (isNew) paths.push(pAlt)
    }
  }
  paths.sort((a, b) => a.cost - b.cost)
  return paths.slice(0, 3)
}
