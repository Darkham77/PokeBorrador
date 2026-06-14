<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'

interface ReputationShopItem {
  id: string
  name: string
  repCost: number
  desc: string
  sprite: string
  givesId: string
  givesQty: number
  tier: 'common' | 'rare' | 'epic' | 'legend'
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

  if (!gameStore.state.inventory) {
    gameStore.state.inventory = {}
  }
  gameStore.state.inventory[props.item.givesId] = (gameStore.state.inventory[props.item.givesId] || 0) + props.item.givesQty

  // Extra handling for Poke Balls
  if (props.item.givesId === 'ultra_ball') {
    gameStore.state.balls = (gameStore.state.balls || 0) + props.item.givesQty
  }

  // Chiptune/audio notification
  try {
    const audioStore = await import('@/stores/audio').then(m => m.useAudioStore())
    if (audioStore.victoryTrainer) {
      audioStore.victoryTrainer()
    }
  } catch (e) {
    console.error('Audio trigger error:', e)
  }

  uiStore.notify(`¡Canjeaste ${props.item.name}!`, '🏆')
  gameStore.scheduleSave()
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
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
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
