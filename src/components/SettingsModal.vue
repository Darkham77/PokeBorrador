<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const isSettingsOpen = computed({
  get: () => uiStore.isSettingsOpen,
  set: (val) => { uiStore.isSettingsOpen = val }
})

const closeSettings = () => {
  isSettingsOpen.value = false
}

const updateZoom = (val) => {
  if (typeof window.updateZoom === 'function') {
    window.updateZoom(val)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      id="settings-modal"
      class="modal-overlay"
      :class="{ active: isSettingsOpen, open: isSettingsOpen }"
    >
      <div class="modal-content-premium settings-card">
        <div class="modal-scrollable-content">
          <div class="modal-header-row">
            <h2 class="settings-title">
              ⚙️ CONFIGURACIÓN
            </h2>
            <button
              class="modal-close-btn"
              @click="closeSettings"
            >
              ✕
            </button>
          </div>
      
          <div class="settings-group">
            <label class="settings-label">
              Zoom de la Interfaz: <span id="zoom-value">100%</span>
            </label>
            <input
              id="zoom-slider"
              type="range"
              min="50"
              max="150"
              value="100"
              step="5"
              class="zoom-slider"
              @input="updateZoom($event.target.value)"
            >
            <div class="zoom-labels">
              <span>50%</span><span>100%</span><span>150%</span>
            </div>
          </div>

          <button
            class="close-btn-primary"
            @click="closeSettings"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-close-btn {
  background: none;
  border: none;
  color: var(--gray);
  font-size: 24px;
  cursor: pointer;
}

.close-btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, var(--yellow), #f59e0b);
  color: var(--darker);
  border: none;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  font-weight: 900;
}
.close-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4); }

/* New classes from inline cleanup */
.settings-card { width: 100%; max-width: 400px; }
.modal-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.settings-title { font-family: 'Press Start 2P', monospace; font-size: 11px; color: var(--yellow); margin: 0; letter-spacing: 1px; }
.settings-group { margin-bottom: 24px; }
.settings-label { display: block; font-size: 14px; color: var(--text); margin-bottom: 12px; font-weight: 700; }
.zoom-slider { width: 100%; accent-color: var(--yellow); cursor: pointer; }
.zoom-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: var(--gray); font-family: 'Press Start 2P', monospace; }
</style>
