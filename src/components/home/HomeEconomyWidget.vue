<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGTSStore } from '@/stores/gts'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemById } from '@/data/inventory/items'
import type { MarketListing } from '@/logic/economy/market'
import type { Pokemon } from '@/types/pokemon/pokemon'

const gtsStore = useGTSStore()
const modalStore = useModalStore()

const widgetRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

onMounted(async () => {
  if (gtsStore.listings.length === 0) {
    await gtsStore.fetchListings()
  }

  gsapCtx = gsap.context(() => {
    if (widgetRef.value) {
      gsap.fromTo(
        widgetRef.value,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, widgetRef.value || undefined)
})

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert()
  }
})

const unseenSalesCount = computed(() => gtsStore.unseenSalesCount)
const recentListings = computed<MarketListing[]>(() => gtsStore.listings.slice(0, 5))

const openGTS = () => {
  modalStore.open('GlobalMarket')
}

const getListingSprite = (listing: MarketListing): string => {
  if (listing.listing_type === 'pokemon') {
    const poke = listing.data as Pokemon
    const speciesId = poke.id || poke.species
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
    ref="widgetRef"
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
        <button
          id="home-gts-view-all-btn"
          v-gsap-hover
          class="card-action-btn"
          @click.stop="openGTS"
        >
          VER TODO <span class="emoji">➔</span>
        </button>
      </div>
    </div>

    <!-- GTS Sales / Listings Content -->
    <div class="gts-body-section">
      <!-- Unseen Sales Alert Banner -->
      <div
        v-if="unseenSalesCount > 0"
        v-gsap-hover="{ scale: 1.01, y: -1 }"
        class="gts-sales-alert"
        @click.stop="openGTS"
      >
        <span class="emoji alert-icon">🔔</span>
        <div class="alert-info">
          <span class="alert-title">¡Ventas completadas en GTS!</span>
          <span class="alert-sub">Tienes {{ unseenSalesCount }} {{ unseenSalesCount === 1 ? 'venta realizada' : 'ventas realizadas' }} pendientes de cobro.</span>
        </div>
        <button
          v-gsap-hover
          class="alert-claim-btn"
        >
          RECLAMAR
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
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  box-sizing: border-box;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
  gap: 8px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;

  .card-icon {
    font-size: 20px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .title-text-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-title {
    @include pixelated;
    font-size: 11px;
    color: var(--yellow, #facc15);
    margin: 0;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .gts-sub {
    font-size: 10px;
    line-height: 1.35;
    color: Rgba(255, 255, 255, 0.5);
  }
}

.header-actions {
  display: flex;
  gap: 6px;
}

.card-action-btn {
  @include widget-action-btn;
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
  background: Rgba(250, 204, 21, 0.1);
  border: 1px solid Rgba(250, 204, 21, 0.35);
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: Rgba(250, 204, 21, 0.18);
    border-color: var(--yellow, #facc15);
    box-shadow: 0 0 12px Rgba(250, 204, 21, 0.25);
  }

  .alert-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .alert-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .alert-title {
      @include pixelated;
      font-size: 9px;
      color: var(--yellow, #facc15);
    }

    .alert-sub {
      font-size: 9px;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .alert-claim-btn {
    @include pixelated;
    font-size: 7px;
    padding: 4px 10px;
    background: var(--yellow, #facc15);
    color: #000000;
    font-weight: bold;
    border: none;
    border-radius: 4px;
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
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
  overflow: visible;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    border-color: Rgba(250, 204, 21, 0.3);
  }

  .item-icon-slot {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: Rgba(0, 0, 0, 0.35);
    border-radius: 6px;
    flex-shrink: 0;
    position: relative;
    overflow: visible;

    .item-thumb {
      width: 44px;
      height: 44px;
      object-fit: contain;
      @include pixelated;
      filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.6));
      pointer-events: none;
    }
  }

  .item-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .item-title {
      @include pixelated;
      font-size: 8px;
      color: var(--white, #ffffff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-seller {
      @include pixelated;
      font-size: 7px;
      color: var(--gray, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .item-price-tag {
    flex-shrink: 0;

    .price-val {
      @include pixelated;
      font-size: 8px;
      color: var(--yellow, #facc15);
      font-weight: bold;
    }
  }
}

.empty-gts-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: Rgba(0, 0, 0, 0.2);
  border: 1px dashed Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  cursor: pointer;

  .empty-gts-icon {
    font-size: 16px;
  }

  .empty-gts-text {
    font-size: 9px;
    color: var(--gray, #94a3b8);
  }
}
</style>
