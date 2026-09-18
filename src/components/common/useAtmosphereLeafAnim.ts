const LEAF_ANIM_FULL_ROTATION_DEG = 360;
const LEAF_ANIM_SPIN_ROTATION_DEG = 1080;

const LEAF_SPAWN_X_BASE_PCT = 10;
const LEAF_SPAWN_X_RANGE_PCT = 120;
const LEAF_SPAWN_Y_BASE_PCT = -30;
const LEAF_SPAWN_Y_RANGE_PCT = 25;

const LEAF_TRAVEL_X_CQW = '-150cqw';
const LEAF_TRAVEL_Y_CQH = '180cqh';

const LEAF_MIN_SCALE = 0.9;
const LEAF_SCALE_VARIATION = 1.2;
const LEAF_ACTIVE_OPACITY = 0.9;
const LEAF_OFFSCREEN_PX = -100;
const LEAF_MAX_CYCLE_DELAY_SEC = 1.5;

const LEAF_BASE_DURATION_WIND_SEC = 3.5;
const LEAF_BASE_DURATION_STRONG_WIND_SEC = 1.2;
const LEAF_BASE_DURATION_STORM_SEC = 1.5;

const LEAF_SPEED_VAR_WIND_SEC = 4.0;
const LEAF_SPEED_VAR_STRONG_WIND_SEC = 1.0;
const LEAF_SPEED_VAR_STORM_SEC = 2.0;

const LEAF_INITIAL_DELAY_WIND_SEC = 0.8;
const LEAF_INITIAL_DELAY_STRONG_WIND_SEC = 0.3;
const LEAF_INITIAL_DELAY_STORM_SEC = 0.4;

const LEAF_SEED_MOD_BASE = 0.8;
const LEAF_SEED_MOD_FACTOR = 0.4;

import { gsap } from 'gsap'
import { nextTick, type Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

type LeafWeatherId = 'wind' | 'strong_winds' | 'storm'
const LEAF_WEATHER_IDS = ['wind', 'strong_winds', 'storm'] as const satisfies readonly LeafWeatherId[]

export function isLeafWeatherId(value: WeatherId): value is LeafWeatherId {
  return value === 'wind' || value === 'strong_winds' || value === 'storm'
}

function resolveLeafDurationAndVariation(weather: LeafWeatherId): { baseDuration: number; speedVariation: number } {
  if (weather === 'wind') {
    return {
      baseDuration: LEAF_BASE_DURATION_WIND_SEC,
      speedVariation: LEAF_SPEED_VAR_WIND_SEC
    }
  }
  if (weather === 'strong_winds') {
    return {
      baseDuration: LEAF_BASE_DURATION_STRONG_WIND_SEC,
      speedVariation: LEAF_SPEED_VAR_STRONG_WIND_SEC
    }
  }
  return {
    baseDuration: LEAF_BASE_DURATION_STORM_SEC,
    speedVariation: LEAF_SPEED_VAR_STORM_SEC
  }
}

function resolveLeafBaseDelay(weather: LeafWeatherId): number {
  if (weather === 'wind') return LEAF_INITIAL_DELAY_WIND_SEC
  if (weather === 'strong_winds') return LEAF_INITIAL_DELAY_STRONG_WIND_SEC
  return LEAF_INITIAL_DELAY_STORM_SEC
}

export function useAtmosphereLeafAnim(
  containerRef: Ref<HTMLElement | null>,
  props: {
    weather: WeatherId
    isFastMode?: boolean
    isPerformanceMode?: boolean
    isLowPower: boolean
    animSeed: number
    isVisible: boolean
  }
) {
  const isFast = props.isFastMode ?? props.isPerformanceMode ?? false

  const initLeafAnim = (ctxVal: gsap.Context) => {
    if (!isLeafWeatherId(props.weather) || isFast || !ctxVal) return

    const runLeafAnimation = () => {
      if (ctxVal.reverted || !props.isVisible || isFast || !isLeafWeatherId(props.weather)) return

      const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
      if (!leafNodes || leafNodes.length === 0) return

      const activeLeaves = Array.from(leafNodes) as HTMLElement[]

      activeLeaves.forEach((el, i) => {
        ctxVal.add(() => {
          gsap.set(el, {
            opacity: 0,
            top: `${LEAF_OFFSCREEN_PX}px`,
            left: `${LEAF_OFFSCREEN_PX}px`
          })
        })

        const animateLeaf = () => {
          const leafWeather = props.weather
          if (ctxVal.reverted || !props.isVisible || isFast || !isLeafWeatherId(leafWeather)) return

          const s1 = Math.random()
          const s2 = Math.random()

          const startX = LEAF_SPAWN_X_BASE_PCT + s2 * LEAF_SPAWN_X_RANGE_PCT
          const startY = LEAF_SPAWN_Y_BASE_PCT - s1 * LEAF_SPAWN_Y_RANGE_PCT

          ctxVal.add(() => {
            gsap.set(el, {
              left: `${startX}%`,
              top: `${startY}%`,
              x: 0,
              y: 0,
              opacity: LEAF_ACTIVE_OPACITY,
              scale: LEAF_MIN_SCALE + Math.random() * LEAF_SCALE_VARIATION,
              rotation: Math.random() * LEAF_ANIM_FULL_ROTATION_DEG
            })

            const seedMod = LEAF_SEED_MOD_BASE + (props.animSeed * LEAF_SEED_MOD_FACTOR)
            const { baseDuration, speedVariation } = resolveLeafDurationAndVariation(leafWeather)
            const duration = (baseDuration + Math.random() * speedVariation) * seedMod

            gsap.to(el, {
              x: LEAF_TRAVEL_X_CQW,
              y: LEAF_TRAVEL_Y_CQH,
              rotation: `+=${LEAF_ANIM_SPIN_ROTATION_DEG}`,
              duration,
              ease: 'none',
              onComplete: () => {
                if (ctxVal.reverted) return
                ctxVal.add(() => {
                  gsap.set(el, {
                    opacity: 0,
                    top: `${LEAF_OFFSCREEN_PX}px`,
                    left: `${LEAF_OFFSCREEN_PX}px`
                  })
                  gsap.delayedCall(Math.random() * LEAF_MAX_CYCLE_DELAY_SEC, animateLeaf)
                })
              }
            })
          })
        }

        const initialWeather = props.weather
        if (!isLeafWeatherId(initialWeather)) return
        const baseDelay = resolveLeafBaseDelay(initialWeather)
        const seedMod = LEAF_SEED_MOD_BASE + (props.animSeed * LEAF_SEED_MOD_FACTOR)

        ctxVal.add(() => {
          gsap.delayedCall(i * baseDelay * seedMod, animateLeaf)
        })
      })
    }

    const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
    if (!leafNodes || leafNodes.length === 0) {
      nextTick(() => {
        if (!ctxVal.reverted) runLeafAnimation()
      })
    } else {
      runLeafAnimation()
    }
  }

  return {
    leafTypes: LEAF_WEATHER_IDS,
    isLeafWeatherId,
    initLeafAnim
  }
}
