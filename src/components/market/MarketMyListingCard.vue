<script setup lang="ts">
import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemById } from '@/data/inventory/items'
import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'
import type { MarketListing } from '@/logic/economy/market'

defineProps<{
  item: MarketListing
}>()

const emit = defineEmits<{
  (e: 'cancel', listingId: string | number): void
}>()
</script>

<template>
  <div class="my-listing-item-wrapper">
    <template v-if="item.listing_type === 'pokemon'">
      <PokemonSelectionItem
        :item="{
          pokemon: item.data,
          _source: 'market',
          index: 0
        }"
        :total="getPokemonTotalPower(item.data)"
        auto-confirm
        class="listing-card-override"
      />
      <div class="listing-actions">
        <span class="price-tag">₽{{ formatCurrency(item.price) }}</span>
        <button
          :id="`market-my-items-cancel-pokemon-btn-${item.id}`"
          class="btn-vicio-danger btn-vicio-sm"
          @click.stop="emit('cancel', item.id)"
        >
          CANCELAR
        </button>
      </div>
    </template>
    <div 
      v-else
      class="my-listing-item-card"
    >
      <div class="card-visual">
        <img 
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.data.name || '')" 
          :alt="getItemById(item.data.name || '')?.name || item.data.name || 'Objeto'"
          class="i-sprite pixelated"
          @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'potion')"
        >
      </div>
      <div class="card-info">
        <span class="name">{{ getItemById(item.data.name || '')?.name || item.data.name }}</span>
        <div class="i-meta">
          <span class="qty">CANTIDAD: x{{ item.data.qty || 1 }}</span>
          <span class="price">₽{{ formatCurrency(item.price) }}</span>
        </div>
      </div>
      <button
        :id="`market-my-items-cancel-item-btn-${item.id}`"
        class="btn-vicio-danger btn-vicio-sm"
        @click.stop="emit('cancel', item.id)"
      >
        CANCELAR
      </button>
    </div>
  </div>
</template>

<style scoped src="./MarketMyItems.styles.scss" lang="scss"></style>
