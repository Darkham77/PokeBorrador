<script setup lang="ts">
/**
 * src/components/map/ContinentStudioControls.vue
 *
 * REACTIVE CONTROL PANEL FOR REGIONAL PROCEDURAL CONTINENT STUDIO
 *
 * Enforces:
 *   - 250ms debounce on sliders via Pinia store.
 *   - 3-Way display mode toggle: 'tiles_only' | 'hybrid' | 'pokégear'.
 *   - Dimension presets (64x64, 128x128, 256x256).
 */

import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';

const store = useRegionalContinentStudioStore();

function handleSliderChange(): void {
  store.triggerRegenerationDebounced(250);
}
</script>

<template>
  <aside class="continent-studio-controls">
    <header class="controls-header">
      <div class="header-title">
        <span class="icon">🧭</span>
        <h2>Generador Regional</h2>
      </div>
      <div
        id="status-continent-generator"
        class="status-indicator"
        :class="{ 'is-loading': store.isGenerating }"
      >
        <span class="dot" />
        <span class="text">{{ store.isGenerating ? 'Generando...' : 'Listo' }}</span>
      </div>
    </header>

    <!-- Visual Display Modes (Directive: Tiles GBA / Híbrido / Pokégear) -->
    <section class="control-section">
      <label class="section-label">Modo de Visualización</label>
      <div class="mode-toggle-group">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: store.displayMode === 'tiles_only' }"
          @click="store.setDisplayMode('tiles_only')"
        >
          Tiles GBA
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: store.displayMode === 'hybrid' }"
          @click="store.setDisplayMode('hybrid')"
        >
          Híbrido
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: store.displayMode === 'pokégear' }"
          @click="store.setDisplayMode('pokégear')"
        >
          Pokégear
        </button>
      </div>
    </section>

    <!-- Map Dimensions & Seed -->
    <section class="control-section">
      <div class="field-row">
        <label for="input-seed">Semilla (Seed)</label>
        <div class="seed-input-wrapper">
          <input
            id="input-seed"
            v-model.number="store.seed"
            type="number"
            class="seed-input"
            @input="handleSliderChange"
          >
          <button
            id="btn-random-seed"
            type="button"
            class="dice-btn"
            title="Generar semilla aleatoria"
            @click="store.randomizeSeed"
          >
            <span class="emoji-inline">🎲</span>
          </button>
        </div>
      </div>

      <div class="field-row">
        <label>Escala de Mapa</label>
        <div class="dimension-preset-group">
          <button
            type="button"
            class="dim-btn"
            :class="{ active: store.mapDimension === 64 }"
            @click="store.mapDimension = 64; handleSliderChange()"
          >
            64²
          </button>
          <button
            type="button"
            class="dim-btn"
            :class="{ active: store.mapDimension === 128 }"
            @click="store.mapDimension = 128; handleSliderChange()"
          >
            128²
          </button>
          <button
            type="button"
            class="dim-btn"
            :class="{ active: store.mapDimension === 256 }"
            @click="store.mapDimension = 256; handleSliderChange()"
          >
            256²
          </button>
          <button
            type="button"
            class="dim-btn"
            :class="{ active: store.mapDimension === 400 }"
            @click="store.mapDimension = 400; handleSliderChange()"
          >
            400²
          </button>
        </div>
      </div>
    </section>

    <!-- Topography Sliders with 250ms Debounce -->
    <section class="control-section">
      <label class="section-label">Parámetros de Terreno</label>

      <div class="slider-field">
        <div class="slider-info">
          <span>Océano Perimetral</span>
          <span class="value">{{ Math.round(store.oceanWaterPercentage * 100) }}%</span>
        </div>
        <input
          v-model.number="store.oceanWaterPercentage"
          type="range"
          min="0.20"
          max="0.55"
          step="0.01"
          class="range-slider"
          @input="handleSliderChange"
        >
      </div>

      <div class="slider-field">
        <div class="slider-info">
          <span>Cordilleras de Montaña</span>
          <span class="value">{{ Math.round(store.mountainPercentage * 100) }}%</span>
        </div>
        <input
          v-model.number="store.mountainPercentage"
          type="range"
          min="0.10"
          max="0.38"
          step="0.01"
          class="range-slider"
          @input="handleSliderChange"
        >
      </div>

      <div class="slider-field">
        <div class="slider-info">
          <span>Lagos Interiores</span>
          <span class="value">{{ store.lakeCount }}</span>
        </div>
        <input
          v-model.number="store.lakeCount"
          type="range"
          min="0"
          max="8"
          step="1"
          class="range-slider"
          @input="handleSliderChange"
        >
      </div>
    </section>

    <!-- POIs & Route Infrastructure -->
    <section class="control-section">
      <label class="section-label">Red Regional de Asentamientos</label>

      <div class="slider-field">
        <div class="slider-info">
          <span>Densidad de POIs</span>
          <span class="value">{{ store.poiTargetCount }} nodos</span>
        </div>
        <input
          v-model.number="store.poiTargetCount"
          type="range"
          min="10"
          max="26"
          step="1"
          class="range-slider"
          @input="handleSliderChange"
        >
      </div>

      <div class="checkbox-field">
        <label class="checkbox-label">
          <input
            v-model="store.allowBridges"
            type="checkbox"
            @change="handleSliderChange"
          >
          <span>Permitir Puentes sobre Agua</span>
        </label>
      </div>
    </section>

    <!-- Quick Stats -->
    <footer class="controls-footer">
      <div class="stat-pill">
        <span class="lbl">Asentamientos:</span>
        <span class="val">{{ store.pois.length }}</span>
      </div>
      <div class="stat-pill">
        <span class="lbl">Rutas:</span>
        <span class="val">{{ store.routes.length }}</span>
      </div>
      <div class="stat-pill">
        <span class="lbl">Árboles:</span>
        <span class="val">{{ store.wilderness?.trees.length ?? 0 }}</span>
      </div>
    </footer>
  </aside>
</template>

<style scoped lang="scss">
.continent-studio-controls {
  width: 320px;
  background: Rgba(15, 23, 42, 0.94);
  backdrop-filter: Blur(12px);
  border-right: 1px solid Rgba(255, 255, 255, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #f8fafc;
  font-family: inherit;
  overflow-y: auto;
  z-index: calc(var(--z-map-floor) + 10);
}

.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;

    .icon {
      font-size: 1.25rem;
    }

    h2 {
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
      color: #38bdf8;
    }
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 9999px;
    background: Rgba(16, 185, 129, 0.15);
    color: #34d399;

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
    }

    &.is-loading {
      background: Rgba(245, 158, 11, 0.15);
      color: #fbbf24;

      .dot {
        background: #fbbf24;
        animation: pulse 1s infinite alternate;
      }
    }
  }
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .section-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }
}

.mode-toggle-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: Rgba(0, 0, 0, 0.3);
  padding: 3px;
  border-radius: 8px;

  .mode-btn {
    border: none;
    background: transparent;
    color: #94a3b8;
    padding: 6px 4px;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: #ffffff;
    }

    &.active {
      background: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 4px Rgba(0, 0, 0, 0.3);
    }
  }
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.8rem;
    color: #cbd5e1;
  }

  .seed-input-wrapper {
    display: flex;
    gap: 6px;

    .seed-input {
      flex: 1;
      background: Rgba(0, 0, 0, 0.4);
      border: 1px solid Rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #ffffff;
      padding: 6px 10px;
      font-size: 0.85rem;
      font-family: monospace;

      &:focus {
        outline: none;
        border-color: #38bdf8;
      }
    }

    .dice-btn {
      background: Rgba(255, 255, 255, 0.08);
      border: 1px solid Rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 0 10px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s ease;

      &:hover {
        background: Rgba(255, 255, 255, 0.18);
      }
    }
  }

  .dimension-preset-group {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;

    .dim-btn {
      background: Rgba(0, 0, 0, 0.3);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      padding: 5px 0;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: #ffffff;
      }

      &.active {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }
    }
  }
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .slider-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #cbd5e1;

    .value {
      font-weight: 700;
      color: #38bdf8;
      font-family: monospace;
    }
  }

  .range-slider {
    width: 100%;
    accent-color: #0284c7;
    cursor: pointer;
  }
}

.checkbox-field {
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #cbd5e1;
    cursor: pointer;

    input[type='checkbox'] {
      accent-color: #0284c7;
      cursor: pointer;
    }
  }
}

.controls-footer {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  border-top: 1px solid Rgba(255, 255, 255, 0.08);
  padding-top: 12px;

  .stat-pill {
    background: Rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 6px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    .lbl {
      font-size: 0.65rem;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .val {
      font-size: 0.9rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: monospace;
    }
  }
}

@keyframes pulse {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}
</style>
