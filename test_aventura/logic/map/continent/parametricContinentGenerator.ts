/**
 * src/logic/map/continent/parametricContinentGenerator.ts
 *
 * PARAMETRIC CONTINENTAL GENERATION ENGINE
 * Generates continuous full-scale Pokémon regions and continents:
 * 1. Multi-octave Simplex Noise with radial falloff for natural coastlines.
 * 2. Biome distribution (ocean, beach, grass, forest, mountain, snow).
 * 3. Poisson-dispersed urban settlement placement on habitable land.
 * 4. 100% connected road network graph via Minimum Spanning Tree (MST).
 * 5. Road carving across terrain.
 */

import { SimplexNoise, fbm2D } from '../noise/simplexNoise.ts';
import type {
  ContinentGenConfig,
  ContinentDimensions,
  ContinentBiomeType,
  ContinentNode,
  ContinentConnection,
  UrbanScale,
  ContinentAmenity
} from '../../../types/map/continentTypes';

export interface GeneratedContinentResult {
  readonly dimensions: ContinentDimensions;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly biomeGrid: ContinentBiomeType[][];
  readonly nodes: Record<string, ContinentNode>;
  readonly connections: readonly ContinentConnection[];
  readonly roads: ReadonlySet<string>;
}

// Canonical Pokémon settlement names pool
const SETTLEMENT_NAMES = [
  'Pueblo Paleta',
  'Ciudad Verde',
  'Ciudad Plateada',
  'Ciudad Celeste',
  'Ciudad Carmín',
  'Pueblo Lavanda',
  'Ciudad Azulona',
  'Ciudad Azafrán',
  'Ciudad Fucsia',
  'Isla Canela',
  'Pueblo Primavera',
  'Ciudad Cerezo',
  'Ciudad Malva',
  'Pueblo Azalea',
  'Ciudad Trigal',
  'Ciudad Iris',
  'Ciudad Olivo',
  'Ciudad Orquídea',
  'Pueblo Caoba',
  'Ciudad Endrino',
  'Pueblo Hoja',
  'Ciudad Escarcha',
  'Pueblo Bruma',
  'Ciudad Cumbre'
] as const;

/**
 * Deterministic Mulberry32 PRNG
 */
function createMulberry32(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Disjoint Set (Union-Find) for Kruskal's algorithm
 */
class UnionFind {
  private readonly parent: Map<string, string> = new Map();

  find(item: string): string {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      return item;
    }
    const p = this.parent.get(item)!;
    if (p === item) return item;
    const root = this.find(p);
    this.parent.set(root, root);
    return root;
  }

  union(a: string, b: string): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    this.parent.set(rootA, rootB);
    return true;
  }
}

/**
 * Generates a full continental world based on parametric configuration.
 */
export function generateContinent(config: ContinentGenConfig): GeneratedContinentResult {
  const { dimensions, seed, cityCount, biomes } = config;
  const gridW = Math.max(10, Math.floor(dimensions.width / dimensions.tileSize));
  const gridH = Math.max(10, Math.floor(dimensions.height / dimensions.tileSize));

  const prng = createMulberry32(seed);
  const simplexHeight = new SimplexNoise(seed);
  const simplexMoist = new SimplexNoise(seed + 101);

  // 1. Compute raw Elevation and Moisture grids
  const elevationGrid: number[][] = Array.from({ length: gridH }, () => new Array(gridW).fill(0));
  const moistureGrid: number[][] = Array.from({ length: gridH }, () => new Array(gridW).fill(0));

  const halfW = gridW / 2;
  const halfH = gridH / 2;
  const maxRadius = Math.min(halfW, halfH) * 1.15;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      // Radial falloff mask for natural island / continent edges
      const dx = (x - halfW) / maxRadius;
      const dy = (y - halfH) / maxRadius;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1.0 - Math.pow(distFromCenter, 2.2));

      // Multi-octave simplex noise
      const hNoise = (fbm2D(simplexHeight, x, y, { octaves: 4, scale: 0.05 }) + 1) * 0.5;
      const mNoise = (fbm2D(simplexMoist, x, y, { octaves: 3, scale: 0.07 }) + 1) * 0.5;

      const rawElevation = hNoise * 0.75 + falloff * 0.35;
      elevationGrid[y]![x] = Math.max(0, Math.min(1.0, rawElevation));
      moistureGrid[y]![x] = Math.max(0, Math.min(1.0, mNoise));
    }
  }

  // 2. Classify Biomes
  const waterThreshold = Math.max(0.05, Math.min(0.6, (biomes.waterPercent / 100) * 0.65));
  const beachThickness = Math.max(0.02, (biomes.beachPercent / 100) * 0.08);
  const beachThreshold = waterThreshold + beachThickness;

  // Mountain threshold scales cleanly with mountainPercent (e.g. 15% -> ~0.72)
  const mountainThreshold = Math.max(
    beachThreshold + 0.08,
    0.85 - (biomes.mountainPercent / 100) * 0.35
  );

  const biomeGrid: ContinentBiomeType[][] = Array.from({ length: gridH }, () =>
    new Array<ContinentBiomeType>(gridW).fill('ocean')
  );

  for (let y = 0; y < gridH; y++) {
    // Latitude gradient: northern rows (low y or high y)
    const northFactor = (gridH - y) / gridH;

    for (let x = 0; x < gridW; x++) {
      const elev = elevationGrid[y]![x]!;
      const moist = moistureGrid[y]![x]!;

      if (elev < waterThreshold) {
        biomeGrid[y]![x] = 'ocean';
      } else if (elev < beachThreshold) {
        biomeGrid[y]![x] = 'beach';
      } else if (elev >= mountainThreshold) {
        // High mountain peak in cold north becomes snow peak
        const isSnowPeak = biomes.snowPercent > 0 && elev >= mountainThreshold + 0.1 && northFactor > 0.6;
        if (isSnowPeak) {
          biomeGrid[y]![x] = 'snow';
        } else {
          biomeGrid[y]![x] = 'mountain';
        }
      } else {
        // Habitable land: check for cold northern plains vs forest vs grass
        const isColdPlain = biomes.snowPercent > 0 && northFactor > 0.8 && elev > 0.45;
        if (isColdPlain) {
          biomeGrid[y]![x] = 'snow';
        } else if (moist > 1.0 - (biomes.forestPercent / 100) * 0.75) {
          biomeGrid[y]![x] = 'forest';
        } else {
          biomeGrid[y]![x] = 'grass';
        }
      }
    }
  }

  // 3. Collect Candidate Habitable Coordinates
  const habitableLand: { gx: number; gy: number }[] = [];
  const secondaryLand: { gx: number; gy: number }[] = [];

  for (let y = 2; y < gridH - 2; y++) {
    for (let x = 2; x < gridW - 2; x++) {
      const b = biomeGrid[y]![x];
      if (b === 'grass' || b === 'forest') {
        habitableLand.push({ gx: x, gy: y });
      } else if (b === 'beach' || b === 'snow') {
        secondaryLand.push({ gx: x, gy: y });
      }
    }
  }

  const allCandidateLand = habitableLand.length >= cityCount ? habitableLand : [...habitableLand, ...secondaryLand];

  // 4. Place Urban Nodes
  const nodes: Record<string, ContinentNode> = {};
  const placedCoords: { gx: number; gy: number }[] = [];
  const targetCount = Math.min(cityCount, Math.max(2, allCandidateLand.length));
  const minDistance = Math.max(3, Math.floor(Math.min(gridW, gridH) / (Math.sqrt(targetCount) * 1.4)));

  // Shuffle candidates deterministically
  for (let i = allCandidateLand.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = allCandidateLand[i]!;
    allCandidateLand[i] = allCandidateLand[j]!;
    allCandidateLand[j] = temp;
  }

  for (const cand of allCandidateLand) {
    if (placedCoords.length >= targetCount) break;

    // Check distance from existing placed nodes
    let tooClose = false;
    for (const p of placedCoords) {
      const dist = Math.hypot(cand.gx - p.gx, cand.gy - p.gy);
      if (dist < minDistance) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      placedCoords.push(cand);
    }
  }

  // Fallback if strict spacing prevented placing enough nodes
  if (placedCoords.length < targetCount) {
    for (const cand of allCandidateLand) {
      if (placedCoords.length >= targetCount) break;
      if (!placedCoords.some((p) => p.gx === cand.gx && p.gy === cand.gy)) {
        placedCoords.push(cand);
      }
    }
  }

  // Assign scales & amenities
  const urbanScales: UrbanScale[] = ['metropolis', 'city', 'town', 'village', 'hamlet'];

  for (let i = 0; i < placedCoords.length; i++) {
    const coord = placedCoords[i]!;
    const nodeId = `node_${i + 1}`;
    const name = SETTLEMENT_NAMES[i % SETTLEMENT_NAMES.length] ?? `Asentamiento ${i + 1}`;

    const scale = i === 0 ? 'metropolis' : i === 1 ? 'city' : urbanScales[Math.min(urbanScales.length - 1, 2 + (i % 3))]!;

    const amenities: ContinentAmenity[] = ['center'];
    if (scale === 'metropolis' || scale === 'city' || scale === 'town') {
      amenities.push('mart');
    }
    if (i < 8 && (scale === 'metropolis' || scale === 'city')) {
      amenities.push('gym');
    }
    if (i === 0) {
      amenities.push('lab');
    }

    nodes[nodeId] = {
      id: nodeId,
      name,
      x: coord.gx * dimensions.tileSize + dimensions.tileSize / 2,
      y: coord.gy * dimensions.tileSize + dimensions.tileSize / 2,
      scale,
      amenities
    };
  }

  // 5. Connect Urban Network via Minimum Spanning Tree (MST) + Extra Loops
  const nodeEntries = Object.values(nodes);
  const connections: ContinentConnection[] = [];

  interface EdgeCandidate {
    u: string;
    v: string;
    dist: number;
  }

  const allEdges: EdgeCandidate[] = [];
  for (let i = 0; i < nodeEntries.length; i++) {
    for (let j = i + 1; j < nodeEntries.length; j++) {
      const nA = nodeEntries[i]!;
      const nB = nodeEntries[j]!;
      const dist = Math.hypot(nA.x - nB.x, nA.y - nB.y);
      allEdges.push({ u: nA.id, v: nB.id, dist });
    }
  }

  allEdges.sort((a, b) => a.dist - b.dist);

  const uf = new UnionFind();
  const mstEdges: EdgeCandidate[] = [];
  const nonMstEdges: EdgeCandidate[] = [];

  for (const edge of allEdges) {
    if (uf.union(edge.u, edge.v)) {
      mstEdges.push(edge);
    } else {
      nonMstEdges.push(edge);
    }
  }

  for (const e of mstEdges) {
    connections.push([e.u, e.v]);
  }

  // Add a few short non-MST edges to form natural loops (avoid strict trees)
  const extraLoopsCount = Math.min(nonMstEdges.length, Math.floor(nodeEntries.length * 0.4));
  for (let k = 0; k < extraLoopsCount; k++) {
    const extra = nonMstEdges[k];
    if (extra) {
      connections.push([extra.u, extra.v]);
    }
  }

  // 6. Carve Roads between Connected Nodes
  const roads = new Set<string>();

  for (const [uId, vId] of connections) {
    const nA = nodes[uId];
    const nB = nodes[vId];
    if (!nA || !nB) continue;

    const x0 = Math.floor(nA.x / dimensions.tileSize);
    const y0 = Math.floor(nA.y / dimensions.tileSize);
    const x1 = Math.floor(nB.x / dimensions.tileSize);
    const y1 = Math.floor(nB.y / dimensions.tileSize);

    // Orthogonal / Manhattan routing for classic Pokémon aesthetic
    const horizFirst = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
    const roadWidth = Math.max(1, Math.min(3, config.roadWidth || 2));
    const points: { x: number; y: number }[] = [];

    if (horizFirst) {
      const stepX = x1 >= x0 ? 1 : -1;
      for (let x = x0; stepX > 0 ? x <= x1 : x >= x1; x += stepX) {
        points.push({ x, y: y0 });
      }
      const stepY = y1 >= y0 ? 1 : -1;
      for (let y = y0; stepY > 0 ? y <= y1 : y >= y1; y += stepY) {
        points.push({ x: x1, y });
      }
    } else {
      const stepY = y1 >= y0 ? 1 : -1;
      for (let y = y0; stepY > 0 ? y <= y1 : y >= y1; y += stepY) {
        points.push({ x: x0, y });
      }
      const stepX = x1 >= x0 ? 1 : -1;
      for (let x = x0; stepX > 0 ? x <= x1 : x >= x1; x += stepX) {
        points.push({ x, y: y1 });
      }
    }

    for (const pt of points) {
      for (let ox = 0; ox < roadWidth; ox++) {
        for (let oy = 0; oy < roadWidth; oy++) {
          const rx = pt.x + ox;
          const ry = pt.y + oy;
          if (rx >= 0 && rx < gridW && ry >= 0 && ry < gridH) {
            roads.add(`${rx},${ry}`);
            biomeGrid[ry]![rx] = 'path';
          }
        }
      }
    }
  }

  return {
    dimensions,
    gridWidth: gridW,
    gridHeight: gridH,
    biomeGrid,
    nodes,
    connections,
    roads
  };
}
