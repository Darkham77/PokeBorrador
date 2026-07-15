<script setup lang="ts">

import { computed } from 'vue'
import { useGTSStore } from '@/stores/gts'
import { formatCurrency } from '@/logic/utils/formatters'
import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { formatDisplayDate } from '@/logic/utils/timeUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useUIStore } from '@/stores/ui'
import { getItemById } from '@/data/inventory/items'

import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

const gtsStore = useGTSStore()
const uiStore = useUIStore()

const activeListings = computed(() => gtsStore.activeMyListings)
const history = computed(() => gtsStore.salesHistory)

function handleCancel(listingId: string) {
  console.log('[GTS] UI: handleCancel disparado para ID:', listingId)
  uiStore.openConfirm({
    title: '¿CANCELAR PUBLICACIÓN?',
    message: '¿Estás seguro de que deseas cancelar esta publicación? El objeto/Pokémon volverá a tu inventario.',
    confirmText: 'ACEPTAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    onConfirm: async () => {
      console.log('[GTS] UI: Confirmación aceptada, llamando al store...')
      const success = await gtsStore.cancelListing(listingId)
      console.log('[GTS] UI: Resultado cancelación en store:', success)
    },
    onCancel: () => {
      console.log('[GTS] UI: Cancelación abortada por el usuario.')
    }
  })
}

// formatTime is now centralized in timeUtils.ts as formatDisplayDate
const formatTime = formatDisplayDate
</script>

<template>
  <div class="market-my-items">
    <section class="listings-section">
      <h3 class="mkt-section-title">
        PUBLICACIONES ACTIVAS ({{ activeListings.length }}/{{ gtsStore.MAX_LISTINGS }})
      </h3>
      
      <div
        v-if="activeListings.length === 0"
        class="empty-state"
      >
        <p>No tienes publicaciones activas en este momento.</p>
      </div>

      <div
        v-else
        class="my-listings-grid-unified"
      >
        <div 
          v-for="item in activeListings"
          :key="item.id"
          class="my-listing-item-wrapper"
        >
          <template v-if="item.listing_type === 'pokemon'">
            <PokemonSelectionItem
              :item="{
                pokemon: item.data as unknown as Pokemon,
                _source: 'market',
                index: 0
              }"
              :total="getPokemonTotalPower(item.data as unknown as Pokemon)"
              auto-confirm
              class="listing-card-override"
            />
            <div class="listing-actions">
              <span class="price-tag">₽{{ formatCurrency(item.price) }}</span>
              <button
                class="btn-vicio-danger btn-vicio-sm"
                @click.stop="handleCancel(item.id)"
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
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="handleCancel(item.id)"
            >
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="history-section">
      <h3 class="mkt-section-title">
        HISTORIAL DE VENTAS
      </h3>
      
      <div
        v-if="history.length === 0"
        class="empty-state"
      >
        <p>No hay ventas registradas recientemente.</p>
      </div>

      <div
        v-else
        class="history-list custom-scrollbar"
      >
        <div
          v-for="sale in history"
          :key="sale.id"
          class="history-row"
        >
          <div class="sale-info">
            <span class="date">{{ formatTime(sale.created_at) }}</span>
            <span class="item-name">Vendido: <strong>{{ getItemById(sale.data.name || '')?.name || sale.data.name }}</strong></span>
          </div>
          <div class="sale-value">
            <span class="net-gain">+ ₽{{ formatCurrency(sale.price * (1 - gtsStore.MARKET_FEE)) }}</span>
            <span class="gross-price">PVP: ₽{{ formatCurrency(sale.price) }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.market-my-items {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.mkt-section-title {
  @include pixelated;
  font-size: 8px;
  color: Rgba(56, 189, 248, 1);
  margin: 20px;
  margin-bottom: 0;
  letter-spacing: 1px;
}

.listings-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.my-listings-grid-unified {
  @include shop-grid-wrapper-unified;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-auto-rows: min-content;
  align-items: start;
  gap: 20px;
}

.my-listing-item-wrapper {
  @include shop-item-card($yellow);
  padding: 0;
  gap: 0;
  position: relative;
  overflow: visible !important;

  .listing-card-override {
    background: transparent !important;
    padding: 15px !important;
    pointer-events: auto;
    box-shadow: none !important;
    width: 100%;
    cursor: pointer;

    :deep(.list-item) {
      transform: none !important;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;

      &:hover {
        transform: none !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }
    }
  }

  .listing-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    padding-top: 10px;
    background: Rgba(0, 0, 0, 0.3);
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;

    .price-tag {
      @include pixelated;
      font-size: 16px;
      color: $coin-gold;
    }
  }
}

.my-listing-item-card {
  padding: 15px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 15px;
  width: 100%;
  box-sizing: border-box;

  .card-visual {
    width: 48px;
    height: 48px;
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    .i-sprite { width: 36px; height: 36px; object-fit: contain; }
  }

  .card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    .name {
      @include pixelated;
      font-size: 9px;
      font-weight: bold;
      color: var(--white);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
      line-height: 1.5;
      padding-top: 2px;
    }
    .i-meta {
      display: flex;
      gap: 10px;
      align-items: center;
      .qty { @include pixelated; font-size: 8px; color: $muted; }
      .price { @include pixelated; font-size: 11px; color: $coin-gold; }
    }
  }
}

.history-list {
  background: Rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  max-height: 250px;
  overflow-y: auto;
  min-height: 0;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  &:last-child { border-bottom: none; }

  .sale-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    .date { font-size: 10px; color: $muted; }
    .item-name {
      @include pixelated;
      font-size: 9px;
      color: var(--white);
      line-height: 1.5;
      padding-top: 2px;
      strong { color: Rgba(56, 189, 248, 1); }
    }
  }

  .sale-value {
    text-align: right;
    display: flex;
    flex-direction: column;
    .net-gain { font-size: 14px; font-weight: bold; color: Rgba(34, 197, 94, 1); }
    .gross-price { font-size: 9px; color: $muted; }
  }
}

.empty-state {
  padding: 30px;
  text-align: center;
  color: $muted;
  font-size: 12px;
  background: Rgba(255, 255, 255, 0.01);
  border-radius: 12px;
  border: 1px dashed Rgba(255, 255, 255, 0.05);
}

</style>
