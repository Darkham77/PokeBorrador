import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { getTrainerIdleConfig } from '../../../src/components/battle/helpers/trainerIdleAnims.ts'
import {
  TRAINER_IDLE_BASE_SCALE_X,
  TRAINER_IDLE_VAR_SCALE_X,
  TRAINER_IDLE_BASE_SCALE_Y,
  TRAINER_IDLE_VAR_SCALE_Y,
  TRAINER_IDLE_BASE_ROTATION_DEG,
  TRAINER_IDLE_VAR_ROTATION_DEG,
  TRAINER_IDLE_BASE_DURATION_SEC,
  TRAINER_IDLE_VAR_DURATION_SEC
} from '../../../src/logic/constants/animations.ts'

describe('trainerIdleAnims', () => {
  it('generates valid GSAP tween config for subtle idle breathing', () => {
    const config = getTrainerIdleConfig()

    assert.equal(config.repeat, -1)
    assert.equal(config.yoyo, true)
    assert.equal(config.repeatRefresh, true)
    assert.equal(config.ease, 'sine.inOut')

    // Test dynamic getter functions return values within expected ranges
    const scaleXFn = config.scaleX as () => number
    const scaleYFn = config.scaleY as () => number
    const rotationFn = config.rotation as () => number
    const durationFn = config.duration as () => number

    const ITERATIONS = 20
    for (let i = 0; i < ITERATIONS; i++) {
      const scaleX = scaleXFn()
      assert.ok(scaleX >= TRAINER_IDLE_BASE_SCALE_X && scaleX <= TRAINER_IDLE_BASE_SCALE_X + TRAINER_IDLE_VAR_SCALE_X)

      const scaleY = scaleYFn()
      assert.ok(scaleY >= TRAINER_IDLE_BASE_SCALE_Y && scaleY <= TRAINER_IDLE_BASE_SCALE_Y + TRAINER_IDLE_VAR_SCALE_Y)

      const rotation = rotationFn()
      assert.ok(
        Math.abs(rotation) >= TRAINER_IDLE_BASE_ROTATION_DEG &&
        Math.abs(rotation) <= TRAINER_IDLE_BASE_ROTATION_DEG + TRAINER_IDLE_VAR_ROTATION_DEG
      )

      const duration = durationFn()
      assert.ok(duration >= TRAINER_IDLE_BASE_DURATION_SEC && duration <= TRAINER_IDLE_BASE_DURATION_SEC + TRAINER_IDLE_VAR_DURATION_SEC)
    }
  })
})
