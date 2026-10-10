<script setup lang="ts">
/**
 * src/components/map/ContinentStudioControls.vue
 *
 * REACTIVE CONTROL PANEL FOR REGIONAL PROCEDURAL CONTINENT STUDIO
 *
 * Enforces:
 *   - 250ms debounce on sliders via Pinia store.
 *   - 3-Way display mode toggle via RegionalDisplayMode.
 *   - Dimension presets (64x64, 128x128, 256x256).
 */

import { computed } from 'vue';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import { SLIDER_DEBOUNCE_DELAY_MS } from '../../config/studioConstants.ts';
import { PERCENT_BASE_MULTIPLIER } from '@/logic/constants/gameplay';

const store = useRegionalContinentStudioStore();

const MAP_DIMENSIONS = [64, 128, 256, 400] as const;

const oceanWaterPercentText = computed(() => `${Math.round(store.oceanWaterPercentage * PERCENT_BASE_MULTIPLIER)}%`);
const mountainPercentText = computed(() => `${Math.round(store.mountainPercentage * PERCENT_BASE_MULTIPLIER)}%`);

function handleSliderChange(): void {
  store.triggerRegenerationDebounced(SLIDER_DEBOUNCE_DELAY_MS);
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
        <span
          v-gsap-loop="{ effect: 'pulse', active: store.isGenerating }"
          class="dot"
        />
        <span class="text">{{ store.isGenerating ? 'Generando...' : 'Listo' }}</span>
      </div>
    </header>

    <!-- Visual Display Modes (Directive: Tiles GBA / Híbrido / Pokégear) -->
    <section class="control-section">
      <label class="section-label">Modo de Visualización</label>
      <div class="mode-toggle-group">
        <button
          id="btn-display-tiles"
          type="button"
          class="mode-btn"
          :class="{ active: store.displayMode === 'tiles_only' }"
          @click="store.setDisplayMode('tiles_only')"
        >
          Tiles GBA
        </button>
        <button
          id="btn-display-hybrid"
          type="button"
          class="mode-btn"
          :class="{ active: store.displayMode === 'hybrid' }"
          @click="store.setDisplayMode('hybrid')"
        >
          Híbrido
        </button>
        <button
          id="btn-display-pokegear"
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
            v-for="dim in MAP_DIMENSIONS"
            :id="'btn-dim-' + dim"
            :key="dim"
            type="button"
            class="dim-btn"
            :class="{ active: store.mapDimension === dim }"
            @click="store.mapDimension = dim; handleSliderChange()"
          >
            {{ dim }}²
          </button>
        </div>
      </div>

      <div class="field-row">
        <label>Presets Canónicos</label>
        <div class="dimension-preset-group">
          <button
            id="btn-preset-kanto"
            type="button"
            class="dim-btn"
            title="Cargar mapa canónico de Kanto"
            @click="store.loadCanonicalPreset('kanto')"
          >
            Kanto
          </button>
          <button
            id="btn-preset-johto"
            type="button"
            class="dim-btn"
            title="Cargar mapa canónico de Johto"
            @click="store.loadCanonicalPreset('johto')"
          >
            Johto
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
          <span class="value">{{ oceanWaterPercentText }}</span>
        </div>
        <input
          id="slider-ocean-water"
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
          <span class="value">{{ mountainPercentText }}</span>
        </div>
        <input
          id="slider-mountain-percent"
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
          id="slider-lake-count"
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
          id="slider-poi-count"
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
            id="check-allow-bridges"
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
  z-index: calc(var(--z-map-floor) + 10);
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  width: 320px;
  padding: 16px;
  background: Rgb(15 23 42 / 94%);
  color: var(--slate-50);
  font-family: inherit;
  backdrop-filter: Blur(12px);
  border-right: 1px solid Rgb(255 255 255 / 10%);
  overflow-y: auto;
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid Rgb(255 255 255 / 8%);
  padding-bottom: 12px;

  .header-title {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .icon {
      font-size: var(--font-20);
    }

    h2 {
      margin: 0;
      color: var(--sky);
      font-size: var(--font-16);
      font-weight: 700;
    }
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;
    padding: 3px 8px;
    border-radius: $radius-full;
    background: Rgb(16 185 129 / 15%);
    color: var(--emerald-400);
    font-size: var(--font-12);

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--emerald-400);
    }

    &.is-loading {
      background: Rgb(245 158 11 / 15%);
      color: var(--amber);

      .dot {
        background: var(--amber);
      }
    }
  }
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;

  .section-label {
    color: var(--slate-400);
    font-size: var(--font-12);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.mode-toggle-group {
  display: grid;
  gap: $spacing-xs;
  grid-template-columns: repeat(3, 1fr);
  padding: 3px;
  border-radius: $radius-lg;
  background: Rgb(0 0 0 / 30%);

  .mode-btn {
    padding: 6px 4px;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: var(--slate-400);
    font-size: var(--font-12);
    font-weight: 600;
    cursor: pointer;

    &:hover {
      color: var(--white);
    }

    &.active {
      background: var(--sky-dark);
      color: var(--white);
      box-shadow: var(--shadow-sm);
    }
  }
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;

  label {
    color: var(--slate-300);
    font-size: var(--font-13);
  }

  .seed-input-wrapper {
    display: flex;
    gap: $spacing-sm-alt;

    .seed-input {
      padding: 6px 10px;
      border: 1px solid Rgb(255 255 255 / 15%);
      border-radius: $radius-md;
      background: Rgb(0 0 0 / 40%);
      color: var(--white);
      font-family: monospace;
      font-size: var(--font-14);
      flex: 1;

      &:focus {
        outline: none;
        border-color: var(--sky);
      }
    }

    .dice-btn {
      padding: 0 10px;
      border: 1px solid Rgb(255 255 255 / 15%);
      border-radius: $radius-md;
      background: Rgb(255 255 255 / 8%);
      font-size: var(--font-16);
      cursor: pointer;

      &:hover {
        background: Rgb(255 255 255 / 18%);
      }
    }
  }

  .dimension-preset-group {
    display: grid;
    gap: $spacing-xs;
    grid-template-columns: repeat(4, 1fr);

    .dim-btn {
      padding: 5px 0;
      border: 1px solid Rgb(255 255 255 / 10%);
      border-radius: $radius-md;
      background: Rgb(0 0 0 / 30%);
      color: var(--slate-400);
      font-size: var(--font-13);
      cursor: pointer;

      &:hover {
        color: var(--white);
      }

      &.active {
        background: var(--sky-dark);
        color: var(--white);
        border-color: var(--sky);
      }
    }
  }
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .slider-info {
    display: flex;
    justify-content: space-between;
    color: var(--slate-300);
    font-size: var(--font-13);

    .value {
      color: var(--sky);
      font-family: monospace;
      font-weight: 700;
    }
  }

  .range-slider {
    width: 100%;
    accent-color: var(--sky-dark);
    cursor: pointer;
  }
}

.checkbox-field {
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    color: var(--slate-300);
    font-size: var(--font-13);
    cursor: pointer;

    input[type='checkbox'] {
      accent-color: var(--sky-dark);
      cursor: pointer;
    }
  }
}

.controls-footer {
  display: grid;
  gap: $spacing-sm-alt;
  grid-template-columns: repeat(3, 1fr);
  margin-top: auto;
  border-top: 1px solid Rgb(255 255 255 / 8%);
  padding-top: 12px;

  .stat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-2xs;
    padding: 6px 4px;
    border-radius: $radius-md;
    background: Rgb(0 0 0 / 30%);

    .lbl {
      color: var(--slate-400);
      font-size: var(--font-10);
      text-transform: uppercase;
    }

    .val {
      color: var(--sky);
      font-family: monospace;
      font-size: var(--font-14);
      font-weight: 700;
    }
  }
}
</style>
