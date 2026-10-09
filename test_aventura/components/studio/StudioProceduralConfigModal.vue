<script setup lang="ts">
import { ref, watch } from 'vue';
import { useContinentStudioStore } from '../../stores/continentStudio';
import { CANONICAL_PRESETS } from '../../logic/map/continent/continentPersistence';
import type { CanonicalPresetId, ContinentGenConfig } from '../../types/map/continentTypes';

const store = useContinentStudioStore();

// Local working copy for the modal to allow clean cancel/apply semantics
const localConfig = ref<ContinentGenConfig>(JSON.parse(JSON.stringify(store.activeProject.config)));

watch(
  () => store.showConfigModal,
  (isOpen) => {
    if (isOpen) {
      localConfig.value = JSON.parse(JSON.stringify(store.activeProject.config));
    }
  }
);

function handleRandomSeed(): void {
  localConfig.value = {
    ...localConfig.value,
    seed: Math.floor(Math.random() * 999999)
  };
}

function handleApplyPreset(presetKey: CanonicalPresetId): void {
  const preset = CANONICAL_PRESETS[presetKey];
  localConfig.value = {
    seed: preset.seed,
    dimensions: { ...preset.dimensions },
    cityCount: preset.cityCount,
    biomes: { ...preset.biomes },
    roadWidth: 1,
    presetId: presetKey
  };
}

function handleApplyAndRegenerate(): void {
  store.updateProjectConfig(localConfig.value);
  store.showConfigModal = false;
  if (localConfig.value.presetId === 'kanto') {
    store.loadCanonicalPreset('kanto');
  } else {
    store.generateGeography(false);
  }
}
</script>

<template>
  <div
    v-if="store.showConfigModal"
    id="modal-procedural-config"
    class="modal-backdrop"
    @click.self="store.showConfigModal = false"
  >
    <div class="modal-card">
      <header class="modal-header">
        <div class="flex items-center gap-2">
          <span class="icon text-xl">⚙️</span>
          <h3 class="modal-title">
            Configuración Procedural del Continente
          </h3>
        </div>
        <button
          id="btn-close-config-modal"
          class="btn-close"
          @click="store.showConfigModal = false"
        >
          <span class="emoji-inline">✕</span>
        </button>
      </header>

      <div class="modal-body">
        <!-- Presets Canónicos -->
        <div class="control-group">
          <label class="control-label"><span class="icon">🏛️</span> Presets de Regiones</label>
          <div class="presets-grid">
            <button
              v-for="(p, key) in CANONICAL_PRESETS"
              :key="key"
              type="button"
              class="btn-preset"
              :class="{ active: localConfig.presetId === key }"
              @click="handleApplyPreset(key)"
            >
              <span class="preset-name">{{ p.name }}</span>
              <span class="preset-meta">{{ p.dimensions.width }}×{{ p.dimensions.height }}px | {{ p.cityCount }} Ciudades</span>
            </button>
          </div>
        </div>

        <!-- Semilla Procedural -->
        <div class="control-group">
          <label class="control-label"><span class="icon">🎲</span> Semilla</label>
          <div class="seed-row">
            <input
              v-model.number="localConfig.seed"
              type="number"
              class="input-field"
            >
            <button
              type="button"
              class="btn-dice"
              title="Aleatorizar semilla"
              @click="handleRandomSeed"
            >
              <span class="btn-emoji">🎲</span>
            </button>
          </div>
        </div>

        <!-- Dimensiones del Continente -->
        <div class="control-group">
          <label class="control-label"><span class="icon">📐</span> Dimensiones (Ancho × Alto px)</label>
          <div class="flex gap-2">
            <input
              v-model.number="localConfig.dimensions.width"
              type="number"
              step="100"
              min="1000"
              max="8000"
              class="input-field"
              placeholder="Ancho px"
            >
            <span class="self-center">×</span>
            <input
              v-model.number="localConfig.dimensions.height"
              type="number"
              step="100"
              min="1000"
              max="8000"
              class="input-field"
              placeholder="Alto px"
            >
          </div>
        </div>

        <!-- Cantidad de Ciudades -->
        <div class="control-group">
          <div class="label-row">
            <label class="control-label"><span class="icon">🏙️</span> Cantidad de Ciudades / Pueblos</label>
            <span class="value-badge">{{ localConfig.cityCount }}</span>
          </div>
          <input
            v-model.number="localConfig.cityCount"
            type="range"
            min="2"
            max="30"
            step="1"
            class="slider"
          >
        </div>

        <div class="separator-line" />

        <!-- Biomas Sliders -->
        <h4 class="biomes-title">
          Distribución de Biomas
        </h4>

        <div class="control-group">
          <div class="label-row">
            <label class="control-label"><span class="icon">🌊</span> Cobertura de Océano y Lagos</label>
            <span class="value-badge">{{ localConfig.biomes.waterPercent }}%</span>
          </div>
          <input
            v-model.number="localConfig.biomes.waterPercent"
            type="range"
            min="0"
            max="100"
            class="slider"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <label class="control-label"><span class="icon">🏖️</span> Cobertura de Playas y Costas</label>
            <span class="value-badge">{{ localConfig.biomes.beachPercent }}%</span>
          </div>
          <input
            v-model.number="localConfig.biomes.beachPercent"
            type="range"
            min="0"
            max="100"
            class="slider"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <label class="control-label"><span class="icon">🌲</span> Cobertura de Bosques</label>
            <span class="value-badge">{{ localConfig.biomes.forestPercent }}%</span>
          </div>
          <input
            v-model.number="localConfig.biomes.forestPercent"
            type="range"
            min="0"
            max="100"
            class="slider"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <label class="control-label"><span class="icon">⛰️</span> Cobertura de Montañas</label>
            <span class="value-badge">{{ localConfig.biomes.mountainPercent }}%</span>
          </div>
          <input
            v-model.number="localConfig.biomes.mountainPercent"
            type="range"
            min="0"
            max="100"
            class="slider"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <label class="control-label"><span class="icon">❄️</span> Cobertura de Nieve y Glaciares</label>
            <span class="value-badge">{{ localConfig.biomes.snowPercent }}%</span>
          </div>
          <input
            v-model.number="localConfig.biomes.snowPercent"
            type="range"
            min="0"
            max="100"
            class="slider"
          >
        </div>
      </div>

      <footer class="modal-footer">
        <button
          type="button"
          class="btn-secondary"
          @click="store.showConfigModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn-primary"
          @click="handleApplyAndRegenerate"
        >
          <span class="btn-emoji">✨</span> Aplicar y Regenerar
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.75);
  backdrop-filter: Blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-hud);
}

.modal-card {
  width: 90%;
  max-width: 540px;
  max-height: dvh;
  background: #0f172a;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 36px Rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  background: #1e293b;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    color: #ffffff;
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-badge {
  background: #334155;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.presets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-preset {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: #1e293b;
  color: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    background: #334155;
  }

  &.active {
    border-color: #38bdf8;
    background: Rgba(56, 189, 248, 0.15);
  }

  .preset-name {
    font-size: 12px;
    font-weight: 600;
  }

  .preset-meta {
    font-size: 10px;
    color: #94a3b8;
  }
}

.seed-row {
  display: flex;
  gap: 8px;
}

.input-field {
  flex: 1;
  background: #1e293b;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  padding: 8px 12px;
  border-radius: 6px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: #38bdf8;
  }
}

.btn-dice {
  background: #334155;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0 14px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background: #475569;
  }
}

.slider {
  width: 100%;
  accent-color: #38bdf8;
  cursor: pointer;
}

.separator-line {
  height: 1px;
  background: Rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

.biomes-title {
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);
  background: #1e293b;

  .btn-secondary {
    background: transparent;
    border: 1px solid Rgba(255, 255, 255, 0.2);
    color: #cbd5e1;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: Rgba(255, 255, 255, 0.05);
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      filter: Brightness(1.1);
    }
  }
}
</style>
