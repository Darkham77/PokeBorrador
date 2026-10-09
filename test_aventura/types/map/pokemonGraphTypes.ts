/**
 * src/types/map/pokemonGraphTypes.ts
 *
 * DOMAIN CONTRACTS FOR POKÉMON TOPOLOGY GRAPH GENERATION
 *
 * Strict Domain-Type-First governance:
 *   - All union types derived from canonical `as const` tuples.
 *   - Graph nodes, edges, barriers, and topology result contracts.
 *   - Zero-any, zero-unknown, zero runtime fallbacks.
 */

// ---------------------------------------------------------------------------
// 1. Node Roles
// ---------------------------------------------------------------------------

/** Roles that a node can play in the abstract topology graph. */
export const GRAPH_NODE_ROLES = [
  'starter',
  'gym_city',
  'league',
  'secondary_dungeon',
  'secondary_cave',
  'secondary_landmark',
  'port_city',
  'route_gate'
] as const;
export type GraphNodeRole = (typeof GRAPH_NODE_ROLES)[number];

/** Node roles that participate in the main progression chain. */
export const PRIMARY_GRAPH_ROLES = [
  'starter',
  'gym_city',
  'league',
  'port_city'
] as const satisfies readonly GraphNodeRole[];
export type PrimaryGraphRole = (typeof PRIMARY_GRAPH_ROLES)[number];

const PRIMARY_ROLE_SET: ReadonlySet<string> = new Set(PRIMARY_GRAPH_ROLES);

/** Returns true if the role participates in the main route chain. */
export function isPrimaryGraphRole(role: GraphNodeRole): role is PrimaryGraphRole {
  return PRIMARY_ROLE_SET.has(role);
}

// ---------------------------------------------------------------------------
// 2. Edge Classification
// ---------------------------------------------------------------------------

/** How a graph edge connects two nodes. */
export const GRAPH_EDGE_KINDS = [
  'main_chain',
  'cycle',
  'branch_stub',
  'wormhole_tunnel',
  'surf_route'
] as const;
export type GraphEdgeKind = (typeof GRAPH_EDGE_KINDS)[number];

// ---------------------------------------------------------------------------
// 3. Progression Barriers
// ---------------------------------------------------------------------------

/** HM/ability barriers that gate progression along edges. */
export const BARRIER_TYPES = [
  'barrier_cut',
  'barrier_surf',
  'barrier_strength',
  'barrier_flash'
] as const;
export type BarrierType = (typeof BARRIER_TYPES)[number];

// ---------------------------------------------------------------------------
// 4. Graph Node Contract
// ---------------------------------------------------------------------------

export interface TopologyGraphNode {
  /** Unique deterministic identifier (e.g. "node_0", "node_5"). */
  readonly id: string; // domain-ok: dynamic graph node identifier
  /** Role in the abstract topology. */
  readonly role: GraphNodeRole;
  /** Which gym number this node hosts (1-8), or undefined if not a gym city. */
  readonly gymNumber?: number;
  /** Whether this node has a coastal port dock. */
  readonly hasPort: boolean;
  /** Progression order assigned during barrier placement (1 = first visited). */
  progressionOrder?: number;
}

// ---------------------------------------------------------------------------
// 5. Graph Edge Contract
// ---------------------------------------------------------------------------

export interface TopologyGraphEdge {
  /** Unique deterministic identifier (e.g. "edge_0_1"). */
  readonly id: string; // domain-ok: dynamic graph edge identifier
  /** Source node id. */
  readonly fromId: string; // domain-ok: Identificador o estructura procedural de aventura
  /** Destination node id. */
  readonly toId: string; // domain-ok: Identificador o estructura procedural de aventura
  /** Classification of this edge in the topology. */
  readonly kind: GraphEdgeKind;
  /** Barrier gating this edge, if any. */
  barrier?: BarrierType;
  /** For wormhole tunnels: shared pair identifier linking two cave entrances. */
  readonly tunnelPairId?: string; // domain-ok: Identificador o estructura procedural de aventura
}

// ---------------------------------------------------------------------------
// 6. Topology Result Contract
// ---------------------------------------------------------------------------

export interface PokemonTopologyGraph {
  /** All nodes in the abstract graph. */
  readonly nodes: readonly TopologyGraphNode[];
  /** All edges (undirected, each listed once). */
  readonly edges: readonly TopologyGraphEdge[];
  /** Ordered list of node IDs forming the main progression chain (Starter → League). */
  readonly mainChainOrder: readonly string[]; // domain-ok: Identificador o estructura procedural de aventura
  /** The seed used to generate this topology. */
  readonly seed: number;
}

// ---------------------------------------------------------------------------
// 7. Spatial Embedding Result Contracts
// ---------------------------------------------------------------------------

export interface EmbeddedTopologyNode extends TopologyGraphNode {
  /** Top-left X coordinate on the world grid. */
  readonly gridX: number;
  /** Top-left Y coordinate on the world grid. */
  readonly gridY: number;
  /** Footprint width in tiles. */
  readonly width: number;
  /** Footprint height in tiles. */
  readonly height: number;
  /** Center X coordinate on the world grid. */
  readonly centerX: number;
  /** Center Y coordinate on the world grid. */
  readonly centerY: number;
  /** Band column index in the orthogonal grid. */
  readonly bandCol: number;
  /** Band row index in the orthogonal grid. */
  readonly bandRow: number;
}

export interface EmbeddedCorridorWaypoint {
  readonly x: number;
  readonly y: number;
}

export interface EmbeddedCorridor {
  readonly id: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly fromId: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly toId: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly kind: GraphEdgeKind;
  readonly barrier?: BarrierType;
  /** Orthogonal waypoints from source center to target center (pure H, V, or single right-angle L-turn). */
  readonly waypoints: readonly EmbeddedCorridorWaypoint[];
  /** Continuous tiles occupied by the corridor center line. */
  readonly pathCells: readonly EmbeddedCorridorWaypoint[];
  /** For wormholes: tunnel identifier (has empty waypoints / pathCells on surface). */
  readonly tunnelPairId?: string; // domain-ok: Identificador o estructura procedural de aventura
}

export interface EmbeddedTopologyGraph {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly EmbeddedTopologyNode[];
  readonly corridors: readonly EmbeddedCorridor[];
  readonly mainChainOrder: readonly string[]; // domain-ok: Identificador o estructura procedural de aventura
  readonly gridCols: number;
  readonly gridRows: number;
  readonly seed: number;
}

// ---------------------------------------------------------------------------
// 8. Emergent Corridor Properties Contracts
// ---------------------------------------------------------------------------

export const TERRAIN_INFLUENCES = ['plains', 'mountain', 'coastal', 'forest'] as const;
export type TerrainInfluence = (typeof TERRAIN_INFLUENCES)[number];

export interface EnrichedCorridorProperties {
  readonly corridorId: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly fromId: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly toId: string; // domain-ok: Identificador o estructura procedural de aventura
  /** Playable corridor width in tiles (emergent 3 to 10 tiles). */
  readonly width: number;
  /** Normalized difficulty metric (0.0 = tutorial to 1.0 = pre-league climax). */
  readonly difficulty: number;
  /** Primary biome terrain influencing this corridor. */
  readonly terrainInfluence: TerrainInfluence;
  /** Density of tall grass encounter patches (0.0 to 1.0). */
  readonly tallGrassDensity: number;
  /** Whether one-way directional jumpable ledges are present. */
  readonly hasOneWayLedges: boolean;
  /** Whether this corridor runs adjacent to ocean or lake water for fishing. */
  readonly waterSideAccess: boolean;
  /** Whether this corridor is an optional shortcut cycle rather than main progression. */
  readonly isShortcutLoop: boolean;
  /** Gatehouse checkpoint coordinates placed at corridor gateways. */
  readonly gatehouses: readonly { readonly x: number; readonly y: number }[];
}


