<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import { useUIStore } from '@/stores/ui'
import MarketPublishSelector from './MarketPublishSelector.vue'
import MarketPublishForm from './MarketPublishForm.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MarketListingType } from '@/logic/economy/market'
import { useMarketPublishActions } from './useMarketPublishActions.ts'

const game = useGameStore()
const gtsStore = useGTSStore()
const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const activeMode = ref<MarketListingType>('pokemon')

const {
  selection,
  price,
  itemQty,
  selectItem,
  handlePublish,
  fee,
  net
} = useMarketPublishActions(gtsStore, activeMode)

const selectedPokemon = computed<Pokemon | null>(() => {
  if (activeMode.value === 'pokemon' && selection.value && 'uid' in selection.value) {
    return selection.value as Pokemon
  }
  return null
})

const itemSpriteUrl = computed<string>(() => {
  if (activeMode.value === 'item' && selection.value && 'id' in selection.value) {
    return getAssetUrl(ASSET_TYPES.ITEM, selection.value.id)
  }
  return ''
})

const formattedFee = computed(() => `-₱${fee.value.toLocaleString()}`)
const formattedNet = computed(() => `₱${net.value.toLocaleString()}`)

const selectedItemUid = computed(() => {
  if (selection.value) {
    if ('uid' in selection.value) return selection.value.uid
    if ('id' in selection.value) return selection.value.id
  }
  return null
})

function handleOpenDetail() {
  if (!selectedPokemon.value) return
  const teamIdx = (game.state.team || []).findIndex(p => p?.uid === selectedPokemon.value?.uid)
  if (teamIdx !== -1) {
    ui.openPokemonDetail(selectedPokemon.value, teamIdx, 'team', { source: 'selection' })
    return
  }
  const boxIdx = (game.state.box || []).findIndex(p => p?.uid === selectedPokemon.value?.uid)
  if (boxIdx !== -1) {
    ui.openPokemonDetail(selectedPokemon.value, boxIdx, 'box', { source: 'selection' })
    return
  }
  ui.openPokemonDetail(selectedPokemon.value, -1, 'selection', { source: 'selection' })
}
</script>

<template>
  <div class="market-publish-wizard">
    <div class="publish-header">
      <div class="mode-selector">
        <button 
          :class="{ active: activeMode === 'pokemon' }"
          @click.stop="activeMode = 'pokemon'; selection = null"
        >
          POKÉMON
        </button>
        <button 
          :class="{ active: activeMode === 'item' }"
          @click.stop="activeMode = 'item'; selection = null"
        >
          OBJETOS
        </button>
      </div>
      <p class="limit-info">
        Publicaciones: {{ gtsStore.activeMyListings.length }} / {{ gtsStore.MAX_LISTINGS }}
      </p>
    </div>

    <div
      class="main-split"
      :class="{ 'is-mobile-view': isSmallScreen }"
    >
      <!-- Selector List -->
      <MarketPublishSelector
        v-if="!isSmallScreen || !selection"
        :active-mode="activeMode"
        :selected-item-uid="selectedItemUid"
        @select="selectItem"
      />

      <!-- Price & Confirm -->
      <MarketPublishForm
        v-if="!isSmallScreen || selection"
        v-model:price="price"
        v-model:item-qty="itemQty"
        :selection="selection"
        :active-mode="activeMode"
        :is-small-screen="isSmallScreen"
        :selected-pokemon="selectedPokemon"
        :item-sprite-url="itemSpriteUrl"
        :formatted-fee="formattedFee"
        :formatted-net="formattedNet"
        :publishing="gtsStore.publishing"
        @open-detail="handleOpenDetail"
        @publish="handlePublish"
        @clear-selection="selection = null"
      />
    </div>
  </div>
</template>

<style src="./MarketPublish.styles.scss" lang="scss"></style>

