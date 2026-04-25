<script setup>
import { computed } from 'vue'
import { getPokemonVisualBadges, getPokemonEditorBadges } from '@/logic/constants/tags'
import PVTooltip from '@/components/common/PVTooltip.vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  size: { type: String, default: 'md' }, // 'sm' (Box), 'md' (Default), 'lg' (Team)
  vertical: { type: Boolean, default: true },
  editable: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
  top: { type: String, default: '10px' },
  left: { type: String, default: '6px' },
  showAll: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-tag'])

const badges = computed(() => {
  return props.showAll 
    ? getPokemonEditorBadges(props.pokemon)
    : getPokemonVisualBadges(props.pokemon)
})

const containerStyle = computed(() => {
  if (props.inline) return { position: 'relative', top: 'auto', left: 'auto', zIndex: 'var(--z-low)' }
  return {
    position: 'absolute',
    top: props.top,
    left: props.left,
    zIndex: 'var(--z-low)'
  }
})

const handleBadgeClick = (badge) => {
  if (!props.editable || badge.isAutomatic || badge.isLocked) return
  emit('toggle-tag', badge.id)
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
        :description="badge.desc || badge.description"
        :title="badge.label || badge.title"
        position="right"
      >
        <span 
          :class="[
            'badge-icon', 
            `is-${badge.id}`,
            { 
              'is-text': badge.icon.length > 1,
              'can-edit': editable && !badge.isAutomatic && !badge.isLocked,
              'is-automatic': badge.isAutomatic,
              'is-active': badge.isActive !== false, // Default true if not provided
              'is-inactive': badge.isActive === false,
              'is-locked': badge.isLocked
            }
          ]"
          :style="{ '--badge-color': badge.color }"
          @click.stop="handleBadgeClick(badge)"
        >
          {{ badge.icon }}
        </span>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.unified-badge-pill {
  display: flex;
  z-index: var(--z-low);

  .pill-container {
    display: flex;
    align-items: center;
    gap: 4px;
    background: Rgba(0, 0, 0, 0.7);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    -webkit-backdrop-filter: Blur(10px); backdrop-filter: Blur(10px);
    box-shadow: 0 4px 15px Rgba(0,0,0,0.5);
  }

  &.vertical {
    .pill-container {
      flex-direction: column;
      align-items: center;
      padding-left: 4px !important;
      padding-right: 4px !important;
    }
    
    &.sm .pill-container { padding-left: 3px !important; padding-right: 3px !important; }
    &.md .pill-container { padding-left: 4px !important; padding-right: 4px !important; }
    &.lg .pill-container { padding-left: 5px !important; padding-right: 5px !important; }
  }

  // --- TAMAÑOS PARAMETRIZABLES ---
  
  &.sm {
    .pill-container { padding: 6px 5px; border-radius: 8px; gap: 5px; min-height: 24px; }
    .badge-icon { 
      font-size: 8px; width: 12px; height: 12px; 
      &.is-text { font-size: 6px; letter-spacing: -0.5px; }

      // Micro-ajustes para mini reducidos
      &.is-shiny { font-size: 7px; }
      &.is-iv31 { font-size: 6px; }
      &.is-breed { font-size: 9px; }
      &.is-competitive { font-size: 10px; }
      &.is-box { font-size: 10px; }
      &.is-trade { font-size: 9px; }
    }
  }

  &.md {
    .pill-container { padding: 6px; border-radius: 12px; gap: 6px; }
    .badge-icon { 
      font-size: 14px; width: 16px; height: 16px; 
      &.is-text { font-size: 8px; }
    }
  }

  &.lg {
    .pill-container { padding: 5px 10px; border-radius: 20px; gap: 8px; }
    .badge-icon { 
      font-size: 18px; width: 20px; height: 20px; 
      &.is-text { font-size: 10px; }
    }
  }

  &.xl {
    .pill-container { padding: 8px 14px; border-radius: 24px; gap: 10px; }
    .badge-icon { 
      font-size: 22px; width: 26px; height: 26px; 
      &.is-text { font-size: 12px; }
    }
  }

  .pill-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    background: Rgba(0, 0, 0, 0.7);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    -webkit-backdrop-filter: Blur(10px); backdrop-filter: Blur(10px);
    box-shadow: 0 4px 15px Rgba(0,0,0,0.5);
    height: fit-content;
    width: fit-content;
  }

  .badge-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    @include pixelated;
    transition: all 0.2s ease;
    color: var(--badge-color, #ccc);
    font-weight: 900;
    line-height: 1;
    text-align: center;

    // NORMALIZACIÓN VISUAL ESTÁNDAR (MD, LG, XL)
    &.is-shiny { font-size: 0.85em; } 
    &.is-iv31 { font-size: 0.75em; letter-spacing: -0.5px; font-weight: 900; }
    &.is-fav { font-size: 0.8em; transform: Scale(0.95); }
    &.is-breed { font-size: 1.6em; transform: Scale(1.1); } 
    &.is-competitive { font-size: 1.4em; transform: Scale(1.1); } 
    &.is-box { font-size: 1.4em; transform: Scale(1.1); } 
    &.is-trade { font-size: 1.3em; transform: Scale(1.1); } 
    &.is-item { font-size: 1.1em; }

    &.is-inactive {
      opacity: 0.4;
      filter: Grayscale(1) Brightness(0.6);
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

    &:hover {
      transform: Scale(1.3) !important;
      filter: Brightness(1.2);
      z-index: calc(var(--z-low) + 1);
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
