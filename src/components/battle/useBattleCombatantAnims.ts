import { watch, type Ref, nextTick, type ComputedRef, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import type { BattleCombatantProps } from '@/types/battle/battle'
import { isFlying } from '@/composables/battle/useBattleShadows'
import {
  GSAP_FAST_DURATION_SEC,
  GSAP_STANDARD_DURATION_SEC,
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
  COMBATANT_FAINT_Y_OFFSET,
  COMBATANT_FAINT_DURATION_SEC,
  ATTACK_DASH_DISTANCE_PX,
  ATTACK_PREP_DISTANCE_PX,
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
  SELFKO_SHAKE_COUNT,
  SELFKO_SHAKE_RANGE_PX,
  SELFKO_SHAKE_DURATION_SEC,
  SELFKO_EXPLODE_SCALE,
  SELFKO_EXPLODE_BRIGHTNESS,
  SELFKO_EXPLODE_SHADOW_PX,
  SELFKO_EXPLODE_PRIMARY_COLOR,
  SELFKO_EXPLODE_UP_DURATION_SEC,
  SELFKO_EXPLODE_FLASH_BRIGHTNESS,
  SELFKO_EXPLODE_FLASH_SHADOW_PX,
  SELFKO_EXPLODE_FLASH_COLOR,
  SELFKO_EXPLODE_DOWN_DURATION_SEC,
  SELFKO_SETTLE_DURATION_SEC,
  ATTACK_SPECIAL_PULSE_DISTANCE_PX,
  ATTACK_SPECIAL_SCALE,
  ATTACK_SPECIAL_BRIGHTNESS,
  ATTACK_SPECIAL_DURATION_SEC,
  ATTACK_STATUS_ROTATION_DEG,
  ATTACK_STATUS_SCALE,
  ATTACK_STATUS_BRIGHTNESS,
  ATTACK_STATUS_DURATION_SEC,
  ATTACK_DEFAULT_NY_PLAYER,
  ATTACK_DEFAULT_NY_ENEMY,
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
  BALL_LEAVE_DURATION_SEC
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
const SCALE_ZERO = 0;
const SCALE_FULL = 1;

const FAINT_BLINK_STEPS: readonly { t: number; op: number }[] = [ // no-magic
  { t: 0.05, op: 0 }, { t: 0.13, op: 1 },
  { t: 0.21, op: 0 }, { t: 0.29, op: 1 },
  { t: 0.37, op: 0 }, { t: 0.45, op: 1 },
  { t: 0.53, op: 0 }, { t: 0.61, op: 1 },
  { t: 0.69, op: 0 }, { t: 0.77, op: 1 },
  { t: 0.85, op: 0 }, { t: 0.93, op: 1 },
  { t: 0.98, op: 0 }
] as const

const VOICE_MOVE_IDS = [
  'growl', 'roar', 'sing', 'hypervoice', 'metalsound', 'perishsong', 'uproar',
  'screech', 'supersonic', 'grasswhistle', 'chatter', 'snarl', 'round',
  'disarmingvoice', 'boomburst', 'confide'
] as const


function isIdleSuppressed(statusRaw: string | null | undefined, confusedCount: number | undefined, animStateRaw: string | null | undefined): boolean {
  const status = statusRaw?.toLowerCase() || ''
  const isFrozen = status === 'freeze' || status === '🧊'
  const isPara = status.includes('paraly') || status.includes('para') || status === '⚡'
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
      const tl = gsap.timeline()
      
      tl.add(() => {
        if (props.pokemon) {
          gameBus.emit('PLAY_CRY', { name: props.pokemon.id || props.pokemon.name, isFaint: true })
        }
      })
      
      gsap.set(spriteRef.value, { transition: "none" })

      
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { display: "none" })
      }

      tl.addLabel("fallStart")

      tl.to(spriteRef.value, { 
        y: COMBATANT_FAINT_Y_OFFSET, 
        duration: COMBATANT_FAINT_DURATION_SEC, 
        ease: "power2.in" 
      }, "fallStart") 
      
      FAINT_BLINK_STEPS.forEach(b => {
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
      
      const moveIdLookup = move.id || ''
      const cleanMoveId = moveIdLookup
      if ((VOICE_MOVE_IDS as readonly string[]).includes(cleanMoveId) && props.pokemon) { // domain-ok
        tl.add(() => {
          gameBus.emit('PLAY_CRY', { name: props.pokemon!.id || props.pokemon!.name })
        })
      }
      
      let nx = isPlayerSide ? 1 : -1
      let ny = isPlayerSide ? ATTACK_DEFAULT_NY_PLAYER : ATTACK_DEFAULT_NY_ENEMY
      
      if (props.targetPosition) {
        const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
        const mySize = props.baseSize * scale
        const targetBase = isPlayerSide ? (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_ENEMY: number }).BASE_ENTITY_SIZE_ENEMY : (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_PLAYER: number }).BASE_ENTITY_SIZE_PLAYER
        const targetSize = targetBase * scale
        
const ENTITY_CENTER_HALF_FACTOR = 0.5;

        const myCenterX = props.position.x + (mySize * ENTITY_CENTER_HALF_FACTOR)
        const myCenterY = props.position.y + (mySize * ENTITY_CENTER_HALF_FACTOR)
        
        const targetCenterX = props.targetPosition.x + (targetSize * ENTITY_CENTER_HALF_FACTOR)
        const targetCenterY = props.targetPosition.y + (targetSize * ENTITY_CENTER_HALF_FACTOR)

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
        for (let i = 0; i < SELFKO_SHAKE_COUNT; i++) {
          const shakeX = (Math.random() - 0.5) * SELFKO_SHAKE_RANGE_PX
          const shakeY = (Math.random() - 0.5) * SELFKO_SHAKE_RANGE_PX
          shakeTimeline.to(spriteRef.value, {
            x: shakeX,
            y: shakeY,
            duration: SELFKO_SHAKE_DURATION_SEC,
            ease: "none"
          })
        }
        tl.add(shakeTimeline)
        
        tl.add(() => {
          if (props.pokemon) {
            gameBus.emit('PLAY_CRY', { name: props.pokemon.id || props.pokemon.name, isFaint: true })
          }
        })


        tl.to(spriteRef.value, {
          scale: SELFKO_EXPLODE_SCALE,
          filter: `Brightness(${SELFKO_EXPLODE_BRIGHTNESS}) Drop-Shadow(0 0 ${SELFKO_EXPLODE_SHADOW_PX}px ${SELFKO_EXPLODE_PRIMARY_COLOR})`,
          duration: SELFKO_EXPLODE_UP_DURATION_SEC,
          ease: "power2.out"
        })
        
        tl.to(spriteRef.value, {
          scale: 0,
          opacity: 0,
          filter: `Brightness(${SELFKO_EXPLODE_FLASH_BRIGHTNESS}) Drop-Shadow(0 0 ${SELFKO_EXPLODE_FLASH_SHADOW_PX}px ${SELFKO_EXPLODE_FLASH_COLOR})`,
          duration: SELFKO_EXPLODE_DOWN_DURATION_SEC,
          ease: "power2.in"
        })

        tl.to(spriteRef.value, {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          filter: "Brightness(1)",
          clearProps: "all",
          duration: SELFKO_SETTLE_DURATION_SEC
        })
      } else if (cat === 'physical' || !cat) {
        const dashDist = ATTACK_DASH_DISTANCE_PX
        const prepDist = ATTACK_PREP_DISTANCE_PX
        
        tl.to(spriteRef.value, { x: nx * prepDist, y: ny * prepDist, duration: GSAP_FAST_DURATION_SEC })
          .to(spriteRef.value, { x: nx * dashDist, y: ny * dashDist, scale: ATTACK_SPECIAL_SCALE, duration: GSAP_STANDARD_DURATION_SEC, ease: "power2.out" })
          .to(spriteRef.value, { x: 0, y: 0, scale: 1, duration: GSAP_STANDARD_DURATION_SEC, ease: "power1.inOut" })
      } else if (cat === 'special') {
        tl.fromTo(spriteRef.value, 
          { filter: "Brightness(1)", x: 0, y: 0, scale: 1 },
          { 
            x: nx * ATTACK_SPECIAL_PULSE_DISTANCE_PX, 
            y: ny * ATTACK_SPECIAL_PULSE_DISTANCE_PX, 
            scale: ATTACK_SPECIAL_SCALE, 
            filter: `Brightness(${ATTACK_SPECIAL_BRIGHTNESS})`, 
            duration: ATTACK_SPECIAL_DURATION_SEC, 
            yoyo: true, 
            repeat: 1,
            ease: "power2.out"
          }
        )
      } else if (cat === 'status') {
        const rot = isPlayerSide ? ATTACK_STATUS_ROTATION_DEG : -ATTACK_STATUS_ROTATION_DEG
        tl.fromTo(spriteRotationRef.value, 
          { filter: "Brightness(1)", rotation: 0, scale: 1 },
          { 
            rotation: rot, 
            scale: ATTACK_STATUS_SCALE, 
            filter: `Brightness(${ATTACK_STATUS_BRIGHTNESS})`, 
            duration: ATTACK_STATUS_DURATION_SEC, 
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

export function onBallLeave(el: Element, side: 'player' | 'enemy', done: () => void) {
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
