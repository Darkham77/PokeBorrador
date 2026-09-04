<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { gsap } from 'gsap'
import type { ItemTier } from '@/types/inventory/items'

interface InventoryItem {
  id: string
  name: string
  qty: number
  desc: string
  price?: number
  tier?: ItemTier
}

const props = defineProps<{
  item: InventoryItem
  isSelected: boolean
  gtsStats?: { min: number; max: number; avg: number }
}>()

defineEmits<{
  (e: 'select'): void
}>()

// Expose to template
const _getAssetUrl = getAssetUrl

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

const tierTooltipDesc = computed(() => {
  const tier = `• ${tierLabel.value}`
  return props.item.desc ? `${tier}\n${props.item.desc}` : tier
})

const tierColor = computed(() => {
  const tier = props.item.tier || 'common'
  if (tier === 'rare') return '#3b82f6'
  if (tier === 'epic') return '#a855f7'
  if (tier === 'legend') return 'var(--yellow)'
  return '#94a3b8'
})
</script>

<template>
  <div 
    class="selectable-item-card"
    :class="[ { selected: isSelected }, tierClass ]"
    :style="{ '--tier-color': tierColor }"
    @click.stop="$emit('select')"
    @mouseenter="(e) => gsap.to(e.currentTarget, { x: 4, duration: 0.2, ease: 'power1.out' })"
    @mouseleave="(e) => gsap.to(e.currentTarget, { x: 0, duration: 0.2, ease: 'power1.out' })"
  >
    <PVTooltip
      :title="item.name"
      :description="tierTooltipDesc"
      position="top"
      tag="div"
      class="item-tooltip-trigger"
    >
      <div class="item-visual">
        <div class="item-bg-glow" />
        <img 
          :src="_getAssetUrl(ASSET_TYPES.ITEM, item.id)" 
          class="i-sprite pixelated"
          @error="(e: Event) => (e.target as HTMLImageElement).src = _getAssetUrl(ASSET_TYPES.ITEM, 'potion')"
        >
      </div>
      <div class="item-details">
        <span class="i-name">{{ item.name }}</span>
        <div class="i-meta">
          <div class="meta-row-top">
            <span class="i-qty">STOCK: {{ item.qty }}</span>
            <!-- Shop Buying Price next to Stock -->
            <div class="price-pill shop-pill">
              <span class="pill-label">TIENDA:</span>
              <span class="pill-amount">₱{{ (item.price || 0).toLocaleString() }}</span>
            </div>
          </div>
          
          <!-- GTS Price Pills Row on separate line -->
          <div class="price-pills-row">
            <template v-if="gtsStats">
              <!-- GTS Min Price -->
              <div class="price-pill min-pill">
                <span class="pill-label">MIN:</span>
                <span class="pill-amount">₱{{ Math.round(gtsStats.min).toLocaleString() }}</span>
              </div>
              
              <!-- GTS Avg Price -->
              <div class="price-pill avg-pill">
                <span class="pill-label">PROM:</span>
                <span class="pill-amount">₱{{ Math.round(gtsStats.avg).toLocaleString() }}</span>
              </div>
              
              <!-- GTS Max Price -->
              <div class="price-pill max-pill">
                <span class="pill-label">MAX:</span>
                <span class="pill-amount">₱{{ Math.round(gtsStats.max).toLocaleString() }}</span>
              </div>
            </template>
            <template v-else>
              <div class="price-pill no-gts-pill">
                <span class="pill-label">GTS:</span>
                <span class="pill-amount">Sin ofertas</span>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="selection-indicator">
        <div class="check-circle">
          <svg
            v-if="isSelected"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="checkmark-svg"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
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

  // Tier Colors & Glows
  &.tier-common {
    border-color: Rgba(148, 163, 184, 0.35);
    background: Rgba(148, 163, 184, 0.04);
    .item-bg-glow {
      background: radial-gradient(circle, Rgba(148, 163, 184, 0.3) 0%, transparent 70%);
    }
    &:hover {
      border-color: Rgba(148, 163, 184, 0.55);
      background: Rgba(148, 163, 184, 0.08);
    }
  }

  &.tier-rare {
    border-color: Rgba(59, 130, 246, 0.45);
    background: Rgba(59, 130, 246, 0.08);
    .item-bg-glow {
      background: radial-gradient(circle, Rgba(59, 130, 246, 0.45) 0%, transparent 70%);
    }
    &:hover {
      border-color: Rgba(59, 130, 246, 0.75);
      background: Rgba(59, 130, 246, 0.12);
    }
  }

  &.tier-epic {
    border-color: Rgba(168, 85, 247, 0.45);
    background: Rgba(168, 85, 247, 0.08);
    .item-bg-glow {
      background: radial-gradient(circle, Rgba(168, 85, 247, 0.45) 0%, transparent 70%);
    }
    &:hover {
      border-color: Rgba(168, 85, 247, 0.75);
      background: Rgba(168, 85, 247, 0.12);
    }
  }

  &.tier-legend {
    border-color: Rgba(245, 158, 11, 0.55);
    background: Rgba(245, 158, 11, 0.1);
    .item-bg-glow {
      background: radial-gradient(circle, Rgba(245, 158, 11, 0.55) 0%, transparent 70%);
    }
    &:hover {
      border-color: Rgba(245, 158, 11, 0.85);
      background: Rgba(245, 158, 11, 0.15);
    }
  }

  &.selected {
    background: Rgba(56, 189, 248, 0.1);
    border-color: Rgba(56, 189, 248, 0.5) !important;
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
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;

    .item-bg-glow {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: var(--z-map-floor);
      opacity: 0.95;
      pointer-events: none;
      filter: Blur(2px);
    }

    .i-sprite {
      width: 32px;
      height: 32px;
      object-fit: contain;
      z-index: calc(var(--z-map-floor) + 1);
      filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));
    }
  }

  .item-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    .i-name {
      @include pixelated;
      font-size: 9px;
      font-weight: bold;
      color: var(--white);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5;
      padding-top: 2px;
    }

    .i-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .meta-row-top {
        display: flex;
        align-items: center;
        gap: 10px;

        .i-qty {
          @include pixelated;
          font-size: 8px;
          color: $muted;
        }
      }
    }
  }

  .price-pills-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
    align-items: center;
  }

  .price-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border-radius: 99px;
    padding: 1.5px 6px;
    white-space: nowrap;
    border: 1px solid transparent;

    .pill-label {
      @include pixelated;
      font-size: 6.5px;
      opacity: 0.85;
      font-weight: bold;
    }

    .pill-amount {
      @include pixelated;
      font-size: 7px;
      font-weight: 900;
    }

    &.shop-pill {
      background: linear-gradient(135deg, #15803d, #166534);
      border-color: #22c55e;
      .pill-label { color: #86efac; }
      .pill-amount { color: #dcfce7; }
    }

    &.min-pill {
      background: linear-gradient(135deg, #0369a1, #075985);
      border-color: #0ea5e9;
      .pill-label { color: #7dd3fc; }
      .pill-amount { color: #e0f2fe; }
    }

    &.avg-pill {
      background: linear-gradient(135deg, #6d28d9, #5b21b6);
      border-color: #8b5cf6;
      .pill-label { color: #c4b5fd; }
      .pill-amount { color: #f5f3ff; }
    }

    &.max-pill {
      background: linear-gradient(135deg, #c2410c, #9a3412);
      border-color: #f97316;
      .pill-label { color: #fdba74; }
      .pill-amount { color: #ffedd5; }
    }

    &.no-gts-pill {
      background: Rgba(255, 255, 255, 0.05);
      border-color: Rgba(255, 255, 255, 0.1);
      .pill-label { color: #94a3b8; }
      .pill-amount { color: #cbd5e1; }
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

      .checkmark-svg {
        width: 65%;
        height: 65%;
        stroke: currentColor;
        display: block;
      }
    }
  }
}
</style>

