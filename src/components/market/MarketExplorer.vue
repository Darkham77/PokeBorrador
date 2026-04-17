<script setup>
import { computed } from 'vue'
import { useGTSStore } from '@/stores/gtsStore'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'

const gtsStore = useGTSStore()

const listings = computed(() => gtsStore.filteredListings)

function handleBuy(listing) {
  gtsStore.buyListing(listing)
}

function getTierData(pokemon) {
  return getPokemonTier(pokemon)
}

function getSprite(pokemon) {
  // Assuming standard sprite path if not provided in data
  if (pokemon.sprite) return pokemon.sprite
  return `/assets/sprites/pokemon/${pokemon.id}.webp`
}
</script>

<template>
  <div class="market-explorer">
    <div v-if="gtsStore.loading" class="loading-state">
      <div class="loader"></div>
      <p>Sincronizando ofertas...</p>
    </div>

    <div v-else-if="listings.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <p>No se encontraron ofertas que coincidan con los filtros.</p>
    </div>

    <div v-else class="listings-grid custom-scrollbar">
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
              <div class="tier-badge" :style="{ background: getTierData(item.data).bg }">
                {{ getTierData(item.data).tier }}
              </div>
              <img :src="getSprite(item.data)" class="pokemon-sprite pixelated">
            </template>
            <template v-else>
               <span class="item-icon">{{ item.data.icon || '📦' }}</span>
            </template>
          </div>

          <div class="info-area">
            <h3 class="name">{{ item.data.name }}</h3>
            <div v-if="item.listing_type === 'pokemon'" class="meta">
              <span class="lvl">Nv. {{ item.data.level }}</span>
              <span class="types">
                <span class="type-tag" :class="item.data.type">{{ item.data.type }}</span>
                <span v-if="item.data.type2" class="type-tag" :class="item.data.type2">{{ item.data.type2 }}</span>
              </span>
            </div>
            <div v-else class="meta">
              <span class="qty">Cantidad: x{{ item.data.qty || 1 }}</span>
            </div>
            
            <div class="price-tag">
              ₽{{ item.price.toLocaleString() }}
            </div>
          </div>
        </div>

        <button 
          class="buy-btn"
          @click="handleBuy(item)"
        >
          COMPRAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
  padding-right: 8px;
}

.listing-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-3px);
    border-color: #a855f755;
    background: rgba(255, 255, 255, 0.05);
  }
}

.seller-header {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #64748b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.card-body {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.visual-area {
  width: 64px;
  height: 64px;
  background: rgba(0, 0, 0, 0.2);
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

  .tier-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    font-size: 8px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 8px;
    color: #fff;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
}

.info-area {
  flex: 1;
  min-width: 0;

  .name {
    font-size: 13px;
    font-weight: bold;
    color: #fff;
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
    color: #94a3b8;
  }

  .price-tag {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    color: #ffd700;
  }
}

.type-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 8px;
  text-transform: uppercase;
  color: #fff;
  &.fire { background: #ff4422; }
  &.water { background: #3399ff; }
  &.grass { background: #77cc55; }
  &.electric { background: #ffcc33; }
  &.psychic { background: #ff5599; }
  &.normal { background: #aaaa99; }
  &.rock { background: #bbaa66; }
  &.ground { background: #ddbb55; }
  &.poison { background: #aa5599; }
  &.bug { background: #aabb22; }
  &.flying { background: #8899ff; }
  &.ghost { background: #6666bb; }
  &.ice { background: #66ccff; }
  &.dragon { background: #7766ee; }
  &.fighting { background: #bb5544; }
  &.dark { background: #775544; }
  &.steel { background: #aaaabb; }
}

.buy-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: #a855f7;
  color: #fff;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #bf5af2;
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
  }
  
  &:disabled {
    background: #334155;
    color: #64748b;
    cursor: not-allowed;
  }
}

.loading-state, .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-align: center;
  padding: 40px;
  
  .empty-icon { font-size: 48px; opacity: 0.2; margin-bottom: 16px; }
  p { font-size: 13px; }
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
