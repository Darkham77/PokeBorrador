export interface Connection {
  target: AdventureNodeId;
  mo?: string; // Requisito opcional de MO
}

/** 2D layout positions for each node in the Kanto map diagram (0-100 scale) */
export interface NodePosition {
  x: number;
  y: number;
  label: string;
}

export const KANTO_NODE_POSITIONS = {
  route1:           { x: 22, y: 52, label: 'Ruta 1' },
  route2:           { x: 22, y: 38, label: 'Ruta 2' },
  forest:           { x: 14, y: 28, label: 'Bosque' },
  route3:           { x: 35, y: 30, label: 'Ruta 3' },
  mt_moon:          { x: 42, y: 22, label: 'Mt.Moon' },
  route4:           { x: 52, y: 26, label: 'Ruta 4' },
  route24:          { x: 56, y: 12, label: 'Ruta 24' },
  route25:          { x: 66, y: 10, label: 'Ruta 25' },
  route5:           { x: 52, y: 38, label: 'Ruta 5' },
  route6:           { x: 52, y: 52, label: 'Ruta 6' },
  route7:           { x: 42, y: 44, label: 'Ruta 7' },
  route8:           { x: 64, y: 38, label: 'Ruta 8' },
  route9:           { x: 64, y: 26, label: 'Ruta 9' },
  route10:          { x: 72, y: 34, label: 'Ruta 10' },
  rock_tunnel:      { x: 76, y: 26, label: 'Túnel Roca' },
  power_plant:      { x: 82, y: 30, label: 'C.Energía' },
  pokemon_tower:    { x: 78, y: 42, label: 'Torre Pokémon' },
  route11:          { x: 52, y: 60, label: 'Ruta 11' },
  route12:          { x: 72, y: 52, label: 'Ruta 12' },
  route13:          { x: 64, y: 64, label: 'Ruta 13' },
  diglett_cave:     { x: 36, y: 48, label: 'C.Diglett' },
  route16:          { x: 30, y: 44, label: 'Ruta 16' },
  route17:          { x: 28, y: 58, label: 'Ruta 17' },
  route18:          { x: 36, y: 68, label: 'Ruta 18' },
  safari_zone:      { x: 44, y: 74, label: 'Zona Safari' },
  route19:          { x: 36, y: 78, label: 'Ruta 19' },
  seafoam_islands:  { x: 28, y: 84, label: 'Islas Espuma' },
  route20:          { x: 20, y: 84, label: 'Ruta 20' },
  mansion:          { x: 14, y: 78, label: 'Mansión' },
  route21:          { x: 16, y: 68, label: 'Ruta 21' },
  route22:          { x: 12, y: 50, label: 'Ruta 22' },
  route23:          { x: 8,  y: 40, label: 'Ruta 23' },
  victory_road:     { x: 6,  y: 30, label: 'Vía Victoria' },
  cerulean_cave:    { x: 60, y: 20, label: 'Cueva Celeste' },
} as const satisfies Record<string, NodePosition>

export type AdventureNodeId = keyof typeof KANTO_NODE_POSITIONS

export function isAdventureNodeId(value: string): value is AdventureNodeId {
  return value in KANTO_NODE_POSITIONS
}

export function requireAdventureNodeId(value: string): AdventureNodeId {
  if (isAdventureNodeId(value)) return value
  throw new Error(`[kantoGraph] Invalid adventure node id: ${value}`)
}

export const ADVENTURE_NODE_IDS = Object.keys(KANTO_NODE_POSITIONS).filter(isAdventureNodeId)

export interface GraphEdge {
  from: AdventureNodeId;
  to: AdventureNodeId;
  mo?: string;
}

/** Returns deduplicated list of edges (A→B only, not B→A duplicated) */
export function getGraphEdges(): GraphEdge[] {
  const seen = new Set<string>()
  const edges: GraphEdge[] = []

  for (const nodeId of ADVENTURE_NODE_IDS) {
    const connections = KANTO_CONNECTIONS[nodeId]
    for (const conn of connections) {
      const key = [nodeId, conn.target].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        edges.push({ from: nodeId, to: conn.target, mo: conn.mo })
      }
    }
  }

  return edges
}

export const KANTO_CONNECTIONS: Record<AdventureNodeId, Connection[]> = {
  route1: [
    { target: 'route2' },      // Conexión por Ciudad Verde
    { target: 'route22' },     // Conexión por Ciudad Verde
    { target: 'route21' }      // Conexión por Pueblo Paleta (necesita surf para ir al sur, pero para ir de route1 a route21 es el nexo de Pueblo Paleta)
  ],
  route2: [
    { target: 'route1' },
    { target: 'forest' },
    { target: 'route3' },      // Conexión por Ciudad Verde/Plateada
    { target: 'diglett_cave', mo: 'cut' } // La salida sur de la cueva está bloqueada por arbustos desde el norte
  ],
  forest: [
    { target: 'route2' }
  ],
  route22: [
    { target: 'route1' },
    { target: 'route23' }
  ],
  route23: [
    { target: 'route22' },
    { target: 'victory_road', mo: 'strength' } // La entrada a la Vía Victoria requiere Fuerza
  ],
  victory_road: [
    { target: 'route23', mo: 'strength' }
  ],
  route3: [
    { target: 'route2' },
    { target: 'mt_moon' }
  ],
  mt_moon: [
    { target: 'route3' },
    { target: 'route4' }
  ],
  route4: [
    { target: 'mt_moon' },
    { target: 'route24' },     // Por Ciudad Celeste
    { target: 'route5' },      // Por Ciudad Celeste
    { target: 'route9', mo: 'cut' },      // Entrada a Ruta 9 bloqueada por arbusto de Corte
    { target: 'cerulean_cave', mo: 'rock_smash' } // Entrada a Cueva Celeste bloqueada por roca rota
  ],
  route24: [
    { target: 'route4' },
    { target: 'route25' }
  ],
  route25: [
    { target: 'route24' }
  ],
  route5: [
    { target: 'route4' },
    { target: 'route6' },      // Conecta con Ruta 6 por Azafrán/Vía Subterránea
    { target: 'route7' },      // Por Ciudad Azafrán
    { target: 'route8' }       // Por Ciudad Azafrán
  ],
  route6: [
    { target: 'route5' },
    { target: 'route11' },     // Por Ciudad Carmín
    { target: 'diglett_cave' } // Por Ciudad Carmín
  ],
  route11: [
    { target: 'route6' },
    { target: 'route12' }
  ],
  diglett_cave: [
    { target: 'route2', mo: 'cut' }, // Salida norte requiere Corte para entrar a Ruta 2 principal
    { target: 'route6' }
  ],
  route9: [
    { target: 'route4', mo: 'cut' },
    { target: 'route10' },
    { target: 'rock_tunnel', mo: 'flash' } // Requiere Flash para entrar al Túnel Roca oscuro
  ],
  rock_tunnel: [
    { target: 'route9', mo: 'flash' },
    { target: 'route10', mo: 'flash' }
  ],
  route10: [
    { target: 'route9' },
    { target: 'rock_tunnel', mo: 'flash' },
    { target: 'power_plant', mo: 'surf' }, // Requiere Surf en el agua de la Ruta 10
    { target: 'route12' },     // Por Pueblo Lavanda
    { target: 'pokemon_tower' }, // Por Pueblo Lavanda
    { target: 'route8' }       // Por Pueblo Lavanda
  ],
  power_plant: [
    { target: 'route10', mo: 'surf' }
  ],
  pokemon_tower: [
    { target: 'route10' }
  ],
  route8: [
    { target: 'route10' },
    { target: 'route5' }       // Por Ciudad Azafrán
  ],
  route7: [
    { target: 'route5' },
    { target: 'route16' }      // Por Ciudad Azulona
  ],
  route16: [
    { target: 'route7' },
    { target: 'route17' }      // Requiere Bicicleta normalmente, pero aquí lo manejamos en el flujo general
  ],
  route17: [
    { target: 'route16' },
    { target: 'route18' }
  ],
  route18: [
    { target: 'route17' },
    { target: 'safari_zone' }, // Por Ciudad Fucsia
    { target: 'route19' },     // Por Ciudad Fucsia
    { target: 'route13' }      // Por Ciudad Fucsia
  ],
  route13: [
    { target: 'route18' },
    { target: 'route12' }
  ],
  route12: [
    { target: 'route10' },     // Por Pueblo Lavanda
    { target: 'route11' },     // Intersección Ruta 11/12
    { target: 'route13' }
  ],
  safari_zone: [
    { target: 'route18' }
  ],
  route19: [
    { target: 'route18' },
    { target: 'seafoam_islands', mo: 'surf' } // Requiere Surf obligatoriamente
  ],
  seafoam_islands: [
    { target: 'route19', mo: 'surf' },
    { target: 'route20', mo: 'surf,strength' } // Requiere Surf y Fuerza para atravesar la corriente de las islas hacia la Ruta 20
  ],
  route20: [
    { target: 'seafoam_islands', mo: 'surf,strength' },
    { target: 'mansion' },     // Conexión por Isla Canela
    { target: 'route21', mo: 'surf' } // Conexión por Isla Canela
  ],
  mansion: [
    { target: 'route20' }
  ],
  route21: [
    { target: 'route20', mo: 'surf' },
    { target: 'route1', mo: 'surf' } // Agua entre Isla Canela y Pueblo Paleta
  ],
  cerulean_cave: [
    { target: 'route4', mo: 'rock_smash' }
  ]
};

/**
 * Encuentra el camino más corto entre dos mapas usando BFS.
 * Filtra las conexiones que requieren MO si no están activas.
 * Admite múltiples requisitos de MO separados por comas.
 */
export function findShortestPath(
  origin: AdventureNodeId,
  destination: AdventureNodeId,
  activeHMs: Set<string>,
  blockedEdges?: Set<string>
): AdventureNodeId[] | null {
  if (origin === destination) return [origin];
  if (!KANTO_CONNECTIONS[origin] || !KANTO_CONNECTIONS[destination]) return null;

  const queue: AdventureNodeId[][] = [[origin]];
  const visited = new Set<AdventureNodeId>([origin]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1]!;

    if (current === destination) {
      return path;
    }

    const connections = KANTO_CONNECTIONS[current] || [];
    for (const conn of connections) {
      if (visited.has(conn.target)) continue;

      // Verificar si la conexión está bloqueada dinámicamente
      const edgeKey = [current, conn.target].sort().join('|');
      if (blockedEdges && blockedEdges.has(edgeKey)) {
        continue;
      }

      // Verificar requisito de MO (soporta múltiples MOs separadas por comas)
      if (conn.mo) {
        const requirements = conn.mo.split(',');
        const hasAll = requirements.every(req => activeHMs.has(req));
        if (!hasAll) {
          continue; // No transitable sin las MOs necesarias
        }
      }

      visited.add(conn.target);
      queue.push([...path, conn.target]);
    }
  }

  return null; // No hay ruta transitable
}
