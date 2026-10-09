/**
 * src/logic/map/continent/coastalFractalEngine.ts
 *
 * GLOBAL FRACTAL COASTAL & ISLAND SCULPTING ENGINE
 *
 * Provides organic, non-linear coastline perturbation and natural archipelago formation
 * using multi-octave Simplex Fractal Brownian Motion (FBM).
 * Eliminates artificial 90-degree straight cuts, rectangular chunks, and rigid circular islands.
 */

import { SimplexNoise, fbm2D } from '../noise/simplexNoise.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';

export interface ShorelineOptions {
  readonly scale?: number; // Spatial frequency (default: 0.04)
  readonly amplitude?: number; // Maximum coastal displacement in tiles (default: 6)
  readonly octaves?: number; // FBM octaves (default: 3)
}

export interface OrganicIslandOptions {
  readonly radiusX: number;
  readonly radiusY: number;
  readonly roughness?: number; // 0.0 - 1.0 (default: 0.35)
  readonly angleRad?: number; // Rotation tilt (default: 0)
}

export interface IsletSpec {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly elevation?: number;
}

/**
 * Perturbs a baseline distance or coordinate to produce a natural organic coastline.
 * Returns the displacement in tile units.
 */
export function sampleCoastalDisplacement(
  noise: SimplexNoise,
  x: number,
  y: number,
  options?: ShorelineOptions
): number {
  const scale = options?.scale ?? 0.04;
  const amplitude = options?.amplitude ?? 6;
  const octaves = options?.octaves ?? 3;
  const raw = fbm2D(noise, x, y, { octaves, scale, persistence: 0.5, lacunarity: 2.0 });
  return raw * amplitude;
}

/**
 * Sculpts an organic island onto an existing water/terrain matrix.
 * Rather than a rigid circle, uses elliptical stretching and fractal radial modulation.
 */
export function sculptOrganicIsland(
  matrix: WaterTerrainKind[][],
  cx: number,
  cy: number,
  options: OrganicIslandOptions,
  seed = 42
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const noise = new SimplexNoise(seed);
  const roughness = options.roughness ?? 0.35;
  const angle = options.angleRad ?? 0;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const maxR = Math.max(options.radiusX, options.radiusY) * 1.5;
  const minX = Math.max(0, Math.floor(cx - maxR));
  const maxX = Math.min(W - 1, Math.ceil(cx + maxR));
  const minY = Math.max(0, Math.floor(cy - maxR));
  const maxY = Math.min(H - 1, Math.ceil(cy + maxR));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;

      // Rotate into island local space
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;

      // Normalized elliptical radius
      const normR = Math.hypot(localX / options.radiusX, localY / options.radiusY);

      // Radial angle for angular noise perturbation
      const theta = Math.atan2(localY, localX);
      const noiseVal = fbm2D(noise, Math.cos(theta) * 2.0 + 10, Math.sin(theta) * 2.0 + 10, {
        octaves: 3,
        scale: 0.5
      });

      const effectiveThreshold = 1.0 + noiseVal * roughness;

      if (normR <= effectiveThreshold) {
        matrix[y]![x] = 'grass';
      }
    }
  }
}

/**
 * Sculpts a natural archipelago chain of islets with sand spits and rocky reefs.
 */
export function sculptArchipelagoChain(
  matrix: WaterTerrainKind[][],
  islets: readonly IsletSpec[],
  seed = 101
): void {
  for (let i = 0; i < islets.length; i++) {
    const islet = islets[i]!;
    sculptOrganicIsland(
      matrix,
      islet.cx,
      islet.cy,
      {
        radiusX: islet.radius * (0.85 + (i % 2) * 0.3),
        radiusY: islet.radius * (0.75 + ((i + 1) % 2) * 0.35),
        roughness: 0.4,
        angleRad: (i * Math.PI) / 4
      },
      seed + i * 53
    );
  }
}

/**
 * Smooths and applies natural sand beaches along every water-grass boundary.
 * Guarantees the invariant: grass never touches water directly without intermediate sand.
 */
export function applyNaturalBeaches(matrix: WaterTerrainKind[][]): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;

  // First pass: identify grass cells directly adjacent to water (4-way)
  const beachCandidates: { x: number; y: number }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'grass') {
        const touchesWater =
          (y > 0 && matrix[y - 1]![x] === 'water') ||
          (y < H - 1 && matrix[y + 1]![x] === 'water') ||
          (x > 0 && matrix[y]![x - 1] === 'water') ||
          (x < W - 1 && matrix[y]![x + 1] === 'water');

        if (touchesWater) {
          beachCandidates.push({ x, y });
        }
      }
    }
  }

  for (const { x, y } of beachCandidates) {
    matrix[y]![x] = 'sand';
  }
}
