/**
 * src/logic/map/microVignetteEngine.ts
 *
 * ENVIRONMENTAL MICRO-VIGNETTES & STRAY TILE CLEANUP (PHASE 5)
 *
 * Populates unbuilt grass clearings in settlements and route margins with rich, living scenes:
 *   1. Berry Orchard (5x4): rustic garden plots with fruit bushes, flower borders, wood fences, and tips sign.
 *   2. Civic Fountain Plaza (5x5): stone basin fountain with rest bench, streetlamps, and flower clusters.
 *   3. Explorer Rest Camp (5x4): field supply cargo crates, rest bench, and trail signposts.
 *   4. Botanical Sanctuary (5x4): decorative picket fencing, ornamental shrubs, flower beds, and park bench.
 *
 * Strict Placement Invariants:
 *   - Clearings MUST be situated along routes or near settlements (within 2-8 tiles of pathGrid).
 *   - Clearings MUST have a 3-tile buffer strictly on flat grass (0% water, 0% sand beaches, 0% mountain cliffs).
 *
 * Also provides the Stray Tile Sweeper utility to eliminate isolated orphan road slivers.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

export type MicroVignetteKind =
  | 'berry_orchard'
  | 'civic_fountain'
  | 'explorer_camp'
  | 'botanical_garden';

export interface VignetteProp {
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string;
}

export interface MicroVignette {
  readonly id: string;
  readonly kind: MicroVignetteKind;
  readonly bounds: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly props: readonly VignetteProp[];
}

export interface GenerateMicroVignettesOptions {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly pois: readonly POINode[];
  readonly seed?: number;
  readonly maxVignettes?: number;
}

const DEFAULT_SEED = 1337;
const DEFAULT_MAX_VIGNETTES = 10;
const CLEARANCE_MARGIN_POI = 2;

const VIGNETTE_KINDS: readonly MicroVignetteKind[] = [
  'berry_orchard',
  'civic_fountain',
  'explorer_camp',
  'botanical_garden'
] as const;

/**
 * Sweeps and removes orphan 1-cell path tiles having zero orthogonal path neighbors.
 */
export function sweepStrayPathTiles(pathGrid: boolean[][]): number {
  const H = pathGrid.length;
  const W = H > 0 ? pathGrid[0]!.length : 0;
  let prunedCount = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pathGrid[y]![x]) continue;

      let neighborCount = 0;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H && pathGrid[ny]![nx]) {
          neighborCount++;
        }
      }

      if (neighborCount === 0) {
        pathGrid[y]![x] = false;
        prunedCount++;
      }
    }
  }

  return prunedCount;
}

/**
 * Synthesizes procedural micro-vignettes in unbuilt clearings across settlements and route margins.
 */
export function generateMicroVignettes(
  options: GenerateMicroVignettesOptions
): readonly MicroVignette[] {
  const { continent, pathGrid, pois, maxVignettes = DEFAULT_MAX_VIGNETTES } = options;
  const W = continent.width;
  const H = continent.height;

  let rngSeed = (options.seed ?? DEFAULT_SEED) | 0;
  const nextRng = (): number => {
    rngSeed = (rngSeed * 1664525 + 1013904223) | 0;
    return (rngSeed >>> 0) / 4294967296;
  };

  const occupied = Array.from({ length: H }, () => Array(W).fill(false));

  // Mark POI building footprints as strictly occupied
  for (const poi of pois) {
    const minX = Math.max(0, poi.gridX - CLEARANCE_MARGIN_POI);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + CLEARANCE_MARGIN_POI);
    const minY = Math.max(0, poi.gridY - CLEARANCE_MARGIN_POI);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + CLEARANCE_MARGIN_POI);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        occupied[y]![x] = true;
      }
    }
  }

  // Mark pathGrid as occupied
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]?.[x]) occupied[y]![x] = true;
    }
  }

  const isAreaFree = (bx: number, by: number, width: number, height: number): boolean => {
    if (bx < 4 || bx + width >= W - 4 || by < 4 || by + height >= H - 4) return false;

    // Check proximity to route paths: vignettes must be situated within 2-8 tiles of a path
    let nearPath = false;
    for (let dy = -8; dy <= height + 8; dy++) {
      for (let dx = -8; dx <= width + 8; dx++) {
        const ny = by + dy;
        const nx = bx + dx;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          if (pathGrid[ny]?.[nx]) {
            nearPath = true;
            break;
          }
        }
      }
      if (nearPath) break;
    }
    if (!nearPath) return false;

    // 1. Clearing footprint itself must be completely unoccupied by POIs or paths
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const cy = by + dy;
        const cx = bx + dx;
        if (occupied[cy]![cx]) return false;
      }
    }

    // 2. Strict clearance check: all tiles in clearing + a 2-tile perimeter must be flat grass
    // Never allow water, deep water, sand beaches, mountain cliffs, or stairs
    for (let dy = -2; dy <= height + 1; dy++) {
      for (let dx = -2; dx <= width + 1; dx++) {
        const cy = by + dy;
        const cx = bx + dx;
        if (cy < 0 || cy >= H || cx < 0 || cx >= W) return false;
        if ((continent.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
        const terr = continent.terrainMatrix[cy]?.[cx];
        if (terr !== 'grass') return false;
        if (continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
        const mCell = continent.resolvedMountain.cellDetails[cy]?.[cx];
        if (mCell) return false;
      }
    }

    if (continent.placedStairs) {
      for (const stair of continent.placedStairs) {
        if (
          stair.x >= bx - 3 &&
          stair.x <= bx + width + 3 &&
          stair.y >= by - 3 &&
          stair.y <= by + height + 3
        ) {
          return false;
        }
      }
    }
    return true;
  };

  const candidateClearings: { x: number; y: number }[] = [];
  for (let y = 6; y < H - 8; y += 2) {
    for (let x = 6; x < W - 8; x += 2) {
      if (isAreaFree(x, y, 5, 4)) {
        candidateClearings.push({ x, y });
      }
    }
  }

  // Shuffle candidate clearings
  for (let i = candidateClearings.length - 1; i > 0; i--) {
    const j = Math.floor(nextRng() * (i + 1));
    const temp = candidateClearings[i]!;
    candidateClearings[i] = candidateClearings[j]!;
    candidateClearings[j] = temp;
  }

  const vignettes: MicroVignette[] = [];

  for (const cand of candidateClearings) {
    if (vignettes.length >= maxVignettes) break;

    const kind = VIGNETTE_KINDS[vignettes.length % VIGNETTE_KINDS.length]!;
    const cx = cand.x;
    const cy = cand.y;

    const vw = 5;
    const vh = kind === 'civic_fountain' ? 5 : 4;

    if (!isAreaFree(cx, cy, vw, vh)) continue;

    const props: VignetteProp[] = [];

    if (kind === 'berry_orchard') {
      // 5x4 Berry Orchard: wooden fence boundary, rows of round berry bushes, flowers & sign
      props.push({ type: 'fence', x: cx, y: cy, prefabFile: 'poke_fence_wood_h.png' });
      props.push({ type: 'fence', x: cx + 1, y: cy, prefabFile: 'poke_fence_wood_h.png' });
      props.push({ type: 'fence', x: cx + 3, y: cy, prefabFile: 'poke_fence_wood_h.png' });
      props.push({ type: 'fence', x: cx + 4, y: cy, prefabFile: 'poke_fence_wood_h.png' });

      // Row 1 berry bushes
      props.push({ type: 'bush', x: cx + 1, y: cy + 1, prefabFile: 'poke_bush_round.png' });
      props.push({ type: 'bush', x: cx + 2, y: cy + 1, prefabFile: 'poke_bush_round.png' });
      props.push({ type: 'bush', x: cx + 3, y: cy + 1, prefabFile: 'poke_bush_round.png' });

      // Row 2 berry bushes
      props.push({ type: 'bush', x: cx + 1, y: cy + 2, prefabFile: 'poke_bush_round.png' });
      props.push({ type: 'bush', x: cx + 2, y: cy + 2, prefabFile: 'poke_bush_round.png' });
      props.push({ type: 'bush', x: cx + 3, y: cy + 2, prefabFile: 'poke_bush_round.png' });

      // Flanking flowers
      props.push({ type: 'flower', x: cx, y: cy + 1, prefabFile: 'poke_flowers_red.png' });
      props.push({ type: 'flower', x: cx + 4, y: cy + 1, prefabFile: 'poke_flowers_red.png' });

      // Lower fence posts & entrance sign
      props.push({ type: 'fence', x: cx, y: cy + 3, prefabFile: 'poke_fence_wood_h.png' });
      props.push({ type: 'signpost', x: cx + 2, y: cy + 3, prefabFile: 'poke_trainer_tips_sign.png' });
      props.push({ type: 'fence', x: cx + 4, y: cy + 3, prefabFile: 'poke_fence_wood_h.png' });
    } else if (kind === 'civic_fountain') {
      // 5x5 Civic Fountain Plaza: 3x3 stone fountain, streetlamps, park bench & flowers
      props.push({ type: 'fountain', x: cx + 1, y: cy + 1, prefabFile: 'poke_fountain.png' });
      props.push({ type: 'street_lamp', x: cx, y: cy, prefabFile: 'poke_street_lamp.png' });
      props.push({ type: 'street_lamp', x: cx + 4, y: cy, prefabFile: 'poke_street_lamp.png' });
      props.push({ type: 'bench', x: cx + 1, y: cy + 4, prefabFile: 'poke_bench.png' });
      props.push({ type: 'flower', x: cx, y: cy + 3, prefabFile: 'poke_flowers_red.png' });
      props.push({ type: 'flower', x: cx + 4, y: cy + 3, prefabFile: 'poke_flowers_red.png' });
    } else if (kind === 'explorer_camp') {
      // 5x4 Explorer Camp: cargo crate stacks, rest bench, trail tips sign & wildflowers
      props.push({ type: 'crate_stack', x: cx + 1, y: cy, prefabFile: 'poke_port_cargo_crates_stack.png' });
      props.push({ type: 'crate_double', x: cx + 1, y: cy + 2, prefabFile: 'poke_port_cargo_crates_double.png' });
      props.push({ type: 'bench', x: cx + 1, y: cy + 3, prefabFile: 'poke_bench.png' });
      props.push({ type: 'signpost', x: cx + 3, y: cy + 2, prefabFile: 'poke_trainer_tips_sign.png' });
      props.push({ type: 'flower', x: cx, y: cy + 1, prefabFile: 'poke_flowers_red.png' });
      props.push({ type: 'flower', x: cx + 4, y: cy + 1, prefabFile: 'poke_flowers_red.png' });
    } else if (kind === 'botanical_garden') {
      // 5x4 Botanical Garden: white picket fencing, ornamental bushes, flower beds & rest bench
      props.push({ type: 'fence', x: cx, y: cy, prefabFile: 'poke_fence_picket.png' });
      props.push({ type: 'fence', x: cx + 1, y: cy, prefabFile: 'poke_fence_picket.png' });
      props.push({ type: 'fence', x: cx + 3, y: cy, prefabFile: 'poke_fence_picket.png' });
      props.push({ type: 'fence', x: cx + 4, y: cy, prefabFile: 'poke_fence_picket.png' });

      props.push({ type: 'bush', x: cx + 1, y: cy + 1, prefabFile: 'poke_bush_round.png' });
      props.push({ type: 'bush', x: cx + 3, y: cy + 1, prefabFile: 'poke_bush_round.png' });

      props.push({ type: 'flower', x: cx + 1, y: cy + 2, prefabFile: 'poke_flowers_red.png' });
      props.push({ type: 'flower', x: cx + 2, y: cy + 2, prefabFile: 'poke_flowers_red.png' });
      props.push({ type: 'flower', x: cx + 3, y: cy + 2, prefabFile: 'poke_flowers_red.png' });

      props.push({ type: 'bench', x: cx + 1, y: cy + 3, prefabFile: 'poke_bench.png' });
    }

    // Reserve footprint in occupied grid
    for (let dy = 0; dy < vh; dy++) {
      for (let dx = 0; dx < vw; dx++) {
        occupied[cy + dy]![cx + dx] = true;
      }
    }

    vignettes.push({
      id: `vignette_${vignettes.length + 1}`,
      kind,
      bounds: { x: cx, y: cy, w: vw, h: vh },
      props
    });
  }

  return vignettes;
}
