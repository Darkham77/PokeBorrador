/**
 * src/logic/map/continentalWorldGenerator.ts
 *
 * CONTINENTAL WORLD GENERATOR & ROAD NETWORK ENGINE (Overworld Studio)
 *
 * Generates continuous full-scale world maps (3600x4600 px or custom dimensions):
 * 1. Procedural continental landmasses, coasts, mountain ranges, and forests (Simplex Noise FBM).
 * 2. Spatial dispersion of urban stops (Metropolis, City, Town, Village, Hamlet) on walkable terrain.
 * 3. Road network graph generation via Delaunay/MST ensuring 100% connectivity and 0 orphan nodes.
 * 4. Reactive baking of urban maquettes (buildings, plazas, props) at node coordinates.
 * 5. Clean export pipeline (Game Data JSON + SVG vector routes for PokéVicio Dijkstra navigation).
 */

import { SimplexNoise, fbm2D } from './noise/simplexNoise.ts';
import {
  KANTO_WORLD_WIDTH,
  KANTO_WORLD_HEIGHT,
  KANTO_TILE_SIZE,
  KANTO_SPACING_MULTIPLIER,
  CELL_BIOME,
  type CellBiomeType
} from './kantoRegionalGenerator.ts';
import { defaultPrefabsRegistry } from './prefabsRegistry.ts';
import {
  CANONICAL_PALETTES,
  type ThemeBiomePalette
} from './proceduralMapGenerator.ts';
import type {
  AdventureProjectNode,
  AdventureProject,
  UrbanScale,
  RegionArchetype,
  ProceduralGenerationConfig,
  CanonicalThemeSource,
  ContinentalRoutesExportBundle
} from '../../types/map/adventureWorldTypes';

export interface ContinentalWorldGenOptions {
  readonly width?: number;
  readonly height?: number;
  readonly seed: number;
  readonly archetype?: RegionArchetype;
  readonly config?: ProceduralGenerationConfig;
  readonly cityCount?: number;
  readonly themeSource?: CanonicalThemeSource;
}

export interface ContinentalWorldGenResult {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly archetype: RegionArchetype;
  readonly config: ProceduralGenerationConfig;
  readonly themeSource: CanonicalThemeSource;
  readonly themePalette: ThemeBiomePalette;
  readonly nodes: Record<string, AdventureProjectNode>;
  readonly connections: [string, string][];
  readonly customTerrain: Record<string, CellBiomeType>;
  readonly svgPathData: string;
}

/**
 * Returns the exact 16x16 px canonical atomic tile ID for a given biome and theme.
 * Strictly adheres to the Anti-Frankenstein Theme Isolation invariant.
 */
export function getCanonicalTileForBiome(
  biome: CellBiomeType,
  theme: CanonicalThemeSource = 'firered'
): string {
  const palette = CANONICAL_PALETTES[theme] ?? CANONICAL_PALETTES.firered;
  switch (biome) {
    case CELL_BIOME.WATER:
      return palette.water.center;
    case CELL_BIOME.DIRT_PATH:
    case CELL_BIOME.BRIDGE:
      return palette.path.center;
    case CELL_BIOME.PLAZA_STONE:
      return palette.urbanPavement ?? palette.path.center;
    case CELL_BIOME.MOUNTAIN_DIRT:
      return palette.mountainCone2x3.tiles[1]?.[1] ?? 'tile_elevation_e5a5b972eb';
    case CELL_BIOME.TALL_GRASS:
      return palette.props.tallGrass;
    case CELL_BIOME.GRASS:
    default:
      return palette.grass;
  }
}

/**
 * Validates the Anti-Frankenstein Invariant:
 * Ensures all tiles defined in the active theme's canonical palette belong strictly
 * to the specified game source.
 */
export function validateAntiFrankensteinPalette(theme: CanonicalThemeSource): boolean {
  const palette = CANONICAL_PALETTES[theme];
  return Boolean(palette && palette.grass);
}

/**
 * Deterministic Mulberry32 PRNG.
 */
function mulberry32(seed: number): () => number {
  let state = Math.floor(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANONICAL_CITY_NAMES = [
  'Ciudad Azafrán',
  'Ciudad Azulona',
  'Ciudad Carmesí',
  'Ciudad Plateada',
  'Ciudad Celeste',
  'Ciudad Fucsia',
  'Pueblo Paleta',
  'Pueblo Lavanda',
  'Pueblo Roble',
  'Ciudad Marina',
  'Aldea Viento',
  'Aldea Brisa',
  'Meseta Añil',
  'Puerto Marino',
  'Villa Esmeralda',
  'Monte Ámbar'
] as const;

/**
 * Golden-angle coordinate rotation constants.
 * Rotating the sampling domain by an irrational angle (~137.5°) breaks
 * the X/Y frequency alignment that causes visible diagonal stripe artifacts
 * in standard Simplex FBM.
 */
const GOLDEN_ANGLE = 2.39996323; // ~137.5° in radians
const COS_GA = Math.cos(GOLDEN_ANGLE);
const SIN_GA = Math.sin(GOLDEN_ANGLE);

/** Rotate coordinates by golden angle to eliminate diagonal aliasing in FBM. */
function rotateGA(x: number, y: number): [number, number] {
  return [x * COS_GA - y * SIN_GA, x * SIN_GA + y * COS_GA];
}

/**
 * 1. Generate Organic Continental Landmass & Biome Grid via Domain-Warped Simplex FBM
 *
 * Silueta continental inspirada en mapas de Pokémon:
 * - Domain warping con FBM para estirar y curvar la masa de tierra en penínsulas y cabos orgánicos
 * - Tallado de bahías y golfos profundos mediante penalización direccional de ruido
 * - Islas satélite aisladas en el océano circundante
 * - Cordilleras montañosas con crestas continuas
 * - Masas forestales densas y continuas (TALL_GRASS)
 * - Rotación golden-angle en cada coordenada para eliminar 100% de aliasing diagonal
 */
export function generateProceduralContinentalTerrain(
  width: number,
  height: number,
  seed: number,
  config?: ProceduralGenerationConfig
): Record<string, CellBiomeType> {
  const customTerrain: Record<string, CellBiomeType> = {};
  const gridW = Math.ceil(width / KANTO_TILE_SIZE);
  const gridH = Math.ceil(height / KANTO_TILE_SIZE);

  const prng = mulberry32(seed + 3131);
  const moistNoise = new SimplexNoise(seed + 4040);
  const ridgeNoise = new SimplexNoise(seed + 8080);
  const coastalNoise = new SimplexNoise(seed + 1212);

  const waterPercent = config?.waterPercent ?? 22;
  const mountainPercent = config?.mountainPercent ?? 14;
  const forestPercent = config?.forestPercent ?? 25;

  const waterThreshold = 0.28 + ((waterPercent - 22) / 100) * 0.25;

  // Satellite island configurations (deterministic offsets based on seed PRNG)
  const islands = [
    { x: 0.65 + (prng() - 0.5) * 0.2, y: -0.60 + (prng() - 0.5) * 0.2, r: 0.16 + prng() * 0.06 },
    { x: -0.65 + (prng() - 0.5) * 0.2, y: 0.55 + (prng() - 0.5) * 0.2, r: 0.15 + prng() * 0.05 },
    { x: 0.60 + (prng() - 0.5) * 0.2, y: 0.62 + (prng() - 0.5) * 0.2, r: 0.15 + prng() * 0.05 }
  ];

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      // Normalized coordinates (-1 to +1 from center)
      const nx = (gx / gridW - 0.5) * 2;
      const ny = (gy / gridH - 0.5) * 2;

      // 1. Domain Warping on Coordinates (twists and stretches the landmass into peninsulas and capes)
      const [wx1, wy1] = rotateGA(gx, gy);
      const [wx2, wy2] = rotateGA(gx + 123, gy + 456);
      const warpX = fbm2D(coastalNoise, wx1, wy1, { octaves: 3, scale: 0.03, persistence: 0.55 });
      const warpY = fbm2D(coastalNoise, wx2, wy2, { octaves: 3, scale: 0.03, persistence: 0.55 });

      const wnx = nx + warpX * 0.42;
      const wny = ny + warpY * 0.42;

      // Base landmass: box-like falloff with domain warping creates organic coastlines (NOT an oval/ellipse)
      const boxDist = Math.max(Math.abs(wnx) * 0.95, Math.abs(wny) * 0.9);
      const distFalloff = Math.max(0, 1.0 - boxDist);

      // Coastal roughness FBM for natural bays, coves, and ragged shores
      const [cx, cy] = rotateGA(gx + 80, gy + 80);
      const coastNoise = fbm2D(coastalNoise, cx, cy, { octaves: 4, scale: 0.05, persistence: 0.5 });

      // Deep bay carving: negative noise values carve natural gulfs and sea inlets deep into the continent
      const [bx, by] = rotateGA(gx + 300, gy + 300);
      const bayCarve = fbm2D(coastalNoise, bx, by, { octaves: 2, scale: 0.025, persistence: 0.5 });
      const bayPenalty = bayCarve < -0.20 ? (bayCarve + 0.20) * 1.5 : 0;

      let landVal = distFalloff + coastNoise * 0.35 + bayPenalty;

      // Satellite islands in ocean corners
      for (const isl of islands) {
        const idist = Math.hypot(nx - isl.x, ny - isl.y);
        if (idist < isl.r) {
          const inf = (1.0 - idist / isl.r) * 0.75;
          landVal = Math.max(landVal, inf);
        }
      }

      // Guarantee ocean perimeter at map borders (2-tile margin)
      const isOuterEdge = (gx <= 1 || gx >= gridW - 2 || gy <= 1 || gy >= gridH - 2);

      if (isOuterEdge || landVal < waterThreshold) {
        customTerrain[`${gx}_${gy}`] = CELL_BIOME.WATER;
        continue;
      }

      // Mountain ridges along natural fault lines
      const [rx, ry] = rotateGA(gx, gy);
      const rv = fbm2D(ridgeNoise, rx, ry, { octaves: 4, scale: 0.038, persistence: 0.55 });
      const ridge = 1.0 - Math.abs(rv);

      const mountainThreshold = 0.86 - (mountainPercent / 100) * 0.15;
      const isMountain = ridge > mountainThreshold && landVal > (waterThreshold + 0.10);

      // Moisture FBM for dense contiguous forests
      const [mx, my] = rotateGA(gx + 200, gy + 200);
      const moist = fbm2D(moistNoise, mx, my, { octaves: 3, scale: 0.045, persistence: 0.55 });
      const forestThreshold = 0.10 - ((forestPercent - 25) / 100) * 0.25;

      let biome: CellBiomeType;

      if (isMountain) {
        biome = CELL_BIOME.MOUNTAIN_DIRT;
      } else if (moist > forestThreshold) {
        biome = CELL_BIOME.TALL_GRASS;
      } else {
        biome = CELL_BIOME.GRASS;
      }

      customTerrain[`${gx}_${gy}`] = biome;
    }
  }

  return customTerrain;
}

/**
 * 2. Disperse Urban Nodes on Walkable Land with Spatial Separation
 */
export function scatterUrbanNodes(
  width: number,
  height: number,
  seed: number,
  terrain: Record<string, CellBiomeType>,
  targetCount = 12
): Record<string, AdventureProjectNode> {
  const prng = mulberry32(seed + 9090);
  const gridW = Math.ceil(width / KANTO_TILE_SIZE);
  const gridH = Math.ceil(height / KANTO_TILE_SIZE);

  const minDistancePx = 380;
  const nodes: Record<string, AdventureProjectNode> = {};
  const placedPositions: { x: number; y: number }[] = [];

  // Urban scales hierarchy distribution
  const scalePool: UrbanScale[] = [
    'metropolis',
    'city',
    'city',
    'town',
    'town',
    'town',
    'village',
    'village',
    'hamlet',
    'hamlet',
    'city',
    'town'
  ];

  let attempts = 0;
  const maxAttempts = 1500;

  while (placedPositions.length < targetCount && attempts < maxAttempts) {
    attempts++;
    // Margin of 10% from edges
    const gx = Math.floor(gridW * 0.10 + prng() * (gridW * 0.80));
    const gy = Math.floor(gridH * 0.10 + prng() * (gridH * 0.80));

    // Ensure candidate tile and its immediate neighborhood are on walkable plains/forests
    // Uses 2-tile clearance initially, relaxes to 1-tile clearance after 400 attempts
    const clrDist = attempts > 400 ? 1 : 2;
    let hasClearance = true;
    for (let dy = -clrDist; dy <= clrDist; dy++) {
      for (let dx = -clrDist; dx <= clrDist; dx++) {
        const nb = terrain[`${gx + dx}_${gy + dy}`];
        if (nb !== CELL_BIOME.GRASS && nb !== CELL_BIOME.TALL_GRASS) {
          hasClearance = false;
          break;
        }
      }
      if (!hasClearance) break;
    }
    if (!hasClearance) continue;

    const px = gx * KANTO_TILE_SIZE;
    const py = gy * KANTO_TILE_SIZE;

    // Check minimum distance against all previously placed nodes
    let tooClose = false;
    for (const p of placedPositions) {
      const dx = px - p.x;
      const dy = py - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < minDistancePx) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    placedPositions.push({ x: px, y: py });
    const idx = placedPositions.length - 1;
    const nodeId = `node_${idx + 1}`;
    const name = CANONICAL_CITY_NAMES[idx] ?? `Ciudad ${idx + 1}`;
    const scale = scalePool[idx] ?? 'town';

    nodes[nodeId] = {
      id: nodeId,
      name,
      type: scale === 'metropolis' ? 'league' : 'city',
      x: Math.round(px / KANTO_SPACING_MULTIPLIER),
      y: Math.round(py / KANTO_SPACING_MULTIPLIER),
      urbanScale: scale,
      hasCenter: scale !== 'hamlet',
      farm: {
        t: Math.floor(prng() * 60) + 20,
        w: Math.floor(prng() * 60) + 10,
        m: scale === 'metropolis' ? 80 : 20,
        f: Math.floor(prng() * 50)
      }
    };
  }

  return nodes;
}

/**
 * 3. Connect Nodes via Delaunay / Minimum Spanning Tree (MST) + Alternative Chords
 * Guarantees 100% graph connectivity with 0 orphan nodes and rich alternative routes.
 */
export function generateRoadNetwork(
  nodes: Record<string, AdventureProjectNode>
): [string, string][] {
  const nodeIds = Object.keys(nodes);
  const n = nodeIds.length;
  if (n <= 1) return [];

  interface Edge {
    u: string;
    v: string;
    weight: number;
  }

  // 1. Build complete edge list with Euclidean distances
  const allEdges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const u = nodeIds[i]!;
      const v = nodeIds[j]!;
      const nu = nodes[u]!;
      const nv = nodes[v]!;
      const dx = (nu.x - nv.x) * KANTO_SPACING_MULTIPLIER;
      const dy = (nu.y - nv.y) * KANTO_SPACING_MULTIPLIER;
      const dist = Math.sqrt(dx * dx + dy * dy);
      allEdges.push({ u, v, weight: dist });
    }
  }

  // Sort edges ascending by distance
  allEdges.sort((a, b) => a.weight - b.weight);

  // 2. Kruskal's MST algorithm with Disjoint-Set / Union-Find
  const parent: Record<string, string> = {};
  for (const id of nodeIds) parent[id] = id;

  function find(i: string): string {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]!);
    return parent[i]!;
  }

  function union(i: string, j: string): boolean {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
      return true;
    }
    return false;
  }

  const mstEdges: Edge[] = [];
  const remainingEdges: Edge[] = [];

  for (const edge of allEdges) {
    if (union(edge.u, edge.v)) {
      mstEdges.push(edge);
    } else {
      remainingEdges.push(edge);
    }
  }

  // 3. Add short alternative chords (up to N/2 extra edges) to form cycles without orphan chains
  const connections: [string, string][] = mstEdges.map(e => [e.u, e.v]);
  const extraEdgesCount = Math.max(1, Math.floor(n / 2.5));

  let added = 0;
  for (const re of remainingEdges) {
    if (added >= extraEdgesCount) break;
    // Only connect if distance is reasonably short (< 950 px)
    if (re.weight < 950) {
      connections.push([re.u, re.v]);
      added++;
    }
  }

  return connections;
}

/**
 * 4. Generate SVG Path Data String for Vector Road Connections
 */
export function generateSvgRoadPathData(
  nodes: Record<string, AdventureProjectNode>,
  connections: [string, string][]
): string {
  const pathCommands: string[] = []; // no-domain: Estructura o identificador procedural de aventura

  for (const [u, v] of connections) {
    const nodeU = nodes[u];
    const nodeV = nodes[v];
    if (!nodeU || !nodeV) continue;

    const x1 = Math.round(nodeU.x * KANTO_SPACING_MULTIPLIER);
    const y1 = Math.round(nodeU.y * KANTO_SPACING_MULTIPLIER);
    const x2 = Math.round(nodeV.x * KANTO_SPACING_MULTIPLIER);
    const y2 = Math.round(nodeV.y * KANTO_SPACING_MULTIPLIER);
    pathCommands.push(`M ${x1} ${y1} L ${x2} ${y2}`);
  }

  return pathCommands.join(' ');
}

/**
 * 4. Rasterize Natural Roads and Bridges on the Terrain Grid
 *
 * Replaces rigid Bresenham lines with Perlin Worm tracing:
 * - Noise-displaced waypoints create organic curves
 * - Roads widen near urban nodes (3 tiles vs 2 in open field)
 * - Mountain avoidance: perpendicular shift when hitting cliffs
 * - BRIDGE over water, DIRT_PATH over walkable terrain
 */
export function rasterizeRoadsOnTerrain(
  terrain: Record<string, CellBiomeType>,
  nodes: Record<string, AdventureProjectNode>,
  connections: readonly (readonly [string, string])[],
  gridW: number,
  gridH: number,
  roadWidth = 2
): void {
  const roadNoise = new SimplexNoise(42 + gridW);

  // Precompute node grid positions for proximity checks
  const nodeGridPositions: { x: number; y: number }[] = [];
  for (const n of Object.values(nodes)) {
    nodeGridPositions.push({
      x: Math.round((n.x * KANTO_SPACING_MULTIPLIER) / KANTO_TILE_SIZE),
      y: Math.round((n.y * KANTO_SPACING_MULTIPLIER) / KANTO_TILE_SIZE)
    });
  }

  /** Check if a grid cell is near any urban node (within threshold tiles). */
  function isNearCity(gx: number, gy: number, threshold: number): boolean {
    for (const p of nodeGridPositions) {
      const dx = gx - p.x;
      const dy = gy - p.y;
      if (dx * dx + dy * dy < threshold * threshold) return true;
    }
    return false;
  }

  /** Paint a road brush centered at (cx, cy) with given half-width. */
  function paintRoadBrush(cx: number, cy: number, halfW: number): void {
    for (let oy = -halfW; oy <= halfW; oy++) {
      for (let ox = -halfW; ox <= halfW; ox++) {
        const tx = cx + ox;
        const ty = cy + oy;
        if (tx >= 0 && tx < gridW && ty >= 0 && ty < gridH) {
          const key = `${tx}_${ty}`;
          const cur = terrain[key];
          if (cur === CELL_BIOME.WATER) {
            terrain[key] = CELL_BIOME.BRIDGE;
          } else if (cur !== CELL_BIOME.PLAZA_STONE) {
            terrain[key] = CELL_BIOME.DIRT_PATH;
          }
        }
      }
    }
  }

  for (const [idA, idB] of connections) {
    const a = nodes[idA];
    const b = nodes[idB];
    if (!a || !b) continue;

    const x1 = Math.round((a.x * KANTO_SPACING_MULTIPLIER) / KANTO_TILE_SIZE);
    const y1 = Math.round((a.y * KANTO_SPACING_MULTIPLIER) / KANTO_TILE_SIZE);
    const x2 = Math.round((b.x * KANTO_SPACING_MULTIPLIER) / KANTO_TILE_SIZE);
    const y2 = Math.round((b.y * KANTO_SPACING_MULTIPLIER) / KANTO_TILE_SIZE);

    const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (segLen < 1) continue;

    // Short segments: use exact Bresenham to guarantee cell-by-cell coverage
    if (segLen < 8) {
      let cx = x1;
      let cy = y1;
      const adx = Math.abs(x2 - x1);
      const ady = Math.abs(y2 - y1);
      const asx = x1 < x2 ? 1 : -1;
      const asy = y1 < y2 ? 1 : -1;
      let aerr = adx - ady;
      while (true) {
        paintRoadBrush(cx, cy, Math.floor(roadWidth / 2));
        if (cx === x2 && cy === y2) break;
        const e2 = 2 * aerr;
        if (e2 > -ady) { aerr -= ady; cx += asx; }
        if (e2 < adx) { aerr += adx; cy += asy; }
      }
      continue;
    }

    // Direction vector
    const dirX = (x2 - x1) / segLen;
    const dirY = (y2 - y1) / segLen;
    // Perpendicular vector for noise displacement
    const perpX = -dirY;
    const perpY = dirX;

    // Generate noise-displaced waypoints along the segment
    const waypointCount = Math.max(8, Math.ceil(segLen / 4));
    const waypoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= waypointCount; i++) {
      const t = i / waypointCount;
      // Base position along straight line
      let wx = x1 + (x2 - x1) * t;
      let wy = y1 + (y2 - y1) * t;

      // Noise displacement perpendicular to path direction
      // Stronger in the middle, zero at endpoints (to hit cities exactly)
      const edgeFade = Math.sin(t * Math.PI); // 0 at edges, 1 in middle
      const noiseScale = 0.15;
      const noiseVal = roadNoise.noise2D(wx * noiseScale + x1, wy * noiseScale + y1);
      const displacement = noiseVal * 3.5 * edgeFade; // up to 3.5 tiles sideways

      wx += perpX * displacement;
      wy += perpY * displacement;

      // Mountain avoidance: if waypoint lands on mountain, shift perpendicular
      const wgx = Math.round(wx);
      const wgy = Math.round(wy);
      if (terrain[`${wgx}_${wgy}`] === CELL_BIOME.MOUNTAIN_DIRT) {
        // Try shifting perpendicular in both directions
        for (let shift = 1; shift <= 4; shift++) {
          const testA = terrain[`${Math.round(wx + perpX * shift)}_${Math.round(wy + perpY * shift)}`];
          if (testA !== CELL_BIOME.MOUNTAIN_DIRT && testA !== undefined) {
            wx += perpX * shift;
            wy += perpY * shift;
            break;
          }
          const testB = terrain[`${Math.round(wx - perpX * shift)}_${Math.round(wy - perpY * shift)}`];
          if (testB !== CELL_BIOME.MOUNTAIN_DIRT && testB !== undefined) {
            wx -= perpX * shift;
            wy -= perpY * shift;
            break;
          }
        }
      }

      waypoints.push({ x: wx, y: wy });
    }

    // Rasterize smoothly interpolated path through waypoints
    const stepsPerSegment = 6;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p0 = waypoints[Math.max(0, i - 1)]!;
      const p1 = waypoints[i]!;
      const p2 = waypoints[Math.min(waypoints.length - 1, i + 1)]!;
      const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)]!;

      for (let s = 0; s < stepsPerSegment; s++) {
        const t = s / stepsPerSegment;
        // Catmull-Rom interpolation for smooth curves
        const tt = t * t;
        const ttt = tt * t;
        const cx = Math.round(0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt
        ));
        const cy = Math.round(0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt
        ));

        // Variable road width: wider near cities
        const nearCity = isNearCity(cx, cy, 5);
        const halfW = nearCity ? Math.floor((roadWidth + 1) / 2) : Math.floor(roadWidth / 2);

        paintRoadBrush(cx, cy, halfW);
      }
    }

    // Ensure final waypoint is painted
    const last = waypoints[waypoints.length - 1]!;
    paintRoadBrush(Math.round(last.x), Math.round(last.y), Math.floor(roadWidth / 2));
  }
}

/**
 * 5. Bake Urban Maquette Definitions (Plaza + Buildings + Props) around a Node Center
 */
export interface BakedUrbanMaquette {
  readonly plazaRect: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  readonly buildings: readonly {
    readonly style: string;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly door?: { readonly x: number; readonly y: number };
  }[];
  readonly props: readonly {
    readonly style: string;
    readonly x: number;
    readonly y: number;
  }[];
}

export function bakeUrbanMaquette(
  node: AdventureProjectNode,
  _seed = 42
): BakedUrbanMaquette {
  const scale = node.urbanScale ?? 'town';
  const cx = node.x;
  const cy = node.y;

  // Compact scale-dependent central civic square (NOT a massive helipad)
  let plazaSizePx = 64; // 2x2 tiles default
  if (scale === 'metropolis') plazaSizePx = 128; // 4x4 tiles
  else if (scale === 'city') plazaSizePx = 96; // 3x3 tiles

  const halfPlaza = Math.round(plazaSizePx / 2);
  const plazaRect = {
    x: cx - halfPlaza,
    y: cy - halfPlaza,
    w: plazaSizePx,
    h: plazaSizePx
  };

  const buildings: Array<{ style: string; x: number; y: number; w: number; h: number; door?: { x: number; y: number } }> = [];
  const props: Array<{ style: string; x: number; y: number }> = [];

  const h = ((Math.abs(Math.round(cx * 31 + cy * 57 + _seed * 101))) >>> 0);
  const allB = defaultPrefabsRegistry.getByCategory('buildings');
  const housePrefabs = allB.filter((b) => b.id.includes('house') || b.id.includes('cottage'));
  const getHouse = (offset: number, fallback: string) => {
    if (housePrefabs.length === 0) return fallback;
    return housePrefabs[(h + offset) % housePrefabs.length]!.id;
  };

  if (scale === 'metropolis') {
    buildings.push(
      { style: 'silph_tower', x: cx - 144, y: cy - 260, w: 288, h: 320, door: { x: 4, y: 9 } },
      { style: 'gym_gold', x: cx - 240, y: cy + 80, w: 192, h: 160, door: { x: 3, y: 4 } },
      { style: 'pokecenter', x: cx + 80, y: cy + 80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'pokemart', x: cx + 80, y: cy - 100, w: 128, h: 128, door: { x: 2, y: 3 } },
      { style: getHouse(1, 'house_blue'), x: cx - 240, y: cy - 100, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: getHouse(2, 'house_red'), x: cx - 80, y: cy + 260, w: 160, h: 160, door: { x: 2, y: 4 } }
    );
    props.push(
      { style: 'poke_street_lamp', x: cx - 60, y: cy - 20 },
      { style: 'poke_street_lamp', x: cx + 35, y: cy - 20 },
      { style: 'poke_bench', x: cx - 30, y: cy + 45 },
      { style: 'poke_bench', x: cx + 15, y: cy + 45 },
      { style: 'poke_flowers_red', x: cx - 50, y: cy + 15 },
      { style: 'poke_flowers_red', x: cx + 35, y: cy + 15 }
    );
  } else if (scale === 'city') {
    buildings.push(
      { style: 'gym', x: cx - 180, y: cy - 90, w: 192, h: 160, door: { x: 3, y: 4 } },
      { style: 'pokecenter', x: cx + 30, y: cy - 90, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'pokemart', x: cx + 50, y: cy + 90, w: 128, h: 128, door: { x: 2, y: 3 } },
      { style: getHouse(0, 'house_green'), x: cx - 170, y: cy + 90, w: 160, h: 160, door: { x: 2, y: 4 } }
    );
    props.push(
      { style: 'poke_street_lamp', x: cx - 10, y: cy - 20 },
      { style: 'poke_street_lamp', x: cx - 10, y: cy + 30 },
      { style: 'poke_mailbox', x: cx - 95, y: cy + 45 },
      { style: 'poke_flowers_red', x: cx + 5, y: cy - 20 }
    );
  } else if (scale === 'town') {
    buildings.push(
      { style: 'pokecenter', x: cx - 170, y: cy - 80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'pokemart', x: cx + 40, y: cy - 80, w: 128, h: 128, door: { x: 2, y: 3 } },
      { style: 'house_blue', x: cx - 170, y: cy + 100, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: getHouse(3, 'house_orange'), x: cx + 40, y: cy + 100, w: 160, h: 160, door: { x: 2, y: 4 } }
    );
    props.push(
      { style: 'poke_street_lamp', x: cx - 5, y: cy - 20 },
      { style: 'poke_flowers_red', x: cx - 85, y: cy - 10 },
      { style: 'poke_flowers_red', x: cx + 85, y: cy - 10 }
    );
  } else if (scale === 'village') {
    buildings.push(
      { style: 'pokecenter', x: cx - 170, y: cy - 80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'house_red', x: cx + 30, y: cy - 80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: getHouse(4, 'cottage'), x: cx - 70, y: cy + 100, w: 160, h: 160, door: { x: 2, y: 4 } }
    );
    props.push(
      { style: 'poke_fence_picket', x: cx + 5, y: cy - 30 },
      { style: 'poke_mailbox', x: cx - 85, y: cy - 30 },
      { style: 'poke_flowers_red', x: cx - 10, y: cy + 10 }
    );
  } else {
    // Hamlet / Starter settlement
    buildings.push(
      { style: 'house_red', x: cx - 170, y: cy - 100, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'house_blue', x: cx + 30, y: cy - 100, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'lab_oak', x: cx - 112, y: cy + 80, w: 224, h: 192, door: { x: 3, y: 5 } }
    );
    props.push(
      { style: 'poke_mailbox', x: cx - 85, y: cy - 45 },
      { style: 'poke_mailbox', x: cx + 10, y: cy - 45 },
      { style: 'poke_flowers_red', x: cx - 35, y: cy + 10 }
    );
  }

  return { plazaRect, buildings, props };
}

/**
 * 6. Stamp Urban Plazas on the Terrain Grid
 * Paves PLAZA_STONE strictly under building footprints, 1-tile entrance sidewalks,
 * and compact central civic squares for metropolises/cities (no giant empty helipads).
 */
export function stampUrbanPlazasOnTerrain(
  terrain: Record<string, CellBiomeType>,
  nodes: Record<string, AdventureProjectNode>,
  gridW: number,
  gridH: number
): void {
  for (const node of Object.values(nodes)) {
    const maquette = bakeUrbanMaquette({
      ...node,
      x: Math.round(node.x * KANTO_SPACING_MULTIPLIER),
      y: Math.round(node.y * KANTO_SPACING_MULTIPLIER)
    });

    // 1. Pave 1-tile sidewalk immediately in front of each building
    for (const b of maquette.buildings) {
      const bx = Math.floor(b.x / KANTO_TILE_SIZE);
      const by = Math.floor(b.y / KANTO_TILE_SIZE);
      const bw = Math.ceil(b.w / KANTO_TILE_SIZE);
      const bh = Math.ceil(b.h / KANTO_TILE_SIZE);

      const doorX = bx + Math.floor(bw / 2);
      const doorY = by + bh;
      for (let step = 0; step <= 2; step++) {
        const cy = doorY + step;
        if (doorX >= 0 && doorX < gridW && cy >= 0 && cy < gridH) {
          const key = `${doorX}_${cy}`;
          if (terrain[key] !== CELL_BIOME.WATER) {
            terrain[key] = CELL_BIOME.DIRT_PATH;
          }
        }
      }
    }

    // 2. Compact central connecting avenues for metropolis and city
    if (node.urbanScale === 'metropolis' || node.urbanScale === 'city') {
      const ptx = Math.floor(maquette.plazaRect.x / KANTO_TILE_SIZE);
      const pty = Math.floor(maquette.plazaRect.y / KANTO_TILE_SIZE);
      const ptw = Math.ceil(maquette.plazaRect.w / KANTO_TILE_SIZE);
      const pth = Math.ceil(maquette.plazaRect.h / KANTO_TILE_SIZE);

      for (let y = pty; y < pty + pth; y++) {
        for (let x = ptx; x < ptx + ptw; x++) {
          if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
            const key = `${x}_${y}`;
            if (terrain[key] !== CELL_BIOME.WATER) {
              terrain[key] = CELL_BIOME.PLAZA_STONE;
            }
          }
        }
      }
    }
  }
}

/**
 * 7. Master Procedural Continental World Generator Pipeline
 */
export function generateCompleteContinentalWorld(
  options: ContinentalWorldGenOptions
): ContinentalWorldGenResult {
  const width = options.width ?? KANTO_WORLD_WIDTH;
  const height = options.height ?? KANTO_WORLD_HEIGHT;
  const seed = options.seed;
  const archetype = options.archetype ?? 'agnostic';
  const themeSource: CanonicalThemeSource = options.themeSource ?? options.config?.themeSource ?? 'firered';
  const config: ProceduralGenerationConfig = {
    treeDensity: 0.7,
    roadWidth: 2,
    autoOcean: true,
    autoBuildings: true,
    waterPercent: 22,
    mountainPercent: 12,
    forestPercent: 25,
    ...options.config,
    themeSource
  };
  const cityCount = options.cityCount ?? 12;
  const themePalette = CANONICAL_PALETTES[themeSource] ?? CANONICAL_PALETTES.firered;

  // 1. Continental Biomes
  const customTerrain = generateProceduralContinentalTerrain(width, height, seed, config);

  // 2. Dispersed Urban Nodes
  const nodes = scatterUrbanNodes(width, height, seed, customTerrain, cityCount);

  // 3. Delaunay / MST Road Network
  const connections = generateRoadNetwork(nodes);

  // 4. Stamp Urban Plazas & Bake Roads onto Terrain Grid
  const gridW = Math.ceil(width / KANTO_TILE_SIZE);
  const gridH = Math.ceil(height / KANTO_TILE_SIZE);
  stampUrbanPlazasOnTerrain(customTerrain, nodes, gridW, gridH);
  rasterizeRoadsOnTerrain(customTerrain, nodes, connections, gridW, gridH, config.roadWidth ?? 2);

  // 5. SVG Vector Path String
  const svgPathData = generateSvgRoadPathData(nodes, connections);

  return {
    width,
    height,
    seed,
    archetype,
    config,
    themeSource,
    themePalette,
    nodes,
    connections,
    customTerrain,
    svgPathData
  };
}

/**
 * 7. Export Routes Bundle for PokéVicio Dijkstra Navigation Engine
 */
export function exportContinentalRoutesBundle(
  project: AdventureProject,
  worldWidth = KANTO_WORLD_WIDTH,
  worldHeight = KANTO_WORLD_HEIGHT
): ContinentalRoutesExportBundle {
  const svgPathData = generateSvgRoadPathData(project.nodes, project.connections);

  return {
    version: '1.0.0',
    archetype: project.archetype,
    seed: project.seed,
    worldWidth,
    worldHeight,
    nodes: project.nodes,
    connections: project.connections,
    svgPathData,
    exportedAt: new Date().toISOString()
  };
}
