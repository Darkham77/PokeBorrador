<script setup>
/**
 * PVSpriteFX.vue
 * Componente centralizado para efectos visuales en sprites de Pokémon.
 * Soporta: Shiny Sparkles, Guardian Aura y es fácilmente extensible.
 */
import { computed, inject, ref } from 'vue'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  // Estado base
  isShiny: { type: Boolean, default: false },
  isGuardian: { type: Boolean, default: false },
  
  // Configuración de brillo
  sparkleCount: { type: Number, default: 5 },
  
  // Control de performance
  enabled: { type: Boolean, default: true },
  
  // Metadata para futuras herramientas de testing/debug
  metadata: { type: Object, default: () => ({}) }
})

const uiStore = useUIStore()
const isModalBelow = inject('isModalPerformanceMode', ref(false))

const isSimplified = computed(() => {
  // Desactivado si: 
  // 1. Se pasó enabled: false explícitamente
  // 2. El modal está por debajo de otro
  // 3. El modo debug de modales simplificados está activo
  return !props.enabled || isModalBelow.value || uiStore.isSimplifiedModalsMode
})

// Generar una semilla aleatoria para desincronizar animaciones
const animSeed = Math.random()

const wrapperClasses = computed(() => ({
  'pv-fx-wrapper': true,
  'is-guardian': props.isGuardian && !isSimplified.value,
  'is-simplified': isSimplified.value
}))
</script>

<template>
  <div 
    :class="wrapperClasses"
    :style="{ '--fx-seed': animSeed }"
  >
    <!-- El sprite real se inyecta aquí -->
    <slot />

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
}
</style>
