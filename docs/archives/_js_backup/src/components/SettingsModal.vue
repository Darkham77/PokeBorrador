<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const uiStore = useUIStore()

const currentZoom = computed(() => {
  return Math.round(uiStore.appZoom * 100)
})

const updateZoom = (val) => {
  const zoomVal = val / 100
  uiStore.setZoom(zoomVal)
  
  if (typeof window.updateZoom === 'function') {
    window.updateZoom(val)
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    title="CONFIGURACIÓN"
    title-color="var(--yellow)"
    header-background="Rgba(26, 28, 46, 1)"
    max-width="440px"
    variant="retro"
    @close="emit('close')"
  >
    <div class="settings-container">
      <div class="zoom-section">
        <label class="zoom-label">
          Zoom de la Interfaz: <span class="zoom-value">{{ currentZoom }}%</span>
        </label>
        
        <input 
          type="range" 
          :value="currentZoom" 
          min="50" 
          max="150" 
          step="5"
          class="zoom-slider"
          @input="updateZoom($event.target.value)"
        >
        
        <div class="zoom-labels">
          <span>50%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </div>

      <div class="settings-actions">
        <button 
          class="btn-vicio-primary btn-vicio-full"
          @click.stop="emit('close')"
        >
          GUARDAR Y CERRAR
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.settings-container {
  padding: 8px 16px 16px;
}

.zoom-section {
  margin-bottom: 32px;
}

.zoom-label {
  display: block;
  font-size: 14px;
  color: Var(--white);
  margin-bottom: 20px;
  font-weight: 700;
}

.zoom-value {
  color: Var(--yellow);
  font-weight: 800;
}

.zoom-slider {
  width: 100%;
  height: 12px;
  cursor: pointer;
  accent-color: Var(--yellow);
  margin: 10px 0;
}

.zoom-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.2);
  @include pixelated;
  @include pixelated;
}
</style>
