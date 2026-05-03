<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  weather: { type: String, default: 'clear' },
  cycle: { type: String, default: 'day' },
  season: { type: String, default: 'spring' },
  isPerformanceMode: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  zIndex: { type: [Number, String], default: 0 },
  seed: { type: Number, default: 0 }
})

// Centralized Seed for Animations (Inheritable)
const animSeed = ref(0.5)
const direction = computed(() => (animSeed.value > 0.5 ? 1 : -1))

watch(() => props.seed, (val) => {
  const base = val || Math.random()
  // Normalizar: si es decimal (0-1) usar tal cual. 
  // Si es entero (hash de ID), dispersar con un multiplicador primo para evitar sesgos
  if (base > 0 && base < 1) {
    animSeed.value = base
  } else {
    const scattered = (base * 1618.033) % 1000 // Usar proporción áurea para dispersar
    animSeed.value = scattered / 1000
  }
}, { immediate: true })

// 1. Atmosphere Filter Logic
const atmosphereStyles = computed(() => {
  const isNight = props.cycle === 'night'
  const isDusk = props.cycle === 'dusk'
  const isMorning = props.cycle === 'morning'

  let brightness = 1.0
  let contrast = 1.0
  let saturate = 1.0
  let hue = 0

  if (isNight) { brightness = 0.6; contrast = 1.1; saturate = 0.8; }
  else if (isDusk) { brightness = 0.8; contrast = 1.2; hue = -10; }
  else if (isMorning) { brightness = 1.1; saturate = 0.9; hue = 5; }

  const w = props.weather
  let wBrightness = 1.0
  let wSaturate = 1.0
  let wContrast = 1.0
  let wHue = 0

  if (w === 'storm') { wBrightness = 0.5; wSaturate = 0.5; wContrast = 1.4; }
  else if (w === 'blizzard') { wBrightness = 0.8; wSaturate = 0.3; wContrast = 1.3; }
  else if (w === 'rain') { wBrightness = 0.8; wSaturate = 0.7; }
  else if (w === 'fog' || w === 'mist') { wBrightness = 0.9; wContrast = 0.8; }
  else if (w === 'sandstorm') { wBrightness = 0.85; wSaturate = 1.2; wContrast = 1.1; }
  else if (w === 'heatwave') { wBrightness = 1.1; wSaturate = 1.3; wContrast = 1.1; }

  // Aplicamos clima sobre el ciclo para el estilo completo
  const finalBrightness = brightness * wBrightness
  const finalSaturate = saturate * wSaturate
  const finalContrast = contrast * wContrast
  const finalHue = hue + wHue

  return {
    filter: `Brightness(${finalBrightness}) Contrast(${finalContrast}) Saturate(${finalSaturate}) hue-rotate(${finalHue}deg)`,
    '--card-seed': animSeed.value,
    '--card-speed': 0.6 + (animSeed.value * 1.0)
  }
})

const weatherOnlyStyles = computed(() => {
  const w = props.weather
  let brightness = 1.0
  let saturate = 1.0
  let contrast = 1.0
  let hue = 0

  if (w === 'storm') { brightness = 0.5; saturate = 0.5; contrast = 1.4; }
  else if (w === 'blizzard') { brightness = 0.8; saturate = 0.3; contrast = 1.3; }
  else if (w === 'rain') { brightness = 0.8; saturate = 0.7; }
  else if (w === 'fog' || w === 'mist') { brightness = 0.9; contrast = 0.8; }
  else if (w === 'sandstorm') { brightness = 0.85; saturate = 1.2; contrast = 1.1; }
  else if (w === 'heatwave') { brightness = 1.1; saturate = 1.3; contrast = 1.1; }

  return {
    filter: `Brightness(${brightness}) Contrast(${contrast}) Saturate(${saturate}) hue-rotate(${hue}deg)`
  }
})

// 2. Shake/Wobble Animation Class
const animClass = computed(() => {
  if (props.isLocked || props.isPerformanceMode) return ''
  const anims = {
    clear: 'anim-glow',
    heatwave: 'anim-glow',
    mist: 'anim-drift',
    fog: 'anim-drift',
    rain: 'anim-shake',
    storm: 'anim-shake'
  }
  return anims[props.weather] || ''
})

// 3. Lightning Randomization
const lightningPos = ref({ x1: 20, x2: 60 })
let lightningInterval = null

function updateLightningPos() {
  const x1 = Math.floor(Math.random() * 60) + 10
  const x2 = x1 + (Math.floor(Math.random() * 20) + 10)
  lightningPos.value = { x1, x2 }
}

watch(() => props.weather, (w) => {
  if (w === 'storm' && !props.isPerformanceMode) {
    if (!lightningInterval) lightningInterval = setInterval(updateLightningPos, 7000)
  } else if (lightningInterval) {
    clearInterval(lightningInterval)
    lightningInterval = null
  }
}, { immediate: true })

onUnmounted(() => {
  if (lightningInterval) clearInterval(lightningInterval)
})

defineExpose({
  atmosphereStyles,
  weatherOnlyStyles,
  animClass
})

const getLeafStyle = (n) => {
  // Use different seeds for different properties to break alignment
  const s1 = Math.abs(Math.sin(animSeed.value * 123.456 + n * 78.910))
  const s2 = Math.abs(Math.cos(animSeed.value * 987.654 + n * 32.109))
  
  const fromSide = s1 > 0.5
  let left
  let top
  
  if (fromSide) {
    left = 105 // Entra por el lado "viento"
    top = s2 * 80 
  } else {
    left = s2 * 100 // Cualquier punto del ancho
    top = -10 // Por arriba
  }

  const delay = s1 * 15 
  const duration = 2.0 + (s2 * 2.5)
  
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `-${delay}s`,
    animationDuration: `${duration}s`,
    '--leaf-rotation': `${s1 * 360}deg`
  }
}

// Estilos dinámicos para el overlay de clima
const weatherOverlayStyles = computed(() => ({
  '--card-seed': animSeed.value,
  '--card-speed': 0.6 + (animSeed.value * 1.0),
  '--atmo-dir': direction.value
}))
</script>

<template>
  <div
    v-if="weather !== 'clear' && !isLocked && !isPerformanceMode"
    class="atmosphere-container"
    :style="{ '--atmo-z': zIndex }"
  >
    <div
      class="weather-overlay"
      :class="[weather, { 'is-performance': isPerformanceMode }]"
      :style="weatherOverlayStyles"
    >
      <!-- Rain & Storm -->
      <template v-if="weather === 'rain' || weather === 'storm'">
        <div class="rain-layer layer-1" />
        <div class="rain-layer layer-2" />
        <div
          v-if="weather === 'storm'"
          class="lightning-bolt"
          :style="{ '--lx1': lightningPos.x1 + '%', '--lx2': lightningPos.x2 + '%' }"
        />
      </template>

      <!-- Snow & Blizzard -->
      <template v-if="weather === 'snow' || weather === 'blizzard'">
        <div class="snow-layer layer-1" />
        <div class="snow-layer layer-2" />
      </template>

      <!-- Sandstorm -->
      <template v-if="weather === 'sandstorm'">
        <div class="sandstorm-layer layer-1" />
        <div class="sandstorm-layer layer-2" />
      </template>

      <!-- Leaves (for Storm effects) -->
      <template v-if="weather === 'storm'">
        <div
          v-for="n in 4"
          :key="'leaf-'+n"
          class="leaf-element"
          :style="getLeafStyle(n)"
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
  // top is now dynamic from inline style
  width: 8px;
  height: 6px;
  background: Linear-Gradient(135deg, #4ade80, #166534);
  border-radius: 50% 0 50% 0;
  opacity: 0.8;
  pointer-events: none;
  z-index: var(--z-low);
  animation: leaf-fall linear infinite;
  filter: Drop-Shadow(0 1px 1px Rgba(0,0,0,0.3));
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
:deep(.weather-overlay) {
  z-index: var(--atmo-z, 0) !important;
  transform: ScaleX(var(--atmo-dir, 1));
}
</style>
