<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useGTSStore } from '@/stores/gts'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'

const gtsStore = useGTSStore() as any

const listings = computed(() => gtsStore.filteredListings)

function handleBuy(listing: any) {
  gtsStore.buyListing(listing)
}

function getTierData(pokemon: any) {
  return getPokemonTier(pokemon)
}

function getSprite(pokemon: any) {
  return getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id)
}

const getTypeColor = (type: string) => (PDEX_TYPE_COLORS as any)[type?.toLowerCase()] || 'Rgba(170, 170, 170, 1)'
</script>

<template>
  <div class="market-explorer">
    <div
      v-if="gtsStore.loading"
      class="loading-state"
    >
      <div class="loader" />
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
      class="listings-grid custom-scrollbar"
    >
      <div 
        v-for="item in listings" 
        :key="item.id"
        class="listing-card"
        :class="[item.listing_type]"
      >
        <div class="seller-header">
          <span class="seller-name">👤 {{ item.seller_name }}</span>
          <span class="time">{{ new Date(item.created_at).toLocaleDateString() }}</span>
        </div>

        <div class="card-body">
          <div class="visual-area">
            <template v-if="item.listing_type === 'pokemon'">
              <div
                class="market-tier-badge m-badge-tier"
                :style="{ background: getTierData(item.data).bg }"
              >
                {{ getTierData(item.data).tier }}
              </div>
              <img
                :src="getSprite(item.data)"
                class="pokemon-sprite pixelated"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              >
            </template>
            <template v-else>
              <span class="item-icon">{{ item.data.icon || '📦' }}</span>
            </template>
          </div>

          <div class="info-area">
            <h3 class="name">
              {{ item.data.name }}
            </h3>
            <div
              v-if="item.listing_type === 'pokemon'"
              class="meta"
            >
              <span class="lvl m-badge-level">Nv. {{ item.data.level }}</span>
              <span class="types">
                <span
                  class="type-tag"
                  :class="item.data.type"
                  :style="{ background: getTypeColor(item.data.type) }"
                >{{ item.data.type }}</span>
                <span
                  v-if="item.data.type2"
                  class="type-tag"
                  :class="item.data.type2"
                  :style="{ background: getTypeColor(item.data.type2) }"
                >{{ item.data.type2 }}</span>
              </span>
            </div>
            <div
              v-else
              class="meta"
            >
              <span class="qty">Cantidad: x{{ item.data.qty || 1 }}</span>
            </div>
            
            <div class="price-tag">
              ₽{{ item.price.toLocaleString() }}
            </div>
          </div>
        </div>

        <button 
          class="buy-btn"
          @click.stop="handleBuy(item)"
        >
          COMPRAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.market-explorer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 8px;
}

.listing-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-3px);
    border-color: #a855f755;
    background: Rgba(255, 255, 255, 0.05);
  }
}

.seller-header {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: $muted;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
}

.card-body {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.visual-area {
  width: 64px;
  height: 64px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;

  .pokemon-sprite {
    width: 56px;
    height: 56px;
    object-fit: contain;
  }
  
  .item-icon { font-size: 32px; }

  .market-tier-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    z-index: var(--z-low);
  }
}

.info-area {
  flex: 1;
  min-width: 0;

  .name {
    font-size: 13px;
    font-weight: bold;
    color: $white;
    margin: 0 0 4px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 10px;
    color: Rgba(148, 163, 184, 1);
  }

  .price-tag {
    @include pixelated;
    font-size: 9px;
    color: $coin-gold;
  }
}

.type-tag {
  @include type-pill-mini;
}

.buy-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: Rgba(168, 85, 247, 1);
  color: $white;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: $purple;
    box-shadow: 0 0 15px Rgba(168, 85, 247, 0.4);
  }
  
  &:disabled {
    background: Rgba(51, 65, 85, 1);
    color: $muted;
    cursor: not-allowed;
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
  border: 3px solid Rgba(168, 85, 247, 0.2);
  border-top-color: Rgba(168, 85, 247, 1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin { to { transform: Rotate(360deg); } }

</style>
