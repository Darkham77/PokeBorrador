<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'
import type { Item } from '@/types/inventory/items'
import type { ItemId } from '@/data/inventory/items'

interface Props {
  item: Item
  isPurchased: boolean
  userMoney: number
  discount?: number
  bcToMoneyRate?: number
}

const props = withDefaults(defineProps<Props>(), {
  discount: 0.20,
  bcToMoneyRate: 50
})

const emit = defineEmits<{
  (e: 'buy', itemId: ItemId): void
}>()

const prices = computed(() => {
  const baseMoney = (props.item.bcPrice || 0) * props.bcToMoneyRate
  const discounted = Math.floor(baseMoney * (1 - props.discount))
  return { original: baseMoney, discounted }
})

const canAfford = computed(() => props.userMoney >= prices.value.discounted)
const tierColor = computed(() => getItemTierColor(props.item.tier))
const tierLabel = computed(() => getItemTierLabel(props.item.tier))

function handleImageError(e: Event) {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <div
    v-gsap-hover="{ scale: 1.02, y: -2 }"
    class="bm-card"
    :class="{ 'is-sold': isPurchased }"
    :style="{ '--tier-color': tierColor }"
  >
    <!-- Tier Badge -->
    <span
      v-if="item.tier"
      class="bm-tier-tag"
      :class="'tier-' + item.tier"
    >
      {{ tierLabel }}
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
        v-if="isPurchased"
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
          ₽ {{ formatCurrency(prices.original) }}
        </span>
        <span class="bm-discount-tag">-{{ Math.round(discount * 100) }}%</span>
        <span class="bm-final-price">
          ₽ {{ formatCurrency(prices.discounted) }}
        </span>
      </div>

      <button
        v-gsap-hover="'button'"
        class="bm-buy-btn"
        :disabled="isPurchased || !canAfford"
        @click="emit('buy', item.id)"
      >
        <span v-if="isPurchased">VENDIDO</span>
        <span v-else-if="!canAfford">SIN FONDOS</span>
        <span v-else>COMPRAR (₽)</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./BlackMarketModal.styles.scss"></style>
