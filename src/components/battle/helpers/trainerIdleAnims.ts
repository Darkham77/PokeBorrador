/**
 * src/components/battle/helpers/trainerIdleAnims.ts
 * 
 * GSAP configuration generators for battle trainer NPC and player idle subtle breathing.
 */

import {
  TRAINER_IDLE_BASE_SCALE_X,
  TRAINER_IDLE_VAR_SCALE_X,
  TRAINER_IDLE_BASE_SCALE_Y,
  TRAINER_IDLE_VAR_SCALE_Y,
  TRAINER_IDLE_BASE_ROTATION_DEG,
  TRAINER_IDLE_VAR_ROTATION_DEG,
  TRAINER_IDLE_BASE_DURATION_SEC,
  TRAINER_IDLE_VAR_DURATION_SEC
} from '@/logic/constants/animations'

const RANDOM_DIRECTION_PROBABILITY_HALF = 0.5

export function getTrainerIdleConfig(): gsap.TweenVars {
  return {
    scaleX: () => TRAINER_IDLE_BASE_SCALE_X + Math.random() * TRAINER_IDLE_VAR_SCALE_X,
    scaleY: () => TRAINER_IDLE_BASE_SCALE_Y + Math.random() * TRAINER_IDLE_VAR_SCALE_Y,
    rotation: () => (Math.random() > RANDOM_DIRECTION_PROBABILITY_HALF ? 1 : -1) * (TRAINER_IDLE_BASE_ROTATION_DEG + Math.random() * TRAINER_IDLE_VAR_ROTATION_DEG),
    duration: () => TRAINER_IDLE_BASE_DURATION_SEC + Math.random() * TRAINER_IDLE_VAR_DURATION_SEC,
    repeat: -1,
    yoyo: true,
    repeatRefresh: true,
    ease: 'sine.inOut'
  }
}
