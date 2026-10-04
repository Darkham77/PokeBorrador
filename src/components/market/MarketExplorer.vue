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
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.listings-grid-unified {
  @include shop-grid-wrapper-unified;

  display: grid;
  align-items: start;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-auto-rows: min-content;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: $muted;
  text-align: center;
  flex: 1;
  
  .empty-icon { font-size: 48px; opacity: 0.2; margin-bottom: 16px; }
  p { font-size: 13px; }
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid rgb(56 189 248 / 20%);
  border-radius: 50%;
  border-top-color: rgb(56 189 248 / 100%);
  margin-bottom: 16px;
}

.gts-pagination {
  @include pixelated;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 10px 0;
  font-size: 10px;
  margin-top: 15px;
  border-top: 1px solid rgb(255 255 255 / 5%);

  .page-info {
    color: var(--yellow);
  }
}

.listings-grid-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
</style>
