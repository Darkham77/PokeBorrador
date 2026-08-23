import { watch, type Ref, nextTick, type ComputedRef, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import type { BattleCombatantProps, BattleSide } from '@/types/battle/battle'
import { isFlying } from '@/composables/battle/useBattleShadows'
import { buildFaintTimeline, buildAttackTimeline } from './helpers/combatantActionAnims.ts'
import {
  COMBATANT_IDLE_FLOAT_BASE_Y_PERCENT,
  COMBATANT_IDLE_FLOAT_VAR_Y_PERCENT,
  COMBATANT_IDLE_FLOAT_BASE_ROTATION_DEG,
  COMBATANT_IDLE_FLOAT_VAR_ROTATION_DEG,
  COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC,
  COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC,
  COMBATANT_IDLE_GROUNDED_BASE_SCALE_X,
  COMBATANT_IDLE_GROUNDED_VAR_SCALE_X,
  COMBATANT_IDLE_GROUNDED_BASE_SCALE_Y,
  COMBATANT_IDLE_GROUNDED_VAR_SCALE_Y,
  COMBATANT_IDLE_GROUNDED_BASE_ROTATION_DEG,
  COMBATANT_IDLE_GROUNDED_VAR_ROTATION_DEG,
  COMBATANT_IDLE_GROUNDED_BASE_DURATION_SEC,
  COMBATANT_IDLE_GROUNDED_VAR_DURATION_SEC,
  POKEBALL_SHAKE_DISTANCE_PX,
  SPARKLE_FULL_ROTATION_DEG,
  SPARKLE_HORIZONTAL_DURATION_SEC,
  SPARKLE_FOUNTAIN_UP_DURATION_SEC,
  SPARKLE_FOUNTAIN_DOWN_DURATION_SEC,
  POKEBALL_APPEAR_DURATION_SEC,
  BALL_TRANSITION_DURATION_SEC,
  RECOIL_HORIZONTAL_OFFSET_PX,
  RECOIL_VERTICAL_OFFSET_PX,
  RECOIL_PUSH_DURATION_SEC,
  RECOIL_RECOVERY_DURATION_SEC,
  COMBATANT_HEAL_Y_OFFSET_PX,
  COMBATANT_HEAL_PHASE_DURATION_SEC,
  EMERGE_SQUISH_Y_PX,
  EMERGE_SQUISH_SCALE_X,
  EMERGE_SQUISH_SCALE_Y,
  EMERGE_SQUISH_DURATION_SEC,
  EMERGE_JUMP_Y_PX,
  EMERGE_JUMP_SCALE_X,
  EMERGE_JUMP_SCALE_Y,
  EMERGE_JUMP_DURATION_SEC,
  EMERGE_LAND_SCALE_X,
  EMERGE_LAND_SCALE_Y,
  EMERGE_LAND_DURATION_SEC,
  EMERGE_SETTLE_DURATION_SEC,
  ATTACK_SPECIAL_SCALE,
  ATTACK_SPECIAL_DURATION_SEC,
  STATUS_FLASH_SHADOW_PX,
  STATUS_FLASH_DURATION_SEC,
  STATUS_FLASH_REPEAT_COUNT,
  STATUS_FLASH_BRIGHTNESS,
  POKEBALL_WOBBLE_ANGLE_1_DEG,
  POKEBALL_WOBBLE_ANGLE_2_DEG,
  POKEBALL_WOBBLE_ANGLE_3_DEG,
  POKEBALL_WOBBLE_ANGLE_4_DEG,
  POKEBALL_WOBBLE_STEP1_SEC,
  POKEBALL_WOBBLE_STEP2_SEC,
  POKEBALL_WOBBLE_STEP34_SEC,
  POKEBALL_BLINK_BRIGHTNESS,
  POKEBALL_BLINK_HUE_ROTATE_DEG,
  POKEBALL_BLINK_DURATION_SEC,
  POKEBALL_SPRITE_SHAKE_REPEAT,
  BALL_LEAVE_SCALE,
  BALL_LEAVE_DURATION_SEC,
  SCALE_FULL,
  SCALE_ZERO,
} from '@/logic/constants/animations'

const RECOIL_EASE_BACK_OVERSHOOT = 1.7
const POKEBALL_SEPIA_RATIO = 0.5
const POKEBALL_SEPIA_SATURATE = 2
const HEAL_SATURATION_FULL = 1
const HEAL_BRIGHTNESS_FULL = 1
const HEAL_SEPIA_NONE = 0
const RANDOM_DIRECTION_PROBABILITY_HALF = 0.5;
const OPACITY_INVISIBLE = 0;
const OPACITY_FULL = 1;


function isIdleSuppressed(statusRaw: string | null | undefined, confusedCount: number | undefined, animStateRaw: string | null | undefined): boolean {
  const status = statusRaw?.toLowerCase() || ''
  const isFrozen = status === 'frz' || status === 'freeze' || status === '🧊'
  const isPara = status === 'par' || status.includes('paraly') || status.includes('para') || status === '⚡'
  const isConfused = (confusedCount || 0) > 0
  const isTrapped = animStateRaw === 'trapped'
  const isCatching = animStateRaw === 'catching'
  return isFrozen || isPara || isConfused || isTrapped || isCatching
}

function getIdleFloatingConfig(): gsap.TweenVars {
  return {
    y: () => `-${COMBATANT_IDLE_FLOAT_BASE_Y_PERCENT + Math.random() * COMBATANT_IDLE_FLOAT_VAR_Y_PERCENT}%`,
    rotation: () => (Math.random() > RANDOM_DIRECTION_PROBABILITY_HALF ? 1 : -1) * (COMBATANT_IDLE_FLOAT_BASE_ROTATION_DEG + Math.random() * COMBATANT_IDLE_FLOAT_VAR_ROTATION_DEG),
    duration: () => COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC + Math.random() * COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC,
    repeat: -1,
    yoyo: true,
    repeatRefresh: true,
    ease: 'sine.inOut'
  }
}

function getIdleGroundedConfig(): gsap.TweenVars {
  return {
    scaleX: () => COMBATANT_IDLE_GROUNDED_BASE_SCALE_X + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_SCALE_X,
    scaleY: () => COMBATANT_IDLE_GROUNDED_BASE_SCALE_Y + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_SCALE_Y,
    rotation: () => (Math.random() > RANDOM_DIRECTION_PROBABILITY_HALF ? 1 : -1) * (COMBATANT_IDLE_GROUNDED_BASE_ROTATION_DEG + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_ROTATION_DEG),
    duration: () => COMBATANT_IDLE_GROUNDED_BASE_DURATION_SEC + Math.random() * COMBATANT_IDLE_GROUNDED_VAR_DURATION_SEC,
    repeat: -1,
    yoyo: true,
    repeatRefresh: true,
    ease: 'sine.inOut'
  }
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

    gsap.killTweensOf(idleWrapperRef.value)

    if (isIdleSuppressed(props.pokemon.status, props.pokemon.confused, props.animState)) {
      gsap.set(idleWrapperRef.value, { y: 0, rotation: 0, scaleX: 1, scaleY: 1 })
      return
    }

    if (isFloating.value) {
      gsap.set(idleWrapperRef.value, { scaleX: 1, scaleY: 1 })
      idleTween = gsap.to(idleWrapperRef.value, getIdleFloatingConfig())
    } else {
      gsap.set(idleWrapperRef.value, { y: 0 })
      idleTween = gsap.to(idleWrapperRef.value, getIdleGroundedConfig())
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
      if (spriteRotationRef.value) {
        gsap.set(spriteRotationRef.value, { rotation: 0, clearProps: "transform,rotation" })
      }
      
      gsap.killTweensOf(spriteRef.value)
      
      gsap.set(spriteRef.value, { 
        transformOrigin: origin,
        x: 0,
        y: 0,
        scale: SCALE_FULL,
        opacity: OPACITY_FULL,
        filter: "url(#pixel-energy-optimized)" 
      })
      
      const tween = gsap.to(spriteRef.value, {
        x: coords.x,
        y: coords.y,
        scale: SCALE_ZERO,
        opacity: OPACITY_INVISIBLE,
        duration: BALL_TRANSITION_DURATION_SEC,
        ease: "power2.inOut",
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { x: 0, y: 0, scale: SCALE_ZERO, opacity: OPACITY_INVISIBLE, filter: "none", clearProps: "transformOrigin" })
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
      if (spriteRotationRef.value) {
        gsap.set(spriteRotationRef.value, { rotation: 0, clearProps: "transform,rotation" })
      }
      
      gsap.killTweensOf(spriteRef.value)
      
      gsap.set(spriteRef.value, { 
        transformOrigin: origin,
        x: coords.x, 
        y: coords.y, 
        scale: SCALE_ZERO, 
        opacity: OPACITY_INVISIBLE, 
        filter: "url(#pixel-energy-optimized)" 
      })
      
      const tween = gsap.to(spriteRef.value, {
        x: 0,
        y: 0,
        scale: SCALE_FULL,
        opacity: OPACITY_FULL,
        duration: BALL_TRANSITION_DURATION_SEC,
        ease: "power2.inOut",
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: "transform,filter,transformOrigin,opacity" })
          }
          if (spriteRotationRef.value) {
            gsap.set(spriteRotationRef.value, { clearProps: "transform,rotation,filter" })
          }
          if (shadowWrapperRef.value) {
            gsap.set(shadowWrapperRef.value, { clearProps: "display" })
          }
          if (props.pokemon) {
            gameBus.emit('PLAY_CRY', { name: props.pokemon.id || props.pokemon.name })
          }
        }
      })

      const animKey = `${props.side}-${props.pokemon?.uid || 'active'}`
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
    }
  }

  watch(() => props.animState, (val) => {
    // For 'releasing' or 'catching': set energy state immediately (same tick) to prevent the
    // 1-frame flash that occurs when the sprite renders before nextTick fires.
    if ((val === 'releasing' || val === 'catching') && spriteRef.value) {
      const origin = getSpriteFeetOrigin()
      const cachedRaw = rawCoordsCache.get(cacheKey.value)
      const coords = cachedRaw || getBallTargetCoords()
      gsap.killTweensOf(spriteRef.value)
      if (spriteRotationRef.value) {
        gsap.set(spriteRotationRef.value, { rotation: 0, clearProps: 'transform,rotation' })
      }
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { display: 'none' })
      }
      if (val === 'releasing') {
        gsap.set(spriteRef.value, {
          transformOrigin: origin,
          x: coords.x,
          y: coords.y,
          scale: SCALE_ZERO,
          opacity: OPACITY_INVISIBLE,
          filter: 'url(#pixel-energy-optimized)'
        })
      } else if (val === 'catching') {
        gsap.set(spriteRef.value, {
          transformOrigin: origin,
          x: 0,
          y: 0,
          scale: SCALE_FULL,
          opacity: OPACITY_FULL,
          filter: 'url(#pixel-energy-optimized)'
        })
      }
    }
    nextTick(() => triggerBallAnimation(val || null))
  }, { immediate: true })

  watch(spriteRef, (newEl) => {
    if (newEl) {
      nextTick(() => triggerBallAnimation(props.animState || null))
    }
  })

  watch(() => props.isEmerging, (val) => {
    const target = idleWrapperRef.value || spriteRef.value
    if (val && target) {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(target, { clearProps: "transform" })
        }
      })
      tl.to(target, { y: EMERGE_SQUISH_Y_PX, scaleX: EMERGE_SQUISH_SCALE_X, scaleY: EMERGE_SQUISH_SCALE_Y, duration: EMERGE_SQUISH_DURATION_SEC, ease: "power1.in" })
        .to(target, { y: EMERGE_JUMP_Y_PX, scaleX: EMERGE_JUMP_SCALE_X, scaleY: EMERGE_JUMP_SCALE_Y, duration: EMERGE_JUMP_DURATION_SEC, ease: "power2.out" })
        .to(target, { y: 0, scaleX: EMERGE_LAND_SCALE_X, scaleY: EMERGE_LAND_SCALE_Y, duration: EMERGE_LAND_DURATION_SEC, ease: "bounce.out" })
        .to(target, { scaleX: 1, scaleY: 1, duration: EMERGE_SETTLE_DURATION_SEC })
    }
  })

  watch(() => props.isFainting, (val) => {
    if (val && spriteRef.value) {
      buildFaintTimeline(spriteRef.value, props.pokemon, shadowWrapperRef.value)
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
      const tl = buildAttackTimeline(spriteRef.value, spriteRotationRef.value, props)
      if (tl) {
        const animKey = `attack-${props.side}`
        gameBus.emit('REGISTER_TWEEN', { key: animKey, tween: tl })
      }
    }
  })

  watch(() => props.pokemon?.status, (newS, oldS) => {
    if (!spriteRotationRef.value) return

    if (newS && newS !== oldS) {
      const statusColors: Record<string, string> = {
        brn: '#ff4500',
        psn: '#9400d3',
        par: '#ffd700',
        frz: '#00ffff',
        slp: '#ffffff',
        tox: '#9400d3'
      }
      const color = statusColors[newS] || '#ffffff'
      
      gsap.killTweensOf(spriteRotationRef.value, "filter")
      
      gsap.fromTo(spriteRotationRef.value,
        { filter: `Drop-Shadow(0 0 0px ${color}) Brightness(1)` },
        { 
          filter: `Drop-Shadow(0 0 ${STATUS_FLASH_SHADOW_PX}px ${color}) Brightness(${STATUS_FLASH_BRIGHTNESS})`, 
          duration: STATUS_FLASH_DURATION_SEC, 
          yoyo: true, 
          repeat: STATUS_FLASH_REPEAT_COUNT, 
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
            { rotation: POKEBALL_WOBBLE_ANGLE_1_DEG, duration: POKEBALL_WOBBLE_STEP1_SEC, ease: 'power1.out' },
            { rotation: POKEBALL_WOBBLE_ANGLE_2_DEG, duration: POKEBALL_WOBBLE_STEP2_SEC, ease: 'power1.inOut' },
            { rotation: POKEBALL_WOBBLE_ANGLE_3_DEG, duration: POKEBALL_WOBBLE_STEP34_SEC, ease: 'power1.inOut' },
            { rotation: POKEBALL_WOBBLE_ANGLE_4_DEG, duration: POKEBALL_WOBBLE_STEP34_SEC, ease: 'power1.inOut' },
            { rotation: 0, duration: POKEBALL_WOBBLE_STEP1_SEC, ease: 'power1.in' }
          ]
        })
      }
    } 
    else if (!props.isCaptureSuccess) {
      if (shaking && spriteRef.value) {
        const shakeDist = props.side === 'player' ? -POKEBALL_SHAKE_DISTANCE_PX : POKEBALL_SHAKE_DISTANCE_PX
        gsap.set(spriteRef.value, { transition: "none" })
        
        gsap.fromTo(spriteRef.value,
          { x: 0 },
          { 
            x: shakeDist, 
            duration: POKEBALL_WOBBLE_STEP1_SEC, 
            yoyo: true, 
            repeat: POKEBALL_SPRITE_SHAKE_REPEAT, 
            ease: 'power1.inOut',
            onComplete: () => { if (spriteRef.value) gsap.set(spriteRef.value, { clearProps: "x,opacity,transition" }) }
          }
        )

        const tl = gsap.timeline()
        const blinkPattern = [ // no-magic
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
          { filter: `Brightness(${STATUS_FLASH_BRIGHTNESS}) Hue-Rotate(10deg)`, duration: ATTACK_SPECIAL_DURATION_SEC, yoyo: true, repeat: 1, ease: 'power1.inOut' }
        )
      }
    } 
    else if (!props.isCaptureSuccess) {
      if (blinking && spriteRef.value) {
        const shakeDist = props.side === 'player' ? -POKEBALL_SHAKE_DISTANCE_PX : POKEBALL_SHAKE_DISTANCE_PX
        gsap.set(spriteRef.value, { transition: "none" })
        gsap.fromTo(spriteRef.value,
          { x: 0, filter: 'Brightness(1)' },
          { 
            x: shakeDist,
            filter: `Brightness(${STATUS_FLASH_BRIGHTNESS})`, 
            duration: POKEBALL_WOBBLE_STEP1_SEC, 
            yoyo: true, 
            repeat: POKEBALL_SPRITE_SHAKE_REPEAT, 
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
        y: COMBATANT_HEAL_Y_OFFSET_PX,
        scale: ATTACK_SPECIAL_SCALE,
        filter: `brightness(1.4) sepia(0.8) hue-rotate(300deg) saturate(${POKEBALL_SEPIA_SATURATE})`,
        duration: COMBATANT_HEAL_PHASE_DURATION_SEC,
        ease: "power1.out"
      })
      .to(spriteRotationRef.value, {
        y: 0,
        scale: 1,
        filter: `brightness(${HEAL_BRIGHTNESS_FULL}) sepia(${HEAL_SEPIA_NONE}) hue-rotate(0deg) saturate(${HEAL_SATURATION_FULL})`,
        duration: COMBATANT_HEAL_PHASE_DURATION_SEC,
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
        { filter: `Brightness(${POKEBALL_BLINK_BRIGHTNESS}) Sepia(${POKEBALL_SEPIA_RATIO}) Hue-Rotate(${POKEBALL_BLINK_HUE_ROTATE_DEG}deg)`, duration: POKEBALL_BLINK_DURATION_SEC, yoyo: true, repeat: -1, ease: 'power1.inOut' }
      )
    } else {
      if (successBlinkTween) {
        successBlinkTween.kill()
        successBlinkTween = null
      }
      gsap.set(pokeballImgRef.value, { clearProps: 'filter' })
    }
  })
  const onRecoilEvent = (e: Event) => {
    const data = (e as CustomEvent).detail as { side?: string } | undefined
    if (data?.side === props.side && spriteRef.value) {
      const isPlayerSide = props.side === 'player'
      const backX = isPlayerSide ? -RECOIL_HORIZONTAL_OFFSET_PX : RECOIL_HORIZONTAL_OFFSET_PX
      const backY = isPlayerSide ? RECOIL_VERTICAL_OFFSET_PX : -RECOIL_VERTICAL_OFFSET_PX
      gsap.timeline()
        .to(spriteRef.value, { x: backX, y: backY, duration: RECOIL_PUSH_DURATION_SEC, ease: 'power2.out' })
        .to(spriteRef.value, { x: 0, y: 0, duration: RECOIL_RECOVERY_DURATION_SEC, ease: `back.out(${RECOIL_EASE_BACK_OVERSHOOT})` })
    }
  }

  onMounted(() => {
    gameBus.on('PLAY_RECOIL', onRecoilEvent)
  })

  onUnmounted(() => {
    gameBus.off('PLAY_RECOIL', onRecoilEvent)
  })
}

export function onSparkleEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  const tx = parseFloat(htmlEl.dataset.tx || '0')
  const ty = parseFloat(htmlEl.dataset.ty || '0')
  const tf = parseFloat(htmlEl.dataset.tf || '0')
  const delay = parseFloat((htmlEl.dataset.delay || '0s').replace('s', ''))
  const scale = parseFloat(htmlEl.dataset.scale || '1')

const SPARKLE_CENTER_OFFSET_PERCENT = -50

  // Reset inicial forzado para evitar flashes o estados quietos
  gsap.set(htmlEl, { 
    x: 0, 
    y: 0, 
    xPercent: SPARKLE_CENTER_OFFSET_PERCENT, 
    yPercent: SPARKLE_CENTER_OFFSET_PERCENT, 
    scale: 0, 
    opacity: 1,
    rotation: 0
  })

  // Animación Horizontal y Rotación (Toda la duración)
  gsap.to(htmlEl, {
    x: tx,
    rotation: SPARKLE_FULL_ROTATION_DEG,
    duration: SPARKLE_HORIZONTAL_DURATION_SEC,
    delay: delay,
    ease: 'power1.out'
  })

  // Fase 1: Salto hacia arriba (Fountain Up)
  gsap.to(htmlEl, {
    y: ty,
    scale: scale,
    duration: SPARKLE_FOUNTAIN_UP_DURATION_SEC,
    delay: delay,
    ease: 'power2.out',
    onComplete: () => {
      // Fase 2: Caída y desvanecimiento (Fountain Down)
      gsap.to(htmlEl, {
        y: tf,
        opacity: 0,
        duration: SPARKLE_FOUNTAIN_DOWN_DURATION_SEC,
        ease: 'power2.in',
        onComplete: done
      })
    }
  })
}

export function onBallEnter(el: Element, done: () => void) {
  gsap.fromTo(el, 
    { opacity: 0, scale: 0.5 }, 
    { opacity: 1, scale: 1, duration: POKEBALL_APPEAR_DURATION_SEC, ease: 'back.out(1.7)', onComplete: done }
  )
}

export function onBallLeave(el: Element, side: BattleSide, done: () => void) {
  const tween = gsap.to(el, { 
    opacity: 0, 
    scale: BALL_LEAVE_SCALE, 
    duration: BALL_LEAVE_DURATION_SEC,
    ease: 'power2.in', 
    onComplete: done 
  })
  const animKey = `ball-fadeout-${side}`
  gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
}
