<script setup lang="ts">
/**
 * PVSpriteFX.vue
 * Componente centralizado para efectos visuales en sprites de Pokémon.
 * Soporta: Shiny Sparkles, Guardian Aura y es fácilmente extensible.
 */
import { computed, inject, type Ref } from 'vue'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  // Estado base
  isShiny: { type: Boolean, default: false },
  isGuardian: { type: Boolean, default: false },
  
  // Estados Alterados
  status: { type: String, default: null }, 
  isConfused: { type: Boolean, default: false },
  isCursed: { type: Boolean, default: false },
  isSeeded: { type: Boolean, default: false },
  isTrapped: { type: Boolean, default: false },
  attracted: { type: Boolean, default: false },
  isFocusEnergy: { type: Boolean, default: false },
  isProtected: { type: Boolean, default: false },
  isEnduring: { type: Boolean, default: false },
  isLockOn: { type: Boolean, default: false },
  hasReflect: { type: Boolean, default: false },
  hasLightScreen: { type: Boolean, default: false },
  hasSafeguard: { type: Boolean, default: false },
  hasMist: { type: Boolean, default: false },
  
  // Identidad (para re-randomizar efectos al cambiar de bicho)
  pokeId: { type: [String, Number], default: null },

  // Configuración de brillo
  sparkleCount: { type: Number, default: 5 },
  
  // Control de performance
  enabled: { type: Boolean, default: true },

  // Estilo visual
  vibrant: { type: Boolean, default: false },
  
  // Metadata para futuras herramientas de testing/debug
  metadata: { type: Object, default: () => ({}) },
  
  // Fuerza modo simplificado para siluetas
  isSilhouette: { type: Boolean, default: false }
})

const uiStore = useUIStore()
const isModalPerformance = inject<Ref<boolean> | null>('isModalPerformanceMode', null)
const forceHighFidelity = inject('forceHighFidelity', false)

const isSimplified = computed(() => {
  // 0. Silhouette forces simplified mode (Hides FX)
  if (props.isSilhouette) return true

  // 0.1 Force High Fidelity (Combat/Special contexts)
  if (forceHighFidelity) return false
  
  // 1. Force off if debug or manual override
  if (!props.enabled || uiStore.isSimplifiedModalsMode) return true
  
  // 2. Logic depends on context (In Modal vs On Map)
  if (isModalPerformance !== null) {
    // Inside a modal: only simplify if this modal is "below" the principal one
    return isModalPerformance.value
  } else {
    // On the map: simplify if ANY obscuring modal is open
    return uiStore.isAnyBlockingModalOpen
  }
})

// Generar una semilla aleatoria para desincronizar animaciones
const animSeed = Math.random()

const wrapperClasses = computed(() => ({
  'pv-fx-wrapper': true,
  'is-vibrant': props.vibrant && !isSimplified.value,
  'is-simplified': isSimplified.value,
  [`status-${props.status}`]: !!props.status && !isSimplified.value,
  'is-confused': props.isConfused && !isSimplified.value,
  'is-cursed': props.isCursed && !isSimplified.value,
  'is-seeded': props.isSeeded && !isSimplified.value,
  'is-trapped': props.isTrapped && !isSimplified.value,
  'is-focus-energy': props.isFocusEnergy && !isSimplified.value,
  'is-protected': props.isProtected && !isSimplified.value,
  'is-enduring': props.isEnduring && !isSimplified.value,
  'is-lock-on': props.isLockOn && !isSimplified.value
}))

const statusEmoji = computed(() => {
  const map: Record<string, string> = {
    burn: '🔥',
    poison: '☠️',
    sleep: '💤',
    paralyze: '⚡',
    freeze: '🧊'
  }
  return (map as any)[props.status as string] || null
})

// Generar partículas con posiciones y órbitas aleatorias para que no salgan todas del centro
const particles = computed(() => {
  if (!statusEmoji.value) return []
  
  // Incluimos pokeId para re-randomizar si cambia el bicho aunque mantenga el estado
  if (props.pokeId) {}
  
  return Array.from({ length: 3 }).map((_, i) => ({
    id: i,
    top: `${20 + Math.random() * 60}%`,
    left: `${20 + Math.random() * 60}%`,
    orbitX: `${(Math.random() - 0.5) * 80}px`,
    orbitY: `${-40 - Math.random() * 60}px`, // Forzamos movimiento hacia ARRIBA (negativo)
    delay: `${i * 0.6}s`
  }))
})
</script>

<template>
  <div 
    :class="wrapperClasses"
    :style="{ '--fx-seed': animSeed }"
  >
    <!-- Capa de Sprite con efectos persistentes (Aura Guardian) -->
    <div 
      class="pv-fx-sprite-layer"
      :class="{ 
        'is-guardian': isGuardian && !isSimplified,
        'is-vibrant': vibrant && !isSimplified 
      }"
    >
      <slot />
    </div>

    <!-- Capa de Brillos (Shiny) -->
    <div
      v-if="isShiny && !isSimplified"
      class="pv-fx-shiny-overlay"
      data-fx-type="shiny"
    >
      <div
        v-for="i in sparkleCount"
        :key="i"
        class="sparkle"
      />
    </div>

    <!-- Capa de Partículas de Estado -->
    <div 
      v-if="statusEmoji && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span 
        v-for="p in particles" 
        :key="p.id" 
        class="status-particle"
        :class="{ 'is-freeze': status === 'freeze' }"
        :style="{
          top: p.top,
          left: p.left,
          '--orbit-x': p.orbitX,
          '--orbit-y': p.orbitY,
          'animation-delay': p.delay
        }"
      >
        {{ status === 'freeze' ? '' : statusEmoji }}
      </span>
    </div>

    <div
      v-if="(isConfused || isCursed) && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span
        v-if="isConfused"
        class="status-particle"
        style="top: 10%; left: 50%; --orbit-x: 0; --orbit-y: -20px; animation-duration: 0.8s; font-size: 40px;"
      >💫</span>
      <span
        v-if="isCursed"
        class="status-particle"
        style="top: 20%; left: 80%; --orbit-x: 10px; --orbit-y: -50px; animation-duration: 3s; font-size: 24px;"
      >👻</span>
    </div>

    <!-- Capa de Atracción -->
    <div
      v-if="props.attracted && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span
        v-for="i in 2"
        :key="'attr-'+i"
        class="status-particle"
        :style="{ top: '40%', left: i === 1 ? '30%' : '70%', '--orbit-x': '0', '--orbit-y': '-60px', 'animation-delay': i * 0.5 + 's' }"
      >❤️</span>
    </div>

    <div
      v-if="(isSeeded || isTrapped) && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <template v-if="isSeeded">
        <span
          v-for="i in 3"
          :key="'seed-'+i"
          class="status-particle"
          :style="{ top: '60%', left: (20 + i * 20) + '%', '--orbit-x': '0', '--orbit-y': '-40px', 'animation-delay': i * 0.3 + 's' }"
        >🌱</span>
      </template>
      <template v-if="isTrapped">
        <span
          v-for="i in 2"
          :key="'trap-'+i"
          class="status-particle"
          :style="{ 
            top: '70%', 
            left: i === 1 ? '15%' : '85%', 
            '--orbit-x': i === 1 ? '5px' : '-5px', 
            '--orbit-y': '-15px', 
            animation: 'status-particle-jitter 0.1s infinite',
            opacity: 1 
          }"
        >⛓️</span>
      </template>
    </div>

    <!-- Capa de Combate Táctico (Protección, Aguante, Foco, Lock-On) -->
    <div
      v-if="(isProtected || isEnduring || isFocusEnergy || isLockOn) && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span
        v-if="isProtected"
        class="status-particle tact-fx"
        style="top: 40%; left: 50%; animation: fx-pulse-in 1s infinite; opacity: 1;"
      >🛡️</span>
      <span
        v-if="isEnduring"
        class="status-particle tact-fx"
        style="top: 30%; left: 20%; animation: fx-pop-in 0.5s forwards; opacity: 1;"
      >👊</span>
      <span
        v-if="isFocusEnergy"
        class="status-particle tact-fx"
        style="top: 20%; left: 50%; animation: fx-target-spin 2s infinite linear; opacity: 1;"
      >🎯</span>
      <span
        v-if="isLockOn"
        class="status-particle tact-fx"
        style="top: 50%; left: 50%; animation: fx-eye-blink 2s infinite; opacity: 1;"
      >👁️</span>
    </div>

    <!-- Capas de Pantallas (Screens) -->
    <div
      v-if="hasReflect && !isSimplified"
      class="pv-fx-screen-overlay reflect"
    />
    <div
      v-if="hasLightScreen && !isSimplified"
      class="pv-fx-screen-overlay light-screen"
    />

    <!-- Capas de Aura (Safeguard / Mist) -->
    <div
      v-if="hasSafeguard && !isSimplified"
      class="pv-fx-aura-overlay safeguard"
    />
    <div
      v-if="hasMist && !isSimplified"
      class="pv-fx-aura-overlay mist"
    />

    <!-- Espacio para futuras capas de efectos (ej. Veneno, Quemadura, etc) -->
    <slot name="overlay" />
  </div>
</template>

<style scoped lang="scss">
// Los estilos base vienen del core/fx.scss
// Aquí solo añadimos ajustes específicos de layout si fuera necesario
.pv-fx-wrapper {
  // Aseguramos que el contenedor no rompa el layout del padre
  width: fit-content;
  height: fit-content;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv-fx-screen-overlay {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  z-index: var(--z-base);
  border-radius: 50%;
  opacity: 0.6;
  animation: screen-pulse 2s infinite ease-in-out;
  mix-blend-mode: color-dodge;
  
  &.reflect {
    background: Radial-Gradient(circle, Transparent 40%, #ff8c00 100%);
    border: 2px solid #ff8c00;
  }
  
  &.light-screen {
    background: Radial-Gradient(circle, Transparent 40%, $coin-gold 100%);
    border: 2px solid $coin-gold;
  }
}

.pv-fx-aura-overlay {
  position: absolute;
  inset: -5%;
  pointer-events: none;
  z-index: var(--z-base);
  border-radius: 40%;
  opacity: 0.4;
  animation: aura-drift 4s infinite ease-in-out;
  
  &.safeguard {
    background: Radial-Gradient(circle, #50fa7b 0%, Transparent 70%);
    mix-blend-mode: screen;
  }
  
  &.mist {
    background: Radial-Gradient(circle, #e0f7fa 20%, Transparent 80%);
    opacity: 0.8;
    animation: mist-drift 4s infinite linear;
  }
}

@keyframes screen-pulse {
  0%, 100% { transform: Scale(1); opacity: 0.3; }
  50% { transform: Scale(1.1); opacity: 0.7; }
}

@keyframes aura-drift {
  0%, 100% { transform: Translate(0, 0) Scale(1); }
  50% { transform: Translate(2px, -2px) Scale(1.05); }
}

@keyframes mist-drift {
  0% { transform: Translate(-10px, 0); opacity: 0.4; }
  50% { transform: Translate(10px, -5px); opacity: 0.8; }
  100% { transform: Translate(-10px, 0); opacity: 0.4; }
}
</style>
