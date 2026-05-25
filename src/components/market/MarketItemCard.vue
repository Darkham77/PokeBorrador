<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface InventoryItem {
  name: string
  qty: number
  desc: string
}

defineProps<{
  item: InventoryItem
  isSelected: boolean
}>()

defineEmits<{
  (e: 'select'): void
}>()

// Expose to template
const _ASSET_TYPES = ASSET_TYPES
const _getAssetUrl = getAssetUrl
</script>

<template>
  <div 
    class="selectable-item-card"
    :class="{ selected: isSelected }"
    @click.stop="$emit('select')"
  >
    <PVTooltip
      :title="item.name"
      :description="item.desc"
      position="top"
      tag="div"
      class="item-tooltip-trigger"
    >
      <div class="item-visual">
        <img 
          :src="_getAssetUrl(_ASSET_TYPES.ITEM, item.name)" 
          class="i-sprite pixelated"
          @error="(e: Event) => (e.target as HTMLImageElement).src = _getAssetUrl(_ASSET_TYPES.ITEM, 'Poción')"
        >
      </div>
      <div class="item-details">
        <span class="i-name">{{ item.name }}</span>
        <div class="i-meta">
          <span class="i-qty">STOCK: {{ item.qty }}</span>
        </div>
      </div>
      <div class="selection-indicator">
        <div class="check-circle">
          <span v-if="isSelected">✓</span>
        </div>
      </div>
    </PVTooltip>
  </div>
</template>

<style lang="scss">
@use "@/styles/core/_mixins" as *;

.selectable-item-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  position: relative;
  margin-bottom: 8px;

  .item-tooltip-trigger {
    display: flex !important;
    align-items: center;
    width: 100%;
    gap: 15px;
    padding: 12px 16px;
    box-sizing: border-box;
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    border-color: Rgba(255, 255, 255, 0.1);
    transform: Translatex(4px);
  }

  &.selected {
    background: Rgba(56, 189, 248, 0.1);
    border-color: Rgba(56, 189, 248, 0.5);
    box-shadow: 0 0 15px Rgba(56, 189, 248, 0.15);
    
    .selection-indicator .check-circle {
      border-color: Rgba(56, 189, 248, 1);
      background: Rgba(56, 189, 248, 1);
      color: white;
    }
  }

  .item-visual {
    width: 44px;
    height: 44px;
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .i-sprite {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }
  }

  .item-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    .i-name {
      font-size: 13px;
      font-weight: bold;
      color: var(--white);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .i-meta {
      display: flex;
      gap: 10px;
      .i-qty {
        @include pixelated;
        font-size: 8px;
        color: $muted;
      }
    }
  }

  .selection-indicator {
    flex-shrink: 0;
    .check-circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid Rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
  }
}
</style>
