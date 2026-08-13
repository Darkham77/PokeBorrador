/**
 * src/logic/render/atmosphere.worker.ts
 * 
 * Web Worker for OffscreenCanvas weather noise/mist rendering.
 * Animates shifting mist/fog noise textures off-thread.
 */

interface AtmosphereParams {
  weather: string;
  isLowPower: boolean;
  animSeed: number;
}

import {
  TEXTURE_TILE_SIZE_BASE,
  TEXTURE_TILE_SIZE_LARGE,
  TEXTURE_TILE_SIZE_HUGE,
  ATMOSPHERE_SPEED_VAR_BASE,
  ATMOSPHERE_SPEED_VAR_SCALE,
  MILLISECONDS_PER_SECOND,
  FULL_CIRCLE_RAD
} from '@/logic/constants/visuals';

type OpacityPresetKey =
  | 'FOG_MIN'
  | 'FOG_MAX'
  | 'MIST_LOW_POWER_BASE'
  | 'MIST_LOW_POWER_MAX'
  | 'MIST_NORMAL_BASE'
  | 'MIST_NORMAL_MAX'
  | 'WIND_MIN'
  | 'WIND_MAX'
  | 'STRONG_MIN'
  | 'STRONG_MAX'
  | 'DUST'
  | 'SAND_OP1'
  | 'SAND_OP2';

const ATMOSPHERE_OPACITY_PRESETS: Record<OpacityPresetKey, number> = {
  FOG_MIN: 0.8,
  FOG_MAX: 0.85,
  MIST_LOW_POWER_BASE: 0.75,
  MIST_LOW_POWER_MAX: 0.9,
  MIST_NORMAL_BASE: 0.4,
  MIST_NORMAL_MAX: 0.6,
  WIND_MIN: 0.15,
  WIND_MAX: 0.25,
  STRONG_MIN: 0.55,
  STRONG_MAX: 0.75,
  DUST: 0.8,
  SAND_OP1: 0.5,
  SAND_OP2: 0.55,
};

/** Physics divisors for fog/mist drift speed calculations. */
const ATMOSPHERE_DRIFT = {
  FOG_MIST_DIVISOR: 80,
  WIND_DIVISOR: 8,
  DUST_DIVISOR: 3,
  SEED_FAST_BASE: 2.5,
  SEED_FAST_MULT: 0.5,
  SEED_SLOW_BASE: 0.6,
  SEED_SLOW_MULT: 0.2,
  GOLDEN_RATIO: 1.618,
  SAND_FACTOR_NORMAL: 1.5,
  SAND_FACTOR_STRONG: 1.2,
  SAND_SEED_BASE: 0.7,
  SAND_SEED_MULT: 0.8,
  SAND_DUR2_BASE: 1.1,
  SAND_DUR2_MULT: 0.4,
} as const;

/** Pulse cycle duration in seconds for non-strong weather. */
const ATMOSPHERE_CYCLE_DURATION_CALM = 5;
/** Pulse cycle base for strong weather (added to animSeed). */
const ATMOSPHERE_CYCLE_DURATION_STRONG_BASE = 1.5;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let isPaused = false;
let params: AtmosphereParams = {
  weather: 'clear',
  isLowPower: false,
  animSeed: 0.5,
};

const patterns: Record<string, CanvasPattern> = {};
const textures: Record<string, ImageBitmap> = {};

let lastTime = 0;
const textureOffsets = {
  layer1: { x: 0, y: 0 },
  layer2: { x: 0, y: 0 }
};

function render(time: number) {
  if (isPaused) return;
  const localCanvas = canvas;
  const localCtx = ctx;
  if (!localCanvas || !localCtx) return;

  const dt = time - lastTime;
  lastTime = time;

  localCtx.clearRect(0, 0, localCanvas.width, localCanvas.height);

  const w = params.weather;
  const isMist = w === 'mist';
  const isFog = w === 'fog';
  const isDust = w === 'dust_storm';
  const isSand = w === 'sandstorm';
  const isStrong = w === 'strong_winds';
  const isWind = w === 'wind';

  if (!['fog', 'mist', 'wind', 'strong_winds', 'dust_storm', 'sandstorm'].includes(w)) {
    requestAnimationFrame(render);
    return;
  }

  const speedVar = ATMOSPHERE_SPEED_VAR_BASE + (params.animSeed * ATMOSPHERE_SPEED_VAR_SCALE);
  let driftX1 = 0;
  let driftY1 = 0;
  let driftX2 = 0;
  let driftY2 = 0;

  if (isFog || isMist) {
    const fogFastDen = ATMOSPHERE_DRIFT.FOG_MIST_DIVISOR * (ATMOSPHERE_DRIFT.SEED_FAST_BASE + params.animSeed * ATMOSPHERE_DRIFT.SEED_FAST_MULT);
    const fogSlowDen = ATMOSPHERE_DRIFT.FOG_MIST_DIVISOR * (ATMOSPHERE_DRIFT.SEED_SLOW_BASE + params.animSeed * ATMOSPHERE_DRIFT.SEED_SLOW_MULT);
    driftX1 = (TEXTURE_TILE_SIZE_BASE * speedVar) / fogFastDen;
    driftY1 = (TEXTURE_TILE_SIZE_BASE * speedVar) / fogFastDen;
    driftX2 = (TEXTURE_TILE_SIZE_LARGE * speedVar) / fogSlowDen;
    driftY2 = (TEXTURE_TILE_SIZE_LARGE * speedVar) / fogSlowDen;
  } else if (isWind) {
    driftX1 = (-TEXTURE_TILE_SIZE_BASE * speedVar) / (ATMOSPHERE_DRIFT.WIND_DIVISOR * (ATMOSPHERE_DRIFT.SEED_FAST_BASE + params.animSeed * ATMOSPHERE_DRIFT.SEED_FAST_MULT));
    driftX2 = (-TEXTURE_TILE_SIZE_LARGE * speedVar) / (ATMOSPHERE_DRIFT.WIND_DIVISOR * (ATMOSPHERE_DRIFT.SEED_SLOW_BASE + params.animSeed * ATMOSPHERE_DRIFT.SEED_SLOW_MULT));
  } else if (isDust) {
    driftX1 = (-TEXTURE_TILE_SIZE_BASE * speedVar) / (ATMOSPHERE_DRIFT.DUST_DIVISOR * (ATMOSPHERE_DRIFT.SEED_FAST_BASE + params.animSeed * ATMOSPHERE_DRIFT.SEED_FAST_MULT));
    driftX2 = (-TEXTURE_TILE_SIZE_LARGE * speedVar) / (ATMOSPHERE_DRIFT.DUST_DIVISOR * (ATMOSPHERE_DRIFT.SEED_SLOW_BASE + params.animSeed * ATMOSPHERE_DRIFT.SEED_SLOW_MULT));
  } else if (isSand || isStrong) {
    const factor = isStrong ? ATMOSPHERE_DRIFT.SAND_FACTOR_STRONG : ATMOSPHERE_DRIFT.SAND_FACTOR_NORMAL;
    const dur1 = (ATMOSPHERE_DRIFT.SAND_SEED_BASE + params.animSeed * ATMOSPHERE_DRIFT.SAND_SEED_MULT) * factor;
    const seed2 = (params.animSeed * ATMOSPHERE_DRIFT.GOLDEN_RATIO) % 1;
    const dur2 = dur1 * (ATMOSPHERE_DRIFT.SAND_DUR2_BASE + seed2 * ATMOSPHERE_DRIFT.SAND_DUR2_MULT);
    driftX1 = -TEXTURE_TILE_SIZE_LARGE / dur1;
    driftX2 = -TEXTURE_TILE_SIZE_HUGE / dur2;
  }

  const noise1 = patterns.noise1;
  const noise2 = patterns.noise2;

  // Opacity & Pulsing logic
  const hasPulse = isStrong;
  const cycleDuration = hasPulse ? (ATMOSPHERE_CYCLE_DURATION_STRONG_BASE + params.animSeed) : ATMOSPHERE_CYCLE_DURATION_CALM;
  const pulse = (Math.sin((time / MILLISECONDS_PER_SECOND) * FULL_CIRCLE_RAD / cycleDuration) + 1) / 2;

  let op1 = ATMOSPHERE_OPACITY_PRESETS.WIND_MAX;
  let op2 = ATMOSPHERE_OPACITY_PRESETS.WIND_MIN;

  if (isFog) {
    op1 = ATMOSPHERE_OPACITY_PRESETS.FOG_MIN + (ATMOSPHERE_OPACITY_PRESETS.FOG_MAX - ATMOSPHERE_OPACITY_PRESETS.FOG_MIN) * pulse;
    op2 = op1;
  } else if (isMist) {
    const baseOp = params.isLowPower ? ATMOSPHERE_OPACITY_PRESETS.MIST_LOW_POWER_BASE : ATMOSPHERE_OPACITY_PRESETS.MIST_NORMAL_BASE;
    const maxOp = params.isLowPower ? ATMOSPHERE_OPACITY_PRESETS.MIST_LOW_POWER_MAX : ATMOSPHERE_OPACITY_PRESETS.MIST_NORMAL_MAX;
    op1 = baseOp + (maxOp - baseOp) * pulse;
    op2 = op1;
  } else if (w === 'wind') {
    op1 = ATMOSPHERE_OPACITY_PRESETS.WIND_MIN + (ATMOSPHERE_OPACITY_PRESETS.WIND_MAX - ATMOSPHERE_OPACITY_PRESETS.WIND_MIN) * pulse;
    op2 = op1;
  } else if (isStrong) {
    op1 = ATMOSPHERE_OPACITY_PRESETS.STRONG_MIN + (ATMOSPHERE_OPACITY_PRESETS.STRONG_MAX - ATMOSPHERE_OPACITY_PRESETS.STRONG_MIN) * pulse;
    op2 = op1;
  } else if (isDust) {
    op1 = ATMOSPHERE_OPACITY_PRESETS.DUST;
    op2 = ATMOSPHERE_OPACITY_PRESETS.DUST;
  } else if (isSand) {
    op1 = ATMOSPHERE_OPACITY_PRESETS.SAND_OP1;
    op2 = ATMOSPHERE_OPACITY_PRESETS.SAND_OP2;
  }

  // Target sizes based on original CSS
  let targetSize1 = TEXTURE_TILE_SIZE_BASE;
  let targetSize2 = TEXTURE_TILE_SIZE_LARGE;

  if (isSand || isStrong) {
    targetSize1 = TEXTURE_TILE_SIZE_LARGE;
    targetSize2 = TEXTURE_TILE_SIZE_LARGE;
  }

  const bitmap1 = textures.noise1;
  const bitmap2 = textures.noise2;

  const scale1 = bitmap1 ? (targetSize1 / bitmap1.width) : 1;
  const scale2 = bitmap2 ? (targetSize2 / bitmap2.width) : 1;

  // Layer 1
  if (noise1) {
    textureOffsets.layer1.x += driftX1 * (dt / MILLISECONDS_PER_SECOND);
    textureOffsets.layer1.y += driftY1 * (dt / MILLISECONDS_PER_SECOND);
    drawPattern(noise1, scale1, textureOffsets.layer1.x, textureOffsets.layer1.y, op1);
  }

  // Layer 2
  if (!params.isLowPower && noise2 && !isStrong) {
    textureOffsets.layer2.x += driftX2 * (dt / MILLISECONDS_PER_SECOND);
    textureOffsets.layer2.y += driftY2 * (dt / MILLISECONDS_PER_SECOND);
    drawPattern(noise2, scale2, textureOffsets.layer2.x, textureOffsets.layer2.y, op2);
  }

  requestAnimationFrame(render);
}

function drawPattern(pattern: CanvasPattern, scale: number, offsetX: number, offsetY: number, opacity: number) {
  const localCanvas = canvas;
  const localCtx = ctx;
  if (!localCtx || !localCanvas) return;
  
  const matrix = new DOMMatrix();
  matrix.translateSelf(offsetX, offsetY);
  matrix.scaleSelf(scale, scale);
  pattern.setTransform(matrix);

  localCtx.globalAlpha = opacity;
  localCtx.fillStyle = pattern;
  localCtx.fillRect(0, 0, localCanvas.width, localCanvas.height);
  
  localCtx.globalAlpha = 1.0;
}

interface AtmosphereWorkerMessage {
  type: 'INIT' | 'RESIZE' | 'UPDATE_PARAMS' | 'PAUSE' | 'RESUME';
  payload: {
    canvas?: OffscreenCanvas;
    noise1?: ImageBitmap;
    noise2?: ImageBitmap;
    width?: number;
    height?: number;
  } & Partial<AtmosphereParams>;
}

self.onmessage = async (event: MessageEvent) => {
  const data = event.data as AtmosphereWorkerMessage;
  const { type, payload } = data;

  switch (type) {
    case 'INIT': {
      canvas = payload.canvas || null;
      if (canvas) {
        ctx = canvas.getContext('2d');
        if (payload.noise1 && ctx) {
          textures.noise1 = payload.noise1;
          const pattern = ctx.createPattern(payload.noise1, 'repeat');
          if (pattern) {
            patterns.noise1 = pattern;
          }
        }
        if (payload.noise2 && ctx) {
          textures.noise2 = payload.noise2;
          const pattern = ctx.createPattern(payload.noise2, 'repeat');
          if (pattern) {
            patterns.noise2 = pattern;
          }
        }
        requestAnimationFrame(render);
      }
      break;
    }
    case 'RESIZE': {
      if (canvas && payload.width !== undefined && payload.height !== undefined) {
        canvas.width = payload.width;
        canvas.height = payload.height;
      }
      break;
    }
    case 'UPDATE_PARAMS': {
      params = { ...params, ...payload };
      break;
    }
    case 'PAUSE': {
      isPaused = true;
      break;
    }
    case 'RESUME': {
      if (isPaused) {
        isPaused = false;
        lastTime = performance.now();
        requestAnimationFrame(render);
      }
      break;
    }
  }
};

export {};
