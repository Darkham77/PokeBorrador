const LEAF_ANIM_FULL_ROTATION_DEG = 360;
const LEAF_ANIM_SPIN_ROTATION_DEG = 1080;
const COMBAT_LEAF_SPAWN_X_TOP_BASE = 1400;
const COMBAT_LEAF_SPAWN_X_TOP_RANGE = 750;
const COMBAT_LEAF_SPAWN_Y_TOP = 850;
const COMBAT_LEAF_SPAWN_X_SIDE = 2150;
const COMBAT_LEAF_SPAWN_Y_SIDE_BASE = 950;
const COMBAT_LEAF_SPAWN_Y_SIDE_RANGE = 650;
const COMBAT_LEAF_TRAVEL_X = -1600;
const COMBAT_LEAF_TRAVEL_Y = 500;

import { gsap } from 'gsap'
import { nextTick, type Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

type LeafWeatherId = 'wind' | 'strong_winds' | 'storm'
const LEAF_WEATHER_IDS = ['wind', 'strong_winds', 'storm'] as const satisfies readonly LeafWeatherId[]

function isLeafWeatherId(value: WeatherId): value is LeafWeatherId {
  return value === 'wind' || value === 'strong_winds' || value === 'storm'
}

export function useAtmosphereLeafAnim(
  containerRef: Ref<HTMLElement | null>,
  props: {
    weather: WeatherId
    isPerformanceMode: boolean
    isLowPower: boolean
    animSeed: number
    isVisible: boolean
  }
) {
  const initLeafAnim = (ctxVal: gsap.Context) => {
    if (!isLeafWeatherId(props.weather) || props.isPerformanceMode || !ctxVal) return

    const runLeafAnimation = () => {
      if (ctxVal.reverted || !props.isVisible || props.isPerformanceMode || !isLeafWeatherId(props.weather)) return

      const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
      if (!leafNodes || leafNodes.length === 0) return

      const activeLeaves = Array.from(leafNodes) as HTMLElement[]

      activeLeaves.forEach((el, i) => {
        const animateLeaf = () => {
          if (ctxVal.reverted || !props.isVisible || props.isPerformanceMode || !isLeafWeatherId(props.weather)) return

          const s1 = Math.random()
          const s2 = Math.random()

          const fromTop = s1 > 0.5
          const isVirtual = Boolean(containerRef.value?.closest('.map-virtual-world'))

          const startX = isVirtual
            ? (fromTop ? (COMBAT_LEAF_SPAWN_X_TOP_BASE + s2 * COMBAT_LEAF_SPAWN_X_TOP_RANGE) : COMBAT_LEAF_SPAWN_X_SIDE)
            : (fromTop ? (80 + s2 * 40) : 115)
          const startY = isVirtual
            ? (fromTop ? COMBAT_LEAF_SPAWN_Y_TOP : (COMBAT_LEAF_SPAWN_Y_SIDE_BASE + s2 * COMBAT_LEAF_SPAWN_Y_SIDE_RANGE))
            : (fromTop ? -20 : (s2 * 60))

          const travelX = isVirtual ? COMBAT_LEAF_TRAVEL_X : '-350cqw'
          const travelY = isVirtual ? COMBAT_LEAF_TRAVEL_Y : '80cqh'

          ctxVal.add(() => {
            gsap.set(el, {
              left: isVirtual ? `${startX}px` : `${startX}%`,
              top: isVirtual ? `${startY}px` : `${startY}%`,
              x: 0,
              y: 0,
              opacity: 0.9,
              scale: 0.9 + Math.random() * 1.2,
              rotation: Math.random() * LEAF_ANIM_FULL_ROTATION_DEG
            })

            const seedMod = 0.8 + (props.animSeed * 0.4)
            const isCommonWind = props.weather === 'wind'
            const isStrongWind = props.weather === 'strong_winds'
            const baseDuration = (isCommonWind ? 3.5 : (isStrongWind ? 1.2 : 1.5)) * seedMod
            const speedVariation = (isCommonWind ? 4.0 : (isStrongWind ? 1.0 : 2.0)) * seedMod

            gsap.to(el, {
              x: travelX,
              y: travelY,
              rotation: `+=${LEAF_ANIM_SPIN_ROTATION_DEG}`,
              duration: baseDuration + (Math.random() * speedVariation),
              ease: 'none',
              onComplete: () => {
                if (ctxVal.reverted) return
                ctxVal.add(() => {
                  gsap.delayedCall(Math.random() * 1.5, animateLeaf)
                })
              }
            })
          })
        }

        const isCommonWind = props.weather === 'wind'
        const isStrongWind = props.weather === 'strong_winds'
        const seedMod = 0.8 + (props.animSeed * 0.4)
        const baseDelay = isCommonWind ? 0.8 : (isStrongWind ? 0.3 : 0.4)

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
