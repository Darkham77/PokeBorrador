<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

interface InventoryItem {
  id: string
  name: string
  desc: string
  sprite: string
  icon?: string
  qty: number
}

interface Props {
  item: InventoryItem
  isSelected?: boolean
  multiSelectMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  multiSelectMode: false
})

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div 
    class="item-node"
    :class="{ 
      selected: isSelected,
      'multi-mode': multiSelectMode
    }"
    @click.stop="$emit('click')"
  >
    <div class="item-icon-wrap">
      <img
        :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
        :alt="item.name"
        class="item-sprite"
        @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
      >
      <span
        v-if="!item.sprite"
        class="fallback-icon"
      >{{ item.icon }}</span>
      <span class="quantity">x{{ item.qty }}</span>
    </div>
    <div class="item-info">
      <div class="item-name">
        {{ item.name }}
      </div>
      <div class="item-desc">
        {{ item.desc }}
      </div>
    </div>
    
    <div
      v-if="multiSelectMode"
      class="selection-indicator"
    >
      <div
        class="check"
        :class="{ checked: isSelected }"
      >
        <span v-if="isSelected">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.item-node {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(255, 255, 255, 0.1);
    transform: Translatex(4px);
  }

  &.selected {
    border-color: var(--yellow);
    background: Rgba(255, 214, 10, 0.05);
  }

  .item-icon-wrap {
    width: 60px;
    height: 60px;
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    .item-sprite { width: 40px; height: 40px; @include pixelated; }
    .fallback-icon { font-size: 24px; }
    
    .quantity {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background: var(--yellow);
      color: Rgba(0, 0, 0, 1);
      font-size: 9px;
      @include pixelated;
      padding: 2px 6px;
      border-radius: 6px;
      box-shadow: 0 2px 5px Rgba(0,0,0,0.3);
    }
  }

  .item-info {
    flex: 1;
    .item-name { font-weight: 800; font-size: 15px; color: Rgba(241, 245, 249, 1); margin-bottom: 4px; }
    .item-desc { font-size: 11px; color: $muted; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  }

  .selection-indicator {
    .check {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 2px solid Rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      
      &.checked {
        background: var(--yellow);
        border-color: var(--yellow);
        span { color: Rgba(0, 0, 0, 1); font-weight: 900; }
      }
    }
  }
}
</style>
