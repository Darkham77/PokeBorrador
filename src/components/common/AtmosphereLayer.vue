<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { gsap } from 'gsap'

// Cache for weather noise textures
let cachedNoise1Img: HTMLImageElement | null = null
let cachedNoise2Img: HTMLImageElement | null = null

const preloadImages = (): Promise<[HTMLImageElement, HTMLImageElement]> => {
  if (cachedNoise1Img && cachedNoise2Img) {
    return Promise.resolve([cachedNoise1Img, cachedNoise2Img])
  }
  
  const base = import.meta.env.BASE_URL || '/'
  
  const loadImageElement = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = (err) => reject(err)
      img.src = url
    })
  }

  return Promise.all([
    loadImageElement(`${base}assets/fx/pattern-noise-1.webp`),
    loadImageElement(`${base}assets/fx/pattern-noise-2.webp`)
  ]).then(([img1, img2]) => {
    cachedNoise1Img = img1
    cachedNoise2Img = img2
    return [img1, img2]
  })
}

const canvasKey = ref(0)
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let atmosphereContext: gsap.Context | null = null
let worker: Worker | null = null
let resizeObserver: ResizeObserver | null = null

const props = defineProps({
  weather: { type: String, default: 'clear' },
  cycle: { type: String, default: 'day' },
  season: { type: String, default: 'spring' },
  isPerformanceMode: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  zIndex: { type: [Number, String], default: 0 },
  animSeed: { type: Number, default: 0.5 },
  isVisible: { type: Boolean, default: false },
  isLowPower: { type: Boolean, default: false }
})

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
  duration: number
) => {
  if (!layer || !weatherTimeline) return
  gsap.killTweensOf(layer)
  gsap.set(layer, { backgroundPosition: `${startX}px ${startY}px` })
  
  const opX = moveX >= 0 ? '+=' : '-='
  const opY = moveY >= 0 ? '+=' : '-='
  const valX = Math.abs(moveX) || 0.01
  const valY = Math.abs(moveY) || 0.01
  
  weatherTimeline.to(layer, {
    backgroundPosition: `${opX}${valX}px ${opY}${valY}px`,
    duration,
    repeat: -1,
    ease: 'none'
  }, 0)
}

const initWorker = async () => {
  destroyWorker()

  if (!canvasRef.value) return

  if (!('transferControlToOffscreen' in canvasRef.value)) {
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

  const offscreen = canvasRef.value.transferControlToOffscreen()
  
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

  // Send initial dimensions immediately
  const initialWidth = (containerRef.value?.clientWidth || 800) + 200
  const initialHeight = (containerRef.value?.clientHeight || 600) + 200
  worker.postMessage({
    type: 'RESIZE',
    payload: { width: initialWidth, height: initialHeight }
  })

  updateWorkerParams()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !worker) return
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      worker.postMessage({
        type: 'RESIZE',
        payload: { width: width + 200, height: height + 200 }
      })
    })
    resizeObserver.observe(containerRef.value)
  }
}

const updateWorkerParams = () => {
  if (!worker) return
  worker.postMessage({
    type: 'UPDATE_PARAMS',
    payload: {
      weather: props.weather,
      isLowPower: props.isLowPower,
      animSeed: props.animSeed
    }
  })
}

const destroyWorker = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  canvasKey.value++
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

  if (w === 'clear' || props.isPerformanceMode) return

  // Canvas / OffscreenCanvas activation for noise/mist layers
  if (['fog', 'mist', 'wind', 'strong_winds', 'dust_storm', 'sandstorm'].includes(w)) {
    nextTick(() => {
      if (canvasRef.value && !worker) {
        initWorker()
      } else {
        updateWorkerParams()
      }
    })
  } else {
    destroyWorker()
  }

  // Rain / Storm / Heavy Rain / Thunderstorm
  initRainAnim(w, seed1, seed2, animSeed.value, props.isLowPower, speedVar, weatherTimeline, atmosphereContext, props)

  // Snow / Blizzard / Hail
  initSnowAnim(w, seed1, seed2, animSeed.value, props.isLowPower, speedVar, weatherTimeline)

  // Sandstorm / Strong Winds / Dust Storm
  initSandstormAnim(w, animSeed.value, props.isLowPower, speedVar)
}

const cleanUpAtmosphere = (keepWorker = false) => {
  if (atmosphereContext) {
    atmosphereContext.revert()
    atmosphereContext = null
  }
  weatherTimeline = null
  cleanUpLightning()
  if (!keepWorker) {
    destroyWorker()
  } else if (worker) {
    worker.postMessage({ type: 'PAUSE' })
  }
}

const initAtmosphere = () => {
  cleanUpAtmosphere(true)
  
  if (!props.isVisible || props.isPerformanceMode || props.isLocked || props.weather === 'clear') {
    return
  }

  atmosphereContext = gsap.context((ctxVal) => {
    initWeatherAnim()
    initLeafAnim(ctxVal)
  }, containerRef.value || undefined)
}

watch(
  [
    () => props.isVisible,
    () => props.weather,
    () => props.isLowPower,
    () => props.isPerformanceMode,
    () => props.animSeed
  ],
  async ([visible, weather, , perfMode]) => {
    if (visible && !perfMode) {
      await nextTick()
      await nextTick()
      if (props.isVisible && !props.isPerformanceMode) {
        initAtmosphere()
      }
    } else {
      const canvasWeathers = ['fog', 'mist', 'wind', 'strong_winds', 'dust_storm', 'sandstorm']
      const keepWorker = !perfMode && canvasWeathers.includes(weather)
      cleanUpAtmosphere(keepWorker)
    }
  },
  { flush: 'post' }
)

onMounted(async () => {
  if (props.isVisible && !props.isPerformanceMode) {
    await nextTick()
    await nextTick()
    if (props.isVisible && !props.isPerformanceMode) {
      initAtmosphere()
    }
  }
})

onUnmounted(() => {
  cleanUpAtmosphere()
})

defineExpose({})

// Weather Animations
import { useAtmosphereLeafAnim } from './useAtmosphereLeafAnim'
import { useAtmosphereSandstormAnim } from './useAtmosphereSandstormAnim'
import { useAtmosphereSnowAnim } from './useAtmosphereSnowAnim'
import { useAtmosphereRainAnim } from './useAtmosphereRainAnim'

const { leafTypes, initLeafAnim: initLeafAnimFn } = useAtmosphereLeafAnim(containerRef, props)
const { initSandstormAnim } = useAtmosphereSandstormAnim(dustLayer1Ref, dustLayer2Ref, applyParallaxLayer)
const { initSnowAnim } = useAtmosphereSnowAnim(layer1Ref, layer2Ref, applyParallaxLayer)
const { initRainAnim, cleanUpLightning } = useAtmosphereRainAnim(layer1Ref, layer2Ref, lightningRef, flashRef, lightningPos)

const leafCount = computed(() => {
  let count = 0
  if (['storm', 'strong_winds'].includes(props.weather)) count = 15
  else if (['wind'].includes(props.weather)) count = 8
  
  if (props.isLowPower) {
    return Math.round(count / 2)
  }
  return count
})

const initLeafAnim = (ctxVal: gsap.Context) => {
  initLeafAnimFn(ctxVal, atmosphereContext)
}

const weatherOverlayStyles = computed(() => {
  return {
    '--atmo-z-final': props.zIndex ? `calc(${props.zIndex} + 1)` : '1',
    '--card-seed': animSeed.value,
    '--card-speed': 0.6 + (animSeed.value * 1.0),
    '--atmo-dir': direction.value,
    '--seed-x': (animSeed.value * 100) % 100,
    '--seed-y': (animSeed.value * 300) % 100
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="atmosphere-container"
    :style="{ zIndex: zIndex }"
  >
    <div
      v-if="!isPerformanceMode && weather !== 'clear' && !isLocked"
      v-show="isVisible"
      class="weather-overlay"
      :class="[weather, props.cycle, { 'is-performance': isPerformanceMode }]"
      :style="weatherOverlayStyles"
    >
      <!-- Rain, Storm, Heavy Rain, Thunderstorm -->
      <template v-if="['rain', 'storm', 'heavy_rain', 'thunderstorm'].includes(weather)">
        <div
          ref="layer1Ref"
          class="rain-layer layer-1"
        />
        <div
          v-if="!isLowPower"
          ref="layer2Ref"
          class="rain-layer layer-2"
        />
        <div
          v-if="['storm', 'thunderstorm'].includes(weather)"
          ref="lightningRef"
          class="lightning-bolt"
          :style="{ '--lx': lightningPos.x1 }"
        />
        <div 
          v-if="['storm', 'thunderstorm'].includes(weather)" 
          ref="flashRef" 
          class="lightning-flash-overlay" 
        />
      </template>

      <!-- Snow, Blizzard, Hail -->
      <template v-if="['snow', 'blizzard', 'hail'].includes(weather)">
        <div
          ref="layer1Ref"
          :class="[weather === 'hail' ? 'hail-layer' : 'snow-layer', 'layer-1']"
        />
        <div
          v-if="!isLowPower"
          ref="layer2Ref"
          :class="[weather === 'hail' ? 'hail-layer' : 'snow-layer', 'layer-2']"
        />
      </template>

      <!-- Sandstorm, Strong Winds, Dust Storm -->
      <template v-if="['strong_winds', 'dust_storm'].includes(weather)">
        <div
          ref="dustLayer1Ref"
          class="sandstorm-layer layer-1"
          :class="{ 'dust-only': weather === 'strong_winds' }"
        />
        <div
          v-if="!isLowPower"
          ref="dustLayer2Ref"
          class="sandstorm-layer layer-2"
          :class="{ 'dust-only': weather === 'strong_winds' }"
        />
      </template>

      <template v-if="['fog', 'mist', 'wind', 'strong_winds', 'dust_storm', 'sandstorm'].includes(weather)">
        <canvas
          ref="canvasRef"
          :key="canvasKey"
          class="weather-canvas"
        />
      </template>
      
      <!-- Leaves (for Wind & Storm effects) -->
      <template v-if="leafTypes.includes(weather)">
        <div
          v-for="n in leafCount"
          :key="'leaf-'+n"
          class="leaf-element"
        />
      </template>
    </div>
  </div>
</template>

<style src="./AtmosphereLayer.styles.scss" scoped lang="scss"></style>
