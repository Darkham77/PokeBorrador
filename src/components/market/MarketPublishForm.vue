<script setup lang="ts">
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MarketListingType } from '@/logic/economy/market'
import type { InventoryItem } from './useMarketPublishInventory.ts'
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue'

interface Props {
  selection: Pokemon | InventoryItem | null
  activeMode: MarketListingType
  isSmallScreen: boolean
  selectedPokemon: Pokemon | null
  itemSpriteUrl: string
  price: number
  itemQty: number
  formattedFee: string
  formattedNet: string
  publishing: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:price', val: number): void
  (e: 'update:itemQty', val: number): void
  (e: 'open-detail'): void
  (e: 'publish'): void
  (e: 'clear-selection'): void
}>()
</script>

<template>
  <div class="publish-panel">
    <div
      v-if="selection"
      class="form-container"
    >
      <div class="selected-summary">
        <span class="label">VAS A VENDER:</span>
        
        <!-- Mini tarjeta estilo Caja para Pokémon seleccionado -->
        <div
          v-if="selectedPokemon"
          id="gts-selected-pokemon-preview"
          class="selected-pokemon-card-wrap"
          @click.stop="emit('open-detail')"
        >
          <BoxPokemonCard
            :pokemon="selectedPokemon"
            :index="0"
            :hide-stats="false"
            type-pill-size="ssm"
            class="selected-card-preview"
            @click="emit('open-detail')"
          />
          <span class="card-click-hint">
            <span class="emoji">🔍</span> Click para ver detalles
          </span>
        </div>

        <!-- Preview para Objetos -->
        <div
          v-else-if="activeMode === 'item' && selection"
          class="selected-item-preview"
        >
          <img
            v-if="itemSpriteUrl"
            :src="itemSpriteUrl"
            class="item-icon"
            alt="item"
          >
          <span class="val">{{ selection.name }}</span>
        </div>

        <span
          v-else
          class="val"
        >{{ selection.name }}</span>
      </div>

      <div
        v-if="activeMode === 'item' && selection && 'qty' in selection"
        class="input-group"
      >
        <label>CANTIDAD (MÁX: {{ selection.qty }})</label>
        <input 
          id="gts-item-qty-input"
          :value="itemQty" 
          type="number" 
          min="1"
          :max="selection.qty"
          class="price-input"
          @input="emit('update:itemQty', Number(($event.target as HTMLInputElement).value))"
        >
      </div>

      <div class="input-group">
        <label>PRECIO DE VENTA (₱)</label>
        <input 
          id="gts-price-input"
          :value="price" 
          type="number" 
          min="1"
          class="price-input"
          @input="emit('update:price', Number(($event.target as HTMLInputElement).value))"
        >
      </div>

      <div class="financials">
        <div class="row">
          <span>Comisión GTS (5%):</span>
          <span class="neg">{{ formattedFee }}</span>
        </div>
        <div class="row total">
          <span>Tú recibes:</span>
          <span class="pos">{{ formattedNet }}</span>
        </div>
      </div>

      <div class="form-actions">
        <button 
          id="gts-publish-offer-btn"
          v-gsap-hover
          class="btn-vicio-secondary btn-vicio-sm" 
          :disabled="publishing"
          @click.stop="emit('publish')"
        >
          {{ publishing ? 'PROCESANDO...' : 'PUBLICAR OFERTA' }}
        </button>

        <button
          v-if="isSmallScreen && selection"
          id="gts-change-selection-btn"
          v-gsap-hover
          class="btn-vicio-neutral btn-vicio-sm back-to-list-btn"
          @click.stop="emit('clear-selection')"
        >
          <span class="emoji">←</span> CAMBIAR SELECCIÓN
        </button>
      </div>
    </div>
    <div
      v-else
      id="gts-selection-hint"
      class="selection-hint"
    >
      <div class="emoji hint-icon">
        👈
      </div>
      <p>Selecciona un Pokémon u objeto para venderlo en el mercado mundial.</p>
    </div>
  </div>
</template>

<style src="./MarketPublish.styles.scss" lang="scss"></style>
