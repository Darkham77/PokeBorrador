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
      <div
        class="modal-content-premium"
        style="width:100%;max-width:400px;"
      >
        <div class="modal-scrollable-content">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2 style="font-family:'Press Start 2P',monospace;font-size:11px;color:var(--yellow);margin:0;letter-spacing:1px;">
              ⚙️ CONFIGURACIÓN
            </h2>
            <button
              class="modal-close-btn"
              @click="closeSettings"
            >
              ✕
            </button>
          </div>
      
          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:14px;color:var(--text);margin-bottom:12px;font-weight:700;">
              Zoom de la Interfaz: <span id="zoom-value">100%</span>
            </label>
            <input
              id="zoom-slider"
              type="range"
              min="50"
              max="150"
              value="100"
              step="5"
              style="width:100%;accent-color:var(--yellow);cursor:pointer;"
              @input="updateZoom($event.target.value)"
            >
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--gray);font-family:'Press Start 2P',monospace;">
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
  cursor: pointer;
  font-weight: 900;
}
</style>
