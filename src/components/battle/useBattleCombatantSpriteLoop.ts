/**
 * src/components/battle/useBattleCombatantSpriteLoop.ts
 * 
 * GSAP Timeline spritesheet animation loop for combatant sprites (idle + variation cycling).
 */

import { ref, type Ref, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import type { BattleCombatantProps } from '@/types/battle/battle'

export interface AnimatedSpriteFramesInfo {
  frames: number
}

const IDLE_CYCLES_MIN = 2
const IDLE_CYCLES_VARIANCE = 3

export interface UseBattleCombatantSpriteLoopParams {
  props: BattleCombatantProps
  spriteRef: Ref<HTMLElement | null>
  isAnimated: Ref<boolean>
  frames: Ref<number>
  variationMeta: Ref<AnimatedSpriteFramesInfo | null>
}

export function useBattleCombatantSpriteLoop(params: UseBattleCombatantSpriteLoopParams) {
  const { props, spriteRef, isAnimated, frames, variationMeta } = params

  const currentMode = ref<'idle' | 'variation'>('idle')
  const idleCyclesTarget = ref(Math.floor(Math.random() * IDLE_CYCLES_VARIANCE) + IDLE_CYCLES_MIN)
  const animTween = ref<gsap.core.Timeline | null>(null)

  const animateSpritesheet = () => {
    if (animTween.value) {
      animTween.value.kill()
      animTween.value = null
    }
    if (!isAnimated.value || !spriteRef.value) return

    const imgEl = spriteRef.value.querySelector('.pokemon-combat-image') as HTMLElement
    if (!imgEl) return

    // Si está congelado o dormido, forzar primer frame del idle y detener animación
    if (props.pokemon?.status === 'frz' || props.pokemon?.status === 'slp') {
      currentMode.value = 'idle'
      const imgEl = spriteRef.value.querySelector('.pokemon-image-idle') as HTMLElement
      if (imgEl) {
        gsap.set(imgEl, { x: 0, xPercent: 0 })
      }
      return
    }

    const playMode = () => {
      // 1. Limpiar timelines previos y detener todas las llamadas a onComplete
      if (animTween.value) {
        animTween.value.kill()
        animTween.value = null
      }
      if (!props.pokemon) return

      const startTween = () => {
        if (!spriteRef.value) return
        
        const activeClass = currentMode.value === 'idle' ? '.pokemon-image-idle' : '.pokemon-image-variation'
        const imgEl = spriteRef.value.querySelector(activeClass) as HTMLElement
        if (!imgEl) return

        const totalFrames = currentMode.value === 'idle' 
          ? (frames.value) 
          : (variationMeta.value?.frames ?? 0)

        if (totalFrames <= 1 || (currentMode.value === 'variation' && !variationMeta.value)) {
          currentMode.value = 'idle'
          const idleImg = spriteRef.value.querySelector('.pokemon-image-idle') as HTMLElement
          if (idleImg) {
            gsap.set(idleImg, { x: 0, xPercent: 0 })
          }
          return
        }

        gsap.killTweensOf(imgEl)
        gsap.set(imgEl, { clearProps: 'x,xPercent,transform' })
        gsap.set(imgEl, { x: 0, xPercent: 0 })

        const endXPercent = -((totalFrames - 1) / totalFrames) * 100
        const fps = currentMode.value === 'idle' ? 8 : 10
        const duration = totalFrames / fps
        const repeatCount = currentMode.value === 'idle' ? (idleCyclesTarget.value - 1) : 0

        const tl = gsap.timeline({
          onComplete: () => {
            if (!props.pokemon) return
            if (currentMode.value === 'idle' && variationMeta.value && variationMeta.value.frames > 1) {
              currentMode.value = 'variation'
              idleCyclesTarget.value = Math.floor(Math.random() * IDLE_CYCLES_VARIANCE) + IDLE_CYCLES_MIN
            } else {
              currentMode.value = 'idle'
            }
            playMode()
          }
        })

        tl.to(imgEl, {
          xPercent: endXPercent,
          ease: `steps(${totalFrames - 1})`,
          duration,
          repeat: repeatCount
        })

        animTween.value = tl
      }

      startTween()
    }

    playMode()
  }

  onUnmounted(() => {
    if (animTween.value) {
      animTween.value.kill()
    }
  })

  return {
    currentMode,
    idleCyclesTarget,
    animTween,
    animateSpritesheet
  }
}
