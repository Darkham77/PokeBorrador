<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGTSStore } from '@/stores/gts'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { type MarketListing, GTS_ITEMS_PER_PAGE } from '@/logic/economy/market'
import MarketExplorerListingCard from './MarketExplorerListingCard.vue'

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
      <div class="empty-icon emoji">
        📂
      </div>
      <p>No se encontraron ofertas que coincidan con los filtros.</p>
    </div>

    <div
      v-else
      class="listings-grid-wrapper"
    >
      <div class="listings-grid-unified custom-scrollbar">
        <MarketExplorerListingCard
          v-for="item in paginatedListings"
          :key="item.id"
          :listing="item"
          :user-money="game.state.money"
          :current-user-uid="auth.user?.id"
          @buy="handleBuy"
        />
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
