<script setup lang="ts">
/**
 * PVSpriteFX.vue
 * Orquestador centralizado para efectos visuales en sprites de Pokémon.
 * MIGRACIÓN 1:1 - Modularizado pero con idéntica lógica.
 */
import { computed, inject, type Ref, ref, watch, nextTick, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { gsap } from 'gsap'
import PVStatusFX from './PVStatusFX.vue'
import PVAuraFX from './PVAuraFX.vue'
import { resolveEffectSettings } from '@/data/battle/fx-configs'
import { Z_LAYERS } from '@/logic/constants/visuals'

const MAX_PERSISTENT_FX_RETRIES = 3
const PERSISTENT_FX_RETRY_DELAY_SEC = 0.1

const CURSED_FX_DURATION_SEC = 1.25
const CONFUSED_FX_DURATION_SEC = 0.15
const TAUNTED_FX_DURATION_SEC = 0.4
const FLINCHED_FX_DURATION_SEC = 0.05
const DISABLED_FX_DURATION_SEC = 1
const ENCORED_FX_DURATION_SEC = 0.8
const FOCUS_ENERGY_FX_DURATION_SEC = 0.75
const ENDURING_FX_DURATION_SEC = 1.5
const BURN_FX_DURATION_SEC = 1
const POISON_FX_DURATION_SEC = 2
const PARALYZE_FX_DURATION_SEC = 0.04
const SLEEP_FX_DURATION_SEC = 2
const GUARDIAN_FX_DURATION_SEC = 2

const FLINCHED_FX_REPEATS = 10
const GUARDIAN_DELAY_MULTIPLIER = -2
const DEFAULT_SPARKLE_COUNT = 5
const DEFAULT_RADIUS_PX = 40

interface FXData {
  type: string;
  emoji: string;
  isField?: boolean;
  active?: boolean;
}

const battleStore = useBattleStore()
const uiStore = useUIStore()

const props = defineProps({
  isShiny: { type: Boolean, default: false },
  isGuardian: { type: Boolean, default: false },
  status: { type: String, default: null }, 
  isConfused: { type: Boolean, default: false },
  isTaunted: { type: Boolean, default: false },
  isSubstitute: { type: Boolean, default: false },
  isFlinched: { type: Boolean, default: false },
  isDisabled: { type: Boolean, default: false },
  isEncored: { type: Boolean, default: false },
  isCursed: { type: Boolean, default: false },
  isSeeded: { type: Boolean, default: false },
  isTrapped: { type: Boolean, default: false },
  attracted: { type: Boolean, default: false },
  isFocusEnergy: { type: Boolean, default: false },
  isProtected: { type: Boolean, default: false },
  isEnduring: { type: Boolean, default: false },
  isLockOn: { type: Boolean, default: false },
  hasReflect: { type: Boolean, default: false },
  hasLightScreen: { type: Boolean, default: false },
  hasSafeguard: { type: Boolean, default: false },
  hasMist: { type: Boolean, default: false },
  hasSpikes: { type: Boolean, default: false },
  isIngrained: { type: Boolean, default: false },
  sparkleCount: { type: Number, default: DEFAULT_SPARKLE_COUNT },
  enabled: { type: Boolean, default: true },
  vibrant: { type: Boolean, default: false },
  isSilhouette: { type: Boolean, default: false },
  radius: { type: Number, default: DEFAULT_RADIUS_PX },
  spriteScale: { type: Number, default: 1 },
  animState: { type: String, default: null },
  isBattle: { type: Boolean, default: false }
})

const isModalPerformance = inject<Ref<boolean> | null>('isModalPerformanceMode', null)
const forceHighFidelity = inject<boolean>('forceHighFidelity', false)

const isSimplified = computed(() => {
  if (props.isSilhouette) return true
  if (forceHighFidelity) return false
  if (!props.enabled || uiStore.isSimplifiedModalsMode) return true
  if (isModalPerformance !== null) return isModalPerformance.value
  return uiStore.isAnyBlockingModalOpen
})

const animSeed = Math.random()

const wrapperClasses = computed(() => ({
  'pv-fx-wrapper': true,
  'is-vibrant': props.vibrant && !isSimplified.value,
  'is-simplified': isSimplified.value,
  [`status-${props.status}`]: !!props.status && !isSimplified.value,
  'is-confused': props.isConfused && !isSimplified.value,
  'is-taunted': props.isTaunted && !isSimplified.value,
  'is-substitute': props.isSubstitute && !isSimplified.value,
  'is-flinched': props.isFlinched && !isSimplified.value,
  'is-disabled': props.isDisabled && !isSimplified.value,
  'is-encored': props.isEncored && !isSimplified.value,
  'is-cursed': props.isCursed && !isSimplified.value,
  'is-seeded': props.isSeeded && !isSimplified.value,
  'is-trapped': props.isTrapped && !isSimplified.value,
  'is-focus-energy': props.isFocusEnergy && !isSimplified.value,
  'is-protected': props.isProtected && !isSimplified.value,
  'is-enduring': props.isEnduring && !isSimplified.value,
  'is-lock-on': props.isLockOn && !isSimplified.value
}))

const secondaryEffects = computed(() => [
  { active: props.isShiny, emoji: '⭐', type: 'shiny' },
  { active: props.isConfused, emoji: '💫', type: 'confused' },
  { active: props.isTaunted, emoji: '💢', type: 'taunted' },
  { active: props.isSubstitute, emoji: '🧸', type: 'substitute' },
  { active: props.isFlinched, emoji: '💥', type: 'flinched' },
  { active: props.isDisabled, emoji: '🔒', type: 'disabled' },
  { active: props.isEncored, emoji: '🔄', type: 'encored' },
  { active: props.isCursed, emoji: '👻', type: 'cursed' },
  { active: props.attracted, emoji: '💖', type: 'attracted' },
  { active: props.isSeeded, emoji: '🌱', type: 'seeded' },
  { active: props.isTrapped, emoji: '🕸️', type: 'trapped' },
  { active: props.isIngrained, emoji: '🌳', type: 'ingrained' }
].filter(e => e.active))

const tacticalEffects = computed(() => [
  { active: props.isProtected, emoji: '🛡️', type: 'protected' },
  { active: props.isEnduring, emoji: '✊', type: 'enduring' },
  { active: props.isFocusEnergy, emoji: '🎯', type: 'focus' },
  { active: props.isLockOn, emoji: '👁️', type: 'lockon' }
].filter(e => e.active))

const fieldEffects = computed(() => [
  { active: props.hasReflect, emoji: '🧱', type: 'reflect' },
  { active: props.hasLightScreen, emoji: '🕯️', type: 'lightscreen' },
  { active: props.hasSafeguard, emoji: '🛡️', type: 'safeguard' },
  { active: props.hasMist, emoji: '☁️', type: 'mist' },
  { active: props.hasSpikes, emoji: '🌵', type: 'spikes' }
].filter(e => e.active))

const activeStatusEffects = computed(() => {
  if (!props.status || isSimplified.value) return []
  const map: Record<string, string> = { brn: '🔥', psn: '☠️', slp: '💤', par: '⚡', frz: '❄️', tox: '☠️' }
  return [{ type: props.status, emoji: map[props.status] || '' }]
})

const spriteLayerRef = ref<HTMLElement | null>(null)
const activeTweens: gsap.core.Tween[] = []

const refreshPersistentFX = (retryCount = 0) => {
  if (!spriteLayerRef.value) return
  const statusWrapper = spriteLayerRef.value.querySelector('.pokemon-sprite-status-wrapper') as HTMLElement
  const img = spriteLayerRef.value.querySelector('img') as HTMLElement
  const target = statusWrapper || img
  if (!target && retryCount < MAX_PERSISTENT_FX_RETRIES) {
    const t = gsap.delayedCall(PERSISTENT_FX_RETRY_DELAY_SEC, () => refreshPersistentFX(retryCount + 1))
    activeTweens.push(t)
    return
  }
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  if (!target) return

  gsap.set(target, { filter: '', x: 0, y: 0, rotation: 0 })
  gsap.set(spriteLayerRef.value, { filter: '' })

  const isImmobilized = props.status === 'frz' || props.isTrapped || props.animState === 'catching'

  if (props.isCursed) {
    activeTweens.push(gsap.to(target, {
      filter: 'Drop-Shadow(0 0 15px Rgba(75, 0, 130, 0.8)) Brightness(0.6) contrast(1.2) Saturate(0.5)',
      duration: CURSED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut'
    }))
  }
  if (props.isConfused && !isImmobilized) {
    activeTweens.push(gsap.to(target, { x: 2, rotation: 1, duration: CONFUSED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.isTaunted) {
    activeTweens.push(gsap.to(target, { filter: 'Drop-Shadow(0 0 12px Rgba(255, 0, 0, 0.9)) Brightness(1.2)', duration: TAUNTED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.isFlinched && !isImmobilized) {
    activeTweens.push(gsap.to(target, { x: 4, duration: FLINCHED_FX_DURATION_SEC, yoyo: true, repeat: FLINCHED_FX_REPEATS, ease: 'none' }))
  }
  if (props.isDisabled) {
    activeTweens.push(gsap.to(target, { filter: 'Grayscale(0.8) Brightness(0.7) Drop-Shadow(0 0 8px Rgba(100, 100, 100, 0.8))', duration: DISABLED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.isEncored) {
    activeTweens.push(gsap.to(target, { filter: 'Hue-Rotate(90deg) Drop-Shadow(0 0 10px Rgba(0, 255, 255, 0.8))', duration: ENCORED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.isFocusEnergy) {
    activeTweens.push(gsap.to(target, { filter: 'Drop-Shadow(0 0 10px Rgba(255, 0, 0, 0.7)) Brightness(1.3)', duration: FOCUS_ENERGY_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.isEnduring || props.isSeeded) {
    activeTweens.push(gsap.to(target, { y: -3, duration: ENDURING_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.status === 'brn') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 25px #ff4500) Brightness(1) Saturate(1.2)' },
      { filter: 'Drop-Shadow(0 0 40px #ff8c00) Brightness(1.4) Saturate(2.2)', duration: BURN_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    ))
  }
  if (props.status === 'psn' || props.status === 'tox') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 2px #9400d3) Brightness(1) Saturate(1)' },
      { filter: 'Drop-Shadow(0 0 12px #9400d3) Brightness(0.8) Saturate(1.4) hue-rotate(10deg)', duration: POISON_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    ))
  }
const GSAP_PARALYZE_X_OFFSET_PX = 3
const DEBUG_OVERLAY_Z_INDEX = '99'

  if ((props.status === 'par') && !isImmobilized) {
    activeTweens.push(gsap.fromTo(target, { filter: 'Drop-Shadow(0 0 2px #ffd700) Brightness(1.2)', x: -GSAP_PARALYZE_X_OFFSET_PX }, { filter: 'Drop-Shadow(0 0 10px #ffd700) Brightness(1.5) contrast(1.3)', x: GSAP_PARALYZE_X_OFFSET_PX, duration: PARALYZE_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'none' }))
  }
  if (props.status === 'frz') {
    activeTweens.push(gsap.set(target, { 
      filter: 'Brightness(1.6) contrast(0.7) Saturate(0.3) url(#pixel-outline-ice) Drop-Shadow(0 0 20px #00ffff)' 
    }))
  }
  if (props.status === 'sleep') {
    activeTweens.push(gsap.fromTo(target, { filter: 'Brightness(1) Saturate(1)' }, { filter: 'Brightness(0.5) contrast(0.8) Saturate(0.5)', duration: SLEEP_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  if (props.isGuardian && !props.status) {
    const isVibrant = props.vibrant
    const baseFilter = isVibrant ? 'Drop-Shadow(0 0 15px white) Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))' : 'Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
    const pulseFilter = isVibrant ? 'Drop-Shadow(0 0 40px white) Drop-Shadow(0 0 15px Rgba(255, 255, 255, 0.9))' : 'Drop-Shadow(0 0 12px Rgba(255, 255, 255, 0.8))'
    activeTweens.push(gsap.fromTo(spriteLayerRef.value, { filter: baseFilter }, { filter: pulseFilter, duration: GUARDIAN_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: animSeed * GUARDIAN_DELAY_MULTIPLIER }))
  }
}

watch([() => props.status, () => props.isConfused, () => props.isTaunted, () => props.isSubstitute, () => props.isFlinched, () => props.isDisabled, () => props.isEncored, () => props.isCursed, () => props.isGuardian, isSimplified], () => {
  nextTick(() => refreshPersistentFX())
}, { immediate: true })

onUnmounted(() => {
  activeTweens.forEach(t => t.kill())
})

// --- DEBUG OVERLAY (1:1 Logic) ---
const allActiveFXDebug = computed(() => {
  if (!battleStore.debugShowFxRadius) return []
  const effects = [...activeStatusEffects.value, ...secondaryEffects.value, ...tacticalEffects.value, ...fieldEffects.value]
  return effects.map((fx: FXData) => {
    const settings = resolveEffectSettings(fx.type, props.radius, { isField: fx.isField, isSimplified: isSimplified.value, isBattle: props.isBattle, spriteScale: props.spriteScale })
    const shape = settings.shape; const offset = settings.offset || { x: 0, y: 0 }; 
    const area = settings.area as { x: [number, number], y?: [number, number] }
const BORDER_RADIUS_CIRCLE_PERCENT = '50%'
const DEBUG_OVERLAY_TRANSLATE_PERCENT = -50

    const style: Record<string, string> = { 
      position: 'absolute', 
      border: '1px solid ' + (shape === 'circle' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 165, 0, 0.8)'), 
      pointerEvents: 'none', 
      zIndex: DEBUG_OVERLAY_Z_INDEX, 
      borderRadius: shape === 'circle' ? BORDER_RADIUS_CIRCLE_PERCENT : '2px' 
    }

    if (shape === 'circle') {
      const radius = area.x[1]; style.width = `${radius * 2}%`; style.height = `${radius * 2}%`; style.top = `${DEBUG_CENTER_OFFSET_PERCENT + offset.y}%`; style.left = `${DEBUG_CENTER_OFFSET_PERCENT + offset.x}%`; style.transform = `translate(${DEBUG_OVERLAY_TRANSLATE_PERCENT}%, ${DEBUG_OVERLAY_TRANSLATE_PERCENT}%)`
    } else {
      const xRange = area.x; const yRange = area.y || [-10, 10]; style.width = `${xRange[1] - xRange[0]}%`; style.height = `${yRange[1] - yRange[0]}%`; style.left = `${DEBUG_CENTER_OFFSET_PERCENT + (xRange[0] + xRange[1]) / 2 + offset.x}%`; style.top = `${DEBUG_CENTER_OFFSET_PERCENT + (yRange[0] + yRange[1]) / 2 + offset.y}%`; style.transform = `translate(${DEBUG_OVERLAY_TRANSLATE_PERCENT}%, ${DEBUG_OVERLAY_TRANSLATE_PERCENT}%)`
    }
    return { id: fx.type, style, label: `${fx.type.toUpperCase()} (${shape})` }
  })
})
</script>

<template>
  <div
    :class="wrapperClasses"
    :style="{ '--fx-seed': animSeed, '--fx-radius': radius }"
  >
    <div
      ref="spriteLayerRef"
      class="pv-fx-sprite-layer"
      :class="{ 'is-guardian': isGuardian && !status && !isSimplified }"
    >
      <slot />
    </div>

    <PVAuraFX
      :is-shiny="isShiny"
      :is-guardian="isGuardian"
      :has-reflect="hasReflect"
      :has-light-screen="hasLightScreen"
      :has-safeguard="hasSafeguard"
      :sparkle-count="sparkleCount"
      :radius="radius"
      :anim-seed="animSeed"
      :sprite-scale="spriteScale"
      :enabled="!isSimplified"
    />

    <PVStatusFX
      :active-status-effects="activeStatusEffects"
      :secondary-effects="secondaryEffects"
      :tactical-effects="tacticalEffects"
      :field-effects="fieldEffects"
      :radius="radius"
      :anim-seed="animSeed"
      :sprite-scale="spriteScale"
      :enabled="!isSimplified"
      :is-simplified="isSimplified"
      :is-battle="isBattle"
    />

    <!-- DEBUG GUIDES (FX radii only — Pokémon body radius is rendered inside BattleCombatant) -->
    <template v-if="battleStore.debugShowFxRadius">
      <div
        v-for="fx in allActiveFXDebug"
        :key="fx.id"
        class="debug-guide debug-fx-radius"
        :style="fx.style"
      >
        <span class="label">{{ fx.label }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pv-fx-wrapper {
  width: fit-content; height: fit-content; position: relative;
  display: flex; align-items: center; justify-content: center;
  @include pixelated;
}
.pv-fx-sprite-layer {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  z-index: calc(v-bind('Z_LAYERS.MAP_SPAWNS') + 2);
  will-change: transform, filter, opacity;
}
.debug-guide {
  position: absolute; top: 50%; left: 50%; transform: Translate(-50%, -50%);
  border: 1px dashed; border-radius: 50%; pointer-events: none; z-index: calc(v-bind('Z_LAYERS.OVERLAY') - 1);
  display: flex; align-items: center; justify-content: center; @include pixelated;
  .label {
    position: absolute; top: -12px; background: Rgba(0, 0, 0, 0.8); color: white;
    font-size: 9px; padding: 1px 4px; border-radius: 2px; white-space: nowrap;
    transform: Scale(calc(1 / var(--camera-scale, 1)));
    transform-origin: center bottom;
  }
  &.debug-poke-radius {
    border-color: #00ffff; background: Rgba(0, 255, 255, 0.35); border: 3px solid #00ffff;
    .label { border: 1px solid #00ffff; background: Rgba(0, 50, 50, 0.9); }
  }
  &.debug-fx-radius {
    border-color: #ff9900; background: Rgba(255, 153, 0, 0.35); border: 3px solid #ff9900;
    .label { border: 1px solid #ff9900; background: Rgba(50, 30, 0, 0.9); }
  }
}
</style>
