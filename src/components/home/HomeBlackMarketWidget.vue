<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useShopStore } from '@/stores/inventory/shop'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { getItemTierColor } from '@/logic/utils/itemTierResolver'
import { isItemId, type ItemId } from '@/data/inventory/items'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore()
const shopStore = useShopStore()
const modalStore = useModalStore()

const DISCOUNT = PLAYER_CLASSES.rocket.modifiers?.shopDiscount || 0.20
const BC_TO_MONEY_RATE = 50

const blackMarketItems = computed(() => {
  return shopStore.getBlackMarketItems()
})

const purchasedItemIds = computed<ItemId[]>(() => {
  const list = gameStore.state.classData?.blackMarketDaily?.purchased || []
  return list.filter(isItemId)
})

function getItemPrice(bcPrice: number = 0): number {
  const baseMoney = bcPrice * BC_TO_MONEY_RATE
  return Math.floor(baseMoney * (1 - DISCOUNT))
}

function isPurchased(itemId: ItemId): boolean {
  return purchasedItemIds.value.includes(itemId)
}

function openBlackMarketModal() {
  modalStore.open('BlackMarket')
}

function handleImageError(e: Event) {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <div
    class="home-black-market-widget home-section-card"
    @click="openBlackMarketModal"
  >
    <!-- Header -->
    <div class="widget-header-row">
      <div class="header-left">
        <span class="emoji widget-icon">🚀</span>
        <div class="title-wrap">
          <h3 class="widget-title">
            MERCADO NEGRO
          </h3>
          <span class="widget-sub">
            Stock exclusivo Team Rocket (-20%)
          </span>
        </div>
      </div>
      <div
        class="header-actions"
        @click.stop
      >
        <HomeWidgetMinimizeBtn widget-id="black_market" />
      </div>
    </div>

    <!-- 3 Items Mini Grid -->
    <div
      v-if="blackMarketItems.length > 0"
      class="bm-mini-grid"
    >
      <div
        v-for="item in blackMarketItems"
        :key="item.id"
        class="bm-mini-card-wrapper"
      >
        <PVTooltip
          :title="item.name"
          :description="item.desc"
          position="top"
        >
          <div
            v-gsap-hover="{ scale: 1.03, y: -2 }"
            class="bm-mini-card"
            :class="{ 'is-sold': isPurchased(item.id) }"
            :style="{ '--tier-color': getItemTierColor(item.tier) }"
          >
            <div class="bm-mini-visual">
              <img
                v-if="item.sprite"
                :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
                :alt="item.name"
                class="bm-mini-sprite"
                @error="handleImageError"
              >
              <div
                v-if="isPurchased(item.id)"
                class="bm-mini-sold-badge"
              >
                VENDIDO
              </div>
            </div>

            <span class="bm-mini-name">{{ item.name }}</span>

            <div class="bm-mini-price-row">
              <span
                v-if="isPurchased(item.id)"
                class="bm-mini-status-sold"
              >
                Vendido
              </span>
              <span
                v-else
                class="bm-mini-price"
              >
                ₽{{ formatCurrency(getItemPrice(item.bcPrice)) }}
              </span>
            </div>
          </div>
        </PVTooltip>
      </div>
    </div>

    <!-- Empty / Fallback state -->
    <div
      v-else
      class="bm-mini-empty"
    >
      <span class="emoji">💼</span>
      <span>Sin ofertas activas registradas en el mercado negro.</span>
    </div>

    <!-- Action Link -->
    <button
      v-gsap-hover
      class="bm-mini-open-btn"
      @click.stop="openBlackMarketModal"
    >
      ABRIR MERCADO NEGRO
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/core/mixins" as *;

.home-black-market-widget {
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4), inset 0 0 12px Rgba(239, 68, 68, 0.05);
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;

  &:hover {
    border-color: Rgba(239, 68, 68, 0.5);
  }
}

.widget-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .widget-icon {
      font-size: 18px;
    }

    .title-wrap {
      display: flex;
      flex-direction: column;

      .widget-title {
        color: #ef4444;
        font-size: 11px;
        margin: 0;
        line-height: 1.35;
        letter-spacing: 0.5px;
        @include pixelated;
      }

      .widget-sub {
        color: var(--gray, #94a3b8);
        font-size: 8.5px;
        line-height: 1.35;
        font-weight: 500;
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
  }
}

.bm-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.bm-mini-card-wrapper {
  display: flex;
  width: 100%;
  min-width: 0;

  :deep(.pv-tooltip-wrapper) {
    display: flex;
    width: 100%;
    min-width: 0;
  }
}

.bm-mini-card {
  width: 100%;
  box-sizing: border-box;
  background: Rgba(25, 15, 20, 0.7);
  border: 1px solid Rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;

  &:hover:not(.is-sold) {
    border-color: Rgba(239, 68, 68, 0.6);
  }

  &.is-sold {
    opacity: 0.6;
    filter: Grayscale(0.6);
  }
}

.bm-mini-visual {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 4px;
}

.bm-mini-sprite {
  width: 32px;
  height: 32px;
  object-fit: contain;
  @include sprite-render;
}

.bm-mini-sold-badge {
  position: absolute;
  background: Rgba(220, 38, 38, 0.95);
  color: white;
  font-size: 7px;
  line-height: 1.3;
  padding: 1px 4px;
  border-radius: 3px;
  transform: Rotate(-10deg);
  letter-spacing: 0.5px;
  @include pixelated;
}

.bm-mini-name {
  color: white;
  font-size: 8px;
  line-height: 1.35;
  text-align: center;
  max-width: 100%;
  margin-bottom: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 22px;
  word-break: break-word;
  @include pixelated;
}

.bm-mini-price-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bm-mini-price {
  color: #4ade80;
  font-size: 9px;
  line-height: 1.35;
  @include pixelated;
}

.bm-mini-status-sold {
  color: #94a3b8;
  font-size: 8px;
  line-height: 1.35;
  @include pixelated;
}

.bm-mini-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  color: var(--gray, #94a3b8);
  font-size: 9.5px;
}

.bm-mini-open-btn {
  background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%);
  border: 1px solid #f87171;
  border-radius: 6px;
  color: white;
  padding: 6px 10px;
  font-size: 9px;
  line-height: 1.35;
  cursor: pointer;
  letter-spacing: 0.5px;
  width: 100%;
  @include pixelated;

  &:hover {
    background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
  }
}
</style>
