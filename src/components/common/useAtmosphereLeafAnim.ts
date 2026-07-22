import { gsap } from 'gsap'
import type { Ref } from 'vue'

export function useAtmosphereLeafAnim(
  containerRef: Ref<HTMLElement | null>,
  props: {
    weather: string
    isPerformanceMode: boolean
    isLowPower: boolean
    animSeed: number
    isVisible: boolean
  }
) {
  const leafTypes = ['wind', 'strong_winds', 'storm']

  const initLeafAnim = (ctxVal: gsap.Context, atmosphereContext: gsap.Context | null) => {
    if (!leafTypes.includes(props.weather) || props.isPerformanceMode || !ctxVal) return

    const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
    if (!leafNodes || leafNodes.length === 0) return

    const activeLeaves = Array.from(leafNodes) as HTMLElement[]

    activeLeaves.forEach((el, i) => {
      const animateLeaf = () => {
        if (atmosphereContext !== ctxVal || ctxVal.reverted) return
        if (!props.isVisible || props.isPerformanceMode || !ctxVal || !leafTypes.includes(props.weather)) return

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
            rotation: Math.random() * 360
          })

          const seedMod = 0.8 + (props.animSeed * 0.4)
          const isCommonWind = props.weather === 'wind'
          const isStrongWind = props.weather === 'strong_winds'
          const baseDuration = (isCommonWind ? 3.5 : (isStrongWind ? 1.2 : 1.5)) * seedMod
          const speedVariation = (isCommonWind ? 4.0 : (isStrongWind ? 1.0 : 2.0)) * seedMod

          gsap.to(el, {
            x: '-350cqw',
            y: '80cqh',
            rotation: `+=1080`,
            duration: baseDuration + (Math.random() * speedVariation),
            ease: 'none',
            onComplete: () => {
              if (atmosphereContext !== ctxVal || ctxVal.reverted) return
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

  return {
    leafTypes,
    initLeafAnim
  }
}
