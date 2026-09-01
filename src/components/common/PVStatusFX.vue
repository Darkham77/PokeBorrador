<script setup lang="ts">
/**
 * PVStatusFX.vue
 * Gestiona las partículas de estados alterados (Emoji particles).
 * MIGRACIÓN 1:1 DESDE PVSPRITEFX.VUE
 */
const STATUS_PARTICLE_MIN_SCALE = 0.05
const DEFAULT_RANDOM_SCALE_MIN = 0.6
const DEFAULT_RANDOM_SCALE_MAX = 1.3
const STATUS_GROW_DUR_RATIO = 0.8
const DEFAULT_PARTICLE_DURATION_SEC = 0.8
const STATUS_GROW_MAX_SCALE_MULT = 1.2
const PARTICLE_HALF_DURATION_DIVISOR = 2
const OFFSET_PERCENT_MARGIN = '10%';
const CENTER_PERCENT_OFFSET = -50;
const STAGGER_INITIAL_DELAY_NONE = 0;
import { onUnmounted, watch, nextTick, ref } from 'vue'
import { gsap } from 'gsap'
import { useParticleEngine, type ParticleSystemOptions } from '@/composables/effects/useParticleEngine'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { resolveEffectSettings } from '@/data/battle/fx-configs'
import { Z_LAYERS, OPACITY_ZERO } from '@/logic/constants/visuals'

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
    createTweens: (el: HTMLElement, index: number, delay: number) => {
      const finalDelay = delay + (settings.stagger ? (index * settings.stagger) : STAGGER_INITIAL_DELAY_NONE)
      const tl = gsap.timeline({ repeat: -1, delay: finalDelay, repeatRefresh: true })
      
      const totalDur = settings.duration || DEFAULT_PARTICLE_DURATION_SEC
      const baseGrowDur = settings.growDuration || (totalDur / PARTICLE_HALF_DURATION_DIVISOR)
      const baseShrinkDur = totalDur - baseGrowDur

      const growDur = settings.randomizeVars ? () => gsap.utils.random(baseGrowDur * STATUS_GROW_DUR_RATIO, baseGrowDur * STATUS_GROW_MAX_SCALE_MULT) : baseGrowDur
      const shrinkDur = settings.randomizeVars ? () => gsap.utils.random(baseShrinkDur * STATUS_GROW_DUR_RATIO, baseShrinkDur * STATUS_GROW_MAX_SCALE_MULT) : baseShrinkDur
      
      const maxScale = props.spriteScale * settings.mult

      // Initial state
      gsap.set(el, { 
        opacity: settings.useFade ? OPACITY_ZERO : settings.targetOpacity, 
        y: OFFSET_PERCENT_MARGIN, 
        scale: STATUS_PARTICLE_MIN_SCALE,
        xPercent: CENTER_PERCENT_OFFSET, 
        yPercent: CENTER_PERCENT_OFFSET, 
        x: 0,
        rotation: 0,
        imageRendering: 'auto',
        webkitFontSmoothing: 'none',
        filter: 'none'
      })

      const growScale = settings.randomizeVars 
        ? () => {
            const range = typeof settings.randomizeVars === 'object' ? settings.randomizeVars : { min: DEFAULT_RANDOM_SCALE_MIN, max: DEFAULT_RANDOM_SCALE_MAX }
            return (maxScale * gsap.utils.random(range.min, range.max))
          } 
        : maxScale
      const growEase = settings.growDuration ? 'power4.out' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')
      const shrinkEase = settings.growDuration ? 'power1.inOut' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')

      const growDurVal = typeof growDur === 'function' ? (growDur as () => number)() : growDur
      const shrinkDurVal = typeof shrinkDur === 'function' ? (shrinkDur as () => number)() : shrinkDur

      // Explicit reset at the start of each loop
      const resetProps: gsap.TweenVars = { 
        scale: STATUS_PARTICLE_MIN_SCALE, 
        opacity: settings.useFade ? OPACITY_ZERO : settings.targetOpacity,
        xPercent: CENTER_PERCENT_OFFSET,
        yPercent: CENTER_PERCENT_OFFSET,
        y: OFFSET_PERCENT_MARGIN
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
        scale: STATUS_PARTICLE_MIN_SCALE,
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
            { xPercent: CENTER_PERCENT_OFFSET - w.x, rotation: -w.rotation },
            { xPercent: CENTER_PERCENT_OFFSET + w.x, rotation: w.rotation, duration: w.duration, repeat: -1, yoyo: true, ease }
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
    <div
      v-for="fx in (activeStatusEffects as FXData[])"
      :key="'status-'+fx.type"
      class="pv-fx-status-overlay"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
    >
      <span
        v-for="i in resolveEffectSettings(fx.type, radius, { isBattle: props.isBattle }).activeRange[1]"
        :key="i"
        class="emoji status-particle primary-status"
      >
        <span
          v-if="fx.type === 'freeze' || fx.type === 'frozen'"
          class="freeze-asset-wrapper"
        >
          <img
            :src="getAssetUrl(ASSET_TYPES.FX, 'shiny')"
            class="freeze-asset"
            alt="Freeze"
          >
        </span>
        <template v-else>
          {{ fx.emoji }}
        </template>
      </span>
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
        class="emoji status-particle secondary-status"
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
        class="emoji status-particle tactical-status"
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
        class="emoji status-particle field-status"
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

.shiny-asset-wrapper,
.freeze-asset-wrapper {
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
  filter: sepia(1) Saturate(12) Hue-Rotate(-15deg) Brightness(1.1);
  @include pixelated;
}

.freeze-asset {
  width: 32px;
  height: 32px;
  object-fit: contain;
  // Centro blanco puro con contornos celestes (cian) a juego con el hielo del Pokémon
  filter: Brightness(0) Invert(1)
          Drop-Shadow(1px 0 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(-1px 0 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(0 1px 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(0 -1px 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(0 0 6px Rgba(0, 255, 255, 0.8));
  @include pixelated;
}
</style>
