<script setup lang="ts">

import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useGTSStore } from '@/stores/gts'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import type { MarketListing } from '@/logic/market'
import { formatCurrency } from '@/logic/utils/formatters'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { formatDisplayDate } from '@/logic/timeUtils'

import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import type { Pokemon } from '@/types/pokemon'

const game = useGameStore()
const gtsStore = useGTSStore()
const auth = useAuthStore()

function getPokemonTotalPower(p: Pokemon) {
  if (!p) return 0
  const base = pokemonDataProvider.getPokemonData(p.id)
  const baseTot = base ? (base.hp + base.atk + base.def + base.spa + base.spd + base.spe) : 0
  const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  return baseTot + totalIvs
}

const listings = computed(() => gtsStore.filteredListings)

function handleBuy(listing: MarketListing) {
  gtsStore.buyListing(listing)
}

// formatTime is now centralized in timeUtils.ts as formatDisplayDate
const formatTime = formatDisplayDate


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
      class="listings-grid-unified custom-scrollbar"
    >
      <div 
        v-for="item in listings" 
        :key="item.id"
        class="market-item-wrapper"
        :class="[item.listing_type]"
      >
        <div class="seller-tag">
          <span class="s-name">👤 {{ item.seller_name }}</span>
          <span class="s-time">{{ formatTime(item.created_at) }}</span>
        </div>

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
        </template>
        <template v-else>
          <div class="explorer-item-card">
            <div class="item-visual">
              <img 
                :src="getAssetUrl(ASSET_TYPES.ITEM, item.data.name || '')" 
                class="i-sprite pixelated"
                @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'Poción')"
              >
            </div>
            <div class="item-details">
              <span class="i-name">{{ item.data.name }}</span>
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
            class="btn-vicio-primary btn-vicio-sm"
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
      .i-name { font-size: 13px; font-weight: bold; color: var(--white); display: block; margin-bottom: 4px; }
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

</style>
