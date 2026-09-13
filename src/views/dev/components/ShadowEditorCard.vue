<script setup lang="ts">
/**
 * src/views/dev/components/ShadowEditorCard.vue
 *
 * Dedicated calibration card for individual entity sprite shadows.
 * High-contrast arena preview, responsive aspect-ratio zoom scaling,
 * visible headers with Frente/Espalda badges, and full editing controls.
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import CombatShadow from '@/components/battle/CombatShadow.vue';
import { useCombatShadowStore } from '@/stores/battle/combatShadows';
import { getShadowWidth } from '@/composables/battle/useBattleShadows';
import type { EditorEntity, SpriteShadowOverride, GlobalShadowConfig, ShadowSliderField } from '@/types/pokemon/spriteShadows';
import animDbJson from '@/data/pokemon/animatedSpriteDatabase.json' with { type: 'json' };
import { DEFAULT_FRAME_SIZE_PX, POKEMON_SPRITE_IDLE_FPS } from '@/logic/constants/animations';
import { copySliderValue, readSliderValue, copyAllValues, readAllValues } from '../utils/shadowEditorClipboard';

interface Props {
  entity: EditorEntity;
  override?: SpriteShadowOverride;
  isShiny?: boolean;
  isInherited?: boolean;
  zoom?: number;
  shadowConfig?: GlobalShadowConfig;
}

const props = withDefaults(defineProps<Props>(), {
  override: undefined,
  isShiny: false,
  isInherited: false,
  zoom: 2.0,
  shadowConfig: undefined
});

const emit = defineEmits<{
  (e: 'updateOverride', key: string, feetX: number, feetY: number, isFlying: boolean, shadowScale?: number): void;
  (e: 'resetOverride', key: string): void;
}>();

const RAW = animDbJson.RAW as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container

const MIN_COORDINATE = 0;
const MAX_COORDINATE = 1;
const COORDINATE_STEP = 0.005;

const MIN_SHADOW_SCALE = 0.2;
const MAX_SHADOW_SCALE = 3.0;
const SHADOW_SCALE_STEP = 0.05;

// Current values (override || default)
const currentFeetX = computed(() => props.override?.feetX ?? props.entity.defaultFeetX);
const currentFeetY = computed(() => props.override?.feetY ?? props.entity.defaultFeetY);
const currentIsFlying = computed(() => props.override?.isFlying ?? props.entity.defaultIsFlying);
const currentShadowScale = computed(() => props.override?.shadowScale ?? props.entity.defaultShadowScale ?? 1.0);
const isModified = computed(() => props.override !== undefined);

const badgeText = computed(() => {
  if (props.isInherited) return 'HEREDADO';
  if (isModified.value) return 'MOD';
  return 'AUTO';
});

const badgeClass = computed(() => {
  if (props.isInherited) return 'badge-inherited';
  if (isModified.value) return 'badge-modified';
  return 'badge-auto';
});

const formatPercent = (ratio: number): number => Math.round(ratio * 10000) / 100;

const MIN_SPRITE_FRAME_SIZE_PX = 16;

// Determine animation metadata from spriteUrl in O(1)
const getAnimSpriteKey = (url: string): string | null => {
  if (!url.includes('/animated/')) return null;
  const match = url.match(/\/([^/]+)\.webp$/i);
  if (!match) return null;
  const fileName = match[1]!; // e.g. "25i", "25i_f", "1i"
  const isBack = url.includes('/Back');
  if (isBack) {
    return fileName.endsWith('_f') ? fileName.replace(/_f$/, '_f_back') : `${fileName}_back`;
  }
  return fileName;
};

const animKey = computed(() => getAnimSpriteKey(props.entity.spriteUrl));
const animData = computed(() => (animKey.value && RAW[animKey.value]) ? RAW[animKey.value] : null);
const isAnimated = computed(() => Boolean(animData.value && animData.value.length > 0));
const frameCount = computed(() => (animData.value && animData.value.length > 0) ? (animData.value[0] ?? 1) : 1);

// DOM refs & responsive sizing
const spriteFrameRef = ref<HTMLElement | null>(null);
const animImageRef = ref<HTMLImageElement | null>(null);
const isDragging = ref(false);
let animTween: gsap.core.Tween | null = null;

// Extract native pixel frame size (e.g. 40px Bulbasaur, 60px Ivysaur, 88px Venusaur)
const nativeFrameSize = computed(() => {
  if (animData.value && animData.value.length > 1) {
    return animData.value[1] ?? DEFAULT_FRAME_SIZE_PX;
  }
  return DEFAULT_FRAME_SIZE_PX;
});

// Virtual sprite size: proportional to actual sprite dimensions, scaled directly by the zoom prop
const containerSize = computed(() => {
  const currentZoom = props.zoom > 0 ? props.zoom : 2.0;
  return Math.max(MIN_SPRITE_FRAME_SIZE_PX, Math.round(nativeFrameSize.value * currentZoom));
});

// Centralized Combat Shadow Store integration
const shadowStore = useCombatShadowStore();
const shadowKey = computed(() => `dev_editor_${props.entity.key}`);

const effectiveShadowWidthStr = computed(() => {
  if (props.entity.category === 'pokemon') {
    const isBack = props.entity.view === 'back';
    return getShadowWidth(
      {
        id: props.entity.pokemonSpeciesId,
        gender: props.entity.gender === 'F' ? 'f' : 'm'
      },
      isBack
    );
  }
  return '70%';
});

const syncShadowInStore = () => {
  shadowStore.requestShadow(shadowKey.value, {
    side: 'generic',
    feetX: 0.5,
    feetY: 0.75,
    entitySize: containerSize.value,
    width: effectiveShadowWidthStr.value,
    isFlying: currentIsFlying.value,
    shadowScale: currentShadowScale.value,
    spriteUrl: props.entity.spriteUrl,
    visible: true,
    force: true
  });
};

watch(
  [
    shadowKey,
    currentIsFlying,
    currentShadowScale,
    effectiveShadowWidthStr,
    containerSize
  ],
  () => {
    syncShadowInStore();
  },
  { immediate: true }
);

// GSAP spritesheet stepping animation
const startAnimation = () => {
  if (animTween) {
    animTween.kill();
    animTween = null;
  }
  if (!isAnimated.value || !animImageRef.value || frameCount.value <= 1) return;

  const totalFrames = frameCount.value;
  animTween = gsap.to(animImageRef.value, {
    xPercent: -((totalFrames - 1) / totalFrames) * 100,
    ease: `steps(${totalFrames - 1})`,
    duration: totalFrames / POKEMON_SPRITE_IDLE_FPS,
    repeat: -1
  });
};

watch([animImageRef, isAnimated, frameCount], () => {
  startAnimation();
});

onMounted(() => {
  startAnimation();
});

onUnmounted(() => {
  if (copyResetTween) {
    copyResetTween.kill();
    copyResetTween = null;
  }
  if (copyAllResetTween) {
    copyAllResetTween.kill();
    copyAllResetTween = null;
  }
  if (animTween) {
    animTween.kill();
    animTween = null;
  }
  shadowStore.hideShadow(shadowKey.value);
  shadowStore.activeShadows.delete(shadowKey.value);
});

// 1:1 direct pointer dragging relative to the sprite frame container
const dragStartPointer = ref({ x: 0, y: 0 });
const dragStartCoords = ref({ x: 0, y: 0 });
const hasPointerMoved = ref(false);

const handlePointerDown = (e: PointerEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  hasPointerMoved.value = false;
  dragStartPointer.value = { x: e.clientX, y: e.clientY };
  dragStartCoords.value = { x: currentFeetX.value, y: currentFeetY.value };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const handlePointerMove = (e: PointerEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
  e.stopPropagation();

  const deltaX = e.clientX - dragStartPointer.value.x;
  const deltaY = e.clientY - dragStartPointer.value.y;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    hasPointerMoved.value = true;
  }

  const size = containerSize.value;
  if (size <= 0) return;

  const rawX = dragStartCoords.value.x - (deltaX / size);
  const rawY = dragStartCoords.value.y - (deltaY / size);

  const clampedX = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(rawX.toFixed(3))));
  const clampedY = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(rawY.toFixed(3))));

  emit('updateOverride', props.entity.key, clampedX, clampedY, currentIsFlying.value, currentShadowScale.value);
};

const handlePointerUp = (e: PointerEvent) => {
  if (isDragging.value) {
    isDragging.value = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_err) {
      // Ignored if capture lost
    }

    // Direct click-to-pin when clicked on sprite without dragging
    if (!hasPointerMoved.value && spriteFrameRef.value) {
      const rect = spriteFrameRef.value.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const clickRelX = (e.clientX - rect.left) / rect.width;
        const clickRelY = (e.clientY - rect.top) / rect.height;
        if (clickRelX >= 0 && clickRelX <= 1 && clickRelY >= 0 && clickRelY <= 1) {
          const clampedX = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(clickRelX.toFixed(3))));
          const clampedY = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(clickRelY.toFixed(3))));
          emit('updateOverride', props.entity.key, clampedX, clampedY, currentIsFlying.value, currentShadowScale.value);
        }
      }
    }
  }
};

const handleNumericXChange = (event: Event) => {
  const num = parseFloat((event.target as HTMLInputElement).value);
  if (isNaN(num)) return;
  const val = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(num.toFixed(3))));
  emit('updateOverride', props.entity.key, val, currentFeetY.value, currentIsFlying.value, currentShadowScale.value);
};

const handleNumericYChange = (event: Event) => {
  const num = parseFloat((event.target as HTMLInputElement).value);
  if (isNaN(num)) return;
  const val = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(num.toFixed(3))));
  emit('updateOverride', props.entity.key, currentFeetX.value, val, currentIsFlying.value, currentShadowScale.value);
};

const handleShadowScaleChange = (event: Event) => {
  const num = parseFloat((event.target as HTMLInputElement).value);
  if (isNaN(num)) return;
  const val = Math.max(MIN_SHADOW_SCALE, Math.min(MAX_SHADOW_SCALE, Number(num.toFixed(2))));
  emit('updateOverride', props.entity.key, currentFeetX.value, currentFeetY.value, currentIsFlying.value, val);
};

const handleFlyingToggle = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('updateOverride', props.entity.key, currentFeetX.value, currentFeetY.value, checked, currentShadowScale.value);
};

const COPY_FEEDBACK_DURATION_SEC = 0.9 as const;
const copiedField = ref<ShadowSliderField | null>(null);
let copyResetTween: gsap.core.Tween | null = null;

const handleCopyValue = async (field: ShadowSliderField, val: number) => {
  await copySliderValue(val);
  copiedField.value = field;
  if (copyResetTween) {
    copyResetTween.kill();
    copyResetTween = null;
  }
  copyResetTween = gsap.delayedCall(COPY_FEEDBACK_DURATION_SEC, () => {
    if (copiedField.value === field) {
      copiedField.value = null;
    }
  });
};

const handlePasteValue = async (field: ShadowSliderField) => {
  const raw = await readSliderValue();
  if (raw === null || isNaN(raw)) return;

  if (field === 'x') {
    const val = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(raw.toFixed(3))));
    emit('updateOverride', props.entity.key, val, currentFeetY.value, currentIsFlying.value, currentShadowScale.value);
  } else if (field === 'y') {
    const val = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, Number(raw.toFixed(3))));
    emit('updateOverride', props.entity.key, currentFeetX.value, val, currentIsFlying.value, currentShadowScale.value);
  } else if (field === 'scale') {
    const val = Math.max(MIN_SHADOW_SCALE, Math.min(MAX_SHADOW_SCALE, Number(raw.toFixed(2))));
    emit('updateOverride', props.entity.key, currentFeetX.value, currentFeetY.value, currentIsFlying.value, val);
  }
};

const copiedAll = ref(false);
let copyAllResetTween: gsap.core.Tween | null = null;

const handleCopyAll = async () => {
  await copyAllValues({
    feetX: currentFeetX.value,
    feetY: currentFeetY.value,
    isFlying: currentIsFlying.value,
    shadowScale: currentShadowScale.value
  });
  copiedAll.value = true;
  if (copyAllResetTween) {
    copyAllResetTween.kill();
    copyAllResetTween = null;
  }
  copyAllResetTween = gsap.delayedCall(COPY_FEEDBACK_DURATION_SEC, () => {
    copiedAll.value = false;
  });
};

const handlePasteAll = async () => {
  const snapshot = await readAllValues();
  if (!snapshot) return;

  emit(
    'updateOverride',
    props.entity.key,
    snapshot.feetX,
    snapshot.feetY,
    snapshot.isFlying,
    snapshot.shadowScale
  );
};

const handleReset = () => {
  emit('resetOverride', props.entity.key);
};
</script>

<template>
  <div
    class="shadow-editor-card"
    :class="{ 'is-modified': isModified }"
  >
    <!-- Card Header with High-Contrast Legible Names & Badges -->
    <div class="card-header">
      <div class="header-name-box">
        <span
          class="entity-name"
          :title="entity.name"
        >
          {{ entity.name }}
        </span>
      </div>

      <div class="header-badges">
        <!-- View Badge (Frente / Espalda) -->
        <span
          v-if="'view' in entity"
          class="view-badge"
          :class="entity.view === 'front' ? 'badge-front' : 'badge-back'"
        >
          {{ entity.view === 'front' ? 'FRENTE' : 'ESPALDA' }}
        </span>

        <!-- Status Badge (AUTO / HEREDADO / MOD) -->
        <span
          class="status-badge"
          :class="badgeClass"
        >
          {{ badgeText }}
        </span>
      </div>
    </div>

    <!-- High-Contrast Arena Floor Preview Area -->
    <div
      class="preview-box"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    >
      <!-- Ground Horizon Line (75%) -->
      <div class="ground-horizon-line" />

      <!-- Canonical Combat Shadow anchored at fixed 75% ground line -->
      <CombatShadow
        :shadow-id="shadowKey"
        :sprite-size="containerSize"
        :shadow-scale="currentShadowScale"
        :preview-config="props.shadowConfig"
        :style="{
          '--shadow-y': '75%'
        }"
      />

      <!-- Fixed Ground Anchor Crosshair (50%, 75%) positioned at dead center of shadow -->
      <div class="ground-anchor-crosshair">
        <div class="anchor-dot" />
      </div>

      <!-- Sprite Frame Wrapper: anchored at (50%, 75%), translated by calibrated feet coordinates -->
      <div
        ref="spriteFrameRef"
        class="sprite-frame-wrapper"
        :style="{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          left: '50%',
          top: '75%',
          transform: `translate(calc(-${formatPercent(currentFeetX)}%), calc(-${formatPercent(currentFeetY)}%)) ${currentIsFlying ? 'translateY(-24px)' : ''}`
        }"
      >
        <img
          v-if="isAnimated"
          ref="animImageRef"
          class="pokemon-combat-image"
          :src="entity.spriteUrl"
          :style="{
            width: `${frameCount * 100}%`
          }"
          alt=""
        >
        <img
          v-else
          class="static-sprite-image"
          :src="entity.spriteUrl"
          alt=""
        >
      </div>
    </div>

    <!-- Controls Panel (Always visible, responsive inputs & sliders) -->
    <div class="card-controls">
      <!-- Feet X Control -->
      <div class="control-row">
        <label class="control-label">X:</label>
        <input
          type="range"
          class="range-slider"
          :min="MIN_COORDINATE"
          :max="MAX_COORDINATE"
          :step="COORDINATE_STEP"
          :value="currentFeetX"
          @input="handleNumericXChange"
        >
        <input
          type="number"
          class="number-input"
          :min="MIN_COORDINATE"
          :max="MAX_COORDINATE"
          :step="COORDINATE_STEP"
          :value="currentFeetX.toFixed(3)"
          @input="handleNumericXChange"
          @change="handleNumericXChange"
        >
        <div class="slider-btn-group">
          <button
            type="button"
            class="slider-action-btn"
            title="Copiar valor X"
            @click="handleCopyValue('x', currentFeetX)"
          >
            <span class="emoji">{{ copiedField === 'x' ? '✅' : '📋' }}</span>
          </button>
          <button
            type="button"
            class="slider-action-btn"
            title="Pegar valor en X"
            @click="handlePasteValue('x')"
          >
            <span class="emoji">📥</span>
          </button>
        </div>
      </div>

      <!-- Feet Y Control -->
      <div class="control-row">
        <label class="control-label">Y:</label>
        <input
          type="range"
          class="range-slider"
          :min="MIN_COORDINATE"
          :max="MAX_COORDINATE"
          :step="COORDINATE_STEP"
          :value="currentFeetY"
          @input="handleNumericYChange"
        >
        <input
          type="number"
          class="number-input"
          :min="MIN_COORDINATE"
          :max="MAX_COORDINATE"
          :step="COORDINATE_STEP"
          :value="currentFeetY.toFixed(3)"
          @input="handleNumericYChange"
          @change="handleNumericYChange"
        >
        <div class="slider-btn-group">
          <button
            type="button"
            class="slider-action-btn"
            title="Copiar valor Y"
            @click="handleCopyValue('y', currentFeetY)"
          >
            <span class="emoji">{{ copiedField === 'y' ? '✅' : '📋' }}</span>
          </button>
          <button
            type="button"
            class="slider-action-btn"
            title="Pegar valor en Y"
            @click="handlePasteValue('y')"
          >
            <span class="emoji">📥</span>
          </button>
        </div>
      </div>

      <!-- Shadow Size / Scale Control -->
      <div class="control-row">
        <label
          class="control-label"
          title="Escala de Sombra (Tamaño)"
        >Tam:</label>
        <input
          type="range"
          class="range-slider slider-scale"
          :min="MIN_SHADOW_SCALE"
          :max="MAX_SHADOW_SCALE"
          :step="SHADOW_SCALE_STEP"
          :value="currentShadowScale"
          @input="handleShadowScaleChange"
        >
        <input
          type="number"
          class="number-input"
          :min="MIN_SHADOW_SCALE"
          :max="MAX_SHADOW_SCALE"
          :step="SHADOW_SCALE_STEP"
          :value="currentShadowScale.toFixed(2)"
          @input="handleShadowScaleChange"
          @change="handleShadowScaleChange"
        >
        <div class="slider-btn-group">
          <button
            type="button"
            class="slider-action-btn"
            title="Copiar valor Tamaño"
            @click="handleCopyValue('scale', currentShadowScale)"
          >
            <span class="emoji">{{ copiedField === 'scale' ? '✅' : '📋' }}</span>
          </button>
          <button
            type="button"
            class="slider-action-btn"
            title="Pegar valor en Tamaño"
            @click="handlePasteValue('scale')"
          >
            <span class="emoji">📥</span>
          </button>
        </div>
      </div>

      <!-- Flying Mode Toggle, Copy/Paste All & Reset Button -->
      <div class="footer-row">
        <label class="flying-checkbox-label">
          <input
            type="checkbox"
            class="flying-checkbox"
            :checked="currentIsFlying"
            @change="handleFlyingToggle"
          >
          <span class="flying-text">Volador</span>
        </label>

        <div class="footer-actions">
          <button
            type="button"
            class="footer-icon-btn"
            title="Copiar todos los valores (X, Y, Tam, Volador)"
            @click="handleCopyAll"
          >
            <span class="emoji">{{ copiedAll ? '✅' : '📋' }}</span>
          </button>
          <button
            type="button"
            class="footer-icon-btn"
            title="Pegar todos los valores (X, Y, Tam, Volador)"
            @click="handlePasteAll"
          >
            <span class="emoji">📥</span>
          </button>
          <button
            type="button"
            class="reset-button"
            :disabled="!isModified"
            @click="handleReset"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/views/_shadow-editor-card.scss"></style>
