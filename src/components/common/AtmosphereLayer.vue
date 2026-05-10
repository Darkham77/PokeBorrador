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
    heatwave: 'anim-glow',
    mist: 'anim-drift',
    fog: 'anim-drift',
    rain: 'anim-shake',
    storm: 'anim-shake'
  }
  return anims[props.weather] || ''
})

// 3. GSAP Orchestrator for Weather Layers
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
  if (layer1Ref.value) {
    gsap.killTweensOf(layer1Ref.value)
    gsap.set(layer1Ref.value, { x: 0, y: 0, opacity: 0.8 })
  }
  if (layer2Ref.value) {
    gsap.killTweensOf(layer2Ref.value)
    gsap.set(layer2Ref.value, { x: 0, y: 0, opacity: 0.5 })
  }
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

  // Sandstorm
  if (w === 'sandstorm') {
    // Desplazamientos iniciales en X e Y para máxima variedad
    const s1X = (animSeed.value * 1200) % 64
    const s1Y = (animSeed.value * 3400) % 64
    const s2X = (animSeed.value * 2400) % 128
    const s2Y = (animSeed.value * 4800) % 128

    if (layer1Ref.value) {
      // Restauramos capa frontal: (0.7s a 1.5s)
      const speed1 = 0.7 + animSeed.value * 0.8
      weatherTimeline.fromTo(layer1Ref.value,
        { backgroundPosition: `${s1X}px ${s1Y}px` },
        {
          backgroundPosition: `${s1X - 256}px ${s1Y + 256}px`, 
          duration: speed1,
          repeat: -1,
          ease: 'none'
        },
        0
      )

      if (layer2Ref.value) {
        // Aceleramos la capa de fondo: (x1.1 a x1.5 de L1) para que sea más activa
        const seed2 = (animSeed.value * 1.618) % 1
        const speed2 = speed1 * (1.1 + seed2 * 0.4)
        weatherTimeline.fromTo(layer2Ref.value,
          { backgroundPosition: `${s2X}px ${s2Y}px` },
          {
            backgroundPosition: `${s2X - 128}px ${s2Y + 128}px`,
            duration: speed2,
            repeat: -1,
            ease: 'none'
          },
          0
        )
      }
    }
  }

  // Fog / Mist / Heatwave
  if (w === 'fog' || w === 'mist' || w === 'heatwave') {
    const target = layer1Ref.value
    if (target) {
      // Efecto basado en gradientes y sombras (sin textura para evitar líneas)

      const baseOpacity = w === 'heatwave' ? 0.5 : 0.7
      const maxOpacity = w === 'heatwave' ? 0.85 : 0.95
      
      weatherTimeline.fromTo(target, 
        { opacity: baseOpacity },
        { 
          opacity: maxOpacity, 
          duration: 2 + animSeed.value * 2, 
          repeat: -1, 
          yoyo: true, 
          ease: 'sine.inOut' 
        },
        0
      )
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

const initLeafAnim = () => {
  if (props.weather !== 'storm' || props.isPerformanceMode) return
  
  leavesRef.value.forEach((el, i) => {
    if (!el) return
    gsap.killTweensOf(el)
    
    const animateLeaf = () => {
      if (props.weather !== 'storm') return
      
      const s1 = Math.random()
      const s2 = Math.random()
      
      const fromTop = s1 > 0.5
      // Ajustamos para que nazcan BIEN fuera de la pantalla (teniendo en cuenta el ScaleX(-1) del padre)
      const startX = fromTop ? (80 + s2 * 40) : 115 
      const startY = fromTop ? -20 : (s2 * 60)
      
      // Reset inmediato de estado para evitar parpadeos de brillo/opacidad
      gsap.set(el, { 
        left: `${startX}%`, 
        top: `${startY}%`, 
        x: 0,
        y: 0,
        opacity: 0.9,
        rotation: Math.random() * 360,
        filter: 'Drop-Shadow(0 2px 2px Rgba(0,0,0,0.4))'
      })

      gsap.to(el,
        {
          x: '-140cqw', 
          y: '100cqh',
          rotation: `+=1080`,
          duration: 1.5 + (Math.random() * 2),
          ease: 'none',
          onComplete: () => {
            gsap.delayedCall(Math.random() * 1.5, animateLeaf)
          }
        }
      )
    }
    
    gsap.delayedCall(i * 0.6, animateLeaf)
  })
}

watch(() => props.weather, (w) => {
  if (w === 'storm') {
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

      <!-- Sandstorm -->
      <template v-if="weather === 'sandstorm'">
        <div
          ref="layer1Ref"
          class="sandstorm-layer layer-1"
        />
        <div
          ref="layer2Ref"
          class="sandstorm-layer layer-2"
        />
      </template>

      <!-- Lightning Flash Overlay (High Performance) -->
      <div 
        v-if="weather === 'storm'" 
        ref="flashRef" 
        class="lightning-flash-overlay" 
      />

      <!-- Fog, Mist & Heatwave -->
      <template v-if="weather === 'fog' || weather === 'mist' || weather === 'heatwave'">
        <div
          ref="layer1Ref"
          class="mist-layer"
        />
      </template>
      
      <!-- Leaves (for Storm effects) -->
      <template v-if="weather === 'storm'">
        <div
          v-for="n in 4"
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

.leaf-element {
  position: absolute;
  width: 8px;
  height: 6px;
  background: Linear-Gradient(135deg, #4ade80, #166534);
  border-radius: 50% 0 50% 0;
  opacity: 0.8;
  pointer-events: none;
  z-index: 50; // Asegurar visibilidad sobre la lluvia
  will-change: transform, opacity;
  transform: translate3d(0,0,0); // GPU Promotion
  filter: Drop-Shadow(0 1px 1px Rgba(0,0,0,0.3)); // Brillo original
}

// Estilos delegados a _map-card-weather.scss

.lightning-flash-overlay {
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
  z-index: 100;
  pointer-events: none;
  will-change: opacity;
  transform: translate3d(0,0,0);
}

@keyframes leaf-fall {
  0% { transform: Translate(0, 0) Rotate(var(--leaf-rotation, 0deg)); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: Translate(-130cqw, 70cqh) Rotate(calc(var(--leaf-rotation, 0deg) + 1080deg)); opacity: 0; }
}

.atmosphere-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--atmo-z, 0); 
  overflow: hidden;
  container-type: size; // Permite usar cqw/cqh para las hojas
}

// Override shared z-index for combat context
// Capas de clima (Niebla, Bruma, Calor)

:deep(.weather-overlay) {
  z-index: var(--atmo-z, 0) !important;
  transform: ScaleX(var(--atmo-dir, 1));
}
</style>
