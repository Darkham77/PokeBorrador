<script setup lang="ts">
/**
 * src/views/dev/components/DevShadowHeaderToolbar.vue
 *
 * Header toolbar and rebuild banner for the Developer Shadow Calibration View.
 */

import {
  MIN_SPRITE_ZOOM,
  MAX_SPRITE_ZOOM,
  SPRITE_ZOOM_STEP
} from '../useShadowEditor.ts';
import {
  MIN_SHADOW_WIDTH_RATIO,
  MAX_SHADOW_WIDTH_RATIO,
  SHADOW_WIDTH_RATIO_STEP,
  MIN_SHADOW_HEIGHT_RATIO,
  MAX_SHADOW_HEIGHT_RATIO,
  SHADOW_HEIGHT_RATIO_STEP,
  MIN_SHADOW_PIXELATION,
  MAX_SHADOW_PIXELATION,
  SHADOW_PIXELATION_STEP,
  type GlobalShadowConfig
} from '@/types/pokemon/spriteShadows';
import { COLUMN_OPTIONS, type SaveButtonState } from '../devShadowMathHelper.ts';

interface Props {
  columns: number;
  shadowWidthPercent: string;
  shadowHeightPercent: string;
  spriteZoomPercent: string;
  globalShadowConfig: GlobalShadowConfig;
  spriteZoom: number;
  modifiedCount: number;
  isSaving: boolean;
  isRebuilding: boolean;
  saveButtonState: SaveButtonState;
  isProgressVisible: boolean;
  rebuildMessage: string;
  rebuildProgress: number;
}

defineProps<Props>();

defineEmits<{
  (e: 'return'): void;
  (e: 'update:columns', val: number): void;
  (e: 'update:spriteZoom', val: number): void;
  (e: 'update:widthRatio', val: number): void;
  (e: 'update:heightRatio', val: number): void;
  (e: 'update:pixelation', val: number): void;
  (e: 'resetWidth'): void;
  (e: 'resetHeight'): void;
  (e: 'resetPixelation'): void;
  (e: 'resetZoom'): void;
  (e: 'rebuild'): void;
  (e: 'download'): void;
  (e: 'save'): void;
}>();
</script>

<template>
  <!-- Top Header & Action Toolbar -->
  <header class="editor-header">
    <div class="header-left">
      <button
        type="button"
        class="action-button btn-back"
        @click="$emit('return')"
      >
        <span class="emoji">←</span> Volver al Juego
      </button>
      <div class="header-title-box">
        <h1 class="header-title">
          CALIBRADOR DE SOMBRAS (DEV)
        </h1>
        <span class="header-subtitle">
          Ajuste de pies (feetX, feetY) y elevación de vuelo precalculados
        </span>
      </div>
    </div>

    <div class="header-right">
      <!-- Density / Columns selector -->
      <div class="zoom-controls">
        <span class="zoom-label">Columnas: {{ columns }}</span>
        <div class="zoom-buttons">
          <button
            v-for="col in COLUMN_OPTIONS"
            :key="col"
            type="button"
            class="zoom-btn"
            :class="{ 'is-active': columns === col }"
            @click="$emit('update:columns', col)"
          >
            {{ col }}
          </button>
        </div>
      </div>

      <!-- Global Shadow Visual Controls (Ancho, Alto, Pixelado) -->
      <div class="global-shadow-toolbar">
        <div
          class="shadow-slider-box"
          title="Ajustar relación de ancho de la sombra base"
        >
          <span class="shadow-slider-label">Sombra Ancho: {{ shadowWidthPercent }}</span>
          <input
            :value="globalShadowConfig.widthRatio"
            type="range"
            class="shadow-range-slider"
            :min="MIN_SHADOW_WIDTH_RATIO"
            :max="MAX_SHADOW_WIDTH_RATIO"
            :step="SHADOW_WIDTH_RATIO_STEP"
            @input="$emit('update:widthRatio', Number(($event.target as HTMLInputElement).value))"
          >
          <button
            type="button"
            class="shadow-reset-btn"
            title="Restablecer ancho al 100%"
            @click="$emit('resetWidth')"
          >
            <span class="emoji">↺</span>
          </button>
        </div>

        <div
          class="shadow-slider-box"
          title="Ajustar relación de alto/aspect ratio de la sombra base"
        >
          <span class="shadow-slider-label">Sombra Alto: {{ shadowHeightPercent }}</span>
          <input
            :value="globalShadowConfig.heightRatio"
            type="range"
            class="shadow-range-slider"
            :min="MIN_SHADOW_HEIGHT_RATIO"
            :max="MAX_SHADOW_HEIGHT_RATIO"
            :step="SHADOW_HEIGHT_RATIO_STEP"
            @input="$emit('update:heightRatio', Number(($event.target as HTMLInputElement).value))"
          >
          <button
            type="button"
            class="shadow-reset-btn"
            title="Restablecer alto al 28%"
            @click="$emit('resetHeight')"
          >
            <span class="emoji">↺</span>
          </button>
        </div>

        <div
          class="shadow-slider-box"
          title="Ajustar qué tan pixelada se ve la sombra (resolución del canvas)"
        >
          <span class="shadow-slider-label">Pixelado: {{ globalShadowConfig.pixelation }}px</span>
          <input
            :value="globalShadowConfig.pixelation"
            type="range"
            class="shadow-range-slider"
            :min="MIN_SHADOW_PIXELATION"
            :max="MAX_SHADOW_PIXELATION"
            :step="SHADOW_PIXELATION_STEP"
            @input="$emit('update:pixelation', Number(($event.target as HTMLInputElement).value))"
          >
          <button
            type="button"
            class="shadow-reset-btn"
            title="Restablecer pixelado a 14px"
            @click="$emit('resetPixelation')"
          >
            <span class="emoji">↺</span>
          </button>
        </div>
      </div>

      <!-- Sprite & Shadow Zoom Slider -->
      <div class="sprite-zoom-slider-box">
        <span class="zoom-slider-label">Zoom: {{ spriteZoomPercent }}</span>
        <input
          :value="spriteZoom"
          type="range"
          class="zoom-range-slider"
          :min="MIN_SPRITE_ZOOM"
          :max="MAX_SPRITE_ZOOM"
          :step="SPRITE_ZOOM_STEP"
          title="Ajustar zoom de sprites y sombras para edición detallada"
          @input="$emit('update:spriteZoom', Number(($event.target as HTMLInputElement).value))"
        >
        <button
          type="button"
          class="zoom-reset-btn"
          title="Restablecer zoom a 200%"
          @click="$emit('resetZoom')"
        >
          <span class="emoji">↺</span>
        </button>
      </div>

      <!-- Overrides Counter Badge -->
      <div
        class="modified-counter"
        :class="{ 'has-modifications': modifiedCount > 0 }"
      >
        {{ modifiedCount }} overrides
      </div>

      <!-- Recompile BD Button -->
      <button
        type="button"
        class="action-button btn-rebuild"
        :disabled="isSaving || isRebuilding"
        title="Recompilar pokemonFeetDatabase.json y gritos en disco"
        @click="$emit('rebuild')"
      >
        <span v-if="isRebuilding"><span class="emoji">⚙️</span> Compilando...</span>
        <span v-else><span class="emoji">⚡</span> Recompilar BD</span>
      </button>

      <!-- JSON Download Button -->
      <button
        type="button"
        class="action-button btn-download"
        title="Descargar spriteShadowOverrides.json localmente"
        @click="$emit('download')"
      >
        <span class="emoji">📥</span> Descargar JSON
      </button>

      <!-- Save Button -->
      <button
        type="button"
        class="action-button btn-save"
        :class="{ 'has-unsaved': saveButtonState === 'unsaved' }"
        :disabled="isSaving || isRebuilding"
        @click="$emit('save')"
      >
        <span v-if="saveButtonState === 'saving'"><span class="emoji">⏳</span> Guardando...</span>
        <span v-else-if="saveButtonState === 'unsaved'"><span class="emoji">💾</span> Guardar Cambios *</span>
        <span v-else><span class="emoji">✅</span> Guardado</span>
      </button>
    </div>
  </header>

  <!-- Real-time DB Rebuild Progress Banner (SSE) -->
  <div
    v-if="isProgressVisible"
    class="rebuild-progress-banner"
  >
    <div class="progress-meta">
      <span class="progress-status-msg">
        <span class="pulse-dot" /> {{ rebuildMessage }}
      </span>
      <span class="progress-percent-val">{{ rebuildProgress }}%</span>
    </div>
    <div class="progress-track-bg">
      <div
        class="progress-fill-bar"
        :style="{ width: `${rebuildProgress}%` }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/views/_dev-shadow-editor.scss"></style>
