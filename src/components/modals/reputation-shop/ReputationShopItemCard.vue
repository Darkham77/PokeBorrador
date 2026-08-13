<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'
import type { ItemTier } from '@/types/inventory/items'

interface ReputationShopItem {
  id: string
  name: string
  repCost: number
  desc: string
  sprite?: string
  givesId: string
  givesQty: number
  tier: ItemTier
  cat: string
}

interface Props {
  item: ReputationShopItem
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const uiStore = useUIStore()

const reputation = computed(() => {
  return Number(gameStore.state.classData?.reputation) || 0
})

const buy = async () => {
  if (gameStore.state.playerClass !== 'entrenador') {
    uiStore.notify('Solo los Entrenadores pueden comprar en esta tienda.', '🔒')
    return
  }

  if (reputation.value < props.item.repCost) {
    uiStore.notify('No tienes suficiente Reputación.', '⚠️')
    return
  }

  // Deduct cost and add reward
  if (!gameStore.state.classData) {
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: { date: '', items: [], purchased: [] }
    }
  }
  gameStore.state.classData.reputation = reputation.value - props.item.repCost

  const inventoryStore = useInventoryStore()
  inventoryStore.addItem(props.item.givesId, props.item.givesQty)

  // Chiptune/audio notification
  try {
    const audioStore = await import('@/stores/audio').then(m => m.useAudioStore())
    audioStore.play('victoryTrainer')
  } catch (e) {
    console.error('Audio trigger error:', e)
  }

  uiStore.notify(`¡Canjeaste ${props.item.name}!`, '🏆')
  gameStore.scheduleSave()
}

const tierLabel = computed(() => getItemTierLabel(props.item.tier))
const tierColor = computed(() => getItemTierColor(props.item.tier))

const handleImageError = () => {
  console.error(`Error al cargar sprite del objeto '${props.item.givesId}': ${props.item.sprite}`)
}
</script>

<template>
  <div 
    class="rep-shop-item-card"
    :class="['tier-' + item.tier, { 'insufficient-funds': reputation < item.repCost }]"
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
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite || item.givesId)"
          :alt="item.name"
          @error="handleImageError"
        >
      </div>

      <div class="item-meta-box">
        <h4 class="item-name">
          {{ item.name }}
        </h4>
        <div class="item-price-wrapper rep-price">
          <span class="rep-star-icon">★</span>
          <span class="price-val">{{ item.repCost }} REP</span>
        </div>
      </div>
    </div>

    <p class="item-desc">
      {{ item.desc }}
    </p>

    <div class="item-actions">
      <button
        class="btn-vicio-primary btn-vicio-sm w-full"
        :disabled="reputation < item.repCost"
        @click.stop="buy"
      >
        {{ reputation >= item.repCost ? 'CANJEAR' : 'SIN REPUTACIÓN' }}
      </button>
    </div>
  </div>
</template>
