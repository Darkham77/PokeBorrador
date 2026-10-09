/**
 * src/logic/map/realContinentPatchExtractor.ts
 *
 * REAL CONTINENT TRANSITION PATCH EXTRACTOR
 * Scans the actual generated continental map and extracts 100% authentic,
 * real-world 3x3 / 5x5 transition patches across the 4 key terrain systems:
 *   1. Water & Coastlines (Lakes, beaches, capes, ocean shores)
 *   2. Mountain Cliffs (Elevations, south walls, corners, stairs)
 *   3. Paths (Routes, turns, dirt trails)
 *   4. Macro Biomes (Mint grass, deserts, volcanic dirt)
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';
import type {
  ContinentTransitionCategory,
  MountainPatchSubtype,
  RealContinentPatch,
  ResolvedPatchCell,
  CellNeighborhood,
  NeighborCellSummary,
  NeighborDirection,
  TileBlitInstruction
} from '../../types/map/autotileStudioTypes.ts';
import {
  buildMapBlitInstructions,
  CANVAS_TILE_SIZE
} from './canvasTileRenderer.ts';
import { BASE_GRASS_TILE } from './waterAutotileEngine.ts';
import { CANONICAL_ASSETS_BY_ID } from './canonicalAssetsRegistry.ts';

const FALLBACK_PREFAB_DIMS: Record<string, { readonly w: number; readonly h: number }> = {
  tree_viridian_forest: { w: 64, h: 96 },
  poke_tree_poke: { w: 64, h: 96 },
  tree_poke: { w: 64, h: 96 },
  poke_tree_cuttable: { w: 32, h: 32 },
  poke_signpost: { w: 32, h: 32 },
  poke_cave_boulder_rock: { w: 32, h: 32 },
  poke_cave_rubble_stones: { w: 32, h: 32 },
  poke_rock_boulder: { w: 32, h: 32 },
  poke_rock_rubble: { w: 32, h: 32 }
};

export function getInstructionDimensions(filename: string): { readonly w: number; readonly h: number } {
  const baseId = filename.replace(/\.png$/, '');
  const canon = CANONICAL_ASSETS_BY_ID[baseId];
  if (canon?.pixelDimensions) {
    return canon.pixelDimensions;
  }
  const fallback = FALLBACK_PREFAB_DIMS[baseId];
  if (fallback) {
    return fallback;
  }
  return { w: CANVAS_TILE_SIZE, h: CANVAS_TILE_SIZE };
}

export interface PatchExtractorOptions {
  readonly radius?: number; // 1 = 3x3, 2 = 5x5, 3 = 7x7 (default: 1)
  readonly maxPerCategory?: number; // default: 16
  readonly mountainLimit?: number; // custom limit for mountains
}

/**
 * Extracts authentic, real-world transition patches from a generated continent.
 */
export function extractRealContinentPatches(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid?: readonly (readonly boolean[])[],
  wilderness?: WildernessLayerResult | null,
  options?: PatchExtractorOptions
): readonly RealContinentPatch[] {
  const radius = options?.radius ?? 1;
  const maxPerCat = options?.maxPerCategory ?? 16;
  const mountainLimit = options?.mountainLimit ?? Math.max(maxPerCat, 48);

  const W = continent.width;
  const H = continent.height;
  const seed = continent.seed;

  // 1. Build the full blit instructions exactly as the game engine does
  const { instructions } = buildMapBlitInstructions(
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness
  );

  // 2. Compile an O(1) 2D grid of layered tile stacks: [y][x] => string[]
  const blitGrid: string[][][] = Array.from({ length: H }, () => // no-domain: Estructura o identificador procedural de aventura
    Array.from({ length: W }, () => [])
  );

  for (const inst of instructions) {
    const { w: pw, h: ph } = getInstructionDimensions(inst.filename);
    const startGx = Math.max(0, Math.floor(inst.px / CANVAS_TILE_SIZE));
    const endGx = Math.min(W - 1, Math.floor((inst.px + pw - 1) / CANVAS_TILE_SIZE));
    const startGy = Math.max(0, Math.floor(inst.py / CANVAS_TILE_SIZE));
    const endGy = Math.min(H - 1, Math.floor((inst.py + ph - 1) / CANVAS_TILE_SIZE));

    for (let gy = startGy; gy <= endGy; gy++) {
      for (let gx = startGx; gx <= endGx; gx++) {
        blitGrid[gy]![gx]!.push(inst.filename);
      }
    }
  }

  // 3. Scan the map and find transition interest points with spatial dispersion
  const waterPoints = findWaterCoastCandidates(continent, radius, maxPerCat);
  const mountainPoints = findMountainCandidates(continent, radius, mountainLimit);
  const pathPoints = findPathCandidates(continent, pathGrid, radius, maxPerCat);
  const macroBiomePoints = findMacroBiomeCandidates(continent, radius, maxPerCat);

  const patches: RealContinentPatch[] = [];

  for (const pt of waterPoints) {
    patches.push(buildPatch(continent, blitGrid, instructions, pt.x, pt.y, radius, 'water_coast', pt.title, pt.desc, seed));
  }

  for (const pt of mountainPoints) {
    patches.push(buildPatch(continent, blitGrid, instructions, pt.x, pt.y, radius, 'mountain_cliff', pt.title, pt.desc, seed, pt.mountainSubtype));
  }

  for (const pt of pathPoints) {
    patches.push(buildPatch(continent, blitGrid, instructions, pt.x, pt.y, radius, 'path', pt.title, pt.desc, seed));
  }

  for (const pt of macroBiomePoints) {
    patches.push(buildPatch(continent, blitGrid, instructions, pt.x, pt.y, radius, 'macro_biome', pt.title, pt.desc, seed));
  }

  return patches;
}

interface CandidatePoint {
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly desc: string;
  readonly mountainSubtype?: MountainPatchSubtype;
}


function isFarEnough(candidates: readonly CandidatePoint[], x: number, y: number, minDist = 4): boolean {
  for (const c of candidates) {
    const distSq = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (distSq < minDist ** 2) return false;
  }
  return true;
}

function findWaterCoastCandidates(continent: ContinentMapResult, radius: number, max: number): readonly CandidatePoint[] {
  const points: CandidatePoint[] = [];
  const W = continent.width;
  const H = continent.height;
  const terrain = continent.terrainMatrix;

  for (let y = radius + 2; y < H - radius - 2 && points.length < max; y++) {
    for (let x = radius + 2; x < W - radius - 2 && points.length < max; x++) {
      const cur = terrain[y]?.[x];
      if (cur !== 'water' && cur !== 'sand') continue;

      const hasGrass =
        terrain[y - 1]?.[x] === 'grass' ||
        terrain[y + 1]?.[x] === 'grass' ||
        terrain[y]?.[x - 1] === 'grass' ||
        terrain[y]?.[x + 1] === 'grass';

      const hasSand =
        terrain[y - 1]?.[x] === 'sand' ||
        terrain[y + 1]?.[x] === 'sand' ||
        terrain[y]?.[x - 1] === 'sand' ||
        terrain[y]?.[x + 1] === 'sand';

      if ((cur === 'sand' && hasGrass) || (cur === 'water' && (hasSand || hasGrass))) {
        if (isFarEnough(points, x, y, 5)) {
          const title = cur === 'sand' ? `Playa y Césped (X: ${x}, Y: ${y})` : `Orilla Costera (X: ${x}, Y: ${y})`;
          const desc = cur === 'sand' ? 'Transición de arena costera con tierra' : 'Borde de agua marina con costa';
          points.push({ x, y, title, desc });
        }
      }
    }
  }

  return points;
}

interface ScoredMountainCandidate extends CandidatePoint {
  readonly subtype: MountainPatchSubtype;
  readonly priority: number;
  readonly elev: number;
}

function findMountainCandidates(continent: ContinentMapResult, radius: number, max: number): readonly CandidatePoint[] {
  const W = continent.width;
  const H = continent.height;
  const heights = continent.heightmap;

  const stairs: ScoredMountainCandidate[] = [];
  const multiTier: ScoredMountainCandidate[] = [];
  const southWalls: ScoredMountainCandidate[] = [];
  const corners: ScoredMountainCandidate[] = [];
  const baseCliffs: ScoredMountainCandidate[] = [];

  // 1. Placed Stairs & Stair Cells
  if (continent.placedStairs) {
    for (const st of continent.placedStairs) {
      if (st.x >= radius + 1 && st.x < W - radius - 1 && st.y >= radius + 1 && st.y < H - radius - 1) {
        const curH = heights[st.y]?.[st.x] ?? 0;
        stairs.push({
          x: st.x,
          y: st.y,
          title: `🪜 Escalera de Montaña (Piso ${curH}) (X: ${st.x}, Y: ${st.y})`,
          desc: 'Acceso escalonado entre niveles de montaña',
          subtype: 'stairs',
          mountainSubtype: 'stairs',
          priority: 100,
          elev: curH
        });
      }
    }
  }

  // 2. Full-map Candidate Sweep
  for (let y = radius + 1; y < H - radius - 1; y++) {
    for (let x = radius + 1; x < W - radius - 1; x++) {
      const curH = heights[y]?.[x] ?? 0;
      if (curH <= 0) continue;

      const nH = heights[y - 1]?.[x] ?? 0;
      const sH = heights[y + 1]?.[x] ?? 0;
      const wH = heights[y]?.[x - 1] ?? 0;
      const eH = heights[y]?.[x + 1] ?? 0;

      const minOrth = Math.min(nH, sH, wH, eH);
      const touchesLower = minOrth < curH;

      if (!touchesLower) {
        if (curH >= 2) {
          let hasLowerNear = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if ((heights[y + dy]?.[x + dx] ?? 0) < curH) {
                hasLowerNear = true;
                break;
              }
            }
            if (hasLowerNear) break;
          }
          if (hasLowerNear) {
            multiTier.push({
              x,
              y,
              title: `🏔️ Meseta Elevada Piso ${curH} (X: ${x}, Y: ${y})`,
              desc: `Meseta interior de piso ${curH} con terrazas próximas`,
              subtype: 'multi_tier',
              mountainSubtype: 'multi_tier',
              priority: 70,
              elev: curH
            });
          }
        }
        continue;
      }

      if (continent.cells[y]?.[x]?.isStair) {
        stairs.push({
          x,
          y,
          title: `🪜 Escalera de Montaña (Piso ${curH}) (X: ${x}, Y: ${y})`,
          desc: 'Conexión escalonada entre pisos',
          subtype: 'stairs',
          mountainSubtype: 'stairs',
          priority: 100,
          elev: curH
        });
      }

      if (curH >= 2) {
        if (minOrth > 0) {
          multiTier.push({
            x,
            y,
            title: `🏔️ Piso ${curH} sobre Terraza Piso ${minOrth} (X: ${x}, Y: ${y})`,
            desc: `Acantilado entre pisos elevados (${curH} → ${minOrth})`,
            subtype: 'multi_tier',
            mountainSubtype: 'multi_tier',
            priority: 95,
            elev: curH
          });
        } else {
          multiTier.push({
            x,
            y,
            title: `🏔️ Acantilado Doble Piso ${curH} a Suelo (X: ${x}, Y: ${y})`,
            desc: `Caída vertical directa de piso ${curH} a nivel base`,
            subtype: 'multi_tier',
            mountainSubtype: 'multi_tier',
            priority: 85,
            elev: curH
          });
        }

        if (sH < curH) {
          southWalls.push({
            x,
            y,
            title: `🧗 Pared Sur Piso ${curH} (Pie 2.5D) (X: ${x}, Y: ${y})`,
            desc: `Pared sur de piso ${curH} con proyección de pie en (${x}, ${y + 1})`,
            subtype: 'south_wall',
            mountainSubtype: 'south_wall',
            priority: 80,
            elev: curH
          });
        }

        if ((nH < curH || sH < curH) && (wH < curH || eH < curH)) {
          corners.push({
            x,
            y,
            title: `📐 Esquina de Piso ${curH} (X: ${x}, Y: ${y})`,
            desc: `Vértice de meseta en elevación ${curH}`,
            subtype: 'corners',
            mountainSubtype: 'corners',
            priority: 75,
            elev: curH
          });
        }
      } else {
        if (sH < curH) {
          southWalls.push({
            x,
            y,
            title: `🧗 Pared Sur Base Piso 1 (Pie 2.5D) (X: ${x}, Y: ${y})`,
            desc: 'Pared sur frontal proyectada al suelo',
            subtype: 'south_wall',
            mountainSubtype: 'south_wall',
            priority: 45,
            elev: 1
          });
        } else if ((nH < curH || sH < curH) && (wH < curH || eH < curH)) {
          corners.push({
            x,
            y,
            title: `📐 Esquina Base Piso 1 (X: ${x}, Y: ${y})`,
            desc: 'Vértice o esquina de acantilado nivel 1',
            subtype: 'corners',
            mountainSubtype: 'corners',
            priority: 40,
            elev: 1
          });
        } else {
          baseCliffs.push({
            x,
            y,
            title: `⛰️ Acantilado Base Piso 1 (X: ${x}, Y: ${y})`,
            desc: 'Borde de montaña sobre terreno base',
            subtype: 'base_cliff',
            mountainSubtype: 'base_cliff',
            priority: 30,
            elev: 1
          });
        }
      }
    }
  }

  // 3. Stratified Selection with Spatial Dispersion
  const selected: ScoredMountainCandidate[] = [];
  const seenCoords = new Set<string>();

  function tryAdd(cand: ScoredMountainCandidate, minDist: number): boolean {
    if (selected.length >= max) return false;
    const coordKey = `${cand.x},${cand.y}`;
    if (seenCoords.has(coordKey)) return false;
    if (!isFarEnough(selected, cand.x, cand.y, minDist)) return false;
    seenCoords.add(coordKey);
    selected.push(cand);
    return true;
  }

  // Pass 1: High priority features with normal spacing
  for (const c of stairs) tryAdd(c, 3);
  for (const c of multiTier) tryAdd(c, 4);
  for (const c of southWalls) tryAdd(c, 4);
  for (const c of corners) tryAdd(c, 4);
  for (const c of baseCliffs) tryAdd(c, 4);

  // Pass 2: If quota remains, fill with slightly relaxed spacing (minDist = 2)
  if (selected.length < max) {
    for (const c of multiTier) tryAdd(c, 2);
    for (const c of southWalls) tryAdd(c, 2);
    for (const c of corners) tryAdd(c, 2);
    for (const c of baseCliffs) tryAdd(c, 2);
  }

  return selected.slice(0, max);
}

function findPathCandidates(
  continent: ContinentMapResult,

  pathGrid: readonly (readonly boolean[])[],
  radius: number,
  max: number
): readonly CandidatePoint[] {
  const points: CandidatePoint[] = [];
  const W = continent.width;
  const H = continent.height;

  for (let y = radius + 2; y < H - radius - 2 && points.length < max; y++) {
    for (let x = radius + 2; x < W - radius - 2 && points.length < max; x++) {
      if (!pathGrid[y]?.[x]) continue;

      const hasNonPath =
        !pathGrid[y - 1]?.[x] ||
        !pathGrid[y + 1]?.[x] ||
        !pathGrid[y]?.[x - 1] ||
        !pathGrid[y]?.[x + 1];

      if (hasNonPath && isFarEnough(points, x, y, 6)) {
        const title = `Camino Rural (X: ${x}, Y: ${y})`;
        const desc = 'Curva o borde de camino de tierra sobre el terreno';
        points.push({ x, y, title, desc });
      }
    }
  }

  return points;
}

function findMacroBiomeCandidates(continent: ContinentMapResult, radius: number, max: number): readonly CandidatePoint[] {
  const points: CandidatePoint[] = [];
  if (!continent.macroBiomes) return points;

  const W = continent.width;
  const H = continent.height;
  const grid = continent.macroBiomes.biomeGrid;

  for (let y = radius + 2; y < H - radius - 2 && points.length < max; y++) {
    for (let x = radius + 2; x < W - radius - 2 && points.length < max; x++) {
      const curB = grid[y]?.[x];
      if (!curB || curB === 'temperate_meadow') continue;

      const touchesPlains =
        grid[y - 1]?.[x] === 'temperate_meadow' ||
        grid[y + 1]?.[x] === 'temperate_meadow' ||
        grid[y]?.[x - 1] === 'temperate_meadow' ||
        grid[y]?.[x + 1] === 'temperate_meadow';

      if (touchesPlains && isFarEnough(points, x, y, 6)) {
        const title = `Borde de Bioma: ${curB} (X: ${x}, Y: ${y})`;
        const desc = `Transición orgánica de ${curB} con pradera templada`;
        points.push({ x, y, title, desc });
      }
    }
  }

  return points;
}

export function findPatchInstructions(
  instructions: readonly TileBlitInstruction[],
  cx: number,
  cy: number,
  radius: number
): readonly TileBlitInstruction[] {
  const patchMinPx = (cx - radius) * CANVAS_TILE_SIZE;
  const patchMinPy = (cy - radius) * CANVAS_TILE_SIZE;
  const patchMaxPx = (cx + radius + 1) * CANVAS_TILE_SIZE;
  const patchMaxPy = (cy + radius + 1) * CANVAS_TILE_SIZE;

  return instructions.filter((inst) => {
    const { w, h } = getInstructionDimensions(inst.filename);
    const instMinPx = inst.px;
    const instMinPy = inst.py;
    const instMaxPx = inst.px + w;
    const instMaxPy = inst.py + h;

    return (
      instMinPx < patchMaxPx &&
      instMaxPx > patchMinPx &&
      instMinPy < patchMaxPy &&
      instMaxPy > patchMinPy
    );
  });
}

function buildPatch(
  continent: ContinentMapResult,
  blitGrid: string[][][],
  instructions: readonly TileBlitInstruction[],
  cx: number,
  cy: number,
  radius: number,
  category: ContinentTransitionCategory,
  title: string,
  desc: string,
  seed: number,
  mountainSubtype?: MountainPatchSubtype
): RealContinentPatch {
  const W = continent.width;
  const H = continent.height;
  const cells: ResolvedPatchCell[][] = [];

  let minElev = 999;
  let maxElev = -999;

  for (let dy = -radius; dy <= radius; dy++) {
    const row: ResolvedPatchCell[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      const gx = cx + dx;
      const gy = cy + dy;
      const isCenter = dx === 0 && dy === 0;

      let layerStack: readonly string[]; // no-domain: composite layer stack
      let filename: string;
      let terrainKind: string | undefined;
      let elevation: number | undefined;

      if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
        const stack = blitGrid[gy]?.[gx] ?? [];
        layerStack = stack.length > 0 ? stack : [BASE_GRASS_TILE];
        filename = layerStack[layerStack.length - 1] ?? BASE_GRASS_TILE;
        terrainKind = continent.terrainMatrix[gy]?.[gx];
        elevation = continent.heightmap[gy]?.[gx];
        if (typeof elevation === 'number') {
          if (elevation < minElev) minElev = elevation;
          if (elevation > maxElev) maxElev = elevation;
        }
      } else {
        layerStack = [BASE_GRASS_TILE];
        filename = BASE_GRASS_TILE;
      }

      row.push({
        x: gx,
        y: gy,
        filename,
        layerStack,
        isCenter,
        terrainKind,
        elevation
      });
    }
    cells.push(row);
  }

  const centerCell = cells[radius]![radius]!;
  const patchInstructions = findPatchInstructions(instructions, cx, cy, radius);

  let resolvedSubtype = mountainSubtype;
  if (category === 'mountain_cliff') {
    if (!resolvedSubtype || resolvedSubtype === 'base_cliff') {
      if (maxElev >= 2 && minElev < maxElev) {
        resolvedSubtype = 'multi_tier';
      }
    }
  }

  return {
    id: `${category}_s${seed}_x${cx}_y${cy}`,
    seed,
    centerX: cx,
    centerY: cy,
    category,
    title,
    description: desc,
    cells,
    centerCell,
    radius,
    instructions: patchInstructions,
    mountainSubtype: resolvedSubtype,
    maxElevationInPatch: maxElev !== -999 ? maxElev : undefined,
    minElevationInPatch: minElev !== 999 ? minElev : undefined
  };
}

/**
 * Extracts the immediate 3x3 neighborhood (8 surrounding directions + center)
 * for an arbitrary tile coordinate in the continental map.
 */
export function extractCellNeighborhood(
  continent: ContinentMapResult,
  tileX: number,
  tileY: number
): CellNeighborhood {
  const W = continent.width;
  const H = continent.height;
  const grid: NeighborCellSummary[][] = [];

  const dirMap: readonly (readonly NeighborDirection[])[] = [
    ['NW', 'N', 'NE'],
    ['W', 'C', 'E'],
    ['SW', 'S', 'SE']
  ];

  for (let dy = -1; dy <= 1; dy++) {
    const row: NeighborCellSummary[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      const gx = tileX + dx;
      const gy = tileY + dy;
      const dir = dirMap[dy + 1]![dx + 1]!;

      if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
        const cell = continent.cells[gy]?.[gx];
        const terrain = cell?.terrain ?? continent.terrainMatrix[gy]?.[gx] ?? 'unknown';
        const topTile = cell?.layerStack && cell.layerStack.length > 0
          ? cell.layerStack[cell.layerStack.length - 1]!
          : (terrain === 'water' ? 'water.png' : 'grass.png');
        row.push({
          dir,
          x: gx,
          y: gy,
          terrain,
          tile: topTile,
          elevation: cell?.elevation ?? continent.heightmap[gy]?.[gx]
        });
      } else {
        row.push({
          dir,
          x: gx,
          y: gy,
          terrain: 'void',
          tile: 'void'
        });
      }
    }
    grid.push(row);
  }

  const asciiLines: string[] = []; // no-domain: dynamic formatted text lines
  for (const row of grid) {
    const line = row
      .map(c => `[${c.dir.padEnd(2)}: ${(c.dir === 'C' ? '*ERROR*' : c.terrain).padEnd(7)}]`)
      .join(' ');
    asciiLines.push(line);
  }

  return {
    cells: grid,
    asciiGrid: asciiLines.join('\n')
  };
}
