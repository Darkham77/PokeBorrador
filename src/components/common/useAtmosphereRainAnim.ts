import { gsap } from 'gsap'
import type { Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

const RAIN_ATMOSPHERE_WEATHER_IDS: readonly WeatherId[] = ['rain', 'storm', 'heavy_rain', 'thunderstorm']

const HEAVY_RAIN_BASE_SPEED = 0.35
const HEAVY_RAIN_VAR_SPEED = 0.2
const HEAVY_RAIN_LAYER2_SPEED_MULT = 1.3
const STORM_BASE_SPEED = 0.65
const STORM_VAR_SPEED = 0.6
const STORM_LAYER2_SPEED_MULT = 1.4
const RAIN_BASE_SPEED = 0.4
const RAIN_VAR_SPEED = 0.4
const RAIN_LAYER2_SPEED_MULT = 1.6
const BG_DRIFT_PX = 256
const SEED_X_FACTOR1 = 1234
const SEED_Y_FACTOR1 = 5678
const SEED_X_FACTOR2 = 9101
const SEED_Y_FACTOR2 = 1121
const LIGHTNING_MIN_X_PCT = 5
const LIGHTNING_RANGE_X_PCT = 90
const HALF_PROBABILITY_THRESHOLD = 0.5
const LIGHTNING_FLASH_DURATION_SEC = 0.05
const LIGHTNING_FADE_DURATION_SEC = 0.25
const FLASH_MAX_OPACITY = 0.6
const FLASH_FADE_DURATION_SEC = 0.4
const THUNDERSTORM_DELAY_BASE_SEC = 1
const THUNDERSTORM_DELAY_VAR_SEC = 2
const STORM_DELAY_BASE_SEC = 4
const STORM_DELAY_VAR_SEC = 6

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
      variantSpeed1 = (HEAVY_RAIN_BASE_SPEED + (animSeed * HEAVY_RAIN_VAR_SPEED)) * speedVar
      variantSpeed2 = variantSpeed1 * HEAVY_RAIN_LAYER2_SPEED_MULT
    } else if (isStorm) {
      variantSpeed1 = (STORM_BASE_SPEED + (animSeed * STORM_VAR_SPEED)) * speedVar
      variantSpeed2 = variantSpeed1 * STORM_LAYER2_SPEED_MULT
    } else {
      variantSpeed1 = (RAIN_BASE_SPEED + (animSeed * RAIN_VAR_SPEED)) * speedVar
      variantSpeed2 = variantSpeed1 * RAIN_LAYER2_SPEED_MULT
    }

    if (layer1Ref.value) {
      const driftX = isStorm ? -BG_DRIFT_PX : 0
      const s1X = (seed1 * SEED_X_FACTOR1) % BG_DRIFT_PX
      const s1Y = (seed1 * SEED_Y_FACTOR1) % BG_DRIFT_PX

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
      const driftX = isStorm ? -BG_DRIFT_PX : 0
      const s2X = (seed2 * SEED_X_FACTOR2) % BG_DRIFT_PX
      const s2Y = (seed2 * SEED_Y_FACTOR2) % BG_DRIFT_PX

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

        const x1 = Math.floor(Math.random() * LIGHTNING_RANGE_X_PCT) + LIGHTNING_MIN_X_PCT
        const isFlipped = Math.random() > HALF_PROBABILITY_THRESHOLD
        lightningPos.value = { x1, x2: x1 }

        const runStrike = () => {
          if (!lightningRef.value) return
          const tl = gsap.timeline()
          tl.to(lightningRef.value, {
            opacity: 1,
            duration: LIGHTNING_FLASH_DURATION_SEC,
            scaleX: isFlipped ? -1 : 1
          })
            .to(lightningRef.value, { opacity: 0, duration: LIGHTNING_FLASH_DURATION_SEC })
            .to(lightningRef.value, { opacity: 1, duration: LIGHTNING_FLASH_DURATION_SEC })
            .to(lightningRef.value, { opacity: 0, duration: LIGHTNING_FADE_DURATION_SEC })

          if (flashRef.value) {
            gsap.timeline()
              .to(flashRef.value, { opacity: FLASH_MAX_OPACITY, duration: LIGHTNING_FLASH_DURATION_SEC })
              .to(flashRef.value, { opacity: 0, duration: FLASH_FADE_DURATION_SEC, ease: 'power2.out' })
          }

          const nextDelay = w === 'thunderstorm'
            ? (THUNDERSTORM_DELAY_BASE_SEC + Math.random() * THUNDERSTORM_DELAY_VAR_SEC)
            : (STORM_DELAY_BASE_SEC + Math.random() * STORM_DELAY_VAR_SEC)
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
