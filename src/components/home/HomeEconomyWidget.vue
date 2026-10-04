<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGTSStore } from '@/stores/gts'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemById } from '@/data/inventory/items'
import type { MarketListing } from '@/logic/economy/market'
import type { Pokemon } from '@/types/pokemon/pokemon'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'
import HomeWidgetRefreshBtn from './HomeWidgetRefreshBtn.vue'

const gtsStore = useGTSStore()
const modalStore = useModalStore()

onMounted(async () => {
  if (gtsStore.listings.length === 0) {
    await gtsStore.fetchListings()
  }
})

const unclaimedGtsCount = computed(() => gtsStore.unclaimedGtsCount)
const recentListings = computed<MarketListing[]>(() => gtsStore.listings.slice(0, 5))

const openGTS = () => {
  modalStore.open('GlobalMarket')
}

const getListingSprite = (listing: MarketListing): string => {
  if (listing.listing_type === 'pokemon') {
    const poke = listing.data as Pokemon
    const speciesId = poke.id
    if (!speciesId) return ''
    return getAssetUrl(ASSET_TYPES.POKEMON, speciesId, { isShiny: poke.isShiny })
  }
  return getAssetUrl(ASSET_TYPES.ITEM, String(listing.data?.name || 'pokeball'))
}

const getListingTitle = (listing: MarketListing): string => {
  if (listing.listing_type === 'pokemon') {
    const poke = listing.data as Pokemon
    const shinyMark = poke.isShiny ? ' ✨' : ''
    return `${poke.name} Nv.${poke.level || 1}${shinyMark}`
  }
  const itemDef = getItemById(String(listing.data?.name || ''))
  const qty = listing.data?.qty || 1
  return `${itemDef?.name || listing.data?.name || 'Objeto'} x${qty}`
}
</script>

<template>
  <div
    class="home-gts-widget home-section-card"
  >
    <!-- Header -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji card-icon">🏪</span>
        <div class="title-text-group">
          <h3 class="card-title">
            MERCADO GTS
          </h3>
          <span class="gts-sub">
            Últimas publicaciones globales
          </span>
        </div>
      </div>

      <div class="header-actions">
        <HomeWidgetRefreshBtn
          id="home-gts-refresh-btn"
          :loading="gtsStore.loading"
          @click="gtsStore.fetchListings(true)"
        />
        <HomeWidgetMinimizeBtn widget-id="economy" />
      </div>
    </div>

    <!-- GTS Sales / Listings Content -->
    <div class="gts-body-section">
      <!-- Unclaimed Sales Alert Banner -->
      <div
        v-if="unclaimedGtsCount > 0"
        v-gsap-hover="{ scale: 1.01, y: -1 }"
        class="gts-sales-alert"
        @click.stop="openGTS"
      >
        <span class="emoji alert-icon">🔔</span>
        <div class="alert-info">
          <span class="alert-title">¡Reclamos pendientes en GTS!</span>
          <span class="alert-sub">Tienes {{ unclaimedGtsCount }} {{ unclaimedGtsCount === 1 ? 'transacción pendiente' : 'transacciones pendientes' }} de cobro o retiro.</span>
        </div>
        <button
          v-gsap-hover
          class="alert-claim-btn"
        >
          VER EN GTS
        </button>
      </div>

      <!-- Recent 5 Global Market Listings Preview -->
      <div
        v-if="recentListings.length > 0"
        class="recent-listings-list"
      >
        <div
          v-for="item in recentListings"
          :key="item.id"
          v-gsap-hover="{ scale: 1.01, x: 2 }"
          class="recent-listing-row"
          @click.stop="openGTS"
        >
          <div class="item-icon-slot">
            <img
              :src="getListingSprite(item)"
              :alt="getListingTitle(item)"
              class="item-thumb"
              @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
            >
          </div>

          <div class="item-details">
            <span class="item-title">{{ getListingTitle(item) }}</span>
            <span class="item-seller">Vendido por: {{ item.seller_name || 'Entrenador' }}</span>
          </div>

          <div class="item-price-tag">
            <span class="price-val">₽{{ item.price.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <div
        v-else
        class="empty-gts-box"
        @click.stop="openGTS"
      >
        <span class="emoji empty-gts-icon">🏪</span>
        <span class="empty-gts-text">Sin ofertas activas registradas en el mercado.</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-gts-widget {
  @include home-section-card;
}

.card-header-bar {
  @include home-card-header-bar;
}

.title-wrap {
  @include home-card-title-wrap;

  .title-text-group {
    gap: 3px;
  }

  .card-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .gts-sub {
    color: Rgb(255 255 255 / 50%);
    font-size: 10px;
    line-height: 1.35;
  }
}

.header-actions {
  @include widget-header-actions;

  flex-shrink: 0;
  margin-left: auto;
}

.gts-body-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.gts-sales-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid Rgb(250 204 21 / 35%);
  border-radius: 8px;
  background: Rgb(250 204 21 / 10%);
  cursor: pointer;

  &:hover {
    background: Rgb(250 204 21 / 18%);
    border-color: var(--yellow, #facc15);
    box-shadow: 0 0 12px Rgb(250 204 21 / 25%);
  }

  .alert-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .alert-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    .alert-title {
      @include pixelated;

      color: var(--yellow, #facc15);
      font-size: 9px;
    }

    .alert-sub {
      color: #e2e8f0;
      font-size: 9px;
      line-height: 1.45;
      padding-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .alert-claim-btn {
    @include pixelated;

    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    background: var(--yellow, #facc15);
    color: #000;
    font-size: 7px;
    font-weight: bold;
    cursor: pointer;
    flex-shrink: 0;
  }
}

.recent-listings-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.recent-listing-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 8px;
  background: Rgb(255 255 255 / 2%);
  cursor: pointer;
  box-sizing: border-box;
  overflow: visible;

  &:hover {
    background: Rgb(255 255 255 / 6%);
    border-color: Rgb(250 204 21 / 30%);
  }

  .item-icon-slot {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: Rgb(0 0 0 / 35%);
    flex-shrink: 0;
    overflow: visible;

    .item-thumb {
      @include pixelated;

      width: 44px;
      height: 44px;
      object-fit: contain;
      filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 60%));
      pointer-events: none;
    }
  }

  .item-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    .item-title {
      @include pixelated;

      color: var(--white, #fff);
      font-size: 8px;
      line-height: 1.45;
      padding-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-seller {
      @include pixelated;

      color: var(--gray, #94a3b8);
      font-size: 7px;
      line-height: 1.4;
      padding-bottom: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .item-price-tag {
    flex-shrink: 0;

    .price-val {
      @include pixelated;

      color: var(--yellow, #facc15);
      font-size: 8px;
      font-weight: bold;
    }
  }
}

.empty-gts-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px dashed Rgb(255 255 255 / 6%);
  border-radius: 6px;
  background: Rgb(0 0 0 / 20%);
  cursor: pointer;

  .empty-gts-icon {
    font-size: 16px;
  }

  .empty-gts-text {
    color: var(--gray, #94a3b8);
    font-size: 9px;
  }
}
</style>
