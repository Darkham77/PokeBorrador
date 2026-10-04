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
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid Rgb(239 68 68 / 30%);
  border-radius: 12px;
  background: Rgb(18 22 34 / 85%);
  box-shadow: 0 4px 16px Rgb(0 0 0 / 40%), inset 0 0 12px Rgb(239 68 68 / 5%);
  box-sizing: border-box;
  cursor: pointer;

  &:hover {
    border-color: Rgb(239 68 68 / 50%);
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
        @include pixelated;

        margin: 0;
        color: #ef4444;
        font-size: 11px;
        line-height: 1.35;
        letter-spacing: 0.5px;
      }

      .widget-sub {
        color: var(--gray, #94a3b8);
        font-size: 8.5px;
        font-weight: 500;
        line-height: 1.35;
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
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
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
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8px 6px;
  border: 1px solid Rgb(239 68 68 / 20%);
  border-radius: 8px;
  background: Rgb(25 15 20 / 70%);
  text-align: center;
  box-sizing: border-box;

  &:hover:not(.is-sold) {
    border-color: Rgb(239 68 68 / 60%);
  }

  &.is-sold {
    opacity: 0.6;
    filter: Grayscale(0.6);
  }
}

.bm-mini-visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 36px;
  margin-bottom: 4px;
}

.bm-mini-sprite {
  @include sprite-render;

  width: 32px;
  height: 32px;
  object-fit: contain;
}

.bm-mini-sold-badge {
  @include pixelated;

  position: absolute;
  padding: 1px 4px;
  border-radius: 3px;
  background: Rgb(220 38 38 / 95%);
  color: white;
  font-size: 7px;
  line-height: 1.3;
  transform: Rotate(-10deg);
  letter-spacing: 0.5px;
}

.bm-mini-name {
  @include pixelated;

  display: -webkit-box;
  max-width: 100%;
  min-height: 24px;
  color: white;
  font-size: 8px;
  line-height: 1.45;
  text-align: center;
  padding-bottom: 2px;
  margin-bottom: 3px;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: break-word;
}

.bm-mini-price-row {
  display: flex;
  justify-content: center;
  align-items: center;
}

.bm-mini-price {
  @include pixelated;

  color: #4ade80;
  font-size: 9px;
  line-height: 1.35;
}

.bm-mini-status-sold {
  @include pixelated;

  color: #94a3b8;
  font-size: 8px;
  line-height: 1.35;
}

.bm-mini-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  background: Rgb(0 0 0 / 20%);
  color: var(--gray, #94a3b8);
  font-size: 9.5px;
}

.bm-mini-open-btn {
  @include pixelated;

  width: 100%;
  padding: 6px 10px;
  border: 1px solid #f87171;
  border-radius: 6px;
  background: Linear-Gradient(180deg, #ef4444 0%, #b91c1c 100%);
  color: white;
  font-size: 9px;
  line-height: 1.35;
  cursor: pointer;
  letter-spacing: 0.5px;

  &:hover {
    background: Linear-Gradient(180deg, #f87171 0%, #dc2626 100%);
  }
}
</style>
