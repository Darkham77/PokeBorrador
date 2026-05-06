<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  item: any
  isSelected?: boolean
  multiSelectMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  multiSelectMode: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const tierClass = computed(() => `tier-${props.item.tier || 'common'}`)
const tierLabel = computed(() => {
  const labels: Record<string, string> = {
    common: 'Común',
    rare: 'Raro',
    epic: 'Épico',
    legend: 'Legendario'
  }
  return labels[props.item.tier || 'common']
})

const itemIcon = computed(() => {
  if (props.item.sprite) return getAssetUrl(ASSET_TYPES.ITEM, props.item.sprite)
  return null
})
</script>

<template>
  <div 
    class="inventory-item-card"
    :class="{ 
      selected: isSelected,
      'multi-mode': multiSelectMode,
      [tierClass]: true
    }"
    @click.stop="$emit('click', $event)"
  >
    <PVTooltip
      :title="item.name"
      :description="item.desc"
      position="top"
      class="card-tooltip-trigger"
    >
      <!-- TIER BADGE -->
      <div class="item-tier-badge">
        {{ tierLabel }}
      </div>

      <!-- ICON AREA -->
      <div class="item-visual-wrap">
        <div class="item-bg-glow" />
        
        <img
          v-if="itemIcon"
          :src="itemIcon"
          :alt="item.name"
          class="item-sprite"
          @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
        >
        <span
          v-else
          class="fallback-icon"
        >{{ item.icon || '📦' }}</span>

        <!-- QUANTITY PILL -->
        <div class="quantity-pill">
          <span class="label">x</span>
          <span class="value">{{ item.qty }}</span>
        </div>
      </div>

      <!-- ITEM NAME -->
      <div class="item-footer">
        <span class="item-name">{{ item.name }}</span>
      </div>

      <!-- SELECTION INDICATOR -->
      <div
        v-if="multiSelectMode"
        class="selection-check"
      >
        <div
          class="check-box"
          :class="{ checked: isSelected }"
        >
          <span v-if="isSelected">✓</span>
        </div>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.inventory-item-card {
  @include card-premium(16px);
  width: 100%;
  min-width: 0; // Fix grid cell overflow
  aspect-ratio: 1 / 1.1;
  align-self: start; // Prevent vertical stretch
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  cursor: pointer;

  :deep(.card-tooltip-trigger) {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 12px;
    gap: 8px;
    box-sizing: border-box;
  }

  @include hover-neon-yellow(1px);

  &.selected {
    border-color: var(--yellow) !important;
    background: Rgba(255, 214, 10, 0.08);
    transform: Scale(0.98);
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border: 2px solid var(--yellow);
      border-radius: inherit;
      pointer-events: none;
      animation: borderPulse 2s infinite;
    }
  }

  .item-tier-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 6px;
    background: Rgba(0, 0, 0, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    @include pixelated;
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.6);
    z-index: var(--z-low);
  }

  .item-visual-wrap {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 0;

    .item-bg-glow {
      position: absolute;
      width: 60%;
      height: 60%;
      background: Radial-Gradient(circle, Rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      filter: Blur(5px);
      z-index: var(--z-base);
    }

    .item-sprite {
      width: 48px;
      height: 48px;
      object-fit: contain;
      image-rendering: pixelated;
      z-index: calc(var(--z-base) + 1);
      filter: Drop-Shadow(0 4px 8px Rgba(0, 0, 0, 0.3));
      transition: transform 0.3s ease;
    }

    .fallback-icon {
      font-size: 32px;
      z-index: calc(var(--z-base) + 1);
    }

    .quantity-pill {
      position: absolute;
      bottom: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 1px;
      background: Linear-Gradient(135deg, #1e293b, #0f172a);
      border: 1px solid Rgba(255, 255, 255, 0.15);
      padding: 2px 6px;
      border-radius: 8px;
      box-shadow: 0 4px 10px Rgba(0, 0, 0, 0.4);
      z-index: var(--z-low);

      .label {
        font-size: 8px;
        color: var(--yellow);
        @include pixelated;
      }

      .value {
        font-size: 10px;
        font-weight: 800;
        color: white;
      }
    }
  }

  .item-footer {
    width: 100%;
    text-align: center;
    padding-top: 4px;
    border-top: 1px solid Rgba(255, 255, 255, 0.05);

    .item-name {
      display: block;
      @include pixelated;
      font-size: 7px;
      color: Rgba(255, 255, 255, 0.9);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .selection-check {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: calc(var(--z-low) + 1);

    .check-box {
      width: 18px;
      height: 18px;
      background: Rgba(0, 0, 0, 0.4);
      border: 1px solid Rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &.checked {
        background: var(--yellow);
        border-color: var(--yellow);
        color: black;
        font-weight: 900;
        font-size: 10px;
        box-shadow: 0 0 10px Rgba(255, 214, 10, 0.5);
      }
    }
  }

  // TIER VARIANTS
  &.tier-rare {
    border-color: Rgba(59, 130, 246, 0.2);
    .item-tier-badge { color: $blue; }
    .item-bg-glow { background: Radial-Gradient(circle, Rgba(59, 130, 246, 0.15) 0%, transparent 70%); }
  }

  &.tier-epic {
    border-color: Rgba(168, 85, 247, 0.2);
    .item-tier-badge { color: $purple; }
    .item-bg-glow { background: Radial-Gradient(circle, Rgba(168, 85, 247, 0.15) 0%, transparent 70%); }
  }

  &.tier-legend {
    border-color: Rgba(245, 158, 11, 0.2);
    .item-tier-badge { color: var(--yellow); }
    .item-bg-glow { background: Radial-Gradient(circle, Rgba(245, 158, 11, 0.15) 0%, transparent 70%); }
  }

  &:hover {
    .item-sprite {
      transform: TranslateY(-4px) Scale(1.1);
    }
  }
}

@keyframes borderPulse {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}
</style>
