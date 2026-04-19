<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()

const isSettingsOpen = computed({
  get: () => uiStore.isSettingsOpen,
  set: (val) => { uiStore.isSettingsOpen = val }
})

const currentZoom = computed(() => {
  return Math.round(uiStore.appZoom * 100)
})

const toggleSettings = () => {
  uiStore.isSettingsOpen = !uiStore.isSettingsOpen
}

const updateZoom = (val) => {
  const zoomVal = val / 100
  uiStore.setZoom(zoomVal)
  
  // Also call legacy if it exists
  if (typeof window.updateZoom === 'function') {
    window.updateZoom(val)
  }
}
</script>

<template>
  <BaseModal
    :show="isSettingsOpen"
    title="CONFIGURACIÓN"
    max-width="440px"
    custom-class="settings-modal-original"
    padding="standard"
    @close="toggleSettings"
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
          class="close-btn-primary"
          @click="toggleSettings"
        >
          GUARDAR Y CERRAR
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss">
/* We use global selector to override BaseModal styles for this specific class */
.modal-content-premium.settings-modal-original {
  background: #110808 !important;
  border: 2px solid #2a1515 !important;
  border-radius: 32px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9) !important;

  .modal-header-premium {
    border-bottom: none;
    padding: 32px 32px 16px;
  }

  .modal-title-text {
    font-size: 14px;
    color: var(--yellow);
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
  }

  .modal-close-btn-standard {
    color: rgba(255, 255, 255, 0.3);
    font-size: 24px;
  }
}
</style>

<style scoped lang="scss">
.settings-container {
  padding: 8px 16px 16px;
}

.zoom-section {
  margin-bottom: 32px;
}

.zoom-label {
  display: block;
  font-size: 14px;
  color: #fff;
  margin-bottom: 20px;
  font-weight: 700;
  font-family: 'Nunito', sans-serif;
}

.zoom-value {
  color: #fff;
}

.zoom-slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: #333;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  position: relative;

  &::-webkit-slider-runnable-track {
    width: 100%;
    height: 8px;
    background: #333;
    border-radius: 4px;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: var(--yellow);
    border-radius: 50%;
    cursor: pointer;
    margin-top: -6px;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    border: none;
  }
}

/* Chrome/Safari specific logic for yellow progress bar if possible, 
   but standard range is hard to style cross-browser with just CSS.
   Using a simpler solid background for now to match the "clean" look. */

.zoom-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 10px;
  color: #666;
  font-family: 'Press Start 2P', monospace;
}

.close-btn-primary {
  width: 100%;
  padding: 18px;
  background: var(--yellow);
  color: #000;
  border: none;
  border-radius: 18px;
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
