<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface InventoryItem {
  id: string
  name: string
  desc?: string
  sprite?: string
  icon?: string
  qty: number
  tier?: 'common' | 'rare' | 'epic' | 'legend'
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

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const hasError = ref(false)
const cardRef = ref<HTMLElement | null>(null)

watch(() => props.item.sprite, () => {
  hasError.value = false
})

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

const itemFontSize = computed(() => {
  const name = props.item.name || ''
  const words = name.split(/\s+/)
  const maxWordLength = Math.max(...words.map(w => w.length))
  const totalLength = name.length
  
  const divisor = Math.max(maxWordLength, totalLength / 2.1)
  
  const minFontSize = divisor >= 10 ? 4.5 : (divisor >= 8 ? 5.2 : 6.2)
  const maxFontSize = 10
  
  return `clamp(${minFontSize}px, calc(72cqw / ${divisor}), ${maxFontSize}px)`
})

const tierColor = computed(() => {
  const tier = props.item.tier || 'common'
  if (tier === 'rare') return '#3b82f6'
  if (tier === 'epic') return '#a855f7'
  if (tier === 'legend') return 'var(--yellow)'
  return 'var(--yellow)'
})

// ── WATCHERS FOR SELECTION STATE ─────────────────────────────────────────────

watch(() => props.isSelected, (newVal) => {
  if (!cardRef.value) return
  const checkBox = cardRef.value.querySelector('.check-box')
  
  if (newVal) {
    gsap.to(cardRef.value, {
      scale: 0.98,
      y: 0,
      borderColor: 'var(--blue)',
      boxShadow: 'inset 0 0 0 4px var(--blue), 0 0 20px Rgba(10, 132, 255, 0.4)',
      duration: 0.2,
      ease: 'power2.out'
    })
    if (checkBox) {
      gsap.to(checkBox, {
        backgroundColor: 'var(--yellow)',
        borderColor: 'var(--yellow)',
        boxShadow: '0 0 10px Rgba(255, 214, 10, 0.5)',
        duration: 0.2,
        ease: 'power2.out'
      })
    }
  } else {
    // Reset to base state
    const tier = props.item.tier || 'common'
    let baseBorderColor = 'Rgba(255, 255, 255, 0.05)'
    if (tier === 'rare') baseBorderColor = 'Rgba(59, 130, 246, 0.2)'
    else if (tier === 'epic') baseBorderColor = 'Rgba(168, 85, 247, 0.2)'
    else if (tier === 'legend') baseBorderColor = 'Rgba(245, 158, 11, 0.2)'

    gsap.to(cardRef.value, {
      y: 0,
      scale: 1,
      borderColor: baseBorderColor,
      boxShadow: '0 10px 40px Rgba(0, 0, 0, 0.8)',
      duration: 0.4,
      ease: 'power2.out'
    })
    if (checkBox) {
      gsap.to(checkBox, {
        backgroundColor: 'Rgba(0, 0, 0, 0.4)',
        borderColor: 'Rgba(255, 255, 255, 0.2)',
        boxShadow: 'none',
        duration: 0.2,
        ease: 'power2.out'
      })
    }
  }
}, { immediate: true })

onMounted(() => {
  // Apply initial states if selected at mount
  if (props.isSelected && cardRef.value) {
    gsap.set(cardRef.value, {
      scale: 0.98,
      borderColor: 'var(--blue)',
      boxShadow: 'inset 0 0 0 4px var(--blue), 0 0 20px Rgba(10, 132, 255, 0.4)'
    })
    const checkBox = cardRef.value.querySelector('.check-box')
    if (checkBox) {
      gsap.set(checkBox, {
        backgroundColor: 'var(--yellow)',
        borderColor: 'var(--yellow)',
        boxShadow: '0 0 10px Rgba(255, 214, 10, 0.5)'
      })
    }
  }
})
</script>

<template>
  <div 
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
          v-if="itemIcon && !hasError"
          :src="itemIcon"
          :alt="item.name"
          class="item-sprite"
          @error="hasError = true"
        >
        <span
          v-else
          class="fallback-icon"
        >🚫</span>

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
  overflow: visible !important; // Permitir que el badge respire por debajo
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  cursor: pointer;
  container-type: inline-size;

  :deep(.card-tooltip-trigger) {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: clamp(6px, 8cqw, 12px);
    gap: clamp(4px, 6cqw, 8px);
    box-sizing: border-box;
  }

  @include gpu-layer;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, Rgba(255, 255, 255, 0.1), transparent 70%);
    opacity: 0.4; // Consistent base sheen
    pointer-events: none;
    z-index: var(--z-map-floor);
  }
  
  // TIER VARIANTS
  &.tier-rare {
    border-color: Rgba(59, 130, 246, 0.2);
    .item-tier-badge { color: #3b82f6; }
    .item-bg-glow { background: radial-gradient(circle, Rgba(59, 130, 246, 0.15) 0%, transparent 70%); }
  }

  &.tier-epic {
    border-color: Rgba(168, 85, 247, 0.2);
    .item-tier-badge { color: #a855f7; }
    .item-bg-glow { background: radial-gradient(circle, Rgba(168, 85, 247, 0.15) 0%, transparent 70%); }
  }

  &.tier-legend {
    border-color: Rgba(245, 158, 11, 0.2);
    .item-tier-badge { color: var(--yellow); }
    .item-bg-glow { background: radial-gradient(circle, Rgba(245, 158, 11, 0.15) 0%, transparent 70%); }
  }

  .item-tier-badge {
    position: absolute;
    top: clamp(4px, 6cqw, 8px);
    left: clamp(4px, 6cqw, 8px);
    padding: clamp(1px, 2cqw, 2px) clamp(3px, 5cqw, 6px);
    background: Rgba(0, 0, 0, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    @include pixelated;
    font-size: clamp(8px, 6cqw, 10px);
    color: Rgba(255, 255, 255, 0.6);
    z-index: var(--z-low);
    max-width: calc(100% - 16px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
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
      background: radial-gradient(circle, Rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      will-change: transform, filter, opacity;
      filter: Blur(5px);
      z-index: var(--z-base);
    }

    .item-sprite {
      width: clamp(28px, 45cqw, 72px);
      height: clamp(28px, 45cqw, 72px);
      object-fit: contain;
      @include pixelated;
      z-index: calc(var(--z-base) + 1);
      will-change: transform, filter, opacity;
      filter: Drop-Shadow(0 4px 8px Rgba(0, 0, 0, 0.3));
    }

    .fallback-icon {
      font-size: clamp(16px, 30cqw, 40px);
      z-index: calc(var(--z-base) + 1);
    }

    .quantity-pill {
      position: absolute;
      bottom: clamp(2px, 4cqw, 6px);
      right: clamp(2px, 4cqw, 6px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid var(--yellow); 
      padding: clamp(1px, 2cqw, 2px) clamp(4px, 6cqw, 8px);
      border-radius: 6px;
      box-shadow: 0 4px 10px Rgba(0, 0, 0, 0.4);
      z-index: var(--z-low);
      min-width: clamp(28px, 32cqw, 36px);
      height: clamp(14px, 16cqw, 18px);
      box-sizing: border-box;

      .label {
        font-size: clamp(8px, 6cqw, 9px);
        color: var(--yellow);
        line-height: 1;
        margin-top: -1px; // Pixel font alignment
      }

      .value {
        @include pixelated;
        font-size: clamp(8px, 6cqw, 9px);
        font-weight: 900;
        color: white;
        line-height: 1;
      }
    }
  }

  .item-footer {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: clamp(2px, 3cqw, 4px);
    border-top: 1px solid Rgba(255, 255, 255, 0.05);
    height: 2.4em; // Fixed footer height for visual grid alignment
    box-sizing: border-box;

    .item-name {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      @include pixelated;
      line-height: 1.1;
      color: Rgba(255, 255, 255, 0.9);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal; // Ensure wrapping is enabled
      overflow-wrap: break-word;
      word-break: normal;
      width: 100%;
      text-align: center;
    }
  }

  .selection-check {
    position: absolute;
    top: clamp(4px, 6cqw, 8px);
    right: clamp(4px, 6cqw, 8px);
    z-index: calc(var(--z-low) + 1);

    .check-box {
      width: clamp(12px, 15cqw, 18px);
      height: clamp(12px, 15cqw, 18px);
      background: Rgba(0, 0, 0, 0.4);
      border: 1px solid Rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      will-change: background-color, border-color, box-shadow;
    }
  }
}
</style>
