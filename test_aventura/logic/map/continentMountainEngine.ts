/**
 * src/logic/map/continentMountainEngine.ts
 *
 * PROCEDURAL CONTINENTAL MOUNTAIN & MULTI-TIER MASSIF ENGINE
 *
 * Handles:
 *   1. Modulated 2D ridge noise synthesis with central valley suppression.
 *   2. Procedural multi-tier massif elevation scaling (1 to 4 floors based on mass).
 *   3. Concentric cushion buffering guaranteeing zero cardinal drops > 1 elevation.
 *   4. Stair placement across all active tiers (Z to Z-1) with walkable landing floor validation.
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import { sanitizeHeightmapMatrix } from './heightmapConstraints.ts';
import {
  resolveMountainMapGrid,
  normalizeHeightmapDiagonals,
  type ResolvedMountainMapResult,
  type MountainPalette,
  type MountainStairLocation
} from './mountainAutotileEngine.ts';
import { findStairCandidates } from './organicMountainGenerator.ts';
import type { WaterTerrainMatrix } from './waterAutotileEngine.ts';
import {
  clusterMountainMassifs,
  type GeologicalClusterResult
} from './geologicalClusterEngine.ts';
import type { ContinentGeneratorOptions } from './continentGenerator.ts';

export const CORDILLERA_TIER_4_MIN_CELLS = 240 as const;
export const MASSIF_TIER_3_MIN_CELLS = 130 as const;
export const MASSIF_TIER_2_MIN_CELLS = 25 as const;
export const DEFAULT_MOUNTAIN_RATIO = 0.20 as const;
export const DEFAULT_MOUNTAIN_PALETTE: MountainPalette = 'brown' as const;
export const DEFAULT_SEED = 42 as const;

/**
 * Prunes isolated pits, tiny depressions, and orphan U/L wall fragments inside mountain plateaus.
 */
export function pruneOrphanCliffWalls(
  heightmap: number[][],
  isWaterCell?: (x: number, y: number) => boolean
): number[][] {
  const H = heightmap.length;
  if (H === 0) return heightmap;
  const W = heightmap[0]?.length ?? 0;

  const result = heightmap.map((row) => [...row]);

  // Pass 1: Fill sunken 1-cell or 2-cell pits completely surrounded by higher elevation
  for (let iter = 0; iter < 2; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (isWaterCell?.(x, y)) continue;
        const cur = result[y]![x]!;
        const neighbors = [
          result[y - 1]![x]!,
          result[y + 1]![x]!,
          result[y]![x - 1]!,
          result[y]![x + 1]!
        ];
        const minNeighbor = Math.min(...neighbors);
        if (minNeighbor > cur) {
          result[y]![x] = minNeighbor;
        }
      }
    }
  }

  // Pass 2: Prune thin protruding 1-cell spikes at elevation Z >= 1
  for (let iter = 0; iter < 2; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const cur = result[y]![x]!;
        if (cur === 0) continue;

        let sameOrHigher = 0;
        if (result[y - 1]![x]! >= cur) sameOrHigher++;
        if (result[y + 1]![x]! >= cur) sameOrHigher++;
        if (result[y]![x - 1]! >= cur) sameOrHigher++;
        if (result[y]![x + 1]! >= cur) sameOrHigher++;

        if (sameOrHigher < 2) {
          const maxNeighbor = Math.max(
            result[y - 1]![x]!,
            result[y + 1]![x]!,
            result[y]![x - 1]!,
            result[y]![x + 1]!
          );
          result[y]![x] = Math.min(cur - 1, maxNeighbor);
        }
      }
    }
  }

  return result;
}

/**
 * Generates multi-tiered mountain massifs strictly located on continental grass,
 * maintaining clearance from beaches and inland lakes.
 */
export function generateContinentalMountains(
  terrainMatrix: WaterTerrainMatrix,
  options: ContinentGeneratorOptions
): {
  readonly sanitizedHeightmap: number[][];
  readonly placedStairs: MountainStairLocation[];
  readonly mountainResult: ResolvedMountainMapResult;
  readonly geologicalClusters: GeologicalClusterResult;
} {
  const H = terrainMatrix.length;
  const W = terrainMatrix[0]?.length ?? 0;
  const seed = options.seed ?? DEFAULT_SEED;
  const palette = options.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE;
  const withStairs = options.withStairs ?? true;
  const maxStairs = options.maxStairsPerTier ?? 2;

  // 1. Identify ocean water cells via flood fill from borders to distinguish from inland freshwater lakes
  const visitedOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const oceanQueue: { x: number; y: number }[] = [];
  for (let x = 0; x < W; x++) {
    if (terrainMatrix[0]![x] === 'water') { visitedOcean[0]![x] = true; oceanQueue.push({ x, y: 0 }); }
    if (terrainMatrix[H - 1]![x] === 'water') { visitedOcean[H - 1]![x] = true; oceanQueue.push({ x, y: H - 1 }); }
  }
  for (let y = 0; y < H; y++) {
    if (terrainMatrix[y]![0] === 'water' && !visitedOcean[y]![0]) { visitedOcean[y]![0] = true; oceanQueue.push({ x: 0, y }); }
    if (terrainMatrix[y]![W - 1] === 'water' && !visitedOcean[y]![W - 1]) { visitedOcean[y]![W - 1] = true; oceanQueue.push({ x: W - 1, y }); }
  }
  let oHead = 0;
  while (oHead < oceanQueue.length) {
    const curr = oceanQueue[oHead++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (
        nx >= 0 && nx < W && ny >= 0 && ny < H &&
        !visitedOcean[ny]![nx] &&
        (terrainMatrix[ny]![nx] === 'water' || terrainMatrix[ny]![nx] === 'water_deep')
      ) {
        visitedOcean[ny]![nx] = true;
        oceanQueue.push({ x: nx, y: ny });
      }
    }
  }

  // Mask of valid mountain terrain: must be grass with clearance from ocean and sand
  const clearance = Math.min(W, H) >= 100 ? 3 : 2;
  const validZone: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] !== 'grass') continue;
      let clear = true;
      for (let dy = -clearance; dy <= clearance; dy++) {
        for (let dx = -clearance; dx <= clearance; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx < 0 || nx >= W || ny < 0 || ny >= H ||
            visitedOcean[ny]![nx] ||
            terrainMatrix[ny]![nx] === 'sand'
          ) {
            clear = false;
            break;
          }
        }
        if (!clear) break;
      }
      validZone[y]![x] = clear;
    }
  }

  // Exclude settlement footprints and margins from mountain validZone
  if (options.settlementExclusionZones) {
    for (const zone of options.settlementExclusionZones) {
      const margin = zone.margin ?? 3;
      const minX = Math.max(0, zone.x - margin);
      const maxX = Math.min(W - 1, zone.x + zone.width + margin);
      const minY = Math.max(0, zone.y - margin);
      const maxY = Math.min(H - 1, zone.y + zone.height + margin);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          validZone[y]![x] = false;
        }
      }
    }
  }



  // Generate raw heightmap using Modulated 2D Ridge Noise
  const mtnRatio = options.mountainPercentage ?? DEFAULT_MOUNTAIN_RATIO;
  const mountainNoise1 = new SimplexNoise(seed + 777);
  const mountainNoise2 = new SimplexNoise(seed + 888);
  const valleyNoise = new SimplexNoise(seed + 999);

  const rawHeightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const mountainScores: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const validScores: number[] = [];
  const cx = W / 2;
  const cy = H / 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!validZone[y]![x]) continue;

      // 1. Ridge Noise: peaks along zero-crossings to form continuous sinuous chains with broad plateaus
      const scale = Math.min(0.035, Math.max(0.022, 2.2 / Math.min(W, H)));
      const n1 = mountainNoise1.noise2D(x * scale, y * scale);
      const rawRidge1 = 1.0 - Math.abs(n1);
      const ridge1 = Math.min(1.0, Math.pow(Math.max(0.0, rawRidge1), 0.7) * 1.25);

      const n2 = mountainNoise2.noise2D(x * scale * 2.0, y * scale * 2.0);
      const rawRidge2 = 1.0 - Math.abs(n2);
      const ridge2 = Math.min(1.0, Math.pow(Math.max(0.0, rawRidge2), 0.7) * 1.25);
      const combinedRidge = ridge1 * 0.85 + ridge2 * 0.15;

      // 2. Central Habitable Valley Modulation:
      // Suppresses mountains in the core interior to leave wide central plains for cities & routes
      const distFromCenter = Math.hypot((x - cx) / (W * 0.45), (y - cy) / (H * 0.45));
      const vn = (valleyNoise.noise2D(x * scale * 0.6, y * scale * 0.6) + 1.0) / 2.0;

      const suppRadius = Math.min(W, H) >= 100 ? 0.35 : 0.20;
      const centerSuppression = distFromCenter < suppRadius ? (suppRadius - distFromCenter) / suppRadius : 0.0;
      const valleySuppression = centerSuppression * 0.60 + (vn > 0.60 ? (vn - 0.60) * 0.50 : 0.0);

      const mountainScore = Math.max(0.0, combinedRidge - valleySuppression);
      mountainScores[y]![x] = mountainScore;
      validScores.push(mountainScore);
    }
  }

  // Quantile thresholds: guarantee mountains occupy strictly ~22% of valid landmass, leaving spacious valleys for settlements
  validScores.sort((a, b) => b - a);
  const targetMountainCount = Math.floor(validScores.length * Math.min(0.24, Math.max(0.12, mtnRatio)));
  const t1Threshold = validScores[targetMountainCount] ?? 0.60;
  const targetTier2Count = Math.floor(targetMountainCount * 0.35);
  const t2Threshold = Math.max(t1Threshold + 0.08, validScores[targetTier2Count] ?? (t1Threshold + 0.15));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!validZone[y]![x]) continue;
      const s = mountainScores[y]![x]!;
      if (s >= t2Threshold) {
        rawHeightmap[y]![x] = 2;
      } else if (s >= t1Threshold) {
        rawHeightmap[y]![x] = 1;
      }
    }
  }

  // Regional Invariant: Guarantee dedicated northern mountain massif for the Pokémon League (Meseta Añil)
  const MASSIVE_MAP_DIMENSION = 200 as const;
  const NORTH_MASSIF_MIN_Y_RATIO = 0.12 as const;
  const NORTH_MASSIF_MAX_Y_RATIO = 0.32 as const;
  const NORTH_MASSIF_MIN_X_RATIO = 0.18 as const;
  const NORTH_MASSIF_MAX_X_RATIO = 0.82 as const;

  if (Math.min(W, H) >= MASSIVE_MAP_DIMENSION) {
    const pW = 24;
    const pH = 18;
    let leagueBestX = -1;
    let leagueBestY = -1;

    for (let y = Math.round(NORTH_MASSIF_MIN_Y_RATIO * H); y <= Math.round(NORTH_MASSIF_MAX_Y_RATIO * H); y += 2) {
      for (let x = Math.round(NORTH_MASSIF_MIN_X_RATIO * W); x <= Math.round(NORTH_MASSIF_MAX_X_RATIO * W); x += 2) {
        let ok = true;
        for (let dy = -2; dy < pH + 2; dy++) {
          for (let dx = -2; dx < pW + 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H || !validZone[ny]![nx]) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
        }
        if (ok) {
          leagueBestX = x;
          leagueBestY = y;
          break;
        }
      }
      if (leagueBestX !== -1) break;
    }

    if (leagueBestX !== -1) {
      for (let dy = 0; dy < pH; dy++) {
        for (let dx = 0; dx < pW; dx++) {
          rawHeightmap[leagueBestY + dy]![leagueBestX + dx] = Math.max(
            1,
            rawHeightmap[leagueBestY + dy]![leagueBestX + dx]!
          );
        }
      }
    }
  }

  // Guaranteed cave mountain massifs (guarantees south cliff wall for cave entrances)
  if (options.caveLocations) {
    for (const cave of options.caveLocations) {
      for (let dy = -8; dy <= -1; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          const cy = cave.y + dy;
          const cx = cave.x + dx;
          if (cx >= 0 && cx < W && cy >= 0 && cy < H && validZone[cy]![cx]) {
            rawHeightmap[cy]![cx] = Math.max(1, rawHeightmap[cy]![cx]!);
          }
        }
      }
    }
  }

  // Guaranteed League Plateau at elevation 1 (Palace upper tier)
  if (options.leaguePlateauZone) {
    const lz = options.leaguePlateauZone;
    const m = lz.margin ?? 4;
    const minX = Math.max(0, lz.x - m);
    const maxX = Math.min(W - 1, lz.x + lz.width + m);
    const minY = Math.max(0, lz.y - m);
    const plateauH = Math.max(10, lz.height - 12);
    const maxY = Math.min(H - 1, lz.y + plateauH);
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (terrainMatrix[y]?.[x] === 'grass') {
          rawHeightmap[y]![x] = 1;
        }
      }
    }
  }

  // Orographic Lake Basin Relief: For inland mountain lakes embedded in massifs,
  // ensure the surrounding massif rim maintains elevation >= 1 so the lake forms a sunken basin
  const visitedLake: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] === 'water' && !visitedOcean[y]![x] && !visitedLake[y]![x]) {
        const q = [{ x, y }];
        visitedLake[y]![x] = true;
        const lakeCells: { x: number; y: number }[] = [];
        let maxNearScore = 0;

        while (q.length > 0) {
          const cur = q.pop()!;
          lakeCells.push(cur);
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = cur.x + dx!;
            const ny = cur.y + dy!;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
              if (terrainMatrix[ny]![nx] === 'water' && !visitedOcean[ny]![nx] && !visitedLake[ny]![nx]) {
                visitedLake[ny]![nx] = true;
                q.push({ x: nx, y: ny });
              }
            }
          }
        }

        // Check if this lake is situated in an elevated/mountain massif sector
        for (const pt of lakeCells) {
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nx = pt.x + dx;
              const ny = pt.y + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H && validZone[ny]![nx]) {
                const s = mountainScores[ny]![nx]!;
                if (s > maxNearScore) maxNearScore = s;
              }
            }
          }
        }

        // If mountain lake: ensure orographic rim relief surrounding the basin
        // strictly for cells with high mountain noise (>= t1Threshold * 0.85) in the lake's immediate perimeter (radius <= 2)
        if (maxNearScore >= t1Threshold) {
          const rimThreshold = t1Threshold * 0.85;
          for (const pt of lakeCells) {
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nx = pt.x + dx;
                const ny = pt.y + dy;
                if (nx >= 0 && nx < W && ny >= 0 && ny < H && validZone[ny]![nx]) {
                  if (mountainScores[ny]![nx]! >= rimThreshold) {
                    rawHeightmap[ny]![nx] = Math.max(1, rawHeightmap[ny]![nx]!);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Ensure all lake water cells are strictly at elevation 0 (sunken water basin)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] === 'water' || terrainMatrix[y]![x] === 'water_deep') {
        rawHeightmap[y]![x] = 0;
      }
    }
  }

  const isWaterCell = (x: number, y: number): boolean => {
    if (x < 0 || x >= W || y < 0 || y >= H) return true;
    const t = terrainMatrix[y]![x];
    return t === 'water' || t === 'water_deep';
  };

  // 3. Procedural multi-tier scaling:
  // - Small hills (< 40 cells): capped at 1 floor
  // - Moderate massifs (40 to 129 cells): 1 to 2 floors
  // - Large massifs (130 to 239 cells): organically elevates ridge crest to 3 floors
  // - Enormous cordilleras (>= 240 cells): organically elevates ridge crest to 3 floors and apex summits to 4 floors
  const maxAllowedGlobal = options?.maxMountainTiers ?? 4;

  const rawMassifs: { x: number; y: number }[][] = [];
  const visitedMassif: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rawHeightmap[y]![x] === 0 || visitedMassif[y]![x]) continue;
      const cells: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visitedMassif[y]![x] = true;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        cells.push(curr);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
          const nx = curr.x + dx;
          const ny = curr.y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H && rawHeightmap[ny]![nx]! >= 1 && !visitedMassif[ny]![nx]) {
            visitedMassif[ny]![nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
      rawMassifs.push(cells);
    }
  }

  // Precompute Chebyshev distance clearance from mountain boundary (elevation 0)
  const mtnClearance: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rawHeightmap[y]![x] === 0) continue;
      let d = 0;
      let ok = true;
      while (ok && d < 15) {
        d++;
        for (let dy = -d; dy <= d; dy++) {
          for (let dx = -d; dx <= d; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || ny >= H || nx < 0 || nx >= W || rawHeightmap[ny]![nx] === 0) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
        }
      }
      mtnClearance[y]![x] = d - 1;
    }
  }

  for (const massif of rawMassifs) {
    const count = massif.length;
    const c0 = massif[0]!;
    const seedOffset = Math.abs(Math.sin((c0.x * 37 + c0.y * 19 + seed) * 0.1)) * 30;

    let maxMassifTier = 1;
    if (count >= CORDILLERA_TIER_4_MIN_CELLS - seedOffset) maxMassifTier = Math.min(maxAllowedGlobal, 4);
    else if (count >= MASSIF_TIER_3_MIN_CELLS - seedOffset) maxMassifTier = Math.min(maxAllowedGlobal, 3);
    else if (count >= MASSIF_TIER_2_MIN_CELLS) maxMassifTier = Math.min(maxAllowedGlobal, 2);
    else maxMassifTier = 1;

    // Small hills: demote any small isolated Tier 2 speck to Tier 1
    if (maxMassifTier === 1) {
      for (const c of massif) {
        if (rawHeightmap[c.y]![c.x]! > 1) {
          rawHeightmap[c.y]![c.x] = 1;
        }
      }
      continue;
    }

    // Guarantee that existing Tier 2 cells are strictly cushioned (mtnClearance >= 1)
    for (const c of massif) {
      if (rawHeightmap[c.y]![c.x]! >= 2 && mtnClearance[c.y]![c.x]! < 1) {
        rawHeightmap[c.y]![c.x] = 1;
      }
    }

    // Cordilleras (Tier 4)
    if (maxMassifTier >= 4) {
      let bestPeak: { x: number; y: number } | null = null;
      let bestScore = -1;

      for (const c of massif) {
        if (mtnClearance[c.y]![c.x]! >= 3) {
          const s = mtnClearance[c.y]![c.x]! * 100 + mountainScores[c.y]![c.x]!;
          if (s > bestScore) {
            bestScore = s;
            bestPeak = c;
          }
        }
      }

      if (bestPeak) {
        const px = bestPeak.x;
        const py = bestPeak.y;
        // Expand Tier 2 buffer ring around peak
        for (let dy = -6; dy <= 6; dy++) {
          for (let dx = -6; dx <= 6; dx++) {
            const ny = py + dy;
            const nx = px + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1 && mtnClearance[ny]![nx]! >= 1) {
              rawHeightmap[ny]![nx] = Math.max(rawHeightmap[ny]![nx]!, 2);
            }
          }
        }
        // Expand Tier 3 buffer ring around peak
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ny = py + dy;
            const nx = px + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1 && mtnClearance[ny]![nx]! >= 2) {
              rawHeightmap[ny]![nx] = Math.max(rawHeightmap[ny]![nx]!, 3);
            }
          }
        }
        // Solid 3x3 Tier 4 apex summit
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = py + dy;
            const nx = px + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1) {
              rawHeightmap[ny]![nx] = 4;
            }
          }
        }
      } else {
        maxMassifTier = 3;
      }
    }

    // Large massifs (Tier 3)
    if (maxMassifTier === 3) {
      let bestPeak: { x: number; y: number } | null = null;
      let bestScore = -1;
      for (const c of massif) {
        if (mtnClearance[c.y]![c.x]! >= 2) {
          const s = mtnClearance[c.y]![c.x]! * 100 + mountainScores[c.y]![c.x]!;
          if (s > bestScore) {
            bestScore = s;
            bestPeak = c;
          }
        }
      }

      if (bestPeak) {
        const px = bestPeak.x;
        const py = bestPeak.y;
        // Expand Tier 2 buffer ring
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            const ny = py + dy;
            const nx = px + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1 && mtnClearance[ny]![nx]! >= 1) {
              rawHeightmap[ny]![nx] = Math.max(rawHeightmap[ny]![nx]!, 2);
            }
          }
        }
        // Solid 3x3 Tier 3 ridge crest
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = py + dy;
            const nx = px + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1) {
              rawHeightmap[ny]![nx] = Math.max(rawHeightmap[ny]![nx]!, 3);
            }
          }
        }
      }
    }

    // Moderate massifs (Tier 2): actively force an interior terrace with interior cliff
    if (maxMassifTier >= 2) {
      let hasTier2 = false;
      for (const c of massif) {
        if (rawHeightmap[c.y]![c.x]! >= 2) {
          hasTier2 = true;
          break;
        }
      }

      if (!hasTier2) {
        let bestPeak: { x: number; y: number } | null = null;
        let bestScore = -1;
        for (const c of massif) {
          if (mtnClearance[c.y]![c.x]! >= 1) {
            const s = mtnClearance[c.y]![c.x]! * 100 + mountainScores[c.y]![c.x]!;
            if (s > bestScore) {
              bestScore = s;
              bestPeak = c;
            }
          }
        }
        if (!bestPeak) {
          for (const c of massif) {
            const s = mountainScores[c.y]![c.x]!;
            if (s > bestScore) {
              bestScore = s;
              bestPeak = c;
            }
          }
        }

        if (bestPeak) {
          const px = bestPeak.x;
          const py = bestPeak.y;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const ny = py + dy;
              const nx = px + dx;
              if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1 && mtnClearance[ny]![nx]! >= 1) {
                rawHeightmap[ny]![nx] = Math.max(rawHeightmap[ny]![nx]!, 2);
              }
            }
          }
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = py + dy;
              const nx = px + dx;
              if (ny >= 0 && ny < H && nx >= 0 && nx < W && rawHeightmap[ny]![nx]! >= 1) {
                rawHeightmap[ny]![nx] = Math.max(rawHeightmap[ny]![nx]!, 2);
              }
            }
          }
        }
      }
    }
  }

  // Prune orphan walls and fill sunken depressions (protecting water bodies)
  const pruned = pruneOrphanCliffWalls(rawHeightmap, isWaterCell);

  // Pre-autotile diagonal normalization: enforce Von Neumann 4-neighbor adjacency
  const preNormalized = normalizeHeightmapDiagonals(pruned);

  // Enforce structural constraints (footprint >= 6x6, core >= 3x3, buffer >= 3, protecting water bodies)
  // Continental mountains enforce minTerraceBuffer: 0 to maintain zero-drop multi-tier stair corridors
  const sanitizedHeightmap = sanitizeHeightmapMatrix(preNormalized, {
    isWaterCell,
    minTerraceBuffer: 0,
    minFootprintDimension: 2,
    minWalkableCoreDimension: 0
  });

  // Post-sanitization diagonal normalization pass to eliminate any emergent isolated diagonal cliff contacts
  const postNormalized = normalizeHeightmapDiagonals(sanitizedHeightmap);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      sanitizedHeightmap[y]![x] = postNormalized[y]![x]!;
    }
  }

  // Guarantee water cells strictly remain at elevation 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isWaterCell(x, y)) {
        sanitizedHeightmap[y]![x] = 0;
      }
    }
  }

  // Re-flatten settlement exclusion zones to guarantee 100% flat ground (elev = 0)
  if (options.settlementExclusionZones) {
    for (const zone of options.settlementExclusionZones) {
      const margin = zone.margin ?? 2;
      const minX = Math.max(0, zone.x - margin);
      const maxX = Math.min(W - 1, zone.x + zone.width + margin);
      const minY = Math.max(0, zone.y - margin);
      const maxY = Math.min(H - 1, zone.y + zone.height + margin);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          sanitizedHeightmap[y]![x] = 0;
        }
      }
    }
  }

  // Guarantee uniform elevation 1 plateau across the Pokémon League footprint + margin
  // Guarantee uniform elevation 1 plateau across the Pokémon League upper palace
  if (options.leaguePlateauZone) {
    const lz = options.leaguePlateauZone;
    const m = lz.margin ?? 4;
    const minX = Math.max(0, lz.x - m);
    const maxX = Math.min(W - 1, lz.x + lz.width + m);
    const minY = Math.max(0, lz.y - m);
    const plateauH = Math.max(10, lz.height - 12);
    const maxY = Math.min(H - 1, lz.y + plateauH);
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (terrainMatrix[y]?.[x] === 'grass') {
          sanitizedHeightmap[y]![x] = 1;
        }
      }
    }
    // Lower plaza, checkpoint gate, and southern concourse remain flat at elevation 0
    const lowerMaxY = Math.min(H - 1, lz.y + lz.height + m);
    for (let y = maxY; y <= lowerMaxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        sanitizedHeightmap[y]![x] = 0;
      }
    }
  }



  // Phase 2: Geological Clusterer enforces single palette per massif
  const geologicalClusters = clusterMountainMassifs({
    elevationMatrix: sanitizedHeightmap,
    macroBiomeGrid: options.macroBiomeGrid,
    seed,
    defaultPalette: options.mountainPalette
  });

  // Initial autotile resolution to detect stair candidates
  const initialResolved = resolveMountainMapGrid(sanitizedHeightmap, {
    palette,
    paletteMatrix: geologicalClusters.paletteMatrix
  });

  const placedStairs: MountainStairLocation[] = [];

  if (withStairs) {
    const effectiveMaxStairs = Math.max(maxStairs, geologicalClusters.massifs.length * 2);
    const isWalkableFloor = (x: number, y: number): boolean => {
      const t = terrainMatrix[y]?.[x];
      return t !== 'water' && t !== 'water_deep' && t !== 'sand';
    };

    let maxElev = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sanitizedHeightmap[y]![x]! > maxElev) maxElev = sanitizedHeightmap[y]![x]!;
      }
    }

    // Detect stairs connecting each tier z down to z - 1
    for (let z = 1; z <= maxElev; z++) {
      const tierStairs = findStairCandidates(
        sanitizedHeightmap,
        initialResolved,
        z,
        z - 1,
        effectiveMaxStairs,
        placedStairs,
        isWalkableFloor
      );
      for (const s of tierStairs) {
        // If within the League plateau south cliff face, prune random stairs
        if (options.leaguePlateauZone && z === 1) {
          const lz = options.leaguePlateauZone;
          const plateauH = Math.max(10, lz.height - 12);
          const wallY = lz.y + plateauH - 1;
          if (Math.abs(s.y - wallY) <= 1 && s.x >= lz.x - 4 && s.x <= lz.x + lz.width + 4) {
            continue; // Will stamp single monumental stair below
          }
        }
        placedStairs.push({ ...s, tier: z });
      }
    }
  }

  // Stamp single monumental central staircase for Pokémon League if zone present
  if (options.leaguePlateauZone) {
    const lz = options.leaguePlateauZone;
    const plateauH = Math.max(10, lz.height - 12);
    const wallY = lz.y + plateauH - 1;
    const midAvenueX = lz.x + Math.floor(lz.width / 2);
    const stairX = midAvenueX - 1;
    const cL = initialResolved.cellDetails[wallY]?.[stairX];
    const cR = initialResolved.cellDetails[wallY]?.[stairX + 1];
    if (cL?.role === 'edge_south_top' && cR?.role === 'edge_south_top') {
      placedStairs.push({ x: stairX, y: wallY, tier: 1 });
    }
  }

  // Final mountain resolution with stamped stairs and massif paletteMatrix
  const mountainResult = resolveMountainMapGrid(sanitizedHeightmap, {
    palette,
    paletteMatrix: geologicalClusters.paletteMatrix,
    stairs: placedStairs
  });

  return {
    sanitizedHeightmap,
    placedStairs,
    mountainResult,
    geologicalClusters
  };
}
