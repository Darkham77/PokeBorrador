/**
 * src/components/battle/helpers/combatantIdleAnims.ts
 * 
 * GSAP configuration generators for battle combatant idle floating and grounded breathing.
 */


import {
  COMBATANT_IDLE_FLOAT_BASE_Y_PERCENT,
  COMBATANT_IDLE_FLOAT_VAR_Y_PERCENT,
  COMBATANT_IDLE_FLOAT_BASE_ROTATION_DEG,
  COMBATANT_IDLE_FLOAT_VAR_ROTATION_DEG,
  COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC,
  COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC,
  COMBATANT_IDLE_GROUNDED_BASE_SCALE_X,
  COMBATANT_IDLE_GROUNDED_VAR_SCALE_X,
  COMBATANT_IDLE_GROUNDED_BASE_SCALE_Y,
  COMBATANT_IDLE_GROUNDED_VAR_SCALE_Y,
  COMBATANT_IDLE_GROUNDED_BASE_ROTATION_DEG,
  COMBATANT_IDLE_GROUNDED_VAR_ROTATION_DEG,
  COMBATANT_IDLE_GROUNDED_BASE_DURATION_SEC,
  COMBATANT_IDLE_GROUNDED_VAR_DURATION_SEC
} from '@/logic/constants/animations'

const RANDOM_DIRECTION_PROBABILITY_HALF = 0.5

export function isIdleSuppressed(
  statusRaw: string | null | undefined,
  confusedCount: number | undefined,
  animStateRaw: string | null | undefined
): boolean {
  const status = statusRaw?.toLowerCase() || ''
  const isFrozen = status === 'frz' || status === 'freeze' || status === '🧊'
  const isPara = status === 'par' || status.includes('paraly') || status.includes('para') || status === '⚡'
  const isConfused = (confusedCount || 0) > 0
  const isTrapped = animStateRaw === 'trapped'
  const isCatching = animStateRaw === 'catching'
  return isFrozen || isPara || isConfused || isTrapped || isCatching
}

export function getIdleFloatingConfig(): gsap.TweenVars {
  return {
    y: () => `-${COMBATANT_IDLE_FLOAT_BASE_Y_PERCENT + Math.random() * COMBATANT_IDLE_FLOAT_VAR_Y_PERCENT}%`,
    rotation: () => (Math.random() > RANDOM_DIRECTION_PROBABILITY_HALF ? 1 : -1) * (COMBATANT_IDLE_FLOAT_BASE_ROTATION_DEG + Math.random() * COMBATANT_IDLE_FLOAT_VAR_ROTATION_DEG),
    duration: () => COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC + Math.random() * COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC,
    repeat: -1,
    yoyo: true,
    repeatRefresh: true,
    ease: 'sine.inOut'
  }
}

export function getIdleGroundedConfig(): gsap.TweenVars {
  return {
    scaleX: () => COMBATANT_IDLE_GROUNDED_BASE_SCALE_X + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_SCALE_X,
    scaleY: () => COMBATANT_IDLE_GROUNDED_BASE_SCALE_Y + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_SCALE_Y,
    rotation: () => (Math.random() > RANDOM_DIRECTION_PROBABILITY_HALF ? 1 : -1) * (COMBATANT_IDLE_GROUNDED_BASE_ROTATION_DEG + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_ROTATION_DEG),
    duration: () => COMBATANT_IDLE_GROUNDED_BASE_DURATION_SEC + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_DURATION_SEC,
    repeat: -1,
    yoyo: true,
    repeatRefresh: true,
    ease: 'sine.inOut'
  }
}
