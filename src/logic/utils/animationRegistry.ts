/**
 * Centralized registry for GSAP animation timings and easings.
 * Ensures visual consistency across the entire project.
 */

export const ANIM_TIMINGS = {
  // UI Transitions
  MODAL_OPEN: 0.4,
  MODAL_CLOSE: 0.3,
  ROUTE_TRANSITION: 0.6,
  STAGGER_FAST: 0.05,
  STAGGER_NORMAL: 0.1,

  // Combat Sequences
  POKEMON_SEND_OUT: 0.8,
  POKEMON_RECALL: 0.5,
  POKEMON_FAINT: 1.2,
  BALL_FLY: 0.6,
  BALL_WOBBLE: 0.4,
  CATCH_SUCCESS: 1.5,
  
  // Effects
  DAMAGE_SHAKE: 0.4,
  STAT_CHANGE: 0.8,
  TEXT_TYPING: 0.03 // Seconds per character
} as const

export const ANIM_EASES = {
  // Smooth entries
  OUT_SOFT: 'power2.out',
  OUT_BACK: 'back.out(1.7)',
  OUT_EXPO: 'expo.out',
  
  // Snappy retro feels
  PIXEL_JUMP: 'steps(4)',
  PIXEL_SLIDE: 'steps(8)',
  
  // Linear for loops/proyectiles
  LINEAR: 'none',
  
  // Elastic for hits
  HIT_ELASTIC: 'elastic.out(1, 0.3)'
} as const

export type AnimTimingKey = keyof typeof ANIM_TIMINGS
export type AnimEaseKey = keyof typeof ANIM_EASES
