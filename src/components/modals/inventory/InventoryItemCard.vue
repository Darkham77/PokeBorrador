<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'
import type { ItemTier } from '@/types/inventory/items'

interface InventoryItem {
  id: string
  name: string
  desc?: string
  sprite?: string
  icon?: string
  qty: number
  tier?: ItemTier
  price?: number
}

interface Props {
  item: InventoryItem
  isSelected?: boolean
  multiSelectMode?: boolean
  sellMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  multiSelectMode: false,
  sellMode: false
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const hasError = ref(false)
const cardRef = ref<HTMLElement | null>(null)

watch(() => props.item.sprite, () => {
  hasError.value = false
})

const tierClass = computed(() => `tier-${props.item.tier || 'common'}`)
const tierLabel = computed(() => getItemTierLabel(props.item.tier))

// Prepend tier label to tooltip description
const tierTooltipDesc = computed(() => {
  const tier = `• ${tierLabel.value}`
  return props.item.desc ? `${tier}\n${props.item.desc}` : tier
})

const itemIcon = computed(() => {
  if (props.item.sprite) return getAssetUrl(ASSET_TYPES.ITEM, props.item.sprite)
  return null
})

const itemFontSize = computed(() => {
  const name = props.item.name || ''
  const words = name.split(/\s+/)
  const maxWordLength = Math.max(...words.map(w => w.length))
  const totalLength = name.length
  
  const divisor = Math.max(maxWordLength, totalLength / 1.7)
  
  const minFontSize = 7
  const maxFontSize = 9.5
  
  return `clamp(${minFontSize}px, calc(80cqw / ${divisor}), ${maxFontSize}px)`
})

const tierColor = computed(() => getItemTierColor(props.item.tier))

// ── WATCHERS FOR SELECTION STATE ─────────────────────────────────────────────
const getBaseColors = () => {
  const tier = props.item.tier || 'common'
  let baseBorderColor = 'rgba(148, 163, 184, 0.45)'
  let baseBoxShadow = '0 0 10px rgba(148, 163, 184, 0.15), inset 0 0 6px rgba(148, 163, 184, 0.05)'
  let baseGlow = 'radial-gradient(circle, rgba(148, 163, 184, 0.12) 0%, transparent 70%)'
  
  if (tier === 'rare') {
    baseBorderColor = 'rgba(59, 130, 246, 0.55)'
    baseBoxShadow = '0 0 10px rgba(59, 130, 246, 0.2), inset 0 0 6px rgba(59, 130, 246, 0.08)'
    baseGlow = 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%)'
  } else if (tier === 'epic') {
    baseBorderColor = 'rgba(168, 85, 247, 0.55)'
    baseBoxShadow = '0 0 10px rgba(168, 85, 247, 0.2), inset 0 0 6px rgba(168, 85, 247, 0.08)'
    baseGlow = 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)'
  } else if (tier === 'legend') {
    baseBorderColor = 'rgba(245, 158, 11, 0.65)'
    baseBoxShadow = '0 0 12px rgba(245, 158, 11, 0.25), inset 0 0 8px rgba(245, 158, 11, 0.1)'
    baseGlow = 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)'
  }
  return { baseBorderColor, baseBoxShadow, baseGlow }
}

const CARD_SCALE_SELECTED = 0.98

watch(() => props.isSelected, (newVal) => {
  if (!cardRef.value) return
  const checkBox = cardRef.value.querySelector('.check-box')
  
  if (newVal) {
    gsap.to(cardRef.value, {
      scale: CARD_SCALE_SELECTED,
      y: 0,
      borderColor: 'var(--blue)',
      boxShadow: 'inset 0 0 0 4px var(--blue), 0 0 20px Rgba(10, 132, 255, 0.4)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
    if (checkBox) {
      gsap.to(checkBox, {
        backgroundColor: 'var(--yellow)',
        borderColor: 'var(--yellow)',
        boxShadow: '0 0 10px Rgba(255, 214, 10, 0.5)',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  } else {
    // Reset to base state
    const { baseBorderColor, baseBoxShadow } = getBaseColors()

    gsap.to(cardRef.value, {
      y: 0,
      scale: 1,
      borderColor: baseBorderColor,
      boxShadow: baseBoxShadow,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
    if (checkBox) {
      gsap.to(checkBox, {
        backgroundColor: 'Rgba(0, 0, 0, 0.4)',
        borderColor: 'Rgba(255, 255, 255, 0.2)',
        boxShadow: 'none',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  }
}, { immediate: true })

onMounted(() => {
  // Apply initial states
  if (cardRef.value) {
    const { baseBorderColor, baseBoxShadow, baseGlow } = getBaseColors()
    
    if (props.isSelected) {
      gsap.set(cardRef.value, {
        scale: CARD_SCALE_SELECTED,
        borderColor: 'var(--blue)',
        boxShadow: 'inset 0 0 0 4px var(--blue), 0 0 20px rgba(10, 132, 255, 0.4)'
      })
      const checkBox = cardRef.value.querySelector('.check-box')
      if (checkBox) {
        gsap.set(checkBox, {
          backgroundColor: 'var(--yellow)',
          borderColor: 'var(--yellow)',
          boxShadow: '0 0 10px rgba(255, 214, 10, 0.5)'
        })
      }
    } else {
      // Set precise initial style for the tier to prevent unstyled flash before hover
      gsap.set(cardRef.value, {
        borderColor: baseBorderColor,
        boxShadow: baseBoxShadow
      })
      const glow = cardRef.value.querySelector('.item-bg-glow')
      if (glow) {
        gsap.set(glow, {
          backgroundImage: baseGlow,
          scale: 0.8,
          opacity: 0.7
        })
      }
    }
  }
})
</script>

<template>
  <div 
    :id="`inventory-item-${item.id}`"
    ref="cardRef"
    class="inventory-item-card"
    :class="{ 
      selected: isSelected,
      'multi-mode': multiSelectMode,
      [tierClass]: true
    }"
    :style="{ '--tier-color': tierColor }"
    @click.stop="$emit('click', $event)"
  >
    <PVTooltip
      :title="item.name"
      :description="tierTooltipDesc"
      position="top"
      class="card-tooltip-trigger"
    >
      <!-- ICON AREA -->
      <div class="item-visual-wrap">
        <div class="item-bg-glow" />

        <img
          v-if="itemIcon && !hasError"
          :src="itemIcon"
          :alt="item.name"
          class="item-sprite"
          @error="hasError = true"
        >
        <span
          v-else
          class="fallback-icon"
        ><span class="emoji">🚫</span></span>

        <!-- QUANTITY PILL -->
        <div class="quantity-pill">
          <span class="label">x</span>
          <span class="value">{{ item.qty }}</span>
        </div>
      </div>

      <!-- ITEM NAME -->
      <div 
        class="item-footer"
        :style="{ fontSize: itemFontSize }"
      >
        <span class="item-name">{{ item.name }}</span>
      </div>

      <!-- SELL PRICE FLOATING PILL -->
      <div
        v-if="sellMode"
        class="sell-price-pill"
      >
        <span class="pill-icon">₱</span>
        <span class="pill-amount">{{ Math.floor((item.price || 0) * 0.5).toLocaleString() }}</span>
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

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.inventory-item-card {
  @include card-premium(16px);
  @include gpu-layer;
  @include item-tier-card;

  position: relative;
  width: 100%;
  min-width: 0; // Fix grid cell overflow
  border: 1px solid Rgb(255 255 255 / 5%);
  background: Rgb(255 255 255 / 2%);
  aspect-ratio: 1 / 1.35; // Adjusted for descriptive name space
  align-self: start; // Prevent vertical stretch
  overflow: visible !important; // Permitir que el badge respire por debajo
  cursor: pointer;
  container-type: inline-size;


  :deep(.card-tooltip-trigger) {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    gap: clamp(4px, 6cqw, 8px);
    width: 100%;
    height: 100%;
    padding: clamp(6px, 8cqw, 12px);
    box-sizing: border-box;
  }

  &::before {
    position: absolute;
    z-index: var(--z-map-floor);
    border-radius: inherit;
    background: Radial-Gradient(circle at top right, Rgb(255 255 255 / 10%), transparent 70%);
    opacity: 0.4; // Consistent base sheen
    content: '';
    inset: 0;
    pointer-events: none;
  }
  
  // TIER VARIANTS — borders always visible, no badge needed
  &.tier-common {
    border-color: Rgb(148 163 184 / 45%);
    box-shadow: 0 0 10px Rgb(148 163 184 / 15%), inset 0 0 6px Rgb(148 163 184 / 5%);
    .item-bg-glow { background: Radial-Gradient(circle, Rgb(148 163 184 / 12%) 0%, transparent 70%); }
  }

  .item-visual-wrap {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 0;
    flex: 1;

    .item-bg-glow {
      position: absolute;
      z-index: var(--z-base);
      width: 60%;
      height: 60%;
      background: Radial-Gradient(circle, Rgb(255 255 255 / 10%) 0%, transparent 70%);
      will-change: transform, filter, opacity;
      filter: Blur(5px);
    }

    .item-sprite {
      @include pixelated;

      z-index: calc(var(--z-base) + 1);
      width: clamp(28px, 45cqw, 72px);
      height: clamp(28px, 45cqw, 72px);
      object-fit: contain;
      will-change: transform, filter, opacity;
      filter: Drop-Shadow(0 4px 8px Rgb(0 0 0 / 30%));
    }

    .fallback-icon {
      z-index: calc(var(--z-base) + 1);
      font-size: clamp(16px, 30cqw, 40px);
    }

    .quantity-pill {
      position: absolute;
      right: clamp(2px, 4cqw, 6px);
      bottom: clamp(2px, 4cqw, 6px);
      z-index: var(--z-low);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2px;
      min-width: clamp(28px, 32cqw, 36px);
      height: clamp(14px, 16cqw, 18px); 
      padding: clamp(1px, 2cqw, 2px) clamp(4px, 6cqw, 8px);
      border: 1px solid var(--yellow);
      border-radius: 6px;
      background: Linear-Gradient(135deg, #1e293b, #0f172a);
      box-shadow: 0 4px 10px Rgb(0 0 0 / 40%);
      box-sizing: border-box;

      .label {
        color: var(--yellow);
        font-size: clamp(8px, 6cqw, 9px);
        margin-top: -1px; // Pixel font alignment
      }

      .value {
        @include pixelated;

        color: white;
        font-size: clamp(8px, 6cqw, 9px);
        font-weight: 900;
      }
    }
  }

  .item-footer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 3.8em;
    padding-top: clamp(2px, 3cqw, 4px);
    border-top: 1px solid Rgb(255 255 255 / 5%);
    box-sizing: border-box;

    .item-name {
      @include pixelated;

      display: -webkit-box;
      width: 100%;
      color: Rgb(255 255 255 / 90%);
      line-height: 1.45;
      text-align: center;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      padding-top: 2px;
      padding-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      overflow-wrap: break-word;
      word-break: normal;
    }
  }

  // Floating sell price pill — overflows below card (overflow: visible on parent)
  .sell-price-pill {
    position: absolute;
    bottom: -10px;
    left: 50%;
    z-index: calc(var(--z-low) + 2);
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: clamp(2px, 2cqw, 3px) clamp(6px, 8cqw, 10px);
    border: 1px solid #22c55e;
    border-radius: 99px;
    background: Linear-Gradient(135deg, #15803d, #166534);
    transform: Translatex(-50%);
    box-shadow: 0 2px 10px Rgb(34 197 94 / 45%), 0 0 0 1px Rgb(34 197 94 / 15%);
    white-space: nowrap;
    pointer-events: none;

    .pill-icon {
      color: #86efac;
      font-family: sans-serif !important;
      font-size: clamp(7px, 7cqw, 9px);
      line-height: 1;
    }

    .pill-amount {
      @include pixelated;

      color: #dcfce7;
      font-size: clamp(6.5px, 7cqw, 8.5px);
      font-weight: 900;
      letter-spacing: 0.03em;
    }
  }

  .selection-check {
    position: absolute;
    top: clamp(4px, 6cqw, 8px);
    right: clamp(4px, 6cqw, 8px);
    z-index: calc(var(--z-low) + 1);

    .check-box {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: clamp(12px, 15cqw, 18px);
      height: clamp(12px, 15cqw, 18px);
      border: 1px solid Rgb(255 255 255 / 20%);
      border-radius: 4px;
      background: Rgb(0 0 0 / 40%);
      color: white;
      will-change: background-color, border-color, box-shadow;

      .checkmark-svg {
        display: block;
        width: 70%;
        height: 70%;
        stroke: currentColor;
      }

      &.checked {
        color: #000 !important;
      }
    }
  }
}
</style>
