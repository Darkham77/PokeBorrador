<script setup lang="ts">
import { computed, ref } from 'vue'
import { gsap } from 'gsap'
import { useShopStore } from '@/stores/shop'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

interface ShopItem {
  id: string
  name: string
  warPrice?: number
  desc: string
  sprite: string
  unlockLv?: number
  tier?: string
}

interface Props {
  item: ShopItem
}

const props = defineProps<Props>()

const shopStore = useShopStore()
const warStore = useWarStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const cardRef = ref<HTMLElement | null>(null)

const isUnlocked = computed(() => {
  return (gameStore.state.trainerLevel || 1) >= (props.item.unlockLv || 1)
})

const hasEnoughCoins = computed(() => {
  return (warStore.warCoins || 0) >= (props.item.warPrice || 0)
})

const buy = () => {
  if (!isUnlocked.value) {
    uiStore.notify('¡Objeto bloqueado! Sube tu nivel de entrenador.', '🔒')
    return
  }
  if (!hasEnoughCoins.value) {
    uiStore.notify('No tienes suficientes Monedas de Guerra.', '⚡')
    return
  }
  shopStore.buyItemWar(props.item.id)
}

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}

// ── GSAP HOVER HANDLERS ──────────────────────────────────────────────────────

function handleMouseEnter() {
  if (!cardRef.value || !isUnlocked.value) return
  
  gsap.to(cardRef.value, {
    y: -4,
    borderColor: 'Rgba(239, 68, 68, 0.5)',
    boxShadow: '0 8px 24px Rgba(239, 68, 68, 0.15)',
    duration: 0.3,
    ease: 'power2.out'
  })

  const glow = cardRef.value.querySelector('.glow-bg')
  if (glow) {
    gsap.to(glow, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  const img = cardRef.value.querySelector('.item-visual-box img')
  if (img) {
    gsap.to(img, {
      scale: 1.1,
      rotation: 5,
      duration: 0.3,
      ease: 'power2.out'
    })
  }
}

function handleMouseLeave() {
  if (!cardRef.value || !isUnlocked.value) return

  gsap.to(cardRef.value, {
    y: 0,
    borderColor: 'Rgba(239, 68, 68, 0.2)',
    boxShadow: 'none',
    duration: 0.3,
    ease: 'power2.out'
  })

  const glow = cardRef.value.querySelector('.glow-bg')
  if (glow) {
    gsap.to(glow, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  const img = cardRef.value.querySelector('.item-visual-box img')
  if (img) {
    gsap.to(img, {
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'power2.out'
    })
  }
}

function handleButtonEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: -2,
    boxShadow: '0 6px 20px Rgba(239, 68, 68, 0.4)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

function handleButtonLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: 0,
    boxShadow: '0 4px 12px Rgba(239, 68, 68, 0.2)',
    duration: 0.2,
    ease: 'power2.out'
  })
}
</script>

<template>
  <div 
    ref="cardRef"
    class="war-shop-item-card"
    :class="{ locked: !isUnlocked }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="glow-bg" />
    
    <!-- Tier Tag -->
    <span
      v-if="item.tier"
      class="tier-tag"
      :class="'tier-' + item.tier"
    >
      {{ item.tier.toUpperCase() }}
    </span>

    <div class="item-card-top">
      <div class="item-visual-box">
        <img
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
          :alt="item.name"
          @error="handleImageError"
        >
        
        <!-- Lock Overlay -->
        <div 
          v-if="!isUnlocked"
          class="item-lock-badge"
        >
          <span class="lock-icon">🔒</span>
          <span class="lock-lvl">NV. {{ item.unlockLv }}</span>
        </div>
      </div>

      <div class="item-meta-box">
        <h4 class="item-name">
          {{ item.name }}
        </h4>
        <div class="item-price-wrapper">
          <i class="fa-solid fa-bolt-lightning currency-symbol" />
          <span class="price-val">{{ item.warPrice }}</span>
        </div>
      </div>
    </div>

    <p class="item-desc">
      {{ item.desc }}
    </p>

    <div class="item-actions">
      <button
        v-if="isUnlocked"
        class="btn-war-buy"
        :disabled="!hasEnoughCoins"
        @click.stop="buy"
        @mouseenter="handleButtonEnter"
        @mouseleave="handleButtonLeave"
      >
        {{ hasEnoughCoins ? 'CANJEAR' : 'SIN MONEDAS' }}
      </button>
      <button
        v-else
        class="btn-war-locked"
        disabled
      >
        BLOQUEADO
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.war-shop-item-card {
  position: relative;
  background: Rgba(20, 10, 10, 0.8);
  border: 1px solid Rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  backdrop-filter: Blur(10px);
  will-change: transform, border-color, box-shadow;

  .glow-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, Rgba(239, 68, 68, 0.1) 0%, transparent 100%);
    opacity: 0;
    pointer-events: none;
    will-change: opacity;
  }

  &.locked {
    opacity: 0.7;
    filter: Grayscale(0.5);
    cursor: not-allowed;
  }
}

.tier-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 2;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  
  &.tier-common { background: #94a3b8; color: #0f172a; }
  &.tier-rare { background: #3b82f6; color: #fff; box-shadow: 0 0 10px Rgba(59, 130, 246, 0.3); }
  &.tier-epic { background: #a855f7; color: #fff; box-shadow: 0 0 10px Rgba(168, 85, 247, 0.3); }
  &.tier-legendary { background: #eab308; color: #0f172a; box-shadow: 0 0 15px Rgba(234, 179, 8, 0.4); }
}

.item-card-top {
  display: flex;
  gap: 12px;
  align-items: center;
  z-index: 1;
}

.item-visual-box {
  position: relative;
  width: 54px;
  height: 54px;
  background: Rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 38px;
    height: 38px;
    image-rendering: pixelated;
    will-change: transform;
  }
}

.item-lock-badge {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.7);
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;

  .lock-icon { font-size: 14px; }
  .lock-lvl {
    font-family: 'Press Start 2P', monospace;
    font-size: 5px;
    color: #ef4444;
  }
}

.item-meta-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  margin: 0;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #fff;
  line-height: 1.4;
}

.item-price-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ef4444;
  
  .currency-symbol {
    font-size: 10px;
    filter: Drop-Shadow(0 0 5px Rgba(239, 68, 68, 0.5));
  }
  
  .price-val {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    font-weight: bold;
  }
}

.item-desc {
  margin: 0;
  font-size: 11px;
  color: #cbd5e1;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 30px;
}

.item-actions {
  margin-top: auto;
}

.btn-war-buy {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  box-shadow: 0 4px 12px Rgba(239, 68, 68, 0.2);
  will-change: transform, box-shadow;

  &:disabled {
    background: #1f2937;
    color: #4b5563;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.btn-war-locked {
  width: 100%;
  padding: 10px;
  background: #111827;
  border: 1px dashed #374151;
  border-radius: 8px;
  color: #4b5563;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: not-allowed;
}
</style>
