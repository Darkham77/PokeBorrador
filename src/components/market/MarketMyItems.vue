<script setup>
import { computed } from 'vue'
import { useGTSStore } from '@/stores/gtsStore'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'

const gtsStore = useGTSStore()

const activeListings = computed(() => gtsStore.activeMyListings)
const history = computed(() => gtsStore.salesHistory)

async function handleCancel(id) {
  if (confirm('¿Estás seguro de que deseas cancelar esta publicación? El objeto/Pokémon volverá a tu inventario.')) {
    await gtsStore.cancelListing(id)
  }
}
</script>

<template>
  <div class="market-my-items">
    <section class="listings-section">
      <h3 class="section-title">
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
        class="my-listings-grid"
      >
        <div 
          v-for="item in activeListings"
          :key="item.id"
          class="my-listing-card"
        >
          <div class="card-visual">
            <template v-if="item.listing_type === 'pokemon'">
              <div
                class="tier-mark"
                :style="{ background: getPokemonTier(item.data).bg }"
              />
              <img
                :src="`/assets/sprites/pokemon/${item.data.id}.webp`"
                class="p-sprite pixelated"
              >
            </template>
            <template v-else>
              <span class="i-icon">📦</span>
            </template>
          </div>

          <div class="card-info">
            <span class="name">{{ item.data.name }}</span>
            <span class="price">₽{{ item.price.toLocaleString() }}</span>
          </div>

          <button
            class="cancel-btn"
            @click="handleCancel(item.id)"
          >
            CANCELAR
          </button>
        </div>
      </div>
    </section>

    <section class="history-section">
      <h3 class="section-title">
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
            <span class="date">{{ new Date(sale.created_at).toLocaleDateString() }}</span>
            <span class="item-name">Vendido: <strong>{{ sale.data.name }}</strong></span>
          </div>
          <div class="sale-value">
            <span class="net-gain">+ ₽{{ (sale.price * (1 - gtsStore.MARKET_FEE)).toLocaleString() }}</span>
            <span class="gross-price">PVP: ₽{{ sale.price.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.market-my-items {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #a855f7;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.my-listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.my-listing-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 15px;

  .card-visual {
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    
    .tier-mark { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
    .p-sprite { width: 40px; height: 40px; object-fit: contain; }
    .i-icon { font-size: 20px; }
  }

  .card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    .name { font-size: 13px; font-weight: bold; color: #fff; }
    .price { font-family: 'Press Start 2P', monospace; font-size: 8px; color: #ffd700; margin-top: 4px;}
  }

  .cancel-btn {
    padding: 6px 10px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: #f87171;
    border-radius: 6px;
    font-size: 9px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: #f87171; color: #fff; }
  }
}

.history-list {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  max-height: 250px;
  overflow-y: auto;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  &:last-child { border-bottom: none; }

  .sale-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    .date { font-size: 10px; color: #64748b; }
    .item-name { font-size: 13px; color: #fff; strong { color: #a855f7; } }
  }

  .sale-value {
    text-align: right;
    display: flex;
    flex-direction: column;
    .net-gain { font-size: 14px; font-weight: bold; color: #22c55e; }
    .gross-price { font-size: 9px; color: #64748b; }
  }
}

.empty-state {
  padding: 30px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.01);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.05);
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
