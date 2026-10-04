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

function onItemMouseEnter(e: MouseEvent): void {
  if (e.currentTarget) {
    gsap.to(e.currentTarget, { x: 4, duration: 0.2, ease: 'power1.out' })
  }
}

function onItemMouseLeave(e: MouseEvent): void {
  if (e.currentTarget) {
    gsap.to(e.currentTarget, { x: 0, duration: 0.2, ease: 'power1.out' })
  }
}

function onItemImgError(e: Event): void {
  const target = e.target as HTMLImageElement | null
  if (target) {
    target.src = _getAssetUrl(ASSET_TYPES.ITEM, 'potion')
  }
}
</script>

<template>
  <div 
    class="selectable-item-card"
    :class="[ { selected: isSelected }, tierClass ]"
    :style="{ '--tier-color': tierColor }"
    @click.stop="$emit('select')"
    @mouseenter="onItemMouseEnter"
    @mouseleave="onItemMouseLeave"
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
          :alt="item.name || 'Objeto'"
          class="i-sprite pixelated"
          @error="onItemImgError"
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
  position: relative;
  padding: 0;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 16px;
  background: Rgb(255 255 255 / 3%);
  content-visibility: auto;
  contain-intrinsic-size: 0 68px;
  cursor: pointer;
  margin-bottom: 8px;

  .item-tooltip-trigger {
    display: flex !important;
    align-items: center;
    gap: 15px;
    width: 100%;
    padding: 12px 16px;
    box-sizing: border-box;
  }

  // Tier Colors & Glows
  &.tier-common {
    background: Rgb(148 163 184 / 4%);
    border-color: Rgb(148 163 184 / 35%);
    &:hover {
      background: Rgb(148 163 184 / 8%);
      border-color: Rgb(148 163 184 / 55%);
    }
    .item-bg-glow {
      background: Radial-Gradient(circle, Rgb(148 163 184 / 30%) 0%, transparent 70%);
    }
  }

  &.tier-rare {
    background: Rgb(59 130 246 / 8%);
    border-color: Rgb(59 130 246 / 45%);
    &:hover {
      background: Rgb(59 130 246 / 12%);
      border-color: Rgb(59 130 246 / 75%);
    }
    .item-bg-glow {
      background: Radial-Gradient(circle, Rgb(59 130 246 / 45%) 0%, transparent 70%);
    }
  }

  &.tier-epic {
    background: Rgb(168 85 247 / 8%);
    border-color: Rgb(168 85 247 / 45%);
    &:hover {
      background: Rgb(168 85 247 / 12%);
      border-color: Rgb(168 85 247 / 75%);
    }
    .item-bg-glow {
      background: Radial-Gradient(circle, Rgb(168 85 247 / 45%) 0%, transparent 70%);
    }
  }

  &.tier-legend {
    background: Rgb(245 158 11 / 10%);
    border-color: Rgb(245 158 11 / 55%);
    &:hover {
      background: Rgb(245 158 11 / 15%);
      border-color: Rgb(245 158 11 / 85%);
    }
    .item-bg-glow {
      background: Radial-Gradient(circle, Rgb(245 158 11 / 55%) 0%, transparent 70%);
    }
  }

  &.selected {
    background: Rgb(56 189 248 / 10%);
    border-color: Rgb(56 189 248 / 50%) !important;
    box-shadow: 0 0 15px Rgb(56 189 248 / 15%);
    
    .selection-indicator .check-circle {
      background: Rgb(56 189 248 / 100%);
      color: white;
      border-color: Rgb(56 189 248 / 100%);
    }
  }

  .item-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;

    .item-bg-glow {
      position: absolute;
      z-index: var(--z-map-floor);
      width: 100%;
      height: 100%;
      opacity: 0.95;
      pointer-events: none;
      filter: Blur(2px);
    }

    .i-sprite {
      z-index: calc(var(--z-map-floor) + 1);
      width: 32px;
      height: 32px;
      object-fit: contain;
      filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));
    }
  }

  .item-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;

    .i-name {
      @include pixelated;

      padding: 2px 0;
      color: var(--white);
      font-size: 9px;
      font-weight: bold;
      line-height: 1.5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

          color: $muted;
          font-size: 8px;
        }
      }
    }
  }

  .price-pills-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }

  .price-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1.5px 6px;
    border: 1px solid transparent;
    border-radius: 99px;
    white-space: nowrap;

    .pill-label {
      @include pixelated;

      font-size: 6.5px;
      font-weight: bold;
      opacity: 0.85;
    }

    .pill-amount {
      @include pixelated;

      font-size: 7px;
      font-weight: 900;
    }

    &.shop-pill {
      background: Linear-Gradient(135deg, #15803d, #166534);
      border-color: #22c55e;
      .pill-label { color: #86efac; }
      .pill-amount { color: #dcfce7; }
    }

    &.min-pill {
      background: Linear-Gradient(135deg, #0369a1, #075985);
      border-color: #0ea5e9;
      .pill-label { color: #7dd3fc; }
      .pill-amount { color: #e0f2fe; }
    }

    &.avg-pill {
      background: Linear-Gradient(135deg, #6d28d9, #5b21b6);
      border-color: #8b5cf6;
      .pill-label { color: #c4b5fd; }
      .pill-amount { color: #f5f3ff; }
    }

    &.max-pill {
      background: Linear-Gradient(135deg, #c2410c, #9a3412);
      border-color: #f97316;
      .pill-label { color: #fdba74; }
      .pill-amount { color: #ffedd5; }
    }

    &.no-gts-pill {
      background: Rgb(255 255 255 / 5%);
      border-color: Rgb(255 255 255 / 10%);
      .pill-label { color: #94a3b8; }
      .pill-amount { color: #cbd5e1; }
    }
  }

  .selection-indicator {
    flex-shrink: 0;
    .check-circle {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 18px;
      height: 18px;
      border: 2px solid Rgb(255 255 255 / 10%);
      border-radius: 50%;
      font-size: 10px;

      .checkmark-svg {
        display: block;
        width: 65%;
        height: 65%;
        stroke: currentColor;
      }
    }
  }
}
</style>

