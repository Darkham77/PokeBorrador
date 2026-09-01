<script setup lang="ts">
import { computed, ref } from 'vue'
import { getPokemonVisualBadges, getPokemonEditorBadges } from '@/logic/constants/tags'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

import type { Pokemon } from '@/types/pokemon/pokemon'
import type { TagDefinition } from '@/logic/constants/tags'

interface Props {
  pokemon: Pokemon | Partial<Pokemon>
  size?: string // 'sm' (Box), 'md' (Default), 'lg' (Team)
  vertical?: boolean
  editable?: boolean
  inline?: boolean
  top?: string
  left?: string
  showAll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  vertical: true,
  editable: false,
  inline: false,
  top: '10px',
  left: '6px',
  showAll: false
})

const emit = defineEmits<{
  'toggle-tag': [tagId: string]
}>()

const badges = computed(() => {
  return props.showAll 
    ? getPokemonEditorBadges(props.pokemon)
    : getPokemonVisualBadges(props.pokemon)
})

const containerStyle = computed(() => {
  if (props.inline) return { position: 'relative', top: 'auto', left: 'auto', zIndex: 'var(--z-low)' } as const
  return {
    position: 'absolute',
    top: props.top,
    left: props.left,
    zIndex: 'var(--z-low)'
  } as const
})

const itemImageError = ref(false)

const handleBadgeClick = (e: MouseEvent, badge: TagDefinition) => {
  if (!props.editable || badge.isAutomatic || badge.isLocked) return
  e.stopPropagation()
  emit('toggle-tag', badge.id)
}

const handleItemImageError = (e: Event) => {
  itemImageError.value = true
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <div 
    v-if="badges.length > 0"
    :class="['unified-badge-pill', size, { vertical, 'is-editable': editable }]"
    :style="containerStyle"
  >
    <div class="pill-container">
      <PVTooltip
        v-for="badge in badges"
        :key="badge.id"
        :description="badge.desc"
        :title="badge.label"
        :position="vertical ? 'right' : 'top'"
        @click="handleBadgeClick($event, badge)"
      >
        <div 
          :class="[
            'badge-icon', 
            `is-${badge.id}`,
            { 
              'is-text': !badge.itemId && badge.icon.length > 1,
              'can-edit': editable && !badge.isAutomatic && !badge.isLocked,
              'is-automatic': badge.isAutomatic,
              'is-active': badge.isActive !== false,
              'is-inactive': badge.isActive === false,
              'is-locked': badge.isLocked
            }
          ]"
          :style="{ '--badge-color': badge.color }"
        >
          <template v-if="badge.id === 'item'">
            <img 
              v-if="!itemImageError"
              :src="getAssetUrl(ASSET_TYPES.ITEM, badge.itemId || '')" 
              class="badge-item-img"
              @error="handleItemImageError"
            >
            <span
              v-else
              class="emoji fallback-icon"
            >{{ badge.icon || '🎒' }}</span>
          </template>
          <template v-else>
            <span class="emoji">{{ badge.icon }}</span>
          </template>
        </div>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.unified-badge-pill {
  @include flex-center;
  z-index: var(--z-low);

  .pill-container {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: nowrap;
    gap: 4px;
    background: $black !important;
    border: 1px solid Rgba(255, 255, 255, 0.1);
    @include gpu-layer;
    box-shadow: 0 4px 15px Rgba(0,0,0,0.5);
    line-height: 0;

    :deep(.pv-tooltip-wrapper) {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100%;
      line-height: 0;
      
      &:hover {
        cursor: pointer; // Unified pointer for all interactive badges
      }
    }
  }

  &.sm {
    .pill-container { padding: 4px; border-radius: 8px; gap: 4px; }
    .badge-icon { 
      font-size: 10px; 
      width: 14px !important; 
      height: 14px !important;
      padding: 0 !important;
      &.is-text { font-size: 6px; }

      .badge-item-img {
        transform: Scale(1.0) !important; // Slightly larger than other sm icons
      }

      &.is-item {
        width: 16px !important;
        height: 16px !important;
      }
    }

    :deep(.pv-tooltip-wrapper) {
      width: 14px !important;
      height: 14px !important;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;

      &:has(.is-item) {
        width: 16px !important;
        height: 16px !important;
      }
    }

    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  &.md {
    .pill-container { padding: 6px; border-radius: 12px; gap: 6px; }
    .badge-icon { 
      font-size: 14px; width: 18px; height: 18px; 
      &.is-text { font-size: 8px; }
    }
    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  &.lg {
    .pill-container { padding: 8px; border-radius: 20px; gap: 8px; }
    .badge-icon { 
      font-size: 18px; width: 22px; height: 22px; 
      &.is-text { font-size: 10px; }
    }
    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  &.xl {
    .pill-container { padding: 10px; border-radius: 24px; gap: 10px; }
    .badge-icon { 
      font-size: 22px; width: 28px; height: 28px; 
      &.is-text { font-size: 12px; }
    }
    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  .badge-icon {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    @include flex-center;
    @include pixelated;
    
    color: var(--badge-color, #ccc);
    font-weight: 900;
    line-height: 1 !important;
    text-align: center;

    &:not(.is-iv31) {
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
    }

    // NORMALIZACIÓN VISUAL ESTÁNDAR (MD, LG, XL)
    &.is-shiny { font-size: 0.85em; } 
    &.is-iv31 { font-size: 0.75em; letter-spacing: -0.5px; font-weight: 900; font-family: var(--font-pixel) !important; @include pixelated; }
    &.is-fav { 
      font-size: 0.68em; 
      transform: Translatey(-0.5px); 
    }
    &.is-breed { font-size: 1.76em; } 
    &.is-competitive { font-size: 1.54em; } 
    &.is-box { font-size: 1.54em; } 
    &.is-trade { font-size: 1.43em; } 
    &.is-item { 
      font-size: 1.1em; 
    }

    .badge-item-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      @include sprite-render;
      transform: Scale(1.6); // "Zoom sufficient" as requested
      will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.4));
    }

    .fallback-icon {
      font-size: 0.9em;
      display: block;
    }

    &.is-inactive {
      opacity: 0.65;
      will-change: transform, filter, opacity;
      filter: Grayscale(0.8) Brightness(1.3);
      transform: none;
      background: transparent !important;
      box-shadow: none !important;
    }

    &.is-active {
      opacity: 1;
    }

    &.is-locked {
      cursor: default !important;
      opacity: 0.9;
    }

    &.can-edit {
      cursor: pointer;
      
      &:active {
        transform: Scale(0.9) !important;
      }
    }

    &.is-automatic {
      cursor: default;
    }
  }
}
</style>
