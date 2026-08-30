<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useGTSStore } from '@/stores/gts'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { type MarketListing, GTS_ITEMS_PER_PAGE } from '@/logic/economy/market'
import { formatCurrency } from '@/logic/utils/formatters'
import { formatDisplayDate } from '@/logic/utils/timeUtils'
import { getItemById } from '@/data/inventory/items'

import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'

import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

const game = useGameStore()
const gtsStore = useGTSStore()
const auth = useAuthStore()

const listings = computed(() => gtsStore.filteredListings)

const currentPage = ref(1)
const itemsPerPage = GTS_ITEMS_PER_PAGE

const totalPages = computed(() => Math.ceil(listings.value.length / itemsPerPage))

const paginatedListings = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return listings.value.slice(start, end)
})

watch(() => listings.value.length, () => {
  currentPage.value = 1
})

function handleBuy(listing: MarketListing) {
  gtsStore.buyListing(listing)
}

// formatTime is now centralized in timeUtils.ts as formatDisplayDate
const formatTime = formatDisplayDate

function getTierLabel(tier?: string) {
  const labels: Record<string, string> = {
    common: 'COMÚN',
    rare: 'RARO',
    epic: 'ÉPICO',
    legend: 'LEGENDARIO'
  }
  return labels[tier || 'common']
}

function getTierColor(tier?: string) {
  const t = tier || 'common'
  if (t === 'rare') return '#3b82f6'
  if (t === 'epic') return '#a855f7'
  if (t === 'legend') return 'var(--yellow)'
  return '#94a3b8'
}
</script>

<template>
  <div class="market-explorer">
    <div
      v-if="gtsStore.loading"
      class="loading-state"
    >
      <div
        v-gsap-loop="'spin'"
        class="loader"
      />
      <p>Sincronizando ofertas...</p>
    </div>

    <div
      v-else-if="listings.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        📂
      </div>
      <p>No se encontraron ofertas que coincidan con los filtros.</p>
    </div>

    <div
      v-else
      class="listings-grid-wrapper"
    >
      <div class="listings-grid-unified custom-scrollbar">
        <div 
          v-for="item in paginatedListings" 
          :id="'market-item-wrapper-' + item.id"
          :key="item.id"
          class="market-item-wrapper"
          :class="[
            item.listing_type,
            item.listing_type === 'item' ? 'tier-' + (getItemById(item.data.name || '')?.tier || 'common') : ''
          ]"
          :style="item.listing_type === 'item' ? { '--tier-color': getTierColor(getItemById(item.data.name || '')?.tier) } : {}"
        >
          <div class="seller-tag">
            <span class="s-name"><span class="icon">👤</span> {{ item.seller_name }}</span>
            <span class="s-time">{{ formatTime(item.created_at) }}</span>
          </div>

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
          </template>
          <template v-else>
            <!-- Tier Tag (Retro Style) -->
            <span
              class="tier-tag"
              :class="'tier-' + (getItemById(item.data.name || '')?.tier || 'common')"
            >
              {{ getTierLabel(getItemById(item.data.name || '')?.tier) }}
            </span>

            <div class="explorer-item-card">
              <div class="item-visual">
                <img 
                  :src="getAssetUrl(ASSET_TYPES.ITEM, item.data.name || '')" 
                  class="i-sprite pixelated"
                  @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'potion')"
                >
              </div>
              <div class="item-details">
                <span class="i-name">{{ getItemById(item.data.name || '')?.name || item.data.name }}</span>
                <div class="i-meta">
                  <span class="i-qty">CANTIDAD: x{{ item.data.qty || 1 }}</span>
                </div>
              </div>
            </div>
          </template>

          <div class="listing-footer">
            <div class="price-info">
              <span class="price-label">PRECIO</span>
              <span class="price-val">₽{{ formatCurrency(item.price) }}</span>
            </div>
            <button 
              :id="'gts-buy-btn-' + item.id"
              class="btn-vicio-primary btn-vicio-sm gts-buy-btn"
              :disabled="game.state.money < item.price || item.seller_id === auth.user?.id"
              @click.stop="handleBuy(item)"
            >
              {{ 
                item.seller_id === auth.user?.id 
                  ? 'TU OFERTA' 
                  : (game.state.money < item.price ? 'SIN SALDO' : 'COMPRAR') 
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination controls -->
      <div
        v-if="totalPages > 1"
        id="gts-explorer-pagination"
        class="gts-pagination"
      >
        <button 
          id="gts-explorer-prev-btn"
          class="btn-vicio-secondary btn-vicio-xs prev-page-btn" 
          :disabled="currentPage === 1" 
          @click="currentPage--"
        >
          ANTERIOR
        </button>
        <span
          id="gts-explorer-page-info"
          class="page-info"
        >PÁGINA {{ currentPage }} DE {{ totalPages }}</span>
        <button 
          id="gts-explorer-next-btn"
          class="btn-vicio-secondary btn-vicio-xs next-page-btn" 
          :disabled="currentPage === totalPages" 
          @click="currentPage++"
        >
          SIGUIENTE
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.market-explorer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.listings-grid-unified {
  @include shop-grid-wrapper-unified;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-auto-rows: min-content;
  align-items: start;
  gap: 20px;
}

.market-item-wrapper {
  @include shop-item-card($yellow);
  padding: 0;
  gap: 0;

  .seller-tag {
    display: flex;
    justify-content: space-between;
    padding: 10px 15px;
    background: Rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
    font-size: 8px;
    @include pixelated;
    color: $muted;

    .s-name { color: var(--blue); }
  }

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

  .explorer-item-card {
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 15px;

    .item-visual {
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

    .item-details {
      flex: 1;
      .i-name {
        @include pixelated;
        font-size: 9px;
        font-weight: bold;
        color: var(--white);
        display: block;
        margin-bottom: 4px;
        line-height: 1.5;
        padding-top: 2px;
      }
      .i-qty { font-size: 8px; @include pixelated; color: $muted; }
    }
  }

  .listing-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: Rgba(0, 0, 0, 0.2);
    border-top: 1px dashed Rgba(255, 255, 255, 0.08);

    .price-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      .price-label { font-size: 7px; @include pixelated; color: $muted; }
      .price-val { font-size: 14px; @include pixelated; color: $coin-gold; }
    }
  }
}

.loading-state, .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $muted;
  text-align: center;
  padding: 40px;
  
  .empty-icon { font-size: 48px; opacity: 0.2; margin-bottom: 16px; }
  p { font-size: 13px; }
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid Rgba(56, 189, 248, 0.2);
  border-top-color: Rgba(56, 189, 248, 1);
  border-radius: 50%;
  margin-bottom: 16px;
}

.gts-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
  padding: 10px 0;
  border-top: 1px solid Rgba(255, 255, 255, 0.05);
  @include pixelated;
  font-size: 10px;

  .page-info {
    color: var(--yellow);
  }
}

.listings-grid-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
