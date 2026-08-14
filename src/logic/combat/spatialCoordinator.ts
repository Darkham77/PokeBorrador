
/**
 * Virtual World Coordinator (Spatial Standardization)
 * Source of truth for all virtual units, scaling, and positioning logic.
 */

const SAFE_ZONE_HEIGHT_PX = 666;
const VISIBLE_UNITS_Y_PX = 766;
const MAX_ASPECT_RATIO = 3.0;
const MIN_ASPECT_RATIO = 0.33;

const VIRTUAL_MAP_WIDTH = 3000;
const VIRTUAL_MAP_HEIGHT = 3000;
const SAFE_ZONE_WIDTH_PX = 1000;
const ACTION_TARGET_X_PX = 1500;
const VISIBLE_UNITS_X_PX = 1000;

const BASE_ENTITY_SIZE_PX = 300;
const BASE_ENTITY_SIZE_PLAYER_PX = 300;
const BASE_ENTITY_SIZE_ENEMY_PX = 200;
const BASE_BUSH_SIZE_PX = 60;
const BASE_PREVIEW_SIZE_PX = 120;
const SHADOW_WIDTH_PX = 10;
const SHADOW_HEIGHT_PX = 7;

export const WORLD_CONSTANTS = {
  // Virtual World Dimensions
  MAP_WIDTH: VIRTUAL_MAP_WIDTH,
  MAP_HEIGHT: VIRTUAL_MAP_HEIGHT,

  // Action/Safe Zone (Center of the world)
  SAFE_ZONE_WIDTH: SAFE_ZONE_WIDTH_PX,
  SAFE_ZONE_HEIGHT: SAFE_ZONE_HEIGHT_PX,
  get SAFE_ZONE_X(): number { return (this.MAP_WIDTH - this.SAFE_ZONE_WIDTH) / 2 },
  get SAFE_ZONE_Y(): number { return (this.MAP_HEIGHT - this.SAFE_ZONE_HEIGHT) / 2 },

  // Action focus point
  TARGET_X: ACTION_TARGET_X_PX,
  get TARGET_Y(): number {
    // Aligned to bottom: The bottom of the safe zone coincides with the bottom of the visible units
    return (this.SAFE_ZONE_Y + this.SAFE_ZONE_HEIGHT) - (this.VISIBLE_UNITS_Y / 2)
  },

  // Camera Constraints
  VISIBLE_UNITS_X: VISIBLE_UNITS_X_PX,
  VISIBLE_UNITS_Y: VISIBLE_UNITS_Y_PX,
  RATIO_MAX: MAX_ASPECT_RATIO,
  RATIO_MIN: MIN_ASPECT_RATIO,

  // Object Scaling Standards
  OBJECT_SCALE: 2,
  BASE_ENTITY_SIZE: BASE_ENTITY_SIZE_PX,
  BASE_ENTITY_SIZE_PLAYER: BASE_ENTITY_SIZE_PLAYER_PX,
  BASE_ENTITY_SIZE_ENEMY: BASE_ENTITY_SIZE_ENEMY_PX,
  BASE_BUSH_SIZE: BASE_BUSH_SIZE_PX,
  BASE_PREVIEW_SIZE: BASE_PREVIEW_SIZE_PX,
  SHADOW_WIDTH: SHADOW_WIDTH_PX,
  SHADOW_HEIGHT: SHADOW_HEIGHT_PX,
  
  /** 
   * Default entity size (400px by default) 
   * Calculated as BASE_ENTITY_SIZE * OBJECT_SCALE
   */
  get ENTITY_SIZE(): number { return this.BASE_ENTITY_SIZE * this.OBJECT_SCALE },
  get ENTITY_SIZE_PLAYER(): number { return this.BASE_ENTITY_SIZE_PLAYER * this.OBJECT_SCALE },
  get ENTITY_SIZE_ENEMY(): number { return this.BASE_ENTITY_SIZE_ENEMY * this.OBJECT_SCALE },
  get BUSH_SIZE(): number { return this.BASE_BUSH_SIZE * this.OBJECT_SCALE },
  get PREVIEW_SIZE(): number { return this.BASE_PREVIEW_SIZE * this.OBJECT_SCALE }
}

export type WorldConstantKey = keyof typeof WORLD_CONSTANTS;

import type { CSSProperties } from 'vue';

/**
 * Normalizes coordinates into the 3000x3000px virtual space.
 */
export function toVirtualStyles(x: number, y: number, w?: number, h?: number): CSSProperties {
  const scale = WORLD_CONSTANTS.OBJECT_SCALE
  return {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: w !== undefined ? `${w * scale}px` : undefined,
    height: h !== undefined ? `${h * scale}px` : undefined
  }
}

import type { BattleSide } from '@/types/battle/battle';

/**
 * Returns the standard position for a combatant side.
 */
export function getCombatantPosition(side: BattleSide): { x: number; y: number } {
  const { SAFE_ZONE_X, SAFE_ZONE_Y, SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT } = WORLD_CONSTANTS
  if (side === 'player') {
    const size = WORLD_CONSTANTS.ENTITY_SIZE_PLAYER
    return {
      x: SAFE_ZONE_X,
      y: SAFE_ZONE_Y + SAFE_ZONE_HEIGHT - size
    }
  }
  // Enemy (p2)
  const size = WORLD_CONSTANTS.ENTITY_SIZE_ENEMY
  return {
    x: SAFE_ZONE_X + SAFE_ZONE_WIDTH - size,
    y: SAFE_ZONE_Y
  }
}
