<script setup>
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

defineProps({
  item: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  multiSelectMode: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<template>
  <div 
    class="item-node"
    :class="{ 
      selected: isSelected,
      'multi-mode': multiSelectMode
    }"
    @click="$emit('click')"
  >
    <div class="item-icon-wrap">
      <img
        :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
        :alt="item.name"
        class="item-sprite"
        onerror="this.style.display='none'"
        @error="e => e.target.style.display = 'none'"
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
.item-node {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    transform: TranslateX(4px);
  }

  &.selected {
    border-color: var(--yellow);
    background: rgba(255, 214, 10, 0.05);
  }

  .item-icon-wrap {
    width: 60px;
    height: 60px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    .item-sprite { width: 40px; height: 40px; image-rendering: pixelated; }
    .fallback-icon { font-size: 24px; }
    
    .quantity {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background: var(--yellow);
      color: $black;
      font-size: 9px;
      font-family: 'Press Start 2P', cursive;
      padding: 2px 6px;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
  }

  .item-info {
    flex: 1;
    .item-name { font-weight: 800; font-size: 15px; color: #f1f5f9; margin-bottom: 4px; }
    .item-desc { font-size: 11px; color: $muted; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  }

  .selection-indicator {
    .check {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      
      &.checked {
        background: var(--yellow);
        border-color: var(--yellow);
        span { color: $black; font-weight: 900; }
      }
    }
  }
}
</style>
