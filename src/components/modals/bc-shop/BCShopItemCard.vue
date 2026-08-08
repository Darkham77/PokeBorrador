<script setup lang="ts">
import { computed } from 'vue'
import { useShopStore } from '@/stores/inventory/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'

interface ShopItem {
  id: string
  name: string
  cat: string
  bcPrice?: number
  price?: number
  desc: string
  sprite: string
  unlockLv?: number
  tier?: string
  icon?: string
}

interface Props {
  item: ShopItem
}

const props = defineProps<Props>()

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

// Reactivity for unlock status
const isUnlocked = computed(() => {
  return (gameStore.state.trainerLevel || 1) >= (props.item.unlockLv || 1)
})

const BATTLE_COINS_PRICE_CONVERSION_DIVISOR = 30

const itemBCPrice = computed(() => {
  if (props.item.bcPrice !== undefined) return props.item.bcPrice
  return props.item.price ? Math.ceil(props.item.price / BATTLE_COINS_PRICE_CONVERSION_DIVISOR) : 0
})

const hasEnoughBC = computed(() => {
  return (gameStore.state.battleCoins || 0) >= itemBCPrice.value
})

const buy = () => {
  if (!isUnlocked.value) {
    uiStore.notify('¡Objeto bloqueado! Sube tu nivel de entrenador.', '🔒')
    return
  }
  if (!hasEnoughBC.value) {
    uiStore.notify('No tienes suficientes Battle Coins.', '🪙')
    return
  }
  shopStore.buyItemBC(props.item.id)
}

const tierLabel = computed(() => getItemTierLabel(props.item.tier))

const tierColor = computed(() => getItemTierColor(props.item.tier))

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <div 
    class="bc-shop-item-card"
    :class="[{ locked: !isUnlocked }, 'tier-' + (item.tier || 'common')]"
    :style="{ '--tier-color': tierColor }"
  >
    <!-- Tier Tag (Retro Style) -->
    <span
      v-if="item.tier"
      class="tier-tag"
      :class="'tier-' + item.tier"
    >
      {{ tierLabel }}
    </span>

    <div class="item-card-top">
      <div class="item-visual-box">
        <img
          v-if="item.sprite"
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
          :alt="item.name"
          @error="handleImageError"
        >
        
        <!-- Lock Overlay if locked -->
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
          <i class="fas fa-coins currency-symbol" />
          <span class="price-val">{{ formatCurrency(itemBCPrice) }} BC</span>
        </div>
      </div>
    </div>

    <p class="item-desc">
      {{ item.desc }}
    </p>

    <div class="item-actions">
      <!-- Buy Button -->
      <button
        v-if="isUnlocked"
        class="btn-vicio-primary btn-vicio-sm"
        :disabled="!hasEnoughBC"
        @click.stop="buy"
      >
        {{ hasEnoughBC ? 'COMPRAR' : 'SIN BC' }}
      </button>
      <button
        v-else
        class="btn-vicio-neutral btn-vicio-sm"
        disabled
      >
        BLOQUEADO
      </button>
    </div>
  </div>
</template>
