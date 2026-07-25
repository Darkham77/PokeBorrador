<script setup lang="ts">
/**
 * PVStatusFX.vue
 * Gestiona las partículas de estados alterados (Emoji particles).
 * MIGRACIÓN 1:1 DESDE PVSPRITEFX.VUE
 */
import { onUnmounted, watch, nextTick, ref } from 'vue'
import { gsap } from 'gsap'
import { useParticleEngine, type ParticleSystemOptions } from '@/composables/effects/useParticleEngine'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { resolveEffectSettings } from '@/data/battle/fx-configs'
import { Z_LAYERS } from '@/logic/constants/visuals'

interface FXData {
  type: string;
  emoji: string;
  category?: string;
  isField?: boolean;
  active?: boolean;
}

const props = defineProps({
  activeStatusEffects: { type: Array as () => FXData[], required: true },
  secondaryEffects: { type: Array as () => FXData[], required: true },
  tacticalEffects: { type: Array as () => FXData[], required: true },
  fieldEffects: { type: Array as () => FXData[], required: true },
  radius: { type: Number, required: true },
  animSeed: { type: Number, required: true },
  spriteScale: { type: Number, required: true },
  isSimplified: { type: Boolean, required: true },
  isBattle: { type: Boolean, default: false }
})

const rootRef = ref<HTMLElement | null>(null)
const { initSystem: initStatusSystem, killAll: killStatusFX } = useParticleEngine()

const engines = new Map<string, ReturnType<typeof useParticleEngine>>()
const activeUnifiedTypes = new Map<string, number>()
const activeStatusType = ref<string>('')

const allUnifiedTypes = [
  'shiny',
  'confused', 'taunted', 'substitute', 'flinched', 'disabled', 'encored', 'cursed', 'attracted', 'seeded', 'trapped', 'ingrained',
  'protected', 'enduring', 'focus', 'lockon',
  'reflect', 'lightscreen', 'safeguard', 'mist', 'spikes'
]

allUnifiedTypes.forEach(type => {
  engines.set(type, useParticleEngine())
})

const getEngine = (type: string) => engines.get(type)!

const applyGenericParticleSystem = (els: HTMLElement[], typeKey: string, engineInit: (els: HTMLElement[], options: ParticleSystemOptions) => void, options: { isField?: boolean, seed?: number, radius: number }) => {
  if (!els || els.length === 0) return
  
  const settings = resolveEffectSettings(typeKey, options.radius, { isField: options.isField, isSimplified: props.isSimplified, isBattle: props.isBattle, spriteScale: props.spriteScale })
  
  engineInit(els, {
    seed: options.seed,
    ...settings,
    disableRandomizeOnRepeat: false,
    createTweens: (el: HTMLElement, index: number, delay: number) => {
      const finalDelay = delay + (settings.stagger ? (index * settings.stagger) : 0)
      const tl = gsap.timeline({ repeat: -1, delay: finalDelay, repeatRefresh: true })
      
      const totalDur = settings.duration || 0.8
      const baseGrowDur = settings.growDuration || (totalDur / 2)
      const baseShrinkDur = totalDur - baseGrowDur

      const growDur = settings.randomizeVars ? () => gsap.utils.random(baseGrowDur * 0.8, baseGrowDur * 1.2) : baseGrowDur
      const shrinkDur = settings.randomizeVars ? () => gsap.utils.random(baseShrinkDur * 0.8, baseShrinkDur * 1.2) : baseShrinkDur
      
      const maxScale = props.spriteScale * settings.mult

      // Initial state
      gsap.set(el, { 
        opacity: settings.useFade ? 0 : settings.targetOpacity, 
        y: '10%', 
        scale: 0.05, 
        xPercent: -50, 
        yPercent: -50, 
        x: 0,
        rotation: 0,
        imageRendering: 'auto',
        webkitFontSmoothing: 'none',
        filter: typeKey === 'freeze' ? 'Drop-Shadow(0 0 8px cyan) Brightness(2)' : 'none'
      })

      const growScale = settings.randomizeVars 
        ? () => {
            const range = typeof settings.randomizeVars === 'object' ? settings.randomizeVars : { min: 0.6, max: 1.3 }
            return (maxScale * gsap.utils.random(range.min, range.max))
          } 
        : maxScale
      const growEase = settings.growDuration ? 'power4.out' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')
      const shrinkEase = settings.growDuration ? 'power1.inOut' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')

      const growDurVal = typeof growDur === 'function' ? (growDur as () => number)() : growDur
      const shrinkDurVal = typeof shrinkDur === 'function' ? (shrinkDur as () => number)() : shrinkDur

      // Explicit reset at the start of each loop
      const resetProps: gsap.TweenVars = { 
        scale: 0.05, 
        opacity: settings.useFade ? 0 : settings.targetOpacity,
        xPercent: -50,
        yPercent: -50,
        y: '10%'
      }
      if (!settings.wobble) resetProps.rotation = 0
      tl.set(el, resetProps)

      tl.to(el, {
        opacity: settings.targetOpacity,
        scale: growScale,
        duration: growDurVal,
        ease: growEase,
        force3D: true
      })
      
      tl.to(el, {
        scale: 0.05,
        opacity: settings.useFade ? 0 : settings.targetOpacity,
        duration: shrinkDurVal,
        ease: shrinkEase,
        force3D: true
      })

      if (settings.wobble && typeof settings.wobble === 'object') {
        const w = settings.wobble as { x: number, rotation: number, duration: number, yoyo?: boolean, ease?: string }
        const isYoyo = w.yoyo !== false
        const ease = w.ease || 'sine.inOut'
        
        if (isYoyo) {
          gsap.fromTo(el,
            { xPercent: -50 - w.x, rotation: -w.rotation },
            { xPercent: -50 + w.x, rotation: w.rotation, duration: w.duration, repeat: -1, yoyo: true, ease }
          )
        } else {
          gsap.to(el, {
            rotation: w.rotation,
            duration: w.duration,
            repeat: -1,
            ease: 'none'
          })
        }
      }
      
      return [tl]
    }
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

watch([() => props.activeStatusEffects, () => props.isSimplified, () => props.radius], () => {
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
    <div
      v-for="fx in (activeStatusEffects as FXData[])"
      :key="'status-'+fx.type"
      class="pv-fx-status-overlay"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
    >
      <span
        v-for="n in 24"
        :key="n"
        class="status-particle"
      >{{ fx.emoji }}</span>
    </div>

    <!-- 2. Capas de Partículas Secundarias -->
    <div
      v-for="fx in (secondaryEffects as FXData[])"
      :key="'sec-'+fx.type"
      class="pv-fx-status-overlay secondary-container"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
    >
      <span
        v-for="i in resolveEffectSettings(fx.type, radius, { isField: fx.isField, isSimplified: props.isSimplified, isBattle: props.isBattle }).activeRange[1]"
        :key="i"
        class="status-particle secondary-status"
      >
        <span
          v-if="fx.type === 'shiny'"
          class="shiny-asset-wrapper"
        >
          <img
            :src="getAssetUrl(ASSET_TYPES.FX, 'shiny')"
            class="shiny-asset"
            alt="Shiny"
          >
        </span>
        <span
          v-else
          :class="{ 'wobble-content': fx.type === 'confusion' || fx.type === 'confused' }"
        >
          {{ fx.emoji }}
        </span>
      </span>
    </div>

    <!-- 3. Capas de Partículas Tácticas -->
    <div
      v-for="fx in (tacticalEffects as FXData[])"
      :key="'tact-'+fx.type"
      class="pv-fx-status-overlay tactical-container"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in resolveEffectSettings(fx.type, radius, { isSimplified: props.isSimplified, isBattle: props.isBattle }).activeRange[1]"
        :key="i"
        class="status-particle tactical-status"
      >{{ fx.emoji }}</span>
    </div>

    <!-- 4. Capas de Partículas de Campo -->
    <div
      v-for="fx in (fieldEffects as FXData[])"
      :key="'field-'+fx.type"
      class="pv-fx-status-overlay field-container"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in resolveEffectSettings(fx.type, radius, { isField: true, isSimplified: props.isSimplified, isBattle: props.isBattle }).activeRange[1]"
        :key="i"
        class="status-particle field-status"
      >{{ fx.emoji }}</span>
    </div>
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
}

.status-particle {
  position: absolute;
  font-size: 32px !important;
  line-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
  -webkit-font-smoothing: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform-origin: 50% 50%;
  will-change: transform, filter, opacity;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  perspective: 1000px;
}

.shiny-asset-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.shiny-asset {
  width: 32px;
  height: 32px;
  object-fit: contain;
  // Tintado amarillo: Sepia + Saturación alta + Rotación de hue para llegar al amarillo/dorado
  filter: sepia(1) Saturate(12) hue-rotate(-15deg) Brightness(1.1);
  @include pixelated;
}
</style>
