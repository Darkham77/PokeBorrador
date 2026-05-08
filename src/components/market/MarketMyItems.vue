<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill'

import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useGTSStore } from '@/stores/gts'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'

const gtsStore = useGTSStore() as any

const activeListings = computed(() => gtsStore.activeMyListings)
const history = computed(() => gtsStore.salesHistory)

async function handleCancel(id: string | number) {
  if (confirm('¿Estás seguro de que deseas cancelar esta publicación? El objeto/Pokémon volverá a tu inventario.')) {
    await gtsStore.cancelListing(id)
  }
}
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
                :src="getAssetUrl(ASSET_TYPES.POKEMON, item.data.id)"
                class="p-sprite pixelated"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
            @click.stop="handleCancel(item.id)"
          >
            CANCELAR
          </button>
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
            <span class="date">{{ Temporal.Instant.fromEpochMilliseconds(sale.created_at).toLocaleDateString() }}</span>
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
@use "@/styles/core/_mixins" as *;
.market-my-items {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.mkt-section-title {
  @include pixelated;
  font-size: 8px;
  color: Rgba(168, 85, 247, 1);
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.my-listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.my-listing-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 15px;

  .card-visual {
    width: 48px;
    height: 48px;
    background: Rgba(0, 0, 0, 0.2);
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
    .name { font-size: 13px; font-weight: bold; color: var(--white); }
    .price { @include pixelated; font-size: 8px; color: $coin-gold; margin-top: 4px;}
  }

  .cancel-btn {
    padding: 6px 10px;
    background: Rgba(248, 113, 113, 0.1);
    border: 1px solid Rgba(248, 113, 113, 0.3);
    color: Rgba(248, 113, 113, 1);
    border-radius: 6px;
    font-size: 9px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: Rgba(248, 113, 113, 1); color: var(--white); }
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
    .item-name { font-size: 13px; color: var(--white); strong { color: Rgba(168, 85, 247, 1); } }
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
