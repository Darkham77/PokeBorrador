<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useShopStore } from '@/stores/inventory/shop'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'
import { isItemId, type ItemId } from '@/data/inventory/items'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const shopStore = useShopStore()
const uiStore = useUIStore()

const isSmallScreen = computed(() => uiStore.isSmallScreen)

const ROCKET_MIN_LEVEL = 10
const isAuthorized = computed(() => {
  return gameStore.state.playerClass === 'rocket' && (gameStore.state.classLevel || 1) >= ROCKET_MIN_LEVEL
})

const DISCOUNT = PLAYER_CLASSES.rocket.modifiers?.shopDiscount || 0.20
const BC_TO_MONEY_RATE = 50

const blackMarketItems = computed(() => {
  if (!isAuthorized.value) return []
  return shopStore.getBlackMarketItems()
})

const purchasedItemIds = computed<ItemId[]>(() => {
  const list = gameStore.state.classData?.blackMarketDaily?.purchased || []
  return list.filter(isItemId)
})

function getItemPrice(bcPrice: number = 0): { original: number; discounted: number } {
  const baseMoney = bcPrice * BC_TO_MONEY_RATE
  const discounted = Math.floor(baseMoney * (1 - DISCOUNT))
  return { original: baseMoney, discounted }
}

function isPurchased(itemId: ItemId): boolean {
  return purchasedItemIds.value.includes(itemId)
}

function canAfford(price: number): boolean {
  return (gameStore.state.money || 0) >= price
}

function handleBuy(itemId: ItemId) {
  shopStore.buyBlackMarketItem(itemId)
}

function handleImageError(e: Event) {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}

const gridRef = ref<HTMLElement | null>(null)

const animateGrid = () => {
  nextTick(() => {
    if (!gridRef.value) return
    const cards = gridRef.value.querySelectorAll('.bm-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.fromTo(cards,
        { opacity: 0, y: 15, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power1.out',
          clearProps: 'transform,scale'
        }
      )
    }
  })
}

watch(() => props.show, (val) => {
  if (val) {
    animateGrid()
  }
})

const close = () => {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '860px'"
    disable-auto-grow
    variant="retro"
    padding="raw"
    accent-color="#ef4444"
    header-background="rgba(20, 10, 10, 0.9)"
    @close="close"
  >
    <!-- Header -->
    <template #header>
      <div class="bm-modal-header">
        <div class="bm-title-group">
          <span class="emoji title-icon">🚀</span>
          <div class="title-text-wrap">
            <span class="main-title">
              MERCADO NEGRO
              <span class="rocket-badge">EXCLUSIVO ROCKET</span>
            </span>
            <span class="sub-title">STOCK EXCLUSIVO Y CONTRABANDO DIARIO</span>
          </div>
        </div>

        <div class="header-stats">
          <div class="stat-node money">
            <span class="shop-stat-label">MIS FONDOS</span>
            <span class="value">
              ₽{{ formatCurrency(gameStore.state.money || 0) }}
            </span>
          </div>

          <div class="stat-node level">
            <span class="shop-stat-label">RANGO ROCKET</span>
            <span class="value">Nv. {{ gameStore.state.classLevel || 1 }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="bm-modal-body custom-scrollbar">
      <!-- Unauthorized State -->
      <div
        v-if="!isAuthorized"
        class="bm-unauthorized-box"
      >
        <span class="emoji lock-icon">🔒</span>
        <h3>ACCESO RESTRINGIDO</h3>
        <p>Solo los miembros del Team Rocket de nivel 10 o superior tienen autorización para negociar en el Mercado Negro.</p>
      </div>

      <!-- Authorized State -->
      <div
        v-else
        class="bm-content"
      >
        <!-- Syndicate Banner -->
        <div class="bm-syndicate-banner">
          <div class="syndicate-header">
            <span class="emoji syndicate-icon">💼</span>
            <div class="syndicate-text">
              <span class="syndicate-title">OFERTA DIARIA DEL SINDICATO</span>
              <span class="syndicate-desc">Stock exclusivo renovado diariamente a las 00:00 (GMT-3) · 20% de descuento en ₽ · Límite de 1 por objeto al día</span>
            </div>
          </div>
        </div>

        <!-- 3 Items Grid -->
        <div
          ref="gridRef"
          class="bm-grid"
        >
          <div
            v-for="item in blackMarketItems"
            :key="item.id"
            v-gsap-hover="{ scale: 1.02, y: -2 }"
            class="bm-card"
            :class="{ 'is-sold': isPurchased(item.id) }"
            :style="{ '--tier-color': getItemTierColor(item.tier) }"
          >
            <!-- Tier Badge -->
            <span
              v-if="item.tier"
              class="bm-tier-tag"
              :class="'tier-' + item.tier"
            >
              {{ getItemTierLabel(item.tier) }}
            </span>

            <div class="bm-card-visual">
              <img
                v-if="item.sprite"
                :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
                :alt="item.name"
                class="bm-item-sprite"
                @error="handleImageError"
              >
              <div
                v-if="isPurchased(item.id)"
                class="bm-sold-stamp"
              >
                VENDIDO
              </div>
            </div>

            <div class="bm-card-info">
              <h4 class="bm-item-name">
                {{ item.name }}
              </h4>
              <p class="bm-item-desc">
                {{ item.desc }}
              </p>

              <div class="bm-price-row">
                <span class="bm-original-price">
                  ₽ {{ formatCurrency(getItemPrice(item.bcPrice).original) }}
                </span>
                <span class="bm-discount-tag">-20%</span>
                <span class="bm-final-price">
                  ₽ {{ formatCurrency(getItemPrice(item.bcPrice).discounted) }}
                </span>
              </div>

              <button
                v-gsap-hover="'button'"
                class="bm-buy-btn"
                :disabled="isPurchased(item.id) || !canAfford(getItemPrice(item.bcPrice).discounted)"
                @click="handleBuy(item.id)"
              >
                <span v-if="isPurchased(item.id)">VENDIDO</span>
                <span v-else-if="!canAfford(getItemPrice(item.bcPrice).discounted)">SIN FONDOS</span>
                <span v-else>COMPRAR (₽)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/core/mixins" as *;
@use "@/styles/components/shop" as *;

.bm-modal-body {
  padding: 20px;
  background: radial-gradient(circle at 50% 0%, Rgba(40, 15, 20, 0.4) 0%, Rgba(10, 8, 12, 0.95) 100%);
  display: flex;
  flex-direction: column;
  flex: 1;
}

.bm-unauthorized-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: var(--gray, #94a3b8);

  .lock-icon {
    font-size: 42px;
    margin-bottom: 12px;
    filter: Drop-Shadow(0 0 12px Rgba(239, 68, 68, 0.5));
  }

  h3 {
    color: #ef4444;
    font-size: 13px;
    margin-bottom: 8px;
    @include pixelated;
  }

  p {
    font-size: 11px;
    max-width: 380px;
    line-height: 1.4;
    color: var(--gray, #94a3b8);
  }
}

.bm-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bm-syndicate-banner {
  background: linear-gradient(135deg, Rgba(30, 15, 20, 0.8) 0%, Rgba(20, 10, 15, 0.9) 100%);
  border: 1px solid Rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.3);

  .syndicate-header {
    display: flex;
    align-items: center;
    gap: 10px;

    .syndicate-icon {
      font-size: 18px;
    }

    .syndicate-text {
      display: flex;
      flex-direction: column;

      .syndicate-title {
        color: #fca5a5;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        @include pixelated;
      }

      .syndicate-desc {
        color: var(--gray, #94a3b8);
        font-size: 9.5px;
        line-height: 1.3;
      }
    }
  }
}

.bm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
}

.bm-card {
  background: Rgba(20, 14, 18, 0.9);
  border: 1.5px solid Rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);

  &:hover:not(.is-sold) {
    border-color: Rgba(239, 68, 68, 0.7);
    box-shadow: 0 4px 16px Rgba(239, 68, 68, 0.2);
  }

  &.is-sold {
    opacity: 0.65;
    filter: Grayscale(0.5);
  }
}

.bm-tier-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 800;
  background: Rgba(0, 0, 0, 0.7);
  color: var(--tier-color, #ffd93d);
  border: 1px solid var(--tier-color, #ffd93d);
  @include pixelated;
}

.bm-card-visual {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 8px;
}

.bm-item-sprite {
  width: 44px;
  height: 44px;
  object-fit: contain;
  @include sprite-render;
}

.bm-sold-stamp {
  position: absolute;
  background: Rgba(220, 38, 38, 0.95);
  color: white;
  font-size: 11px;
  line-height: 1.3;
  padding: 3px 10px;
  border-radius: 4px;
  transform: Rotate(-12deg);
  letter-spacing: 1px;
  box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.6);
  border: 1px solid #fca5a5;
  @include pixelated;
}

.bm-card-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.bm-item-name {
  color: #fff;
  font-size: 11.5px;
  font-weight: 800;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bm-item-desc {
  color: var(--gray, #94a3b8);
  font-size: 9.5px;
  line-height: 1.3;
  margin: 0 0 10px 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.bm-original-price {
  color: #64748b;
  font-size: 9.5px;
  text-decoration: line-through;
}

.bm-discount-tag {
  background: #dc2626;
  color: #fff;
  font-size: 8px;
  line-height: 1.3;
  padding: 1px 4px;
  border-radius: 2px;
  @include pixelated;
}

.bm-final-price {
  color: #4ade80;
  font-size: 12px;
  line-height: 1.35;
  margin-left: auto;
  @include pixelated;
}

.bm-buy-btn {
  background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%);
  color: white;
  border: 1px solid #f87171;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 10px;
  line-height: 1.35;
  cursor: pointer;
  letter-spacing: 0.5px;
  @include pixelated;

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
  }

  &:disabled {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
    cursor: not-allowed;
  }
}
</style>
