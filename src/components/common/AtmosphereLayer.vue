<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { gsap } from 'gsap'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { WeatherSeasonId } from '@/data/world/weather-tables'
import type { DayPhase } from '@/logic/utils/timeUtils'
import type { AtmosphereLayerDepth } from './atmosphereParticleHelper'

interface AtmosphereLayerProps {
  weather?: WeatherId
  cycle?: DayPhase
  season?: WeatherSeasonId
  isFastMode?: boolean
  isPerformanceMode?: boolean
  isLocked?: boolean
  zIndex?: number | string
  animSeed?: number
  isVisible?: boolean
  isLowPower?: boolean
  layer?: AtmosphereLayerDepth
}

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

// Cache for weather noise textures
let cachedNoise1Img: HTMLImageElement | null = null
let cachedNoise2Img: HTMLImageElement | null = null

const preloadImages = (): Promise<[HTMLImageElement, HTMLImageElement]> => {
  if (cachedNoise1Img && cachedNoise2Img) {
    return Promise.resolve([cachedNoise1Img, cachedNoise2Img])
  }
  
  const noise1Url = getAssetUrl(ASSET_TYPES.FX, 'pattern-noise-1')
  const noise2Url = getAssetUrl(ASSET_TYPES.FX, 'pattern-noise-2')

  return Promise.all([
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = noise1Url
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load weather texture at ${noise1Url}`))
    }),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = noise2Url
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load weather texture at ${noise2Url}`))
    })
  ]).then(([img1, img2]) => {
    cachedNoise1Img = img1
    cachedNoise2Img = img2
    return [img1, img2]
  })
}

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let atmosphereContext: gsap.Context | null = null
let worker: Worker | null = null
let stopResizeObserver: (() => void) | null = null

import { Z_LAYERS } from '@/logic/constants/visuals'

const props = withDefaults(defineProps<AtmosphereLayerProps>(), {
  weather: 'clear',
  cycle: 'day',
  season: 'spring',
  isFastMode: false,
  isPerformanceMode: false,
  isLocked: false,
  zIndex: Z_LAYERS.BASE,
  animSeed: 0.5,
  isVisible: false,
  isLowPower: false,
  layer: 'all'
})

const isFastModeActive = computed(() => Boolean(props.isFastMode ?? props.isPerformanceMode))

// Centralized Seed for Animations (Inherited from Map)
const animSeed = computed(() => props.animSeed)
const direction = computed(() => (animSeed.value > 0.5 ? 1 : -1))
const flashRef = ref<HTMLElement | null>(null)

// GSAP Orchestrator for Weather Layers
const dustLayer1Ref = ref<HTMLElement | null>(null)
const dustLayer2Ref = ref<HTMLElement | null>(null)
const layer1Ref = ref<HTMLElement | null>(null)
const layer2Ref = ref<HTMLElement | null>(null)
const lightningRef = ref<HTMLElement | null>(null)

const lightningPos = ref({ x1: 20, x2: 60 })
let weatherTimeline: gsap.core.Timeline | null = null

const applyParallaxLayer = (
  layer: HTMLElement | null,
  startX: number,
  startY: number,
  moveX: number,
  moveY: number,
  duration: number,
  seed?: number
) => {
  if (!layer || !weatherTimeline) return
  gsap.killTweensOf(layer)
  
  const tween = weatherTimeline.fromTo(
    layer,
    { x: startX, y: startY },
    {
      x: startX + moveX,
      y: startY + moveY,
      duration,
      repeat: -1,
      ease: 'none'
    },
    0
  )
  if (seed !== undefined) {
    tween.progress(seed % 1)
  }
}

const initWorker = async () => {
  if (!canvasRef.value) return

  // If worker is already active, just update parameters instead of re-creating worker & re-transferring canvas
  if (worker) {
    updateWorkerParams()
    return
  }

  const canvasEl = canvasRef.value as HTMLCanvasElement & { __offscreenTransferred?: boolean }
  if (canvasEl.__offscreenTransferred) return

  if (!('transferControlToOffscreen' in canvasEl)) {
    console.error('[AtmosphereLayer] OffscreenCanvas is not supported.')
    return
  }

  let img1: HTMLImageElement
  let img2: HTMLImageElement
  try {
    const images = await preloadImages()
    img1 = images[0]
    img2 = images[1]
  } catch (err) {
    console.error('[AtmosphereLayer] Failed to preload weather textures:', err)
    return
  }

  if (!canvasRef.value) return

  let offscreen: OffscreenCanvas
  try {
    offscreen = canvasEl.transferControlToOffscreen()
    canvasEl.__offscreenTransferred = true
  } catch (e) {
    console.warn('[AtmosphereLayer] Cannot transfer canvas control:', e)
    return
  }
  
  worker = new Worker(
    new URL('../../logic/render/atmosphere.worker.ts', import.meta.url),
    { type: 'module' }
  )

  const bitmap1 = await createImageBitmap(img1)
  const bitmap2 = await createImageBitmap(img2)

  worker.postMessage(
    {
      type: 'INIT',
      payload: {
        canvas: offscreen,
        noise1: bitmap1,
        noise2: bitmap2
      }
    },
    [offscreen, bitmap1, bitmap2]
  )

  const ATMOSPHERE_CANVAS_OVERDRAW_PX = 200
  const ATMOSPHERE_RESIZE_THRESHOLD_PX = 20

  // Send initial dimensions immediately
  const initialWidth = (containerRef.value?.clientWidth || 800) + ATMOSPHERE_CANVAS_OVERDRAW_PX
  const initialHeight = (containerRef.value?.clientHeight || 600) + ATMOSPHERE_CANVAS_OVERDRAW_PX
  worker.postMessage({
    type: 'RESIZE',
    payload: { width: initialWidth, height: initialHeight }
  })

  updateWorkerParams()

  if (stopResizeObserver) {
    stopResizeObserver()
    stopResizeObserver = null
  }
  let lastSentW = initialWidth
  let lastSentH = initialHeight
  const { stop } = useResizeObserver(containerRef, (entries) => {
    if (!entries || entries.length === 0 || !worker) return
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    const targetW = width + ATMOSPHERE_CANVAS_OVERDRAW_PX
    const targetH = height + ATMOSPHERE_CANVAS_OVERDRAW_PX
    if (Math.abs(targetW - lastSentW) > ATMOSPHERE_RESIZE_THRESHOLD_PX || Math.abs(targetH - lastSentH) > ATMOSPHERE_RESIZE_THRESHOLD_PX) {
      lastSentW = targetW
      lastSentH = targetH
      worker.postMessage({
        type: 'RESIZE',
        payload: { width: targetW, height: targetH }
      })
    }
  })
  stopResizeObserver = stop
}

const updateWorkerParams = () => {
  if (!worker) return
  const isVirtual = Boolean(containerRef.value?.closest('.map-virtual-world'))
  worker.postMessage({
    type: 'UPDATE_PARAMS',
    payload: {
      weather: props.weather,
      isLowPower: props.isLowPower,
      animSeed: props.animSeed,
      speedMultiplier: isVirtual ? 2.5 : 1.0
    }
  })
  worker.postMessage({ type: 'RESUME' })
}

const pauseWorker = () => {
  if (worker) {
    worker.postMessage({ type: 'PAUSE' })
  }
}

const destroyWorker = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
  if (stopResizeObserver) {
    stopResizeObserver()
    stopResizeObserver = null
  }
}

const initWeatherAnim = () => {
  if (weatherTimeline) weatherTimeline.kill()
  cleanUpLightning()
  
  const allLayers = [
    layer1Ref.value, 
    layer2Ref.value, 
    dustLayer1Ref.value, 
    dustLayer2Ref.value
  ]
  
  allLayers.forEach(layer => {
    if (layer) {
      gsap.killTweensOf(layer)
      gsap.set(layer, { clearProps: 'all' })
      gsap.set(layer, { x: 0, y: 0 })
    }
  })

  if (lightningRef.value) {
    gsap.killTweensOf(lightningRef.value)
    gsap.set(lightningRef.value, { opacity: 0 })
  }
  
  weatherTimeline = gsap.timeline()
  const w = props.weather
  
  const seed1 = animSeed.value
  const seed2 = (animSeed.value * 1.618) % 1
  const speedVar = 0.8 + (animSeed.value * 0.4)

  if (w === 'clear' || isFastModeActive.value) {
    pauseWorker()
    return
  }

  // Canvas / OffscreenCanvas activation for noise/mist/heat layers
  const shouldActivateCanvas = (weatherId?: WeatherId): boolean => {
    if (isHeatWeather(weatherId)) {
      return props.layer !== 'ambient' && isCanvasWeather(weatherId)
    }
    return props.layer !== 'particles' && isCanvasWeather(weatherId)
  }

  if (shouldActivateCanvas(w)) {
    nextTick(() => {
      if (canvasRef.value && !worker) {
        initWorker()
      } else {
        updateWorkerParams()
      }
    })
  } else {
    pauseWorker()
  }

  if (props.layer !== 'ambient') {
    // Rain / Storm / Heavy Rain / Thunderstorm
    initRainAnim(w, seed1, seed2, animSeed.value, props.isLowPower, speedVar, weatherTimeline, atmosphereContext, {
      isVisible: props.isVisible,
      isFastMode: isFastModeActive.value,
      weather: props.weather
    })

    // Snow / Blizzard / Hail
    initSnowAnim(w, seed1, seed2, animSeed.value, props.isLowPower, speedVar, weatherTimeline)

    // Sandstorm / Strong Winds / Dust Storm
    initSandstormAnim(w, animSeed.value, props.isLowPower, speedVar)
  }
}

const hasActiveWeather = computed(() => {
  return !!props.weather && props.weather !== 'clear' && props.weather !== 'none' && props.weather !== 'null'
})

const shouldRenderAtmosphere = computed<boolean>(() => {
  return props.isVisible && !isFastModeActive.value && !props.isLocked && hasActiveWeather.value
})

const cleanUpAtmosphere = () => {
  if (atmosphereContext) {
    atmosphereContext.revert()
    atmosphereContext = null
  }
  weatherTimeline = null
  cleanUpLightning()
  pauseWorker()
}

const initAtmosphere = () => {
  cleanUpAtmosphere()
  
  if (!shouldRenderAtmosphere.value) {
    return
  }

  atmosphereContext = gsap.context((ctxVal) => {
    initWeatherAnim()
    initLeafAnim(ctxVal)
  }, containerRef.value || undefined)
}

watch(
  [shouldRenderAtmosphere, () => props.weather, () => props.animSeed, () => props.isLowPower, () => props.layer],
  async ([shouldRender]) => {
    if (shouldRender) {
      await nextTick()
      await nextTick()
      if (shouldRenderAtmosphere.value) {
        initAtmosphere()
      }
    } else {
      cleanUpAtmosphere()
    }
  },
  { flush: 'post' }
)

onMounted(async () => {
  if (shouldRenderAtmosphere.value) {
    await nextTick()
    await nextTick()
    if (shouldRenderAtmosphere.value) {
      initAtmosphere()
    }
  }
})

onUnmounted(() => {
  cleanUpAtmosphere()
  destroyWorker()
})

defineExpose({})

// Weather Animations
import { useAtmosphereLeafAnim } from './useAtmosphereLeafAnim.ts'
import { useAtmosphereSandstormAnim } from './useAtmosphereSandstormAnim.ts'
import { useAtmosphereSnowAnim } from './useAtmosphereSnowAnim.ts'
import { useAtmosphereRainAnim } from './useAtmosphereRainAnim.ts'

const { initLeafAnim: initLeafAnimFn } = useAtmosphereLeafAnim(containerRef, props)
const { initSandstormAnim } = useAtmosphereSandstormAnim(dustLayer1Ref, dustLayer2Ref, applyParallaxLayer)
const { initSnowAnim } = useAtmosphereSnowAnim(layer1Ref, layer2Ref)
const { initRainAnim, cleanUpLightning } = useAtmosphereRainAnim(layer1Ref, layer2Ref, lightningRef, flashRef, lightningPos)

import {
  isRainWeather,
  isLightningWeather,
  isSnowWeather,
  isSandstormWeather,
  isCanvasWeather,
  isHeatWeather,
  resolveSnowLayerClass,
  resolveWeatherOverlayStyles
} from './atmosphereParticleHelper'
import AtmosphereLeavesOverlay from './AtmosphereLeavesOverlay.vue'

const initLeafAnim = (ctxVal: gsap.Context) => {
  initLeafAnimFn(ctxVal)
}

const weatherOverlayStyles = computed(() =>
  resolveWeatherOverlayStyles({
    zIndex: props.zIndex,
    animSeed: animSeed.value,
    direction: direction.value
  })
)

const hasRain = computed(() => isRainWeather(props.weather))
const hasLightning = computed(() => isLightningWeather(props.weather))
const hasSnow = computed(() => isSnowWeather(props.weather))
const hasSandstorm = computed(() => isSandstormWeather(props.weather))
const hasCanvasWeather = computed(() => isCanvasWeather(props.weather))
const snowLayerClass = computed(() => resolveSnowLayerClass(props.weather))
const isDustOnly = computed(() => props.weather === 'strong_winds')

const hasPrecipitation = computed(() => hasRain.value || hasSnow.value)
const precipitationLayerClass = computed(() => (hasRain.value ? 'rain-layer' : snowLayerClass.value))
const dustLayerClass = computed(() => ['sandstorm-layer', { 'dust-only': isDustOnly.value }])
const showSecondLayer = computed(() => !props.isLowPower)
const lightningStyle = computed(() => ({ '--lx': lightningPos.value.x1 }))
const containerStyle = computed(() => ({ zIndex: props.zIndex }))

const containerClasses = computed(() => [
  `layer-${props.layer}`,
  {
    'is-ambient-layer': props.layer === 'ambient',
    'is-particles-layer': props.layer === 'particles'
  }
])

const overlayClasses = computed(() => [
  props.weather,
  props.cycle,
  {
    'is-fast-mode': isFastModeActive.value,
    'is-performance': isFastModeActive.value,
    'is-ambient-layer': props.layer === 'ambient',
    'is-particles-layer': props.layer === 'particles'
  }
])

const showPrecipitation = computed(() => props.layer !== 'ambient' && hasPrecipitation.value)
const showSandstorm = computed(() => props.layer !== 'ambient' && hasSandstorm.value)
const showCanvasWeather = computed(() => {
  if (isHeatWeather(props.weather)) {
    return props.layer !== 'ambient' && hasCanvasWeather.value
  }
  return props.layer !== 'particles' && hasCanvasWeather.value
})
const showLeavesOverlay = computed(() => props.layer !== 'ambient' && Boolean(props.weather))
</script>

<template>
  <div
    ref="containerRef"
    class="atmosphere-container"
    :class="containerClasses"
    :style="containerStyle"
  >
    <div
      v-show="shouldRenderAtmosphere"
      class="weather-overlay"
      :class="overlayClasses"
      :style="weatherOverlayStyles"
    >
      <!-- Rain, Storm, Heavy Rain, Thunderstorm, Snow, Blizzard, Hail -->
      <template v-if="showPrecipitation">
        <div
          ref="layer1Ref"
          :class="[precipitationLayerClass, 'layer-1']"
        />
        <div
          v-if="showSecondLayer"
          ref="layer2Ref"
          :class="[precipitationLayerClass, 'layer-2']"
        />
        <template v-if="hasLightning">
          <div
            ref="lightningRef"
            class="lightning-bolt"
            :style="lightningStyle"
          />
          <div 
            ref="flashRef" 
            class="lightning-flash-overlay" 
          />
        </template>
      </template>

      <!-- Sandstorm, Strong Winds, Dust Storm -->
      <template v-if="showSandstorm">
        <div
          ref="dustLayer1Ref"
          :class="[dustLayerClass, 'layer-1']"
        />
        <div
          v-if="showSecondLayer"
          ref="dustLayer2Ref"
          :class="[dustLayerClass, 'layer-2']"
        />
      </template>

      <canvas
        v-show="showCanvasWeather"
        ref="canvasRef"
        class="weather-canvas"
      />
      
      <!-- Leaves (for Wind & Storm effects) -->
      <AtmosphereLeavesOverlay
        v-if="showLeavesOverlay"
        :weather="props.weather"
        :is-fast-mode="isFastModeActive"
        :is-low-power="props.isLowPower"
      />
    </div>
  </div>
</template>

<style src="./AtmosphereLayer.styles.scss" scoped lang="scss"></style>
