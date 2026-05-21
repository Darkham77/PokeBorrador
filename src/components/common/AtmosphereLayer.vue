<script setup lang="ts">
// [PureVue-Ignore-Length]
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { gsap } from 'gsap'
import { logger } from '@/logic/utils/logger'

const containerRef = ref<HTMLElement | null>(null)
let atmosphereContext: gsap.Context | null = null

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
const flashRef = ref<HTMLElement | null>(null) // Ref para el flash overlay

// Legacy Shake/Wobble Animation Class removed. Pill animations migrated to GSAP.

// 3. GSAP Orchestrator for Weather Layers
const dustLayer1Ref = ref<HTMLElement | null>(null)
const dustLayer2Ref = ref<HTMLElement | null>(null)
const mistLayerRef = ref<HTMLElement | null>(null)
const mistLayer2Ref = ref<HTMLElement | null>(null)
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
  
  // Formateo estricto para GSAP (evita el bug de '+=-256px' y fallos con '+0px')
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

const initWeatherAnim = () => {
  if (weatherTimeline) weatherTimeline.kill()
  if (lightningTimer) lightningTimer.kill()
  
  // Limpiar y resetear posiciones e asegurar opacidad base
  const allLayers = [
    layer1Ref.value, 
    layer2Ref.value, 
    dustLayer1Ref.value, 
    dustLayer2Ref.value, 
    mistLayerRef.value,
    mistLayer2Ref.value
  ]
  
  allLayers.forEach(layer => {
    if (layer) {
      gsap.killTweensOf(layer)
      gsap.set(layer, { clearProps: 'all' })
      gsap.set(layer, { x: 0, y: 0 }) // La opacidad la controla 100% el SCSS ahora
    }
  })

  if (lightningRef.value) {
    gsap.killTweensOf(lightningRef.value)
    gsap.set(lightningRef.value, { opacity: 0 })
  }
  
  weatherTimeline = gsap.timeline()
  const w = props.weather
  
  // Semillas únicas por capa para desalinear el parallax (Globales)
  const seed1 = animSeed.value
  const seed2 = (animSeed.value * 1.618) % 1
  const speedVar = 0.8 + (animSeed.value * 0.4) // Rango ±20% (0.8 a 1.2)

  if (w === 'clear' || props.isPerformanceMode) return

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
        const ctx = atmosphereContext
        if (!props.isVisible || props.isPerformanceMode || !ctx || !['storm', 'thunderstorm'].includes(props.weather) || !lightningRef.value) return
        
        // Coordenada X al azar cubriendo casi todo el ancho (5% a 95%)
        const x1 = Math.floor(Math.random() * 90) + 5
        const isFlipped = Math.random() > 0.5
        lightningPos.value = { x1, x2: x1 } // x2 es obligatorio en el tipo

        ctx.add(() => {
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
    
    // 1. Snow & Blizzard (Vientos cruzados, baldosas 256/192)
    if (!isHail) {
      if (layer1Ref.value) {
        const s1X = (seed1 * 1500) % 256
        const s1Y = (seed1 * 2500) % 256
        const drift1X = isBlizzard ? -512 : 0
        const dur1 = (isBlizzard ? 3.0 : 18.0) / speedVar // Frontal
        
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
      // 2. Hail (Caída pesada vertical, baldosas 128/64)
      if (layer1Ref.value) {
        const s1X = (seed1 * 1200) % 128
        const s1Y = (seed1 * 2200) % 128
        gsap.set(layer1Ref.value, { backgroundPosition: `${s1X}px ${s1Y}px` })
        
        weatherTimeline.to(layer1Ref.value, {
          backgroundPosition: '0px +=512px',
          duration: 1.0 / speedVar,
          repeat: -1,
          ease: 'none'
        }, 0)
      }

      if (layer2Ref.value && !props.isLowPower) {
        const speedVar = 0.9 + (animSeed.value * 0.2)
        const s2X = (seed2 * 2800) % 64
        const s2Y = (seed2 * 3800) % 64
        gsap.set(layer2Ref.value, { backgroundPosition: `${s2X}px ${s2Y}px` })
        
        weatherTimeline.to(layer2Ref.value, {
          backgroundPosition: '0px +=512px',
          duration: 1.5 / speedVar,
          repeat: -1,
          ease: 'none'
        }, 0)
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

  // Fog / Mist / Wind / Heatwave / Sun / Cold / Coldwave / Intense Sun / Dust Storm
  if (['fog', 'mist', 'wind', 'heatwave', 'sun', 'cold', 'coldwave', 'intense_sun', 'dust_storm'].includes(w)) {
    const target = mistLayerRef.value
    if (target) {
      const hasPulse = ['heatwave', 'coldwave', 'intense_sun'].includes(w)
      const isMist = w === 'mist'
      const isDust = w === 'dust_storm'
      
      // Solo aplicamos pulso de opacidad si no es Tormenta de Polvo (para evitar parpadeo GPU)
      if (!isDust) {
        let baseOpacity = isMist ? 0.4 : (hasPulse ? 0.5 : 0.8)
        let maxOpacity = isMist ? 0.6 : (hasPulse ? 0.9 : 0.85)
        
        // In low power mode, we lose the foreground mist layer.
        // Increase the opacity of the remaining background layer to compensate.
        if (isMist && props.isLowPower) {
          baseOpacity = 0.75
          maxOpacity = 0.9
        }
        
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
      } else {
        // Opacidad constante para T. Polvo para optimizar GPU
        gsap.set(target, { opacity: 0.8 })
      }

      // Animación de desplazamiento (Drift)
      if (['wind', 'fog', 'mist', 'dust_storm'].includes(w)) {
        const isFoggy = ['fog', 'mist'].includes(w);
        const isDust = w === 'dust_storm';
        const moveX = isFoggy ? 512 : -512; // Valor fijo, el CSS voltea
        const moveY = isFoggy ? 512 : 0; // Solo diagonal en niebla/bruma, el resto horizontal
        
        // Variación de velocidad por mapa (Global speedVar ya calculada al inicio)
        const baseDur = isFoggy ? 80 : (isDust ? 3 : 8); // Reducido de 120 a 80 para que la niebla sea más dinámica
        const dur = baseDur / speedVar;

        // Capa 1 (Fondo: Más pequeña, MUCHO más lenta)
        const sX1 = (animSeed.value * 1234) % 256;
        const sY1 = (animSeed.value * 5678) % 256;
        const varDur1 = dur * (2.5 + (animSeed.value * 0.5)); // Más lenta aún para profundidad

        applyParallaxLayer(mistLayerRef.value, sX1, sY1, moveX * 0.3, moveY * 0.3, varDur1)
        
        // Capa 2 (Frente: Más grande, más rápida)
        if (!props.isLowPower) {
          const sX2 = (animSeed.value * 3456) % 512;
          const sY2 = (animSeed.value * 7890) % 512;
          const varDur2 = dur * (0.6 + (animSeed.value * 0.2)); // Más rápida para resaltar el primer plano

          applyParallaxLayer(mistLayer2Ref.value, sX2, sY2, moveX, moveY, varDur2)
        }
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
}

const initAtmosphere = () => {
  logger.debug('AtmosphereLayer', 'initAtmosphere called', {
    weather: props.weather,
    isVisible: props.isVisible,
    isPerformanceMode: props.isPerformanceMode,
    isLowPower: props.isLowPower,
    hasContainer: !!containerRef.value
  })
  cleanUpAtmosphere()
  
  if (!props.isVisible || props.isPerformanceMode || props.isLocked || props.weather === 'clear') {
    return
  }

  atmosphereContext = gsap.context((ctx) => {
    initWeatherAnim()
    initLeafAnim(ctx)
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
  async ([visible, weather, lowPower, perfMode]) => {
    logger.debug('AtmosphereLayer', 'Unified watch triggered', {
      visible,
      weather,
      lowPower,
      perfMode
    })
    if (visible && !perfMode) {
      // Wait twice for DOM to settle and children (leaves v-for) to render
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

// 4. GSAP Leaf Animation
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

const initLeafAnim = (ctx: gsap.Context) => {
  logger.debug('AtmosphereLayer', 'initLeafAnim triggered', {
    weather: props.weather,
    isPerformanceMode: props.isPerformanceMode,
    ctxExists: !!ctx,
    leafCount: leafCount.value
  })
  if (!leafTypes.includes(props.weather) || props.isPerformanceMode || !ctx) return
  
  // [PureVue-Ignore]
  const leafNodes = containerRef.value?.querySelectorAll('.leaf-element')
  logger.debug('AtmosphereLayer', 'leafNodes query result', {
    nodesCount: leafNodes?.length || 0,
    containerExists: !!containerRef.value
  })
  if (!leafNodes || leafNodes.length === 0) return
  
  const activeLeaves = Array.from(leafNodes) as HTMLElement[]
  
  activeLeaves.forEach((el, i) => {
    const animateLeaf = () => {
      if (atmosphereContext !== ctx || ctx.reverted) return
      if (!props.isVisible || props.isPerformanceMode || !ctx || !leafTypes.includes(props.weather)) return
      
      const s1 = Math.random()
      const s2 = Math.random()
      
      const fromTop = s1 > 0.5
      // Ajustamos para que nazcan BIEN fuera de la pantalla (teniendo en cuenta el scaleX(-1) del padre)
      const startX = fromTop ? (80 + s2 * 40) : 115 
      const startY = fromTop ? -20 : (s2 * 60)
      
      ctx.add(() => {
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
              if (atmosphereContext !== ctx || ctx.reverted) return
              ctx.add(() => {
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
    
    ctx.add(() => {
      gsap.delayedCall(i * baseDelay * seedMod, animateLeaf)
    })
  })
}

// Estilos dinámicos para el overlay de clima
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
      <template v-if="['sandstorm', 'strong_winds', 'dust_storm'].includes(weather)">
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

      <!-- El flash se movió arriba con el rayo -->

      <!-- Fog, Mist, Wind, Heatwave, Sun, Cold, Coldwave, Intense Sun -->
      <!-- Capas de Bruma/Niebla (Doble capa para parallax) -->
      <template v-if="['fog', 'mist', 'wind', 'dust_storm'].includes(weather)">
        <div
          ref="mistLayerRef"
          class="mist-layer layer-1"
        />
        <div
          v-if="!isLowPower"
          ref="mistLayer2Ref"
          class="mist-layer layer-2"
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

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;

.dust-only {
  opacity: 0.6 !important; // Aumentado para visibilidad
  filter: Grayscale(0.2) contrast(1.1); // Recuperado parte del color original
  will-change: transform, opacity;
  transform: translate3d(0,0,0);
  z-index: calc(10 * 1);
}

.leaf-element {
  position: absolute;
  width: 8px;
  height: 6px;
  background: linear-gradient(135deg, #4ade80, #166534);
  border-radius: 50% 0 50% 0;
  opacity: 0.8;
  pointer-events: none;
  z-index: calc(var(--z-low) * 1); // Asegurar visibilidad sobre la lluvia
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
  z-index: calc(5 * 1); // Por debajo del rayo (que tiene 10)
  will-change: opacity;
  image-rendering: pixelated;
  pointer-events: none;
}

// Eliminado leaf-fall antiguo para evitar conflictos con GSAP

.atmosphere-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: calc(var(--atmo-z, 0) * 1); 
  overflow: hidden;
  container-type: size; // Permite usar cqw/cqh para las hojas
  contain: layout style paint; // Optimización equilibrada: aisla el renderizado sin forzar buffers rígidos
  backface-visibility: hidden;
}

// Override shared z-index for combat context
// Capas de clima (Niebla, Bruma, Calor)

:deep(.weather-overlay) {
  z-index: calc(var(--atmo-z-final, var(--atmo-z, 0)) * 1) !important;
  transform: scaleX(var(--atmo-dir, 1));
}
</style>
