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

const RAW = dbJson.RAW as unknown as Record<string, readonly [number, number, number, number, number, number, number]>;

export const ANIMATED_SPRITE_DATABASE: Record<string, AnimatedSpriteData> = Object.fromEntries(
  Object.entries(RAW).map(([id, [frames, size, feetY, feetX, bodyH, bodyW, bodyRadius]]) => [
    id,
    { frames, size, feetY, feetX, bodyH, bodyW, bodyRadius }
  ])
);

/** Variation frame counts to keep variation sprites out of coordinate databases */
export const ANIMATED_VARIATION_FRAMES = dbJson.VARIATIONS as Record<string, number>;
