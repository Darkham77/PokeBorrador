/**
 * src/logic/map/noise/simplexNoise.ts
 *
 * LIGHTWEIGHT 2D SIMPLEX NOISE & FBM GENERATOR (SSoT)
 * Pure TypeScript implementation without external dependencies.
 * Provides deterministic continuous gradient noise and Fractal Brownian Motion (FBM)
 * for organic heightmap and moisture distribution.
 */

// Skewing and unskewing factors for 2 dimensions
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

// Standard 2D gradients (12 vectors to avoid directional artifacts)
const GRAD2: readonly (readonly [number, number])[] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0, 1],
  [0, -1]
];

/**
 * Deterministic Mulberry32 32-bit PRNG
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

export interface FbmOptions {
  readonly octaves?: number; // default: 4
  readonly lacunarity?: number; // default: 2.0
  readonly persistence?: number; // default: 0.5
  readonly scale?: number; // default: 0.05
}

/**
 * 2D Simplex Noise Generator
 */
export class SimplexNoise {
  private readonly perm: Uint8Array;
  private readonly permMod12: Uint8Array;

  constructor(seed = 42) {
    const prng = createMulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const temp = p[i]!;
      p[i] = p[j]!;
      p[j] = temp;
    }

    // Double permutation table to avoid modulo wrapping
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      const val = p[i & 255]!;
      this.perm[i] = val;
      this.permMod12[i] = val % 12;
    }
  }

  /**
   * Samples 2D Simplex Noise at coordinates (xin, yin).
   * Result is strictly normalized to the range [-1.0, 1.0].
   */
  public noise2D(xin: number, yin: number): number {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    // Skew the input space to determine which simplex cell we're in
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t); // Unskewed distance from cell origin
    const y0 = yin - (j - t);

    // Determine which simplex triangle of the square cell we're in
    let i1 = 0;
    let j1 = 0;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0; // lower triangle: (0,0)->(1,0)->(1,1)
    } else {
      i1 = 0;
      j1 = 1; // upper triangle: (0,0)->(0,1)->(1,1)
    }

    // Offsets for second and third corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]!]!;
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]!]!;
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]!]!;

    // Calculate the contribution from the first corner
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const g0 = GRAD2[gi0]!;
      n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0);
    }

    // Calculate the contribution from the second corner
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const g1 = GRAD2[gi1]!;
      n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1);
    }

    // Calculate the contribution from the third corner
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const g2 = GRAD2[gi2]!;
      n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2);
    }

    // Scale to return [-1.0, 1.0]
    const raw = 70.14805770653952 * (n0 + n1 + n2);
    return Math.max(-1.0, Math.min(1.0, raw));
  }
}

/**
 * Fractal Brownian Motion (FBM) accumulator over SimplexNoise 2D.
 * Combines multiple octaves of varying frequencies and amplitudes.
 * Returns values normalized in the range [-1.0, 1.0].
 */
export function fbm2D(
  noise: SimplexNoise,
  x: number,
  y: number,
  options?: FbmOptions
): number {
  const octaves = Math.max(1, options?.octaves ?? 4);
  const lacunarity = options?.lacunarity ?? 2.0;
  const persistence = options?.persistence ?? 0.5;
  const scale = options?.scale ?? 0.05;

  let total = 0;
  let frequency = scale;
  let amplitude = 1.0;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise.noise2D(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return maxAmplitude > 0 ? total / maxAmplitude : 0;
}

/**
 * FBM normalized strictly to the range [0.0, 1.0].
 * Convenient for heightmaps, moisturemaps, and quantile sorting.
 */
export function fbm2DNormalized(
  noise: SimplexNoise,
  x: number,
  y: number,
  options?: FbmOptions
): number {
  const raw = fbm2D(noise, x, y, options);
  const normalized = (raw + 1.0) * 0.5;
  return Math.max(0.0, Math.min(1.0, normalized));
}
