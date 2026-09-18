<script setup lang="ts">
/**
 * PVStatusFX.vue
 * Gestiona las partículas de estados alterados (Emoji particles).
 * MIGRACIÓN 1:1 DESDE PVSPRITEFX.VUE
 */
import { onUnmounted, watch, nextTick, ref } from 'vue'
import { useParticleEngine, type ParticleSystemOptions } from '@/composables/effects/useParticleEngine'
import { resolveEffectSettings } from '@/data/battle/fx-configs'
import { Z_LAYERS } from '@/logic/constants/visuals'
import PVStatusOverlayLayer from './PVStatusOverlayLayer.vue'
import { createStatusParticleTimeline, type FXData } from './statusParticleHelpers'

const props = defineProps({
  activeStatusEffects: { type: Array as () => FXData[], required: true },
  secondaryEffects: { type: Array as () => FXData[], required: true },
  tacticalEffects: { type: Array as () => FXData[], required: true },
  fieldEffects: { type: Array as () => FXData[], required: true },
  radius: { type: Number, required: true },
  animSeed: { type: Number, required: true },
  spriteScale: { type: Number, required: true },
  pokeScale: { type: Number, default: 1 },
  isSimplified: { type: Boolean, required: true },
  isBattle: { type: Boolean, default: false }
})

const rootRef = ref<HTMLElement | null>(null)
const { initSystem: initStatusSystem, killAll: killStatusFX } = useParticleEngine()

const engines = new Map<string, ReturnType<typeof useParticleEngine>>()
const activeUnifiedTypes = new Map<string, number>()
const activeStatusType = ref<string>('')

const getEngine = (type: string) => {
  let engine = engines.get(type)
  if (!engine) {
    engine = useParticleEngine()
    engines.set(type, engine)
  }
  return engine
}

const applyGenericParticleSystem = (els: HTMLElement[], typeKey: string, engineInit: (els: HTMLElement[], options: ParticleSystemOptions) => void, options: { isField?: boolean, seed?: number, radius: number }) => {
  if (!els || els.length === 0) return
  
  const settings = resolveEffectSettings(typeKey, options.radius, { isField: options.isField, isSimplified: props.isSimplified, isBattle: props.isBattle, spriteScale: props.spriteScale, pokeScale: props.pokeScale })
  
  engineInit(els, {
    seed: options.seed,
    ...settings,
    disableRandomizeOnRepeat: false,
    createTweens: (el: HTMLElement, index: number, delay: number) =>
      createStatusParticleTimeline(el, index, delay, settings, typeKey, props.spriteScale)
  })
}

const initParticleAnim = (container: HTMLElement, force = false) => {
  if (props.isSimplified) return
  const statusType = props.activeStatusEffects[0]?.type || ''
  
  if (statusType !== activeStatusType.value || force) {
    activeStatusType.value = statusType
    if (statusType) {
      const els = Array.from(container.querySelectorAll('.status-particle:not(.secondary-status):not(.tactical-status):not(.field-status)')) as HTMLElement[]
      applyGenericParticleSystem(els, statusType, initStatusSystem, { radius: props.radius, seed: props.animSeed })
    } else {
      killStatusFX()
    }
  }
}

const syncUnifiedSystems = (container: HTMLElement, forceReset = false) => {
  if (forceReset) {
    activeUnifiedTypes.forEach((_, type) => getEngine(type).killAll())
    activeUnifiedTypes.clear()
  }

  if (props.isSimplified) {
    activeUnifiedTypes.forEach((_, type) => getEngine(type).killAll())
    activeUnifiedTypes.clear()
    return
  }

  const allActiveFX: FXData[] = [
    ...props.secondaryEffects.map((fx) => ({ ...fx, category: 'secondary-container', isField: false })),
    ...props.tacticalEffects.map((fx) => ({ ...fx, category: 'tactical-container', isField: false })),
    ...props.fieldEffects.map((fx) => ({ ...fx, category: 'field-container', isField: true }))
  ]

  const currentTypes = allActiveFX.map(fx => fx.type)

  for (const type of activeUnifiedTypes.keys()) {
    if (!currentTypes.includes(type)) {
      getEngine(type).killAll()
      activeUnifiedTypes.delete(type)
    }
  }

  allActiveFX.forEach(fx => {
    const els = Array.from(container.querySelectorAll(`.pv-fx-status-overlay.${fx.category}.fx-type-${fx.type} .status-particle`)) as HTMLElement[]
    const currentCount = activeUnifiedTypes.get(fx.type)

    if (currentCount === undefined || currentCount !== els.length) {
      activeUnifiedTypes.set(fx.type, els.length)
      applyGenericParticleSystem(els, fx.type, getEngine(fx.type).initSystem, { radius: props.radius, seed: props.animSeed, isField: fx.isField })
    }
  })
}

const refreshAll = (forceReset = false) => {
  const container = rootRef.value?.closest('.pv-fx-wrapper') as HTMLElement
  if (!container) return
  if (forceReset) {
    killStatusFX()
    activeStatusType.value = ''
  }
  initParticleAnim(container, forceReset)
  syncUnifiedSystems(container, forceReset)
}

watch([() => props.activeStatusEffects, () => props.isSimplified, () => props.radius, () => props.spriteScale, () => props.pokeScale], () => {
  nextTick(() => refreshAll(true))
}, { immediate: true, deep: true })

watch([() => props.secondaryEffects, () => props.tacticalEffects, () => props.fieldEffects], () => {
  nextTick(() => refreshAll(false))
}, { deep: true })

onUnmounted(() => {
  killStatusFX()
  engines.forEach(e => e.killAll())
})
</script>

<template>
  <div
    ref="rootRef"
    class="pv-status-fx-layer"
  >
    <!-- 1. Capas de Partículas de Estado -->
    <PVStatusOverlayLayer
      v-for="fx in (activeStatusEffects as FXData[])"
      :key="'status-' + fx.type"
      :fx="fx"
      :radius="radius"
      :is-battle="isBattle"
      :is-simplified="isSimplified"
      category="primary"
    />

    <!-- 2. Capas de Partículas Secundarias -->
    <PVStatusOverlayLayer
      v-for="fx in (secondaryEffects as FXData[])"
      :key="'sec-' + fx.type"
      :fx="fx"
      :radius="radius"
      :is-battle="isBattle"
      :is-simplified="isSimplified"
      category="secondary"
    />

    <!-- 3. Capas de Partículas Tácticas -->
    <PVStatusOverlayLayer
      v-for="fx in (tacticalEffects as FXData[])"
      :key="'tact-' + fx.type"
      :fx="fx"
      :radius="radius"
      :is-battle="isBattle"
      :is-simplified="isSimplified"
      category="tactical"
    />

    <!-- 4. Capas de Partículas de Campo -->
    <PVStatusOverlayLayer
      v-for="fx in (fieldEffects as FXData[])"
      :key="'field-' + fx.type"
      :fx="fx"
      :radius="radius"
      :is-battle="isBattle"
      :is-simplified="isSimplified"
      category="field"
    />
  </div>
</template>

<style scoped lang="scss">
.pv-status-fx-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(v-bind('Z_LAYERS.MAP_SPAWNS') + 3);
  filter: none;
}
</style>
