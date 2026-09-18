<script lang="ts">
const DEFAULT_SPARKLE_COUNT = 5
const DEFAULT_RADIUS_PX = 40
</script>

<script setup lang="ts">
/**
 * PVSpriteFX.vue
 * Orquestador centralizado para efectos visuales en sprites de Pokémon.
 * MIGRACIÓN 1:1 - Modularizado pero con idéntica lógica.
 */
import { computed, inject, type Ref, ref, watch, nextTick, onUnmounted, type PropType } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { gsap } from 'gsap'
import PVStatusFX from './PVStatusFX.vue'
import PVAuraFX from './PVAuraFX.vue'
import { resolveEffectSettings } from '@/data/battle/fx-configs'
import { Z_LAYERS } from '@/logic/constants/visuals'

import {
  applyVolatileFXTweens,
  applyStatusFXTweens,
  applyGuardianFXTween
} from './spritePersistentFXHelpers.ts'

const MAX_PERSISTENT_FX_RETRIES = 3
const PERSISTENT_FX_RETRY_DELAY_SEC = 0.1

interface FXData {
  type: string;
  emoji: string;
  isField?: boolean;
  active?: boolean;
}

const battleStore = useBattleStore()
const uiStore = useUIStore()

const props = defineProps({
  pokeId: { type: [String, Number], default: null },
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
  hasStealthRock: { type: Boolean, default: false },
  hasToxicSpikes: { type: Boolean, default: false },
  isIngrained: { type: Boolean, default: false },
  isPerishSong: { type: Boolean, default: false },
  sparkleCount: { type: Number, default: DEFAULT_SPARKLE_COUNT },
  enabled: { type: Boolean, default: true },
  vibrant: { type: Boolean, default: false },
  isSilhouette: { type: Boolean, default: false },
  radius: { type: Number, default: DEFAULT_RADIUS_PX },
  spriteScale: { type: Number, default: 1 },
  pokeScale: { type: Number, default: 1 },
  animState: { type: String as PropType<string | null>, default: null },
  isBattle: { type: Boolean, default: false },
  hideStatusOverlay: { type: Boolean, default: false },
  overlayOnly: { type: Boolean, default: false }
})

const isModalFast = inject<Ref<boolean> | null>('isModalFastMode', null) ?? inject<Ref<boolean> | null>('isModalPerformanceMode', null)
const forceHighFidelity = inject<boolean>('forceHighFidelity', false)

const isSimplified = computed(() => {
  if (props.isSilhouette) return true
  if (forceHighFidelity) return false
  if (!props.enabled || uiStore.isSimplifiedModalsMode) return true
  if (isModalFast !== null) return isModalFast.value
  return uiStore.isFastMode
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

const isAnimStateHidden = computed(() =>
  props.animState === 'trapped' || props.animState === 'releasing'
)

const secondaryEffects = computed(() => {
  if (isAnimStateHidden.value) return []
  return [
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
    { active: props.isIngrained, emoji: '🌳', type: 'ingrained' },
    { active: props.isPerishSong, emoji: '⏳', type: 'perishsong' }
  ].filter(e => e.active)
})

const tacticalEffects = computed(() => {
  if (isAnimStateHidden.value) return []
  return [
    { active: props.isProtected, emoji: '🛡️', type: 'protected' },
    { active: props.isEnduring, emoji: '✊', type: 'enduring' },
    { active: props.isFocusEnergy, emoji: '🎯', type: 'focus' },
    { active: props.isLockOn, emoji: '👁️', type: 'lockon' }
  ].filter(e => e.active)
})

const fieldEffects = computed(() => {
  if (isAnimStateHidden.value) return []
  return [
    { active: props.hasReflect, emoji: '🧱', type: 'reflect' },
    { active: props.hasLightScreen, emoji: '🕯️', type: 'lightscreen' },
    { active: props.hasSafeguard, emoji: '🛡️', type: 'safeguard' },
    { active: props.hasMist, emoji: '☁️', type: 'mist' },
    { active: props.hasSpikes, emoji: '🌵', type: 'spikes' },
    { active: props.hasStealthRock, emoji: '🪨', type: 'stealthrock' },
    { active: props.hasToxicSpikes, emoji: '☠️', type: 'toxicspikes' }
  ].filter(e => e.active)
})

const activeStatusEffects = computed(() => {
  if (!props.status || isSimplified.value || isAnimStateHidden.value) return []
  const map: Record<string, string> = { brn: '🔥', psn: '☠️', slp: '💤', par: '⚡', frz: '❄️', tox: '☠️' }
  return [{ type: props.status, emoji: map[props.status] || '' }]
})

const spriteLayerRef = ref<HTMLElement | null>(null)
const activeTweens: gsap.core.Tween[] = []

const refreshPersistentFX = (retryCount = 0) => {
  if (props.overlayOnly || !spriteLayerRef.value) return
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

  applyVolatileFXTweens(target, props, isImmobilized, activeTweens)
  applyStatusFXTweens(target, props.status, isImmobilized, activeTweens)

  if (props.isGuardian && !props.status && spriteLayerRef.value) {
    applyGuardianFXTween(spriteLayerRef.value, Boolean(props.vibrant), animSeed, activeTweens)
  }
}

watch([() => props.pokeId, () => props.status, () => props.isConfused, () => props.isTaunted, () => props.isSubstitute, () => props.isFlinched, () => props.isDisabled, () => props.isEncored, () => props.isCursed, () => props.isGuardian, isSimplified], () => {
  nextTick(() => refreshPersistentFX())
}, { immediate: true })

onUnmounted(() => {
  activeTweens.forEach(t => t.kill())
})

// --- DEBUG OVERLAY (1:1 Logic) ---
const allActiveFXDebug = computed(() => {
  if (!battleStore.debugShowFxRadius || props.hideStatusOverlay) return []
  const effects = [...activeStatusEffects.value, ...secondaryEffects.value, ...tacticalEffects.value, ...fieldEffects.value]
  return effects.map((fx: FXData) => {
    const settings = resolveEffectSettings(fx.type, props.radius, { isField: fx.isField, isSimplified: isSimplified.value, isBattle: props.isBattle, spriteScale: props.spriteScale, pokeScale: props.pokeScale })
    const shape = settings.shape; const offset = settings.offset || { x: 0, y: 0 }; 
    const area = settings.area as { x: [number, number], y?: [number, number] }
const BORDER_RADIUS_CIRCLE_PERCENT = '50%'
const DEBUG_OVERLAY_TRANSLATE_PERCENT = -50
const DEBUG_CENTER_OFFSET_PERCENT = 50

    const style: Record<string, string> = { 
      position: 'absolute', 
      border: '1px solid ' + (shape === 'circle' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 165, 0, 0.8)'), 
      pointerEvents: 'none', 
      zIndex: String(Z_LAYERS.HUD), 
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
      v-if="!overlayOnly"
      ref="spriteLayerRef"
      class="pv-fx-sprite-layer"
      :class="{ 'is-guardian': isGuardian && !status && !isSimplified }"
    >
      <slot />
    </div>

    <template v-if="!hideStatusOverlay">
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
        :poke-scale="pokeScale"
        :enabled="!isSimplified"
        :is-simplified="isSimplified"
        :is-battle="isBattle"
      />
    </template>

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

.pv-fx-wrapper,
.pv-fx-sprite-layer {
  image-rendering: -webkit-optimize-contrast !important;
  #{"image-rendering"}: crisp-edges !important;
  image-rendering: pixelated !important;
  -ms-interpolation-mode: nearest-neighbor !important;
}

.pv-fx-wrapper {
  width: fit-content; height: fit-content; position: relative;
  display: flex; align-items: center; justify-content: center;

  &.is-simplified {
    :deep(img:not(.is-silhouette)), :deep(.sprite-layer), :deep(.pokemon-sprite:not(.is-silhouette)) {
      will-change: filter, transform, opacity;
      filter: none;
      animation: none !important;
      transform: none;
    }
  }

  &.is-cursed :deep(img) {
    filter: Drop-Shadow(0 0 15px Rgba(75, 0, 130, 0.8)) Brightness(0.6) contrast(1.2) Saturate(0.5);
  }

  &.is-confused :deep(img) {
    will-change: transform, filter, opacity;
    filter: Hue-Rotate(180deg) Saturate(0.5);
  }

  &.is-focus-energy :deep(img) {
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 0 10px Rgba(255, 0, 0, 0.7)) Brightness(1.1);
  }

  &.is-ingrain :deep(img) {
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 4px 10px Rgba(34, 139, 134, 0.8));
  }
}
.pv-fx-sprite-layer {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  z-index: calc(v-bind('Z_LAYERS.MAP_SPAWNS') + 2);
  will-change: transform;

  &.is-guardian {
    @include aura-guardian;

    &.is-vibrant {
      will-change: transform, filter, opacity;
    }
  }

  &.is-freeze {
    filter: Drop-Shadow(0 0 12px Rgba(0, 255, 255, 0.8)) 
            Drop-Shadow(0 0 6px Rgba(255, 255, 255, 0.9)) 
            Brightness(1.1);
  }
}

.debug-guide {
  position: absolute; top: 50%; left: 50%; transform: Translate(-50%, -50%);
  border: 1px dashed; border-radius: 50%; pointer-events: none; z-index: calc(v-bind('Z_LAYERS.OVERLAY') - 1);
  display: flex; align-items: center; justify-content: center;
  .label {
    position: absolute; bottom: -18px; background: Rgba(0, 0, 0, 0.9); color: white;
    font-family: monospace, sans-serif; font-size: 10px; line-height: 1.2; font-weight: bold;
    padding: 2px 5px; border-radius: 3px; white-space: nowrap;
    transform: Scale(calc(1 / var(--camera-scale, 1)));
    transform-origin: center top;
  }
  &.debug-poke-radius {
    border-color: #00ffff; background: Rgba(0, 255, 255, 0.25); border: 2px solid #00ffff;
    .label { border: 1px solid #00ffff; background: Rgba(0, 40, 40, 0.9); color: #00ffff; }
  }
  &.debug-fx-radius {
    border-color: #ff9900; background: Rgba(255, 153, 0, 0.2); border: 2px solid #ff9900;
    .label { border: 1px solid #ff9900; background: Rgba(40, 20, 0, 0.9); color: #ffbb33; }
  }
}
</style>
