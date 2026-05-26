<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUIStore()

const currentZoom = computed(() => {
  return Math.round(uiStore.appZoom * 100)
})

const updateZoom = (val: number) => {
  const zoomVal = val / 100
  uiStore.setZoom(zoomVal)
  
  const win = window as unknown as { updateZoom?: (v: number) => void }
  if (typeof win.updateZoom === 'function') {
    win.updateZoom(val)
  }
}

const handleZoomInput = (e: Event) => {
  if (e.target) {
    updateZoom(Number((e.target as HTMLInputElement).value))
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
          @input="handleZoomInput"
        >
        
        <div class="zoom-labels">
          <span>50%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </div>

      <div class="setting-section">
        <label class="setting-label">
          Modo Bajo Consumo:
        </label>
        <div class="power-buttons">
          <button 
            type="button"
            class="power-btn" 
            :class="{ active: uiStore.lowPowerMode === 'auto' }"
            @click="uiStore.setLowPowerMode('auto')"
          >
            AUTO
          </button>
          <button 
            type="button"
            class="power-btn" 
            :class="{ active: uiStore.lowPowerMode === 'enabled' }"
            @click="uiStore.setLowPowerMode('enabled')"
          >
            ACTIVADO
          </button>
          <button 
            type="button"
            class="power-btn" 
            :class="{ active: uiStore.lowPowerMode === 'disabled' }"
            @click="uiStore.setLowPowerMode('disabled')"
          >
            DESACTIVADO
          </button>
        </div>
        <p class="power-desc">
          <span v-if="uiStore.lowPowerMode === 'auto'">
            Activo automáticamente si el ancho de pantalla es menor a 768px (Móviles).
          </span>
          <span v-else-if="uiStore.lowPowerMode === 'enabled'">
            Optimización forzada (Reduce resolución y simplifica efectos visuales).
          </span>
          <span v-else>
            Efectos visuales y resolución completa en todas las pantallas.
          </span>
        </p>
      </div>

      <div class="setting-section">
        <label class="setting-label">
          Ocultar Pokémon en Mapa:
        </label>
        <div class="power-buttons">
          <button 
            type="button"
            class="power-btn" 
            :class="{ active: uiStore.hideMapPokemon }"
            @click="uiStore.setHideMapPokemon(true)"
          >
            ACTIVADO
          </button>
          <button 
            type="button"
            class="power-btn" 
            :class="{ active: !uiStore.hideMapPokemon }"
            @click="uiStore.setHideMapPokemon(false)"
          >
            DESACTIVADO
          </button>
        </div>
        <p class="power-desc">
          <span v-if="uiStore.hideMapPokemon">
            Oculta los Pokémon salvajes del mapa. Solo podrás verlos en el reporte de encuentros (botón Poké Ball).
          </span>
          <span v-else>
            Los Pokémon salvajes se muestran directamente sobre el mapa.
          </span>
        </p>
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
  margin-bottom: 24px;
}

.zoom-label {
  display: block;
  font-size: 14px;
  color: var(--white);
  margin-bottom: 20px;
  font-weight: 700;
}

.zoom-value {
  color: var(--yellow);
  font-weight: 800;
}

.zoom-slider {
  width: 100%;
  height: 12px;
  cursor: pointer;
  accent-color: var(--yellow);
  margin: 10px 0;
}

.zoom-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.2);
  @include pixelated;
}

.setting-section {
  margin-bottom: 32px;
}

.setting-label {
  display: block;
  font-size: 14px;
  color: var(--white);
  margin-bottom: 12px;
  font-weight: 700;
}

.power-buttons {
  display: flex;
  gap: 8px;
  width: 100%;
}

.power-btn {
  flex: 1;
  background: Rgba(255, 255, 255, 0.05);
  border: 2px solid Rgba(255, 255, 255, 0.1);
  color: var(--white);
  padding: 8px 4px;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
  @include pixelated;
  

  &:hover {
    background: Rgba(255, 255, 255, 0.1);
    border-color: Rgba(255, 255, 255, 0.2);
  }

  &.active {
    background: var(--yellow);
    border-color: var(--yellow);
    color: #1a1c2e;
    box-shadow: 0 0 8px var(--yellow);
  }
}

.power-desc {
  margin-top: 12px;
  font-size: 9px;
  color: Rgba(255, 255, 255, 0.5);
  line-height: 1.4;
  min-height: 26px;
}
</style>
