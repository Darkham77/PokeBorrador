/**
 * src/data/animatedSpriteDatabase.ts
 *
 * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts — NO MODIFICAR MANUALMENTE
 *
 * Métricas precalculadas de cada sprite en animated/Front/ y animated/Back/:
 *   frames     — número de frames en el spritesheet horizontal
 *   size       — tamaño del frame en px (cuadrado: cada frame es size×size)
 *   feetY/X    — punto de anclaje al suelo, normalizado [0-1], calculado en el primer frame
 *   bodyH/W    — alto/ancho del cuerpo visible (bbox sin transparencia) como ratio [0-1]
 *   bodyRadius — max(bodyH, bodyW)/2, radio del cuerpo para colisiones y escala [0-1]
 *
 * MAX_ANIMATED_SPRITE_SIZE_FRONT: tamaño (px) del frame más grande de Front.
 * MAX_ANIMATED_SPRITE_SIZE_BACK: tamaño (px) del frame más grande de Back.
 * Úsalo para calcular tamaños relativos en el mundo virtual de combate.
 */
import dbJson from './animatedSpriteDatabase.json' with { type: 'json' };

export interface AnimatedSpriteData {
  readonly frames: number;
  readonly size: number;
  readonly feetY: number;
  readonly feetX: number;
  readonly bodyH: number;
  readonly bodyW: number;
  readonly bodyRadius: number;
}

/** Frame size (px) of the largest sprite in Front/Back. Used for relative combat scaling. */
export const MAX_ANIMATED_SPRITE_SIZE_FRONT = 250 as const;
export const MAX_ANIMATED_SPRITE_SIZE_BACK = 172 as const;
export const MAX_ANIMATED_SPRITE_SIZE = MAX_ANIMATED_SPRITE_SIZE_FRONT;

const RAW = dbJson.RAW;
export type AnimatedSpriteId = keyof typeof RAW;

export function hasAnimatedSpriteId(id: string): id is AnimatedSpriteId {
  return Object.hasOwn(RAW, id);
}

function requireAnimatedMetric(values: readonly number[], id: AnimatedSpriteId, index: number): number {
  const value = values[index];
  if (value !== undefined) return value;
  throw new Error(`[animatedSpriteDatabase] Invalid metric tuple for sprite id: ${id}`);
}

const ANIMATED_SPRITE_DATABASE: Partial<Record<AnimatedSpriteId, AnimatedSpriteData>> = {};

for (const id in RAW) {
  if (!hasAnimatedSpriteId(id)) continue;
  const tuple = RAW[id];
  const frames = requireAnimatedMetric(tuple, id, 0);
  const size = requireAnimatedMetric(tuple, id, 1);
  const feetY = requireAnimatedMetric(tuple, id, 2);
  const feetX = requireAnimatedMetric(tuple, id, 3);
  const bodyH = requireAnimatedMetric(tuple, id, 4);
  const bodyW = requireAnimatedMetric(tuple, id, 5);
  const bodyRadius = requireAnimatedMetric(tuple, id, 6);
  ANIMATED_SPRITE_DATABASE[id] = { frames, size, feetY, feetX, bodyH, bodyW, bodyRadius };
}

export function requireAnimatedSpriteData(id: AnimatedSpriteId): AnimatedSpriteData {
  const data = ANIMATED_SPRITE_DATABASE[id];
  if (data) return data;
  throw new Error(`[animatedSpriteDatabase] Missing animated sprite data for id: ${id}`);
}

/** Variation frame counts to keep variation sprites out of coordinate databases */
const ANIMATED_VARIATION_FRAMES: Partial<Record<keyof typeof dbJson.VARIATIONS, number>> = dbJson.VARIATIONS;
export type AnimatedVariationId = keyof typeof ANIMATED_VARIATION_FRAMES;

export function hasAnimatedVariationId(id: string): id is AnimatedVariationId {
  return Object.hasOwn(ANIMATED_VARIATION_FRAMES, id);
}

export function requireAnimatedVariationFrameCount(id: AnimatedVariationId): number {
  const frames = ANIMATED_VARIATION_FRAMES[id];
  if (frames !== undefined) return frames;
  throw new Error(`[animatedSpriteDatabase] Missing variation frame count for id: ${id}`);
}
