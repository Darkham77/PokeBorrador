const LEAF_ANIM_FULL_ROTATION_DEG = 360;
const LEAF_ANIM_SPIN_ROTATION_DEG = 1080;

import { gsap } from 'gsap'
import type { Ref } from 'vue'
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
          const startX = fromTop ? (80 + s2 * 40) : 115
          const startY = fromTop ? -20 : (s2 * 60)

          ctxVal.add(() => {
            gsap.set(el, {
              left: `${startX}%`,
              top: `${startY}%`,
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
              x: '-350cqw',
              y: '80cqh',
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

const LEAF_NODES_RETRY_TIMEOUT_MS = 50

    const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
    if (!leafNodes || leafNodes.length === 0) {
      setTimeout(() => {
        if (!ctxVal.reverted) runLeafAnimation()
      }, LEAF_NODES_RETRY_TIMEOUT_MS)
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
