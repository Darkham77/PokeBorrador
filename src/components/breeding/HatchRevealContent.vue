<script setup lang="ts">
/**
 * src/components/breeding/HatchRevealContent.vue
 *
 * Reveal information wrapper with splash text, stats card, and continue button.
 */
import type { Pokemon } from '@/types/pokemon/pokemon';
import HatchStatsCard from './HatchStatsCard.vue';

interface Props {
  pokemon?: Pokemon | null;
}

withDefaults(defineProps<Props>(), {
  pokemon: null
});

defineEmits<{
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div class="reveal-info-wrapper">
    <div class="splash-text">
      ¡Ha nacido un <span class="highlight">{{ pokemon?.name }}</span>!
    </div>

    <!-- Tarjeta Premium de Stats -->
    <HatchStatsCard
      v-if="pokemon"
      :pokemon="pokemon"
    />

    <!-- Botón de Confirmación -->
    <button
      id="hatch-continue-btn"
      class="btn-confirm"
      @click.stop="$emit('confirm')"
    >
      CONTINUAR
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/hatch-animation-modal";
</style>
