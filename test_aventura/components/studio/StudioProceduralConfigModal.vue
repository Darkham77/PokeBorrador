<script setup lang="ts">
import { ref, watch } from 'vue';
import { cloneReactive } from '@/logic/utils/cloneUtils';
import StudioModalShell from './StudioModalShell.vue';
import { useContinentStudioStore } from '../../stores/continentStudio';
import { CANONICAL_PRESETS } from '../../logic/map/continent/continentPersistence';
import { MAX_RANDOM_SEED } from '../../config/studioConstants.ts';
import type { CanonicalPresetId, ContinentGenConfig } from '../../types/map/continentTypes';

const store = useContinentStudioStore();

// Local working copy for the modal to allow clean cancel/apply semantics
const localConfig = ref<ContinentGenConfig>(cloneReactive(store.activeProject.config));

watch(
  () => store.showConfigModal,
  (isOpen) => {
    if (isOpen) {
      localConfig.value = cloneReactive(store.activeProject.config);
    }
  }
);

function handleRandomSeed(): void {
  localConfig.value = {
    ...localConfig.value,
    seed: Math.floor(Math.random() * MAX_RANDOM_SEED)
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
  <StudioModalShell
    v-if="store.showConfigModal"
    id="modal-procedural-config"
    title="Configuración Procedural del Continente"
    icon="⚙️"
    max-width="540px"
    @close="store.showConfigModal = false"
  >
    <!-- Presets Canónicos -->
    <div class="control-group">
      <label class="control-label"><span class="icon">🏛️</span> Presets de Regiones</label>
      <div class="presets-grid">
        <button
          v-for="(p, key) in CANONICAL_PRESETS"
          id="studio-procedural-config-modal-btn-applypreset"
          :key="key"
          v-gsap-hover="'button'"
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
          id="studio-procedural-config-modal-input-seed"
          v-model.number="localConfig.seed"
          type="number"
          class="input-field"
        >
        <button
          id="studio-procedural-config-modal-btn-randomseed"
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
          id="studio-procedural-config-modal-input-width"
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
          id="studio-procedural-config-modal-input-height"
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
        id="studio-procedural-config-modal-input-citycount"
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
        id="studio-procedural-config-modal-input-waterpercent"
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
        id="studio-procedural-config-modal-input-beachpercent"
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
        id="studio-procedural-config-modal-input-forestpercent"
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
        id="studio-procedural-config-modal-input-mountainpercent"
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
        id="studio-procedural-config-modal-input-snowpercent"
        v-model.number="localConfig.biomes.snowPercent"
        type="range"
        min="0"
        max="100"
        class="slider"
      >
    </div>
    <template #footer>
      <button
        id="studio-procedural-config-modal-btn-cancelar"
        type="button"
        class="btn-secondary"
        @click="store.showConfigModal = false"
      >
        Cancelar
      </button>
      <button
        id="studio-procedural-config-modal-btn-aplicar-y-regenerar"
        type="button"
        class="btn-primary"
        @click="handleApplyAndRegenerate"
      >
        <span class="btn-emoji">✨</span> Aplicar y Regenerar
      </button>
    </template>
  </StudioModalShell>
</template>

<style scoped lang="scss">

.control-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
}

.control-label {
  color: var(--slate-300);
  font-size: var(--font-12);
  font-weight: 600;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-badge {
  padding: 2px 8px;
  border-radius: $radius-sm;
  background: var(--slate-700);
  color: var(--sky);
  font-size: var(--font-11);
  font-weight: 700;
}

.presets-grid {
  display: grid;
  gap: $spacing-sm;
  grid-template-columns: 1fr 1fr;
}

.btn-preset {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--slate-700);
  }

  &.active {
    background: Rgb(56 189 248 / 15%);
    border-color: var(--sky);
  }

  .preset-name {
    font-size: var(--font-12);
    font-weight: 600;
  }

  .preset-meta {
    color: var(--slate-400);
    font-size: var(--font-10);
  }
}

.seed-row {
  display: flex;
  gap: $spacing-sm;
}

.input-field {
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-13);
  flex: 1;
  outline: none;

  &:focus {
    border-color: var(--sky);
  }
}

.btn-dice {
  padding: 0 14px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-md;
  background: var(--slate-700);
  font-size: var(--font-16);
  cursor: pointer;

  &:hover {
    background: var(--slate-600);
  }
}

.slider {
  width: 100%;
  accent-color: var(--sky);
  cursor: pointer;
}

.separator-line {
  height: 1px;
  margin: 4px 0;
  background: Rgb(255 255 255 / 10%);
}

.biomes-title {
  margin: 0;
  color: var(--sky);
  font-size: var(--font-13);
  font-weight: 700;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md-alt;
  padding: 14px 20px;
  background: var(--slate-800);
  border-top: 1px solid Rgb(255 255 255 / 10%);

  .btn-secondary {
    padding: 8px 16px;
    border: 1px solid Rgb(255 255 255 / 20%);
    border-radius: $radius-md;
    background: transparent;
    color: var(--slate-300);
    font-size: var(--font-12);
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: Rgb(255 255 255 / 5%);
    }
  }

  .btn-primary {
    padding: 8px 16px;
    border: none;
    border-radius: $radius-md;
    background: linear-gradient(135deg, var(--emerald-500) 0%, var(--emerald-500) 100%);
    color: var(--white);
    font-size: var(--font-12);
    font-weight: 700;
    cursor: pointer;

    &:hover {
      filter: Brightness(1.1);
    }
  }
}
</style>
