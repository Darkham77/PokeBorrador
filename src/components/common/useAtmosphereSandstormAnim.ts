import type { Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import {
  computeSandstormKinematics,
  computeSandstormSpeed,
  applyStrongWindSizes,
  DUST_LAYER_ONE_DRIFT_X_PX,
  DUST_LAYER_TWO_DRIFT_X_PX
} from './atmosphereSandstormHelper.ts'

const SANDSTORM_ATMOSPHERE_WEATHER_IDS_SET: ReadonlySet<WeatherId> = new Set<WeatherId>(['sandstorm', 'strong_winds', 'dust_storm']) // runtime-set: Fast O(1) membership lookup set

export function useAtmosphereSandstormAnim(
  dustLayer1Ref: Ref<HTMLElement | null>,
  dustLayer2Ref: Ref<HTMLElement | null>,
  applyParallaxLayer: (layer: HTMLElement | null, startX: number, startY: number, moveX: number, moveY: number, duration: number, seed?: number) => void
) {
  const initSandstormAnim = (
    w: WeatherId,
    animSeed: number,
    isLowPower: boolean,
    speedVar: number
  ) => {
    if (!SANDSTORM_ATMOSPHERE_WEATHER_IDS_SET.has(w)) return
    const l1 = dustLayer1Ref.value
    if (!l1) return

    const k = computeSandstormKinematics(animSeed)
    const speed1 = computeSandstormSpeed(animSeed, w, speedVar, 1)
    applyParallaxLayer(l1, k.s1X, k.s1Y, DUST_LAYER_ONE_DRIFT_X_PX, 0, speed1, animSeed)

    const l2 = dustLayer2Ref.value
    if (l2 && !isLowPower) {
      const speed2 = computeSandstormSpeed(animSeed, w, speedVar, 2)
      if (w === 'strong_winds') {
        applyStrongWindSizes(l1, l2)
      }
      applyParallaxLayer(l2, k.s2X, k.s2Y, DUST_LAYER_TWO_DRIFT_X_PX, 0, speed2, (animSeed * 1.618) % 1)
    }
  }

  return {
    initSandstormAnim
  }
}
