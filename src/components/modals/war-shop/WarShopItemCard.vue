<script setup lang="ts">
import { computed } from 'vue'
import { useShopStore } from '@/stores/inventory/shop'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'
import type { ItemId } from '@/data/inventory/items'

interface ShopItem {
  id: ItemId
  name: string
  warPrice?: number
  desc?: string
  sprite?: string
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
    class="war-shop-item-card"
    :class="[{ locked: !isUnlocked }, 'tier-' + (item.tier || 'common')]"
    :style="{ '--tier-color': tierColor }"
  >
    <!-- Tier Tag -->
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
        
        <!-- Lock Overlay -->
        <div 
          v-if="!isUnlocked"
          class="item-lock-badge"
        >
          <span class="emoji lock-icon">🔒</span>
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
        class="btn-vicio-danger btn-vicio-sm w-full"
        :disabled="!hasEnoughCoins"
        @click.stop="buy"
      >
        {{ hasEnoughCoins ? 'CANJEAR' : 'SIN MONEDAS' }}
      </button>
      <button
        v-else
        class="btn-vicio-neutral btn-vicio-sm w-full"
        disabled
      >
        BLOQUEADO
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_shop_cards.scss"></style>



