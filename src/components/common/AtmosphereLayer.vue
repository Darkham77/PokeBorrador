<script setup lang="ts">
// [PureVue-Ignore-Length]
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
let lightningTimer: gsap.core.Tween | null = null

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
  if (lightningTimer) lightningTimer.kill()
  
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
  if (['rain', 'storm', 'heavy_rain', 'thunderstorm'].includes(w)) {
    const isStorm = w === 'storm' || w === 'thunderstorm'
    const isHeavy = w === 'heavy_rain'
    
    let variantSpeed1, variantSpeed2;
    
    if (isHeavy) {
      variantSpeed1 = (0.35 + (animSeed.value * 0.2)) * speedVar
      variantSpeed2 = variantSpeed1 * 1.3
    } else if (isStorm) {
      const stormBase = 0.65
      variantSpeed1 = (stormBase + (animSeed.value * 0.6)) * speedVar
      variantSpeed2 = variantSpeed1 * 1.4
    } else {
      const rainBase = 0.4
      variantSpeed1 = (rainBase + (animSeed.value * 0.4)) * speedVar
      variantSpeed2 = variantSpeed1 * 1.6
    }
    

    if (layer1Ref.value) {
      const driftX = isStorm ? -256 : 0
      const s1X = (seed1 * 1234) % 256
      const s1Y = (seed1 * 5678) % 256
      
      gsap.set(layer1Ref.value, { backgroundPosition: `${s1X}px ${s1Y}px` })
      
      weatherTimeline.to(layer1Ref.value, 
        {
          backgroundPosition: `+=${driftX}px +=256px`,
          duration: variantSpeed1,
          repeat: -1,
          ease: 'none'
        },
        0
      ).progress(seed1)
    }
    if (layer2Ref.value && !props.isLowPower) {
      const driftX = isStorm ? -256 : 0 
      const s2X = (seed2 * 9101) % 256
      const s2Y = (seed2 * 1121) % 256
      
      gsap.set(layer2Ref.value, { backgroundPosition: `${s2X}px ${s2Y}px` })
      
      weatherTimeline.to(layer2Ref.value, 
        {
          backgroundPosition: `+=${driftX}px +=256px`,
          duration: variantSpeed2 * (isHeavy ? 1.5 : 1),
          repeat: -1,
          ease: 'none'
        },
        0
      ).progress(seed2)
    }

    if (isStorm) {
      const strike = () => {
        const ctxVal = atmosphereContext
        if (!props.isVisible || props.isPerformanceMode || !ctxVal || !['storm', 'thunderstorm'].includes(props.weather) || !lightningRef.value) return
        
        const x1 = Math.floor(Math.random() * 90) + 5
        const isFlipped = Math.random() > 0.5
        lightningPos.value = { x1, x2: x1 }

        ctxVal.add(() => {
          const tl = gsap.timeline()
          tl.to(lightningRef.value, { 
            opacity: 1, 
            duration: 0.05,
            scaleX: isFlipped ? -1 : 1 
          })
            .to(lightningRef.value, { opacity: 0, duration: 0.05 })
            .to(lightningRef.value, { opacity: 1, duration: 0.05 })
            .to(lightningRef.value, { opacity: 0, duration: 0.25 })
            
          if (flashRef.value) {
            gsap.timeline()
              .to(flashRef.value, { opacity: 0.6, duration: 0.05 })
              .to(flashRef.value, { opacity: 0, duration: 0.4, ease: 'power2.out' })
          }

          const nextDelay = w === 'thunderstorm' ? (1 + Math.random() * 2) : (4 + Math.random() * 6)
          lightningTimer = gsap.delayedCall(nextDelay, strike)
        })
      }
      lightningTimer = gsap.delayedCall(2 + Math.random() * 3, strike)
    }
  }

  // Snow / Blizzard / Hail
  if (['snow', 'blizzard', 'hail'].includes(w)) {
    const isBlizzard = w === 'blizzard'
    const isHail = w === 'hail'
    
    if (!isHail) {
      if (layer1Ref.value) {
        const s1X = (seed1 * 1500) % 256
        const s1Y = (seed1 * 2500) % 256
        const drift1X = isBlizzard ? -512 : 0
        const dur1 = (isBlizzard ? 3.0 : 18.0) / speedVar
        
        gsap.set(layer1Ref.value, { backgroundPosition: `${s1X}px ${s1Y}px` })
        
        weatherTimeline.to(layer1Ref.value, 
          { 
            backgroundPosition: `${drift1X >= 0 ? '+=' : '-='}${Math.abs(drift1X)}px +=1024px`, 
            duration: dur1, 
            repeat: -1, 
            ease: 'none' 
          }, 
          0
        )

        if (layer2Ref.value && !props.isLowPower) {
          const s2X = (seed2 * 3500) % 192
          const s2Y = (seed2 * 4500) % 192
          const drift2X = isBlizzard ? 768 : 0
          const dur2 = (isBlizzard ? 9.0 : 54.0) / speedVar 
          
          gsap.set(layer2Ref.value, { backgroundPosition: `${s2X}px ${s2Y}px` })

          weatherTimeline.to(layer2Ref.value, 
            { 
              backgroundPosition: `${drift2X >= 0 ? '+=' : '-='}${Math.abs(drift2X)}px +=1536px`, 
              duration: dur2, 
              repeat: -1, 
              ease: 'none' 
            }, 
            0
          )
        }
      }
    } else {
      if (layer1Ref.value) {
        const s1X = (seed1 * 1200) % 128
        const s1Y = (seed1 * 2200) % 128
        applyParallaxLayer(layer1Ref.value, s1X, s1Y, 0, 512, 1.0 / speedVar)
      }

      if (layer2Ref.value && !props.isLowPower) {
        const speedVar2 = 0.9 + (animSeed.value * 0.2)
        const s2X = (seed2 * 2800) % 64
        const s2Y = (seed2 * 3800) % 64
        applyParallaxLayer(layer2Ref.value, s2X, s2Y, 0, 512, 1.5 / speedVar2)
      }
    }
  }

  // Sandstorm / Strong Winds / Dust Storm
  if (['sandstorm', 'strong_winds', 'dust_storm'].includes(w)) {
    const isStrongWind = w === 'strong_winds'
    const isDust = w === 'dust_storm'
    const s1X = (animSeed.value * 1200) % 64
    const s1Y = (animSeed.value * 3400) % 64
    const s2X = (animSeed.value * 2400) % 128
    const s2Y = (animSeed.value * 4800) % 128

    if (dustLayer1Ref.value) {
      const speed1 = (1.0 + animSeed.value * 0.4) * (isStrongWind ? 1.0 : (isDust ? 1.2 : 0.8)) / speedVar
      const driftX = -512
      const isDiagonal = !['strong_winds', 'sandstorm', 'dust_storm'].includes(w)
      const moveY1 = isDiagonal ? 256 : 0
      
      applyParallaxLayer(dustLayer1Ref.value, s1X, s1Y, driftX, moveY1, speed1)

      if (dustLayer2Ref.value && !props.isLowPower) {
        const speed2 = (0.7 + animSeed.value * 0.3) * (isStrongWind ? 0.9 : (isDust ? 1.0 : 0.7)) / speedVar
        
        if (isStrongWind) {
          gsap.set(dustLayer1Ref.value, { backgroundSize: '128px 128px' })
          gsap.set(dustLayer2Ref.value, { backgroundSize: '256px 256px' })
        }

        const moveY2 = isDiagonal ? 512 : 0
        applyParallaxLayer(dustLayer2Ref.value, s2X, s2Y, -1024, moveY2, speed2)
      }
    }
  }
}

const cleanUpAtmosphere = () => {
  if (atmosphereContext) {
    atmosphereContext.revert()
    atmosphereContext = null
  }
  weatherTimeline = null
  lightningTimer = null
  destroyWorker()
}

const initAtmosphere = () => {
  cleanUpAtmosphere()
  
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
  async ([visible, , , perfMode]) => {
    if (visible && !perfMode) {
      await nextTick()
      await nextTick()
      if (props.isVisible && !props.isPerformanceMode) {
        initAtmosphere()
      }
    } else {
      cleanUpAtmosphere()
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

// Leaf animation
const leafTypes = ['wind', 'strong_winds', 'storm']

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
  if (!leafTypes.includes(props.weather) || props.isPerformanceMode || !ctxVal) return
  
  const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
  if (!leafNodes || leafNodes.length === 0) return
  
  const activeLeaves = Array.from(leafNodes) as HTMLElement[]
  
  activeLeaves.forEach((el, i) => {
    const animateLeaf = () => {
      if (atmosphereContext !== ctxVal || ctxVal.reverted) return
      if (!props.isVisible || props.isPerformanceMode || !ctxVal || !leafTypes.includes(props.weather)) return
      
      const s1 = Math.random()
      const s2 = Math.random()
      
      const fromTop = s1 > 0.5
      const startX = fromTop ? (80 + s2 * 40) : 115 
      const startY = fromTop ? -20 : (s2 * 60)
      
      ctxVal.add(() => {
        gsap.set(el, { 
          left: `${startX}%`, 
          top: `${startY}%`, 
          x: 0,
          y: 0,
          opacity: 0.9,
          scale: 0.9 + Math.random() * 1.2,
          rotation: Math.random() * 360
        })

        const seedMod = 0.8 + (animSeed.value * 0.4)
        const isCommonWind = props.weather === 'wind'
        const isStrongWind = props.weather === 'strong_winds'
        const baseDuration = (isCommonWind ? 3.5 : (isStrongWind ? 1.2 : 1.5)) * seedMod
        const speedVariation = (isCommonWind ? 4.0 : (isStrongWind ? 1.0 : 2.0)) * seedMod

        gsap.to(el,
          {
            x: '-350cqw', 
            y: '80cqh',
            rotation: `+=1080`,
            duration: baseDuration + (Math.random() * speedVariation),
            ease: 'none',
            onComplete: () => {
              if (atmosphereContext !== ctxVal || ctxVal.reverted) return
              ctxVal.add(() => {
                gsap.delayedCall(Math.random() * 1.5, animateLeaf)
              })
            }
          }
        )
      })
    }
    
    const isCommonWind = props.weather === 'wind'
    const isStrongWind = props.weather === 'strong_winds'
    const seedMod = 0.8 + (animSeed.value * 0.4)
    const baseDelay = isCommonWind ? 0.8 : (isStrongWind ? 0.3 : 0.4)
    
    ctxVal.add(() => {
      gsap.delayedCall(i * baseDelay * seedMod, animateLeaf)
    })
  })
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
      v-if="!isPerformanceMode && isVisible && weather !== 'clear' && !isLocked"
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
