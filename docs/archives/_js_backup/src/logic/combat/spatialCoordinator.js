/**
 * Virtual World Coordinator (Spatial Standardization)
 * Source of truth for all virtual units, scaling, and positioning logic.
 */

export const WORLD_CONSTANTS = {
  // Virtual World Dimensions
  MAP_WIDTH: 3000,
  MAP_HEIGHT: 3000,

  // Action/Safe Zone (Center of the world)
  SAFE_ZONE_WIDTH: 1000,
  SAFE_ZONE_HEIGHT: 666,
  get SAFE_ZONE_X() { return (this.MAP_WIDTH - this.SAFE_ZONE_WIDTH) / 2 }, // 1000
  get SAFE_ZONE_Y() { return (this.MAP_HEIGHT - this.SAFE_ZONE_HEIGHT) / 2 }, // 1167

  // Action focus point
  TARGET_X: 1500,
  get TARGET_Y() {
    // Aligned to bottom: The bottom of the safe zone coincides with the bottom of the visible units
    return (this.SAFE_ZONE_Y + this.SAFE_ZONE_HEIGHT) - (this.VISIBLE_UNITS_Y / 2)
  },

  // Camera Constraints
  VISIBLE_UNITS_X: 1000,
  VISIBLE_UNITS_Y: 766, // Safe zone height + 100u padding top
  RATIO_MAX: 3.0,
  RATIO_MIN: 0.33,

  // Object Scaling Standards
  OBJECT_SCALE: 2,
  BASE_ENTITY_SIZE: 300,
  BASE_ENTITY_SIZE_PLAYER: 300,
  BASE_ENTITY_SIZE_ENEMY: 150,
  BASE_BUSH_SIZE: 60,
  BASE_PREVIEW_SIZE: 120,
  SHADOW_WIDTH: 10,
  SHADOW_HEIGHT: 7,
  
  /** 
   * Default entity size (400px by default) 
   * Calculated as BASE_ENTITY_SIZE * OBJECT_SCALE
   */
  get ENTITY_SIZE() { return this.BASE_ENTITY_SIZE * this.OBJECT_SCALE },
  get ENTITY_SIZE_PLAYER() { return this.BASE_ENTITY_SIZE_PLAYER * this.OBJECT_SCALE },
  get ENTITY_SIZE_ENEMY() { return this.BASE_ENTITY_SIZE_ENEMY * this.OBJECT_SCALE },
  get BUSH_SIZE() { return this.BASE_BUSH_SIZE * this.OBJECT_SCALE },
  get PREVIEW_SIZE() { return this.BASE_PREVIEW_SIZE * this.OBJECT_SCALE }
}

/**
 * Normalizes coordinates into the 3000x3000px virtual space.
 */
export function toVirtualStyles(x, y, w, h) {
  const scale = WORLD_CONSTANTS.OBJECT_SCALE
  return {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: w !== undefined ? `${w * scale}px` : undefined,
    height: h !== undefined ? `${h * scale}px` : undefined
  }
}

/**
 * Returns the standard position for a combatant side.
 */
export function getCombatantPosition(side) {
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
