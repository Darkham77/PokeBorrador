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
    driftX1 = (TEXTURE_TILE_SIZE_BASE * speedVar) / (80 * (2.5 + params.animSeed * 0.5)); // magic-ok
    driftY1 = (TEXTURE_TILE_SIZE_BASE * speedVar) / (80 * (2.5 + params.animSeed * 0.5)); // magic-ok
    driftX2 = (TEXTURE_TILE_SIZE_LARGE * speedVar) / (80 * (0.6 + params.animSeed * 0.2)); // magic-ok
    driftY2 = (TEXTURE_TILE_SIZE_LARGE * speedVar) / (80 * (0.6 + params.animSeed * 0.2)); // magic-ok
  } else if (isWind) {
    driftX1 = (-TEXTURE_TILE_SIZE_BASE * speedVar) / (8 * (2.5 + params.animSeed * 0.5)); // magic-ok
    driftX2 = (-TEXTURE_TILE_SIZE_LARGE * speedVar) / (8 * (0.6 + params.animSeed * 0.2)); // magic-ok
  } else if (isDust) {
    driftX1 = (-TEXTURE_TILE_SIZE_BASE * speedVar) / (3 * (2.5 + params.animSeed * 0.5)); // magic-ok
    driftX2 = (-TEXTURE_TILE_SIZE_LARGE * speedVar) / (3 * (0.6 + params.animSeed * 0.2)); // magic-ok
  } else if (isSand || isStrong) {
    const factor = isStrong ? 1.2 : 1.5;
    const dur1 = (0.7 + params.animSeed * 0.8) * factor; // magic-ok
    const seed2 = (params.animSeed * 1.618) % 1; // magic-ok
    const dur2 = dur1 * (1.1 + seed2 * 0.4); // magic-ok
    driftX1 = -TEXTURE_TILE_SIZE_LARGE / dur1;
    driftX2 = -TEXTURE_TILE_SIZE_HUGE / dur2;
  }

  const noise1 = patterns.noise1;
  const noise2 = patterns.noise2;

  // Opacity & Pulsing logic
  const hasPulse = isStrong;
  const cycleDuration = hasPulse ? (1.5 + params.animSeed) : 5;
  const pulse = (Math.sin((time / MILLISECONDS_PER_SECOND) * FULL_CIRCLE_RAD / cycleDuration) + 1) / 2;

  const ATMOSPHERE_PRIMARY_OPACITY = 0.25;
  const ATMOSPHERE_SECONDARY_OPACITY = 0.15;

  let op1 = ATMOSPHERE_PRIMARY_OPACITY;
  let op2 = ATMOSPHERE_SECONDARY_OPACITY;

  if (isFog) {
    op1 = 0.8 + (0.85 - 0.8) * pulse; // magic-ok
    op2 = op1;
  } else if (isMist) {
    const baseOp = params.isLowPower ? 0.75 : 0.4; // magic-ok
    const maxOp = params.isLowPower ? 0.9 : 0.6; // magic-ok
    op1 = baseOp + (maxOp - baseOp) * pulse;
    op2 = op1;
  } else if (w === 'wind') {
    op1 = 0.15 + (0.25 - 0.15) * pulse; // magic-ok
    op2 = op1;
  } else if (isStrong) {
    op1 = 0.55 + (0.75 - 0.55) * pulse; // magic-ok
    op2 = op1;
  } else if (isDust) {
    op1 = 0.8; // magic-ok
    op2 = 0.8; // magic-ok
  } else if (isSand) {
    op1 = 0.5; // magic-ok
    op2 = 0.55; // magic-ok
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
