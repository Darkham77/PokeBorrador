<script setup lang="ts">
import { computed } from 'vue';
import type { EvolutionStep } from './evolutionTypes';

const props = withDefaults(defineProps<{
  step: EvolutionStep;
  oldName?: string;
  newName?: string;
  isCancelable?: boolean;
}>(), {
  oldName: '',
  newName: '',
  isCancelable: true
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'cancel'): void;
}>();

const isProgressing = computed(() => props.step === 'intro' || props.step === 'flashing');
</script>

<template>
  <div class="evolution-info">
    <p
      v-if="isProgressing"
      class="status-text"
    >
      ¡{{ oldName }} está evolucionando!
    </p>

    <div
      v-if="step === 'cancelled'"
      class="result-text"
    >
      <p class="status-text">
        ¿Eh? ¡{{ oldName }} ha dejado de evolucionar!
      </p>
      <button
        id="btn-evolution-confirm-cancel"
        class="btn-confirm"
        @click.stop="emit('close')"
      >
        CONTINUAR
      </button>
    </div>
    
    <div
      v-if="step === 'final'"
      class="result-text"
    >
      <p>¡{{ oldName }} evolucionó a <span class="highlight">{{ newName }}</span>!</p>
      <button
        id="btn-evolution-confirm"
        class="btn-confirm"
        @click.stop="emit('close')"
      >
        CONTINUAR
      </button>
    </div>

    <!-- Botón de cancelar evolución premium respetando el estándar -->
    <div
      v-if="isProgressing && isCancelable"
      class="cancel-container"
    >
      <button
        id="btn-evolution-cancel"
        class="btn-vicio-secondary"
        @click.stop="emit('cancel')"
      >
        <span class="emoji">❌</span> CANCELAR EVOLUCIÓN
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_evolution-scene.scss" as *;
</style>
