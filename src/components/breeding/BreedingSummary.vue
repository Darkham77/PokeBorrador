<script setup lang="ts">
import { computed } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { usePlayerClassStore } from '@/stores/playerClass'
import { getGeneticsForecast } from '@/logic/breeding/breedingEngine'
import { COMPAT_TEXT } from '@/data/breeding/breedingConstants'

const breedingStore = useBreedingStore() as any
const classStore = usePlayerClassStore() as any

const forecast = computed(() => {
  if (!breedingStore.isBreeding) return null
  return getGeneticsForecast(
    breedingStore.slots[0].pokemon,
    breedingStore.slots[1].pokemon,
    classStore.activeClass
  ) as any
})

const formatTime = (ms: number | null) => {
  if (!ms) return '--:--'
  const left = Math.max(0, Math.floor((ms - Date.now()) / 1000))
  const m = String(Math.floor(left / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="breeding-summary">
    <div class="compat-section">
      <div
        class="compat-indicator"
        :style="{ color: COMPAT_TEXT[breedingStore.compatibility.level]?.color || 'Rgba(148, 163, 184, 1)' }"
      >
        <div class="compat-label">
          {{ breedingStore.compatibility.label || COMPAT_TEXT[breedingStore.compatibility.level]?.label }}
        </div>
        <div
          v-if="breedingStore.isBreeding"
          class="timer"
        >
          <span class="timer-icon">⏳</span>
          {{ formatTime(breedingStore.nextEggTime) }}
        </div>
      </div>
      <div
        class="heart-fx"
        :class="{ active: breedingStore.isBreeding }"
      >
        ❤️
      </div>
    </div>

    <div
      v-if="breedingStore.isBreeding && forecast"
      class="forecast-card"
    >
      <div class="forecast-header">
        <span class="icon">🧬</span>
        <h4>Pronóstico de Herencia</h4>
      </div>
      
      <div class="forecast-grid">
        <div
          class="forecast-item"
          :class="{ positive: forecast.ivsInherited >= 5 }"
        >
          <span class="label">IVs heredados:</span>
          <span class="value">{{ forecast.ivsInherited }} de 6</span>
        </div>
        
        <div
          class="forecast-item"
          :class="{ active: forecast.natureGuaranteed }"
        >
          <span class="label">Naturaleza:</span>
          <span class="value">{{ forecast.natureGuaranteed ? 'GARANTIZADA' : 'Aleatoria' }}</span>
        </div>

        <div
          class="forecast-item"
          :class="{ active: forecast.masudaActive }"
        >
          <span class="label">Método Masuda:</span>
          <span class="value">{{ forecast.masudaActive ? `ACTIVO (x${forecast.shinyMultiplier})` : 'Inactivo' }}</span>
        </div>

        <div
          class="forecast-item"
          :class="{ positive: forecast.eggMovesCount > 0 }"
        >
          <span class="label">Movimientos Huevo:</span>
          <span class="value">{{ forecast.eggMovesCount > 0 ? 'DETECTADOS ✨' : 'Ninguno' }}</span>
        </div>
      </div>

      <div class="forecast-help">
        <p>ℹ️ Usa Piedra Eterna para la Naturaleza y Lazo Destino para heredar más IVs.</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.breeding-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.compat-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.compat-indicator {
  text-align: center;
  .compat-label {
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .timer {
    @include pixelated;
    font-size: 10px;
    color: $white;
    margin-top: 8px;
  }
}

.heart-fx {
  font-size: 32px;
  opacity: 0.1;
  filter: Grayscale(100%);
  transition: all 0.5s;
  
  &.active {
    opacity: 1;
    filter: Grayscale(0%);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% { transform: Scale(1.0); filter: Drop-Shadow(0 0 0 Rgba(239, 68, 68, 0)); }
  50% { transform: Scale(1.2); filter: Drop-Shadow(0 0 15px Rgba(239, 68, 68, 0.6)); }
  100% { transform: Scale(1.0); filter: Drop-Shadow(0 0 0 Rgba(239, 68, 68, 0)); }
}

.forecast-card {
  background: Rgba(30, 41, 59, 0.7);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid Rgba(139, 92, 246, 0.3);
  box-shadow: 0 10px 30px Rgba(0,0,0,0.2);
  
  .forecast-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid Rgba(255,255,255,0.05);
    
    .icon { font-size: 20px; }
    h4 {
      font-size: 14px;
      font-weight: 800;
      color: $white;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }
}

.forecast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.forecast-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: Rgba(0,0,0,0.2);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s;
  
  .label {
    font-size: 10px;
    color: $muted;
    font-weight: 600;
  }
  
  .value {
    font-size: 12px;
    color: $white;
    font-weight: 700;
  }
  
  &.active {
    border-color: Rgba(139, 92, 246, 0.4);
    background: Rgba(139, 92, 246, 0.05);
    .value { color: Rgba(167, 139, 250, 1); }
  }
  
  &.positive {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.05);
    .value { color: Rgba(74, 222, 128, 1); }
  }
}

.forecast-help {
  padding-top: 12px;
  border-top: 1px dashed Rgba(51, 65, 85, 1);
  p {
    font-size: 11px;
    color: Rgba(148, 163, 184, 1);
    line-height: 1.5;
  }
}
</style>
