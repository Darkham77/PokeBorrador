import { gsap } from 'gsap'
import type { Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

const RAIN_ATMOSPHERE_WEATHER_IDS: readonly WeatherId[] = ['rain', 'storm', 'heavy_rain', 'thunderstorm']

export function useAtmosphereRainAnim(
  layer1Ref: Ref<HTMLElement | null>,
  layer2Ref: Ref<HTMLElement | null>,
  lightningRef: Ref<HTMLElement | null>,
  flashRef: Ref<HTMLElement | null>,
  lightningPos: Ref<{ x1: number; x2: number }>
) {
  let lightningTimer: gsap.core.Tween | null = null

  const initRainAnim = (
    w: WeatherId,
    seed1: number,
    seed2: number,
    animSeed: number,
    isLowPower: boolean,
    speedVar: number,
    weatherTimeline: gsap.core.Timeline | null,
    atmosphereContext: gsap.Context | null,
    props: { isVisible: boolean; isPerformanceMode: boolean; weather: WeatherId }
  ) => {
    if (!RAIN_ATMOSPHERE_WEATHER_IDS.includes(w) || !weatherTimeline) return

    const isStorm = w === 'storm' || w === 'thunderstorm'
    const isHeavy = w === 'heavy_rain'

    let variantSpeed1: number, variantSpeed2: number

    if (isHeavy) {
      variantSpeed1 = (0.35 + (animSeed * 0.2)) * speedVar
      variantSpeed2 = variantSpeed1 * 1.3
    } else if (isStorm) {
      const stormBase = 0.65
      variantSpeed1 = (stormBase + (animSeed * 0.6)) * speedVar
      variantSpeed2 = variantSpeed1 * 1.4
    } else {
      const rainBase = 0.4
      variantSpeed1 = (rainBase + (animSeed * 0.4)) * speedVar
      variantSpeed2 = variantSpeed1 * 1.6
    }

    if (layer1Ref.value) {
      const driftX = isStorm ? -256 : 0
      const s1X = (seed1 * 1234) % 256
      const s1Y = (seed1 * 5678) % 256

      gsap.set(layer1Ref.value, { backgroundPosition: `${s1X}px ${s1Y}px` })

      weatherTimeline.to(layer1Ref.value,
        {
          backgroundPosition: `+=${driftX}px +=256px`,
          duration: variantSpeed1,
          repeat: -1,
          ease: 'none'
        },
        0
      ).progress(seed1)
    }

    if (layer2Ref.value && !isLowPower) {
      const driftX = isStorm ? -256 : 0
      const s2X = (seed2 * 9101) % 256
      const s2Y = (seed2 * 1121) % 256

      gsap.set(layer2Ref.value, { backgroundPosition: `${s2X}px ${s2Y}px` })

      weatherTimeline.to(layer2Ref.value,
        {
          backgroundPosition: `+=${driftX}px +=256px`,
          duration: variantSpeed2 * (isHeavy ? 1.5 : 1),
          repeat: -1,
          ease: 'none'
        },
        0
      ).progress(seed2)
    }

    if (isStorm) {
      const strike = () => {
        if (!props.isVisible || props.isPerformanceMode || !['storm', 'thunderstorm'].includes(props.weather) || !lightningRef.value) return

        const x1 = Math.floor(Math.random() * 90) + 5
        const isFlipped = Math.random() > 0.5
        lightningPos.value = { x1, x2: x1 }

        const runStrike = () => {
          if (!lightningRef.value) return
          const tl = gsap.timeline()
          tl.to(lightningRef.value, {
            opacity: 1,
            duration: 0.05,
            scaleX: isFlipped ? -1 : 1
          })
            .to(lightningRef.value, { opacity: 0, duration: 0.05 })
            .to(lightningRef.value, { opacity: 1, duration: 0.05 })
            .to(lightningRef.value, { opacity: 0, duration: 0.25 })

          if (flashRef.value) {
            gsap.timeline()
              .to(flashRef.value, { opacity: 0.6, duration: 0.05 })
              .to(flashRef.value, { opacity: 0, duration: 0.4, ease: 'power2.out' })
          }

          const nextDelay = w === 'thunderstorm' ? (1 + Math.random() * 2) : (4 + Math.random() * 6)
          lightningTimer = gsap.delayedCall(nextDelay, strike)
        }

        if (atmosphereContext) {
          atmosphereContext.add(runStrike)
        } else {
          runStrike()
        }
      }
      lightningTimer = gsap.delayedCall(2 + Math.random() * 3, strike)
    }
  }

  const cleanUpLightning = () => {
    if (lightningTimer) {
      lightningTimer.kill()
      lightningTimer = null
    }
  }

  return {
    initRainAnim,
    cleanUpLightning
  }
}
