<script setup lang="ts">
/**
 * PVStatusOverlayLayer.vue
 * Renders an isolated particle overlay group for primary, secondary, tactical, or field status effects.
 */
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { resolveEffectSettings } from '@/data/battle/fx-configs'
import { Z_LAYERS } from '@/logic/constants/visuals'
import type { FXData, FXCategoryKind } from './statusParticleHelpers'

const props = withDefaults(
  defineProps<{
    fx: FXData
    radius: number
    isBattle?: boolean
    isSimplified?: boolean
    category: FXCategoryKind
  }>(),
  {
    isBattle: false,
    isSimplified: false
  }
)

const particleCount = computed(() => {
  const options = {
    isField: props.category === 'field' || Boolean(props.fx.isField),
    isSimplified: props.isSimplified,
    isBattle: props.isBattle
  }
  return resolveEffectSettings(props.fx.type, props.radius, options).activeRange[1]
})

const isFreezeAsset = computed(() => props.fx.type === 'freeze' || props.fx.type === 'frozen')
const isShinyAsset = computed(() => props.fx.type === 'shiny')
const isWobbleContent = computed(() => props.fx.type === 'confusion' || props.fx.type === 'confused')

const containerCategoryClass = computed(() => {
  if (props.category === 'secondary') return 'secondary-container'
  if (props.category === 'tactical') return 'tactical-container'
  if (props.category === 'field') return 'field-container'
  return ''
})

const particleCategoryClass = computed(() => {
  if (props.category === 'secondary') return 'secondary-status'
  if (props.category === 'tactical') return 'tactical-status'
  if (props.category === 'field') return 'field-status'
  return 'primary-status'
})

const isLayerVisible = computed(() => {
  if (props.category === 'tactical' || props.category === 'field') {
    return !props.isSimplified
  }
  return true
})
</script>

<template>
  <div
    v-show="isLayerVisible"
    class="pv-fx-status-overlay"
    :class="[containerCategoryClass, 'fx-type-' + fx.type]"
    :data-fx-type="fx.type"
  >
    <span
      v-for="i in particleCount"
      :key="i"
      class="emoji status-particle"
      :class="particleCategoryClass"
    >
      <span
        v-if="category === 'primary' && isFreezeAsset"
        class="freeze-asset-wrapper"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.FX, 'shiny')"
          class="freeze-asset"
          alt="Freeze"
        >
      </span>
      <span
        v-else-if="category === 'secondary' && isShinyAsset"
        class="shiny-asset-wrapper"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.FX, 'shiny')"
          class="shiny-asset"
          alt="Shiny"
        >
      </span>
      <span
        v-else-if="category === 'secondary'"
        :class="{ 'wobble-content': isWobbleContent }"
      >
        {{ fx.emoji }}
      </span>
      <template v-else>
        {{ fx.emoji }}
      </template>
    </span>
  </div>
</template>

<style scoped lang="scss">
.pv-fx-status-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: calc(v-bind('Z_LAYERS.MAP_SPAWNS') + 3);
  overflow: visible;
}

.status-particle {
  position: absolute;
  font-size: 32px !important;
  line-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
  -webkit-font-smoothing: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform-origin: 50% 50%;
  will-change: transform, filter, opacity;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  perspective: 1000px;
}

.secondary-container,
.tactical-container,
.field-container {
  pointer-events: none;
}

.primary-status,
.secondary-status,
.tactical-status,
.field-status {
  pointer-events: none;
}

.wobble-content {
  display: inline-block;
}

.shiny-asset-wrapper,
.freeze-asset-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.shiny-asset {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: sepia(1) Saturate(12) Hue-Rotate(-15deg) Brightness(1.1);
  @include pixelated;
}

.freeze-asset {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: Brightness(0) Invert(1)
          Drop-Shadow(1px 0 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(-1px 0 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(0 1px 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(0 -1px 0 Rgba(0, 255, 255, 0.95))
          Drop-Shadow(0 0 6px Rgba(0, 255, 255, 0.8));
  @include pixelated;
}
</style>
