<script setup lang="ts">
import { computed, ref } from 'vue'
import { getPokemonVisualBadges, getPokemonEditorBadges, isPokemonTagId, type TagDefinition, type PokemonTagId } from '@/logic/constants/tags'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

import type { Pokemon } from '@/types/pokemon/pokemon'

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
  'toggle-tag': [tagId: PokemonTagId]
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
  if (isPokemonTagId(badge.id)) {
    emit('toggle-tag', badge.id)
  }
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
        id="unified-badge-pill-pvtooltip-badgeclick"
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
              :alt="badge.label || 'Objeto'"
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
    @include gpu-layer;

    display: flex !important;
    flex-wrap: nowrap;
    justify-content: center !important;
    align-items: center !important;
    gap: $spacing-xs;
    border: 1px solid Rgb(255 255 255 / 10%);
    background: $black !important;
    box-shadow: var(--shadow-md);

    :deep(.pv-tooltip-wrapper) {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      height: 100%;
      
      &:hover {
        cursor: pointer; // Unified pointer for all interactive badges
      }
    }
  }

  &.sm {
    .pill-container { gap: $spacing-xs; padding: 4px; border-radius: $radius-lg; }
    .badge-icon { 
      width: 14px !important; 
      height: 14px !important;
      padding: 0 !important; 
      font-size: var(--font-10);
      &.is-text { font-size: var(--font-6); }

      .badge-item-img {
        transform: Scale(1.0); // Slightly larger than other sm icons
      }

      &.is-item {
        width: 16px !important;
        height: 16px !important;
      }
    }

    :deep(.pv-tooltip-wrapper) {
      display: inline-flex !important;
      justify-content: center;
      align-items: center;
      width: 14px !important;
      height: 14px !important;

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
    .pill-container { gap: $spacing-sm-alt; padding: 6px; border-radius: $radius-xl; }
    .badge-icon { width: 18px; height: 18px; 
      font-size: var(--font-14); 
      &.is-text { font-size: var(--font-8); }
    }
    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  &.lg {
    .pill-container { gap: $spacing-sm; padding: 8px; border-radius: $radius-3xl; }
    .badge-icon { width: 22px; height: 22px; 
      font-size: var(--font-18); 
      &.is-text { font-size: var(--font-10); }
    }
    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  &.xl {
    .pill-container { gap: $spacing-md-alt; padding: 10px; border-radius: $radius-4xl; }
    .badge-icon { width: 28px; height: 28px; 
      font-size: var(--font-22); 
      &.is-text { font-size: var(--font-12); }
    }
    &.vertical {
      .pill-container { flex-direction: column; }
    }
  }

  .badge-icon {
    @include flex-center;
    @include pixelated;

    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    color: var(--badge-color, #ccc);
    font-weight: 900;
    line-height: 1 !important;
    text-align: center;

    &:not(.is-iv31) {
      font-family: $font-family-emoji !important;
    }

    // NORMALIZACIÓN VISUAL ESTÁNDAR (MD, LG, XL)
    &.is-shiny { font-size: var(--font-14); } 
    &.is-iv31 { @include pixelated; font-family: var(--font-pixel) !important; font-size: var(--font-12); font-weight: 900; letter-spacing: -0.5px; }
    &.is-fav { 
      font-size: var(--font-11); 
      transform: Translatey(-0.5px); 
    }
    &.is-breed { font-size: var(--font-28); } 
    &.is-competitive { font-size: var(--font-24); } 
    &.is-box { font-size: var(--font-24); } 
    &.is-trade { font-size: var(--font-22); } 
    &.is-item { 
      font-size: var(--font-18); 
    }

    .badge-item-img {
      @include sprite-render;

      width: 100%;
      height: 100%;
      transform: Scale(1.6); // "Zoom sufficient" as requested
      object-fit: contain;
      will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));
    }

    .fallback-icon {
      display: block;
      font-size: var(--font-14);
    }

    &.is-inactive {
      background: transparent !important;
      opacity: 0.65;
      transform: none;
      will-change: transform, filter, opacity;
      filter: Grayscale(0.8) Brightness(1.3);
      box-shadow: none !important;
    }

    &.is-active {
      opacity: 1;
    }

    &.is-locked {
      opacity: 0.9;
      cursor: default !important;
    }

    &.can-edit {
      cursor: pointer;
      
      &:active {
        transform: Scale(0.9);
      }
    }

    &.is-automatic {
      cursor: default;
    }
  }
}
</style>
