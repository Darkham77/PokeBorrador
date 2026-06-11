import { watch, type Ref, nextTick, type ComputedRef, computed } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/gameBus'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'
import { isFlying } from '@/composables/useBattleShadows'

interface SparkleData {
  id: string | number
  tx: number
  ty: number
  tf: number
  scale: number
  delay: string
}

interface BattleCombatantProps {
  side: 'player' | 'enemy'
  pokemon?: Pokemon | null
  position: { x: number; y: number }
  targetPosition?: { x: number; y: number } | null
  baseSize: number
  groundY?: string
  shadowKey?: string | null
  animState?: 'catching' | 'trapped' | 'releasing' | null
  ballId?: string
  isShaking?: boolean
  isBlinking?: boolean
  isHealing?: boolean
  isSilhouette?: boolean
  isAttacking?: boolean
  activeMove?: { side: string; cat: 'physical' | 'special' | 'status' | 'selfKO'; name: string; selfKO?: boolean } | null
  showGuides?: boolean
  isCaptureSuccess?: boolean
  sparkles?: SparkleData[]
  isFainting?: boolean
  isEmerging?: boolean
  suppressFX?: boolean
  hidden?: boolean
  hasSeat?: boolean
  stages?: Partial<BattleStages>
}

export function useBattleCombatantAnims(
  props: BattleCombatantProps,
  spriteRef: Ref<HTMLElement | null>,
  spriteRotationRef: Ref<HTMLElement | null>,
  shadowWrapperRef: Ref<HTMLElement | null>,
  pokeballImgRef: Ref<HTMLImageElement | null>,
  idleWrapperRef: Ref<HTMLElement | null>,
  cacheKey: ComputedRef<string>,
  getSpriteFeetOrigin: () => string,
  getBallTargetCoords: () => { x: number; y: number },
  rawCoordsCache: Map<string, { x: number; y: number }>,
  wasCaptured: Ref<boolean>
) {
  let successBlinkTween: gsap.core.Tween | null = null
  let idleTween: gsap.core.Tween | null = null

  const isFloating = computed(() => {
    if (!props.pokemon) return false
    return isFlying(props.pokemon)
  })

  const initIdleAnim = () => {
    if (!idleWrapperRef.value || !props.pokemon) return
    if (idleTween) {
      idleTween.kill()
      idleTween = null
    }

    const status = props.pokemon.status?.toLowerCase() || ''
    const isFrozen = status === 'freeze' || status === '🧊'
    const isPara = status.includes('paraly') || status.includes('para') || status === '⚡'
    const isConfused = (props.pokemon.confused || 0) > 0
    const isTrapped = (props.animState as string) === 'trapped'
    const isCatching = props.animState === 'catching'
    
    if (isFrozen || isPara || isConfused || isTrapped || isCatching) {
      gsap.killTweensOf(idleWrapperRef.value)
      gsap.set(idleWrapperRef.value, { y: 0, rotation: 0, scaleX: 1, scaleY: 1 })
      return
    }

    if (isFloating.value) {
      idleTween = gsap.to(idleWrapperRef.value, {
        y: () => `-${10 + Math.random() * 6}%`,
        rotation: () => (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 4),
        duration: () => 2 + Math.random() * 1,
        repeat: -1,
        yoyo: true,
        repeatRefresh: true,
        ease: 'sine.inOut'
      })
    } else {
      idleTween = gsap.to(idleWrapperRef.value, {
        scaleX: () => 1.01 + Math.random() * 0.02,
        scaleY: () => 0.97 + Math.random() * 0.02,
        rotation: () => (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1),
        duration: () => 1.5 + Math.random() * 0.5,
        repeat: -1,
        yoyo: true,
        repeatRefresh: true,
        ease: 'sine.inOut'
      })
    }
  }

  watch(() => [props.pokemon?.status, props.pokemon?.confused, props.animState, isFloating.value], () => {
    if (idleWrapperRef.value) initIdleAnim()
  }, { deep: true })

  watch(idleWrapperRef, (el) => {
    if (el) initIdleAnim()
  })

  const triggerBallAnimation = (val: string | null) => {
    if (!spriteRef.value || !val) return
    
    if (val === 'catching') {
      const origin = getSpriteFeetOrigin()
      const cachedRaw = rawCoordsCache.get(cacheKey.value)
      const coords = cachedRaw || getBallTargetCoords()
      
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { display: "none" })
      }
      
      gsap.killTweensOf(spriteRef.value)
      
      gsap.set(spriteRef.value, { 
        transformOrigin: origin,
        filter: "url(#pixel-energy-optimized)" 
      })
      
      const tween = gsap.to(spriteRef.value, {
        x: coords.x,
        y: coords.y,
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { x: 0, y: 0, scale: 0, opacity: 0, filter: "none", clearProps: "transformOrigin" })
          }
        }
      })
      
      const animKey = `${props.side}-${props.pokemon?.uid || 'active'}`
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
    } else if (val === 'releasing') {
      const origin = getSpriteFeetOrigin()
      const cachedRaw = rawCoordsCache.get(cacheKey.value)
      const coords = cachedRaw || getBallTargetCoords()
      
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { display: "none" })
      }
      
      gsap.killTweensOf(spriteRef.value)
      
      gsap.set(spriteRef.value, { 
        transformOrigin: origin,
        x: coords.x, 
        y: coords.y, 
        scale: 0, 
        opacity: 0, 
        filter: "url(#pixel-energy-optimized)" 
      })
      
      const tween = gsap.to(spriteRef.value, {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: "transform,filter,transformOrigin,opacity" })
          }
          if (shadowWrapperRef.value) {
            gsap.set(shadowWrapperRef.value, { clearProps: "display" })
          }
        }
      })

      const animKey = `${props.side}-${props.pokemon?.uid || 'active'}`
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
    }
  }

  watch(() => props.animState, (val) => {
    nextTick(() => triggerBallAnimation(val || null))
  }, { immediate: true })

  watch(spriteRef, (newEl) => {
    if (newEl) {
      nextTick(() => triggerBallAnimation(props.animState || null))
    }
  })

  watch(() => props.isEmerging, (val) => {
    if (val && spriteRef.value) {
      const tl = gsap.timeline({
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: "transform" })
          }
        }
      })
      tl.to(spriteRef.value, { y: 8, scaleX: 1.2, scaleY: 0.75, duration: 0.1, ease: "power1.in" })
        .to(spriteRef.value, { y: -60, scaleX: 0.85, scaleY: 1.2, duration: 0.3, ease: "power2.out" })
        .to(spriteRef.value, { y: 0, scaleX: 1.1, scaleY: 0.9, duration: 0.2, ease: "bounce.out" })
        .to(spriteRef.value, { scaleX: 1, scaleY: 1, duration: 0.1 })
    }
  })

  watch(() => props.isFainting, (val) => {
    if (val && spriteRef.value) {
      const tl = gsap.timeline()
      
      gsap.set(spriteRef.value, { transition: "none" })
      
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { display: "none" })
      }

      tl.addLabel("fallStart")

      tl.to(spriteRef.value, { 
        y: 60, 
        duration: 1.0, 
        ease: "power2.in" 
      }, "fallStart") 
      
      const blinkPattern = [
        { t: 0.05, op: 0 }, { t: 0.13, op: 1 },
        { t: 0.21, op: 0 }, { t: 0.29, op: 1 },
        { t: 0.37, op: 0 }, { t: 0.45, op: 1 },
        { t: 0.53, op: 0 }, { t: 0.61, op: 1 },
        { t: 0.69, op: 0 }, { t: 0.77, op: 1 },
        { t: 0.85, op: 0 }, { t: 0.93, op: 1 },
        { t: 0.98, op: 0 }
      ]

      blinkPattern.forEach(b => {
        tl.set(spriteRef.value, { opacity: b.op }, `fallStart+=${b.t}`)
      })
    } else if (!val && spriteRef.value) {
      gsap.set(spriteRef.value, { clearProps: "opacity,y,transition" })
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { clearProps: "display" })
      }
    }
  })

  watch(() => {
    if (!props.isAttacking || !props.activeMove) return null
    return `${props.isAttacking}-${props.activeMove.name}-${props.activeMove.cat}`
  }, (newVal) => {
    if (newVal && spriteRef.value) {
      const move = props.activeMove
      if (!move) return
      const isPlayerSide = props.side === 'player'
      const cat = move.cat
      const tl = gsap.timeline()
      
      let nx = isPlayerSide ? 1 : -1
      let ny = isPlayerSide ? -0.5 : 0.5
      
      if (props.targetPosition) {
        const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
        const mySize = props.baseSize * scale
        const targetBase = isPlayerSide ? (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_ENEMY: number }).BASE_ENTITY_SIZE_ENEMY : (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_PLAYER: number }).BASE_ENTITY_SIZE_PLAYER
        const targetSize = targetBase * scale
        
        const myCenterX = props.position.x + (mySize / 2)
        const myCenterY = props.position.y + (mySize / 2)
        
        const targetCenterX = props.targetPosition.x + (targetSize / 2)
        const targetCenterY = props.targetPosition.y + (targetSize / 2)

        const dx = targetCenterX - myCenterX
        const dy = targetCenterY - myCenterY
        const length = Math.sqrt(dx * dx + dy * dy)
        if (length > 0) {
          nx = dx / length
          ny = dy / length
        }
      }
      
      if (move.selfKO || cat === 'selfKO') {
        const shakeTimeline = gsap.timeline()
        for (let i = 0; i < 8; i++) {
          const shakeX = (Math.random() - 0.5) * 30
          const shakeY = (Math.random() - 0.5) * 30
          shakeTimeline.to(spriteRef.value, {
            x: shakeX,
            y: shakeY,
            duration: 0.05,
            ease: "none"
          })
        }
        tl.add(shakeTimeline)
        
        tl.add(() => {
          gameBus.emit('PLAY_SOUND', 'faint')
        })

        tl.to(spriteRef.value, {
          scale: 1.6,
          filter: "Brightness(1.8) Drop-Shadow(0 0 25px #ff4500)",
          duration: 0.25,
          ease: "power2.out"
        })
        
        tl.to(spriteRef.value, {
          scale: 0,
          opacity: 0,
          filter: "Brightness(3) Drop-Shadow(0 0 35px #ffffff)",
          duration: 0.35,
          ease: "power2.in"
        })

        tl.to(spriteRef.value, {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          filter: "Brightness(1)",
          clearProps: "all",
          duration: 0.01
        })
      } else if (cat === 'physical' || !cat) {
        const dashDist = 60
        const prepDist = -15
        
        tl.to(spriteRef.value, { x: nx * prepDist, y: ny * prepDist, duration: 0.1 })
          .to(spriteRef.value, { x: nx * dashDist, y: ny * dashDist, scale: 1.1, duration: 0.15, ease: "power2.out" })
          .to(spriteRef.value, { x: 0, y: 0, scale: 1, duration: 0.15, ease: "power1.inOut" })
      } else if (cat === 'special') {
        const pulseDist = 15
        tl.fromTo(spriteRef.value, 
          { filter: "Brightness(1)", x: 0, y: 0, scale: 1 },
          { 
            x: nx * pulseDist, 
            y: ny * pulseDist, 
            scale: 1.15, 
            filter: "Brightness(1.4)", 
            duration: 0.2, 
            yoyo: true, 
            repeat: 1,
            ease: "power2.out"
          }
        )
      } else if (cat === 'status') {
        const rot = isPlayerSide ? 12 : -12
        tl.fromTo(spriteRotationRef.value, 
          { filter: "Brightness(1)", rotation: 0, scale: 1 },
          { 
            rotation: rot, 
            scale: 1.1, 
            filter: "Brightness(1.2)", 
            duration: 0.2, 
            yoyo: true, 
            repeat: 1,
            ease: "power2.out"
          }
        )
      }
      
      const animKey = `attack-${props.side}`
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween: tl })
    }
  })

  watch(() => props.pokemon?.status, (newS, oldS) => {
    if (!spriteRotationRef.value) return

    if (newS && newS !== oldS) {
      const statusColors: Record<string, string> = {
        burn: '#ff4500',
        poison: '#9400d3',
        paralysis: '#ffd700',
        freeze: '#00ffff',
        sleep: '#ffffff'
      }
      const color = statusColors[newS] || '#ffffff'
      
      gsap.killTweensOf(spriteRotationRef.value, "filter")
      
      gsap.fromTo(spriteRotationRef.value,
        { filter: `Drop-Shadow(0 0 0px ${color}) Brightness(1)` },
        { 
          filter: `Drop-Shadow(0 0 20px ${color}) Brightness(2)`, 
          duration: 0.25, 
          yoyo: true, 
          repeat: 3, 
          ease: "power1.inOut",
          onComplete: () => {
            if (spriteRotationRef.value) {
              gsap.set(spriteRotationRef.value, { clearProps: "filter" })
            }
          }
        }
      )
    } else if (!newS && oldS) {
      if (spriteRotationRef.value) {
        gsap.killTweensOf(spriteRotationRef.value, "filter")
        gsap.set(spriteRotationRef.value, { clearProps: "filter" })
      }
    }
  })

  watch(() => props.isShaking, (shaking) => {
    if (pokeballImgRef.value) {
      if (shaking) {
        gameBus.emit('PLAY_SOUND', 'wobble')
        gsap.to(pokeballImgRef.value, {
          keyframes: [
            { rotation: 18, duration: 0.08, ease: 'power1.out' },
            { rotation: -18, duration: 0.16, ease: 'power1.inOut' },
            { rotation: 12, duration: 0.14, ease: 'power1.inOut' },
            { rotation: -12, duration: 0.14, ease: 'power1.inOut' },
            { rotation: 0, duration: 0.08, ease: 'power1.in' }
          ]
        })
      }
    } 
    else if (!props.isCaptureSuccess) {
      if (shaking && spriteRef.value) {
        const shakeDist = props.side === 'player' ? -10 : 10
        gsap.set(spriteRef.value, { transition: "none" })
        
        gsap.fromTo(spriteRef.value,
          { x: 0 },
          { 
            x: shakeDist, 
            duration: 0.08, 
            yoyo: true, 
            repeat: 5, 
            ease: 'power1.inOut',
            onComplete: () => { if (spriteRef.value) gsap.set(spriteRef.value, { clearProps: "x,opacity,transition" }) }
          }
        )

        const tl = gsap.timeline()
        const blinkPattern = [
          { t: 0.00, op: 0 }, { t: 0.08, op: 1 },
          { t: 0.16, op: 0 }, { t: 0.24, op: 1 },
          { t: 0.32, op: 0 }, { t: 0.40, op: 1 },
          { t: 0.48, op: 1 }
        ]
        blinkPattern.forEach(b => {
          tl.set(spriteRef.value, { opacity: b.op }, b.t)
        })
      }
    }
  })

  watch(() => props.isBlinking, (blinking) => {
    if (pokeballImgRef.value) {
      if (blinking) {
        gsap.fromTo(pokeballImgRef.value,
          { filter: 'Brightness(1)' },
          { filter: 'Brightness(2) Hue-Rotate(10deg)', duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.inOut' }
        )
      }
    } 
    else if (!props.isCaptureSuccess) {
      if (blinking && spriteRef.value) {
        const shakeDist = props.side === 'player' ? -10 : 10
        gsap.set(spriteRef.value, { transition: "none" })
        gsap.fromTo(spriteRef.value,
          { x: 0, filter: 'Brightness(1)' },
          { 
            x: shakeDist,
            filter: 'Brightness(2)', 
            duration: 0.08, 
            yoyo: true, 
            repeat: 5, 
            ease: 'power1.inOut',
            onComplete: () => { if (spriteRef.value) gsap.set(spriteRef.value, { clearProps: "x,filter,transition" }) }
          }
        )
      }
    }
  })

  watch(() => props.isHealing, (val) => {
    if (val && spriteRotationRef.value) {
      gsap.set(spriteRotationRef.value, { transition: "none" })
      const tl = gsap.timeline()
      tl.to(spriteRotationRef.value, {
        y: -15,
        scale: 1.08,
        filter: "brightness(1.4) sepia(0.8) hue-rotate(300deg) saturate(2)",
        duration: 0.25,
        ease: "power1.out"
      })
      .to(spriteRotationRef.value, {
        y: 0,
        scale: 1,
        filter: "brightness(1) sepia(0) hue-rotate(0deg) saturate(1)",
        duration: 0.25,
        ease: "power1.in",
        onComplete: () => {
          if (spriteRotationRef.value) {
            gsap.set(spriteRotationRef.value, { clearProps: "y,scale,filter,transition" })
          }
        }
      })
    }
  })

  watch(() => props.isCaptureSuccess, (success) => {
    if (success) {
      wasCaptured.value = true
    }
    if (!pokeballImgRef.value) return
    if (success) {
      successBlinkTween = gsap.fromTo(pokeballImgRef.value,
        { filter: 'Brightness(1)' },
        { filter: 'Brightness(1.8) Sepia(0.5) Hue-Rotate(-10deg)', duration: 0.25, yoyo: true, repeat: -1, ease: 'power1.inOut' }
      )
    } else {
      if (successBlinkTween) {
        successBlinkTween.kill()
        successBlinkTween = null
      }
      gsap.set(pokeballImgRef.value, { clearProps: 'filter' })
    }
  })
}

export function onSparkleEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  const tx = parseFloat(htmlEl.dataset.tx || '0')
  const ty = parseFloat(htmlEl.dataset.ty || '0')
  const tf = parseFloat(htmlEl.dataset.tf || '0')
  const delay = parseFloat((htmlEl.dataset.delay || '0s').replace('s', ''))
  const scale = parseFloat(htmlEl.dataset.scale || '1')

  // Reset inicial forzado para evitar flashes o estados quietos
  gsap.set(htmlEl, { 
    x: 0, 
    y: 0, 
    xPercent: -50, 
    yPercent: -50, 
    scale: 0, 
    opacity: 1,
    rotation: 0
  })

  // Animación Horizontal y Rotación (Toda la duración)
  gsap.to(htmlEl, {
    x: tx,
    rotation: 720,
    duration: 0.8,
    delay: delay,
    ease: 'power1.out'
  })

  // Fase 1: Salto hacia arriba (Fountain Up)
  gsap.to(htmlEl, {
    y: ty,
    scale: scale,
    duration: 0.3,
    delay: delay,
    ease: 'power2.out',
    onComplete: () => {
      // Fase 2: Caída y desvanecimiento (Fountain Down)
      gsap.to(htmlEl, {
        y: tf,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: done
      })
    }
  })
}

export function onBallEnter(el: Element, done: () => void) {
  gsap.fromTo(el, 
    { opacity: 0, scale: 0.5 }, 
    { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', onComplete: done }
  )
}

export function onBallLeave(el: Element, side: 'player' | 'enemy', done: () => void) {
  const tween = gsap.to(el, { 
    opacity: 0, 
    scale: 0.8, 
    duration: 0.3,
    ease: 'power2.in', 
    onComplete: done 
  })
  const animKey = `ball-fadeout-${side}`
  gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
}

