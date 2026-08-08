import { gsap } from 'gsap'
import type { Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

const SNOW_ATMOSPHERE_WEATHER_IDS: readonly WeatherId[] = ['snow', 'blizzard', 'hail']

export function useAtmosphereSnowAnim(
  layer1Ref: Ref<HTMLElement | null>,
  layer2Ref: Ref<HTMLElement | null>,
  applyParallaxLayer: (layer: HTMLElement | null, startX: number, startY: number, moveX: number, moveY: number, duration: number) => void
) {
  const initSnowAnim = (
    w: WeatherId,
    seed1: number,
    seed2: number,
    animSeed: number,
    isLowPower: boolean,
    speedVar: number,
    weatherTimeline: gsap.core.Timeline | null
  ) => {
    if (!SNOW_ATMOSPHERE_WEATHER_IDS.includes(w) || !weatherTimeline) return

    const isBlizzard = w === 'blizzard'
    const isHail = w === 'hail'

    if (!isHail) {
      if (layer1Ref.value) {
        const s1X = (seed1 * 1500) % 256
        const s1Y = (seed1 * 2500) % 256
        const drift1X = isBlizzard ? -512 : 0
        const dur1 = (isBlizzard ? 3.0 : 18.0) / speedVar

        gsap.set(layer1Ref.value, { backgroundPosition: `${s1X}px ${s1Y}px` })

        weatherTimeline.to(layer1Ref.value,
          {
            backgroundPosition: `${drift1X >= 0 ? '+=' : '-='}${Math.abs(drift1X)}px +=1024px`,
            duration: dur1,
            repeat: -1,
            ease: 'none'
          },
          0
        )

        if (layer2Ref.value && !isLowPower) {
          const s2X = (seed2 * 3500) % 192
          const s2Y = (seed2 * 4500) % 192
          const drift2X = isBlizzard ? 768 : 0
          const dur2 = (isBlizzard ? 9.0 : 54.0) / speedVar

          gsap.set(layer2Ref.value, { backgroundPosition: `${s2X}px ${s2Y}px` })

          weatherTimeline.to(layer2Ref.value,
            {
              backgroundPosition: `${drift2X >= 0 ? '+=' : '-='}${Math.abs(drift2X)}px +=1536px`,
              duration: dur2,
              repeat: -1,
              ease: 'none'
            },
            0
          )
        }
      }
const HAIL_VERTICAL_DRIFT_PX = 512;

    } else {
      if (layer1Ref.value) {
        const s1X = (seed1 * 1200) % 128
        const s1Y = (seed1 * 2200) % 128
        applyParallaxLayer(layer1Ref.value, s1X, s1Y, 0, HAIL_VERTICAL_DRIFT_PX, 1.0 / speedVar)
      }

      if (layer2Ref.value && !isLowPower) {
        const speedVar2 = 0.9 + (animSeed * 0.2)
        const s2X = (seed2 * 2800) % 64
        const s2Y = (seed2 * 3800) % 64
        applyParallaxLayer(layer2Ref.value, s2X, s2Y, 0, HAIL_VERTICAL_DRIFT_PX, 1.5 / speedVar2)
      }
    }
  }

  return {
    initSnowAnim
  }
}
