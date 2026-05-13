<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  weather: { type: String, default: 'clear' },
  cycle: { type: String, default: 'day' },
  season: { type: String, default: 'spring' },
  isPerformanceMode: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  zIndex: { type: [Number, String], default: 0 },
  seed: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: false }
})

// Centralized Seed for Animations (Inheritable)
const animSeed = ref(0.5)
const direction = computed(() => (animSeed.value > 0.5 ? 1 : -1))
const flashRef = ref<HTMLElement | null>(null) // Ref para el flash overlay

// 2. Shake/Wobble Animation Class
const animClass = computed(() => {
  if (props.isLocked || props.isPerformanceMode) return ''
  const anims: Record<string, string> = {
    clear: 'anim-glow',
    sun: 'anim-glow',
    heatwave: 'anim-glow',
    cold: 'anim-glow',
    coldwave: 'anim-glow',
    sandstorm: 'anim-glow',
    mist: 'anim-drift',
    fog: 'anim-drift',
    wind: 'anim-drift',
    strong_winds: 'anim-drift',
    rain: 'anim-shake',
    storm: 'anim-shake'
  }
  return anims[props.weather] || ''
})

// 3. GSAP Orchestrator for Weather Layers
const dustLayer1Ref = ref<HTMLElement | null>(null)
const dustLayer2Ref = ref<HTMLElement | null>(null)
const mistLayerRef = ref<HTMLElement | null>(null)
const layer1Ref = ref<HTMLElement | null>(null)
const layer2Ref = ref<HTMLElement | null>(null)
const lightningRef = ref<HTMLElement | null>(null)

const lightningPos = ref({ x1: 20, x2: 60 })
let weatherTimeline: gsap.core.Timeline | null = null
let lightningTimer: gsap.core.Tween | null = null

const initWeatherAnim = () => {
  if (weatherTimeline) weatherTimeline.kill()
  if (lightningTimer) lightningTimer.kill()
  
  // Limpiar y resetear posiciones e asegurar opacidad base
  const allLayers = [layer1Ref.value, layer2Ref.value, dustLayer1Ref.value, dustLayer2Ref.value, mistLayerRef.value]
  
  allLayers.forEach(layer => {
    if (layer) {
      gsap.killTweensOf(layer)
      gsap.set(layer, { clearProps: 'all' })
      gsap.set(layer, { x: 0, y: 0, opacity: 0.8 })
    }
  })

  if (lightningRef.value) {
    gsap.killTweensOf(lightningRef.value)
    gsap.set(lightningRef.value, { opacity: 0 })
  }
  
  weatherTimeline = gsap.timeline()

  const w = props.weather
  if (w === 'clear' || props.isPerformanceMode) return

  // Rain / Storm
  if (w === 'rain' || w === 'storm') {
    const isStorm = w === 'storm'
    
    // Separamos totalmente las velocidades para evitar que la tormenta sea "infinita"
    let variantSpeed1, variantSpeed2;
    
    if (isStorm) {
      // Tormenta: Rango agresivo de 0.65s a 1.25s para notar la diferencia
      const stormBase = 0.65
      variantSpeed1 = stormBase + (animSeed.value * 0.6)
      variantSpeed2 = variantSpeed1 * 1.4
    } else {
      // Lluvia Normal: Velocidad mínima aumentada (duración 0.4s a 0.8s)
      const rainBase = 0.4
      variantSpeed1 = rainBase + (animSeed.value * 0.4) 
      variantSpeed2 = variantSpeed1 * 1.6
    }
    
    // Desplazamientos iniciales deterministas basados en la semilla para romper la simetría
    const start1X = (animSeed.value * 1234) % 256
    const start1Y = (animSeed.value * 5678) % 256
    const start2X = (animSeed.value * 9101) % 197
    const start2Y = (animSeed.value * 1121) % 197

    if (layer1Ref.value) {
      const driftX = isStorm ? -256 : 0
      weatherTimeline.fromTo(layer1Ref.value, 
        { backgroundPosition: `${start1X}px ${start1Y}px` },
        {
          backgroundPosition: `${start1X + driftX}px ${start1Y + 256}px`,
          duration: variantSpeed1,
          repeat: -1,
          ease: 'none'
        },
        0
      )
    }
    if (layer2Ref.value) {
      const size = isStorm ? 128 : 197
      const driftX = isStorm ? -size : 0
      weatherTimeline.fromTo(layer2Ref.value,
        { backgroundPosition: `${start2X}px ${start2Y}px` },
        {
          backgroundPosition: `${start2X + driftX}px ${start2Y + size}px`,
          duration: variantSpeed2,
          repeat: -1,
          ease: 'none'
        },
        0
      )
    }

    if (isStorm) {
      // Lightning logic
      const strike = () => {
        if (props.weather !== 'storm' || !lightningRef.value) return
        
        const x1 = Math.floor(Math.random() * 60) + 10
        const x2 = x1 + (Math.floor(Math.random() * 20) + 10)
        lightningPos.value = { x1, x2 }

        const tl = gsap.timeline()
        tl.to(lightningRef.value, { opacity: 1, duration: 0.05 })
          .to(lightningRef.value, { opacity: 0, duration: 0.05 })
          .to(lightningRef.value, { opacity: 1, duration: 0.05 })
          .to(lightningRef.value, { opacity: 0, duration: 0.2 })
          
        // Flash de alto rendimiento (solo opacidad en capa GPU)
        if (flashRef.value) {
          gsap.timeline()
            .to(flashRef.value, { opacity: 0.6, duration: 0.05 })
            .to(flashRef.value, { opacity: 0, duration: 0.4, ease: 'power2.out' })
        }

        lightningTimer = gsap.delayedCall(4 + Math.random() * 6, strike)
      }
      lightningTimer = gsap.delayedCall(2 + Math.random() * 3, strike)
    }
  }

  // Snow / Blizzard
  if (w === 'snow' || w === 'blizzard') {
    const isBlizzard = w === 'blizzard'
    // Blizzard ultra-rápida (0.6s a 2s), Nieve dinámica y variada (2.5s a 10s)
    const speed = isBlizzard 
      ? (0.6 + animSeed.value * 1.4) 
      : (2.5 + animSeed.value * 7.5) 
    
    const start1X = (animSeed.value * 1500) % 256
    const start1Y = (animSeed.value * 2500) % 256
    const start2X = (animSeed.value * 3500) % 192
    const start2Y = (animSeed.value * 4500) % 192

    if (layer1Ref.value) {
      weatherTimeline.fromTo(layer1Ref.value,
        { backgroundPosition: `${start1X}px ${start1Y}px` },
        {
          backgroundPosition: `${start1X - 256}px ${start1Y + 256}px`,
          duration: speed,
          repeat: -1,
          ease: 'none'
        },
        0
      )
    }
    if (layer2Ref.value) {
      weatherTimeline.fromTo(layer2Ref.value,
        { backgroundPosition: `${start2X}px ${start2Y}px` },
        {
          backgroundPosition: `${start2X + 192}px ${start2Y + 192}px`,
          duration: speed * 1.5,
          repeat: -1,
          ease: 'none'
        },
        0
      )
    }
  }

  // Sandstorm / Strong Winds (Dust)
  if (w === 'sandstorm' || w === 'strong_winds') {
    const isStrongWind = w === 'strong_winds'
    // Desplazamientos iniciales en X e Y para máxima variedad
    const s1X = (animSeed.value * 1200) % 64
    const s1Y = (animSeed.value * 3400) % 64
    const s2X = (animSeed.value * 2400) % 128
    const s2Y = (animSeed.value * 4800) % 128

    if (dustLayer1Ref.value) {
      // Speed configuration: Strong winds are fast, but not too frantic
      const speed1 = (0.7 + animSeed.value * 0.8) * (isStrongWind ? 1.2 : 1.5)
      weatherTimeline.fromTo(dustLayer1Ref.value,
        { backgroundPosition: `${s1X}px ${s1Y}px` },
        {
          backgroundPosition: `${s1X - 512}px ${s1Y + 64}px`, 
          duration: speed1,
          repeat: -1,
          ease: 'none'
        },
        0
      )

      if (dustLayer2Ref.value) {
        const seed2 = (animSeed.value * 1.618) % 1
        const speed2 = speed1 * (1.1 + seed2 * 0.4)
        
        // Si es viento fuerte, las partículas son pequeñas pero visibles
        if (isStrongWind) {
          gsap.set(dustLayer1Ref.value, { backgroundSize: '64px 64px' })
          gsap.set(dustLayer2Ref.value, { backgroundSize: '128px 128px' })
        }

        weatherTimeline.fromTo(dustLayer2Ref.value,
          { backgroundPosition: `${s2X}px ${s2Y}px` },
          {
            backgroundPosition: `${s2X - 1024}px ${s2Y + 128}px`,
            duration: speed2,
            repeat: -1,
            ease: 'none'
          },
          0
        )
      }
    }
  }

  // Fog / Mist / Wind / Heatwave / Cold / Coldwave
  if (['fog', 'mist', 'wind', 'strong_winds', 'heatwave', 'sun', 'cold', 'coldwave'].includes(w)) {
    const target = mistLayerRef.value
    if (target) {
      // Heatwave / Coldwave / Strong Winds tienen pulso activo
      const hasPulse = ['heatwave', 'coldwave', 'strong_winds'].includes(w)
      const baseOpacity = hasPulse ? 0.5 : 0.8
      const maxOpacity = hasPulse ? 0.9 : 0.85
      
      weatherTimeline.fromTo(target, 
        { opacity: baseOpacity },
        { 
          opacity: maxOpacity, 
          duration: hasPulse ? (1.5 + animSeed.value) : 5, 
          repeat: -1, 
          yoyo: true, 
          ease: hasPulse ? 'sine.inOut' : 'none' 
        },
        0
      )

      // Si es viento, añadimos un drift horizontal suave
      if (w === 'wind' || w === 'strong_winds') {
        weatherTimeline.to(target, {
          backgroundPosition: `${direction.value * 512}px 0px`,
          duration: w === 'strong_winds' ? 2 : 8,
          repeat: -1,
          ease: 'none'
        }, 0)
      }
    }
  }
}
watch(() => props.isVisible, async (visible) => {
  if (visible) {
    await nextTick()
    initWeatherAnim()
    initLeafAnim()
  } else {
    if (weatherTimeline) weatherTimeline.kill()
    if (lightningTimer) lightningTimer.kill()
    if (layer1Ref.value) gsap.killTweensOf(layer1Ref.value)
    if (layer2Ref.value) gsap.killTweensOf(layer2Ref.value)
  }
})

watch(() => props.weather, async () => {
  if (props.isVisible && !props.isPerformanceMode) {
    await nextTick()
    initWeatherAnim()
    initLeafAnim()
  }
})

watch(() => props.isPerformanceMode, async (isPaused) => {
  if (!isPaused && props.isVisible) {
    // Doble tick para asegurar que v-if en el template ha re-montado los elementos
    await nextTick()
    await nextTick()
    initWeatherAnim()
    initLeafAnim()
  } else if (isPaused) {
    if (weatherTimeline) weatherTimeline.pause()
    if (lightningTimer) lightningTimer.pause()
  }
})

onMounted(async () => {
  if (props.isVisible) {
    await nextTick()
    initWeatherAnim()
    initLeafAnim()
  }
})

onUnmounted(() => {
  if (weatherTimeline) weatherTimeline.kill()
  if (lightningTimer) lightningTimer.kill()
  leavesRef.value.forEach(el => gsap.killTweensOf(el))
})

defineExpose({
  animClass
})

// 4. GSAP Leaf Animation
const leavesRef = ref<HTMLElement[]>([])
const leafTypes = ['wind', 'strong_winds', 'storm']

const leafCount = computed(() => {
  if (['storm', 'strong_winds', 'blizzard'].includes(props.weather)) return 15
  if (['wind'].includes(props.weather)) return 8
  return 0
})

const initLeafAnim = () => {
  if (!leafTypes.includes(props.weather) || props.isPerformanceMode) return
  
  leavesRef.value.forEach((el, i) => {
    if (!el) return
    gsap.killTweensOf(el)
    
    const animateLeaf = () => {
      if (!leafTypes.includes(props.weather)) return
      
      const s1 = Math.random()
      const s2 = Math.random()
      
      const fromTop = s1 > 0.5
      // Ajustamos para que nazcan BIEN fuera de la pantalla (teniendo en cuenta el scaleX(-1) del padre)
      const startX = fromTop ? (80 + s2 * 40) : 115 
      const startY = fromTop ? -20 : (s2 * 60)
      
      // Reset inmediato de estado para evitar parpadeos de brillo/opacidad
      gsap.set(el, { 
        left: `${startX}%`, 
        top: `${startY}%`, 
        x: 0,
        y: 0,
        opacity: 0.9,
        scale: 0.9 + Math.random() * 1.2, // Variación de tamaño entre 0.9x y 2.1x
        rotation: Math.random() * 360
      })

      // Speed configuration: Strong winds are the fastest, common wind is slow
      // We apply a multiplier based on the global animSeed to ensure different maps look unique
      const seedMod = 0.8 + (animSeed.value * 0.4) // Multiplier between 0.8x and 1.2x
      
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
            gsap.delayedCall(Math.random() * 1.5, animateLeaf)
          }
        }
      )
    }
    
    const isCommonWind = props.weather === 'wind'
    const isStrongWind = props.weather === 'strong_winds'
    const seedMod = 0.8 + (animSeed.value * 0.4)
    const baseDelay = isCommonWind ? 0.8 : (isStrongWind ? 0.3 : 0.4)
    
    gsap.delayedCall(i * baseDelay * seedMod, animateLeaf)
  })
}

watch(() => props.weather, (w) => {
  if (leafTypes.includes(w)) {
    nextTick(initLeafAnim)
  }
}, { immediate: true })

watch(() => props.seed, (val) => {
  if (!val) {
    animSeed.value = Math.random()
  } else {
    // Generador pseudo-aleatorio determinista basado en seno para máxima dispersión
    const x = Math.sin(val) * 10000
    animSeed.value = Math.abs(x - Math.floor(x))
  }
  
  // Reiniciar animaciones con el nuevo seed si somos visibles
  if (props.isVisible) {
    initWeatherAnim()
    initLeafAnim()
  }
}, { immediate: true })

// Estilos dinámicos para el overlay de clima
const weatherOverlayStyles = computed(() => ({
  '--atmo-z-final': props.zIndex ? `calc(${props.zIndex} + 1)` : '1',
  '--card-seed': animSeed.value,
  '--card-speed': 0.6 + (animSeed.value * 1.0),
  '--atmo-dir': direction.value
}))
</script>

<template>
  <div
    ref="containerRef"
    class="atmosphere-container"
  >
    <div
      v-if="!isPerformanceMode && isVisible && weather !== 'clear' && !isLocked"
      class="weather-overlay"
      :class="[weather, props.cycle, { 'is-performance': isPerformanceMode }]"
      :style="weatherOverlayStyles"
    >
      <!-- Rain & Storm -->
      <template v-if="weather === 'rain' || weather === 'storm'">
        <div
          ref="layer1Ref"
          class="rain-layer layer-1"
        />
        <div
          ref="layer2Ref"
          class="rain-layer layer-2"
        />
        <div
          v-if="weather === 'storm'"
          ref="lightningRef"
          class="lightning-bolt"
          :style="{ '--lx1': lightningPos.x1 + '%', '--lx2': lightningPos.x2 + '%' }"
        />
      </template>

      <!-- Snow & Blizzard -->
      <template v-if="weather === 'snow' || weather === 'blizzard'">
        <div
          ref="layer1Ref"
          class="snow-layer layer-1"
        />
        <div
          ref="layer2Ref"
          class="snow-layer layer-2"
        />
      </template>

      <!-- Sandstorm & Strong Winds (Dust Particles) -->
      <template v-if="weather === 'sandstorm' || weather === 'strong_winds'">
        <div
          ref="dustLayer1Ref"
          class="sandstorm-layer layer-1"
          :class="{ 'dust-only': weather === 'strong_winds' }"
        />
        <div
          ref="dustLayer2Ref"
          class="sandstorm-layer layer-2"
          :class="{ 'dust-only': weather === 'strong_winds' }"
        />
      </template>

      <!-- Lightning Flash Overlay (High Performance) -->
      <div 
        v-if="weather === 'storm'" 
        ref="flashRef" 
        class="lightning-flash-overlay" 
      />

      <!-- Fog, Mist, Wind, Heatwave, Sun & Cold -->
      <template v-if="['fog', 'mist', 'wind', 'strong_winds', 'heatwave', 'sun', 'cold', 'coldwave'].includes(weather)">
        <div
          ref="mistLayerRef"
          class="mist-layer"
        />
      </template>
      
      <!-- Leaves (for Wind & Storm effects) -->
      <template v-if="leafTypes.includes(weather)">
        <div
          v-for="n in leafCount"
          :key="'leaf-'+n"
          ref="leavesRef"
          class="leaf-element"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;
@use "@/styles/components/map-card-animations" as *;

.dust-only {
  opacity: 0.6 !important; // Aumentado para visibilidad
  filter: Grayscale(0.2) contrast(1.1); // Recuperado parte del color original
  will-change: transform, opacity;
  transform: translate3d(0,0,0);
  z-index: 10;
}

.leaf-element {
  position: absolute;
  width: 8px;
  height: 6px;
  background: linear-gradient(135deg, #4ade80, #166534);
  border-radius: 50% 0 50% 0;
  opacity: 0.8;
  pointer-events: none;
  z-index: var(--z-low); // Asegurar visibilidad sobre la lluvia
  will-change: transform, opacity;
  transform: translate3d(0,0,0); // GPU Promotion
  // Eliminado Drop-Shadow para optimización GPU
}

// Estilos delegados a _map-card-weather.scss

.lightning-flash-overlay {
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
  z-index: var(--z-modal-step);
  pointer-events: none;
  will-change: opacity;
  transform: translate3d(0,0,0);
}

// Eliminado leaf-fall antiguo para evitar conflictos con GSAP

.atmosphere-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--atmo-z, 0); 
  overflow: hidden;
  container-type: size; // Permite usar cqw/cqh para las hojas
  contain: strict; // Optimización masiva: aisla el renderizado de la atmósfera del resto del DOM
  backface-visibility: hidden;
}

// Override shared z-index for combat context
// Capas de clima (Niebla, Bruma, Calor)

:deep(.weather-overlay) {
  z-index: var(--atmo-z-final, var(--atmo-z, 0)) !important;
  transform: scaleX(var(--atmo-dir, 1));
}
</style>
