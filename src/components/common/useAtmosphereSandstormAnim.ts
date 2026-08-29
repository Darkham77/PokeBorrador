import { gsap } from 'gsap'
import type { Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

const SANDSTORM_ATMOSPHERE_WEATHER_IDS_SET: ReadonlySet<WeatherId> = new Set<WeatherId>(['sandstorm', 'strong_winds', 'dust_storm']) // runtime-set

export function useAtmosphereSandstormAnim(
  dustLayer1Ref: Ref<HTMLElement | null>,
  dustLayer2Ref: Ref<HTMLElement | null>,
  applyParallaxLayer: (layer: HTMLElement | null, startX: number, startY: number, moveX: number, moveY: number, duration: number) => void
) {
  const initSandstormAnim = (
    w: WeatherId,
    animSeed: number,
    isLowPower: boolean,
    speedVar: number
  ) => {
    if (!SANDSTORM_ATMOSPHERE_WEATHER_IDS_SET.has(w)) return

    const isStrongWind = w === 'strong_winds'
    const isDust = w === 'dust_storm'
    const s1X = (animSeed * 1200) % 64
    const s1Y = (animSeed * 3400) % 64
    const s2X = (animSeed * 2400) % 128
    const s2Y = (animSeed * 4800) % 128

    if (dustLayer1Ref.value) {
      const speed1 = (1.0 + animSeed * 0.4) * (isStrongWind ? 1.0 : (isDust ? 1.2 : 0.8)) / speedVar
      const driftX = -512
      const isDiagonal = !['strong_winds', 'sandstorm', 'dust_storm'].includes(w)
      const moveY1 = isDiagonal ? 256 : 0

      applyParallaxLayer(dustLayer1Ref.value, s1X, s1Y, driftX, moveY1, speed1)

      if (dustLayer2Ref.value && !isLowPower) {
        const speed2 = (0.7 + animSeed * 0.3) * (isStrongWind ? 0.9 : (isDust ? 1.0 : 0.7)) / speedVar

        if (isStrongWind) {
          gsap.set(dustLayer1Ref.value, { backgroundSize: '128px 128px' })
          gsap.set(dustLayer2Ref.value, { backgroundSize: '256px 256px' })
        }

const DUST_LAYER_TWO_DRIFT_X_PX = -1024

        const moveY2 = isDiagonal ? 512 : 0
        applyParallaxLayer(dustLayer2Ref.value, s2X, s2Y, DUST_LAYER_TWO_DRIFT_X_PX, moveY2, speed2)
      }
    }
  }

  return {
    initSandstormAnim
  }
}
