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
  price: number
  desc: string
  sprite: string
  unlockLv?: number
  market?: boolean
  tier?: string
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

// Calculate the price modifier locally (reproducing the store logic accurately)
const priceModifier = computed(() => {
  const playerClass = gameStore.state.playerClass
  if (playerClass === 'rocket') return 1.20
  return 1.0
})

const finalPrice = computed(() => {
  return Math.floor(props.item.price * priceModifier.value)
})

const isModifiedPrice = computed(() => priceModifier.value !== 1.0)

const quantity = computed(() => shopStore.getQuantity(props.item.id))

const tierLabel = computed(() => getItemTierLabel(props.item.tier))

const handleQuantityChange = (e: Event) => {
  if (e.target) {
    const val = Number((e.target as HTMLInputElement).value)
    shopStore.setQuantity(props.item.id, val)
  }
}

const adjustQuantity = (amount: number) => {
  shopStore.setQuantity(props.item.id, quantity.value + amount)
}

const buy = () => {
  if (!isUnlocked.value) {
    uiStore.notify('¡Objeto bloqueado! Sube tu nivel de entrenador.', '🔒')
    return
  }
  shopStore.buyItem(props.item.id)
}

const tierColor = computed(() => getItemTierColor(props.item.tier))

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <div 
    class="shop-item-card"
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
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
          :alt="item.name"
          @error="handleImageError"
        >
        
        <!-- Lock Overlay if locked -->
        <div 
          v-if="!isUnlocked"
          class="item-lock-badge"
        >
          <p class="lock-icon">
            🔒
          </p>
          <p class="lock-lvl">
            NV. {{ item.unlockLv }}
          </p>
        </div>
      </div>

      <div class="item-meta-box">
        <h4 class="item-name">
          {{ item.name }}
        </h4>
        <div class="item-price-wrapper">
          <span class="currency-symbol">₽</span>
          <span class="price-val">{{ formatCurrency(finalPrice) }}</span>
          
          <!-- Original price crossed out if modified -->
          <span 
            v-if="isModifiedPrice" 
            class="original-price"
          >
            ₽{{ formatCurrency(item.price) }}
          </span>
        </div>
      </div>
    </div>

    <p class="item-desc">
      {{ item.desc }}
    </p>

    <div class="item-actions">
      <!-- Total Price Display (Only if quantity > 1) -->
      <div 
        v-if="quantity > 1" 
        class="item-total-price-tag"
      >
        <span class="total-label">Total:</span>
        <span class="total-val">₽{{ formatCurrency(finalPrice * quantity) }}</span>
      </div>

      <!-- Quantity controls (Disabled if locked) -->
      <div class="qty-ctrl-group">
        <button 
          class="qty-btn"
          :disabled="!isUnlocked || quantity <= 1"
          @click.stop="adjustQuantity(-1)"
        >
          -
        </button>
        <input 
          type="number" 
          class="qty-input"
          :value="quantity"
          :disabled="!isUnlocked"
          @change="handleQuantityChange"
        >
        <button 
          class="qty-btn"
          :disabled="!isUnlocked || quantity >= 999"
          @click.stop="adjustQuantity(1)"
        >
          +
        </button>
      </div>

      <!-- Buy Button -->
      <button
        v-if="isUnlocked"
        class="btn-vicio-primary btn-vicio-sm"
        @click.stop="buy"
      >
        COMPRAR
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
