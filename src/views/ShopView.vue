<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useShopStore } from '@/stores/shop'
import BlackMarket from '@/components/shop/BlackMarket.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ShopItem } from '@/types/items'

const gameStore = useGameStore()
const uiStore = useUIStore()
const shopStore = useShopStore()

const activeTab = computed(() => uiStore.activeTab)
const gs = computed(() => gameStore.state)

const currentRank = computed(() => shopStore.getTrainerRank)

const displayItems = computed(() => {
  const isTrainerShop = activeTab.value === 'trainer-shop'
  
  return (shopStore.SHOP_ITEMS as ShopItem[]).filter((item: ShopItem) => {
    if (isTrainerShop) {
      if (!item.trainerShop) return false
    } else {
      if (item.market === false) return false
    }

    if (shopStore.marketCategory !== 'todos' && item.cat !== shopStore.marketCategory) return false
    if (shopStore.searchQuery && !item.name.toLowerCase().includes(shopStore.searchQuery.toLowerCase())) return false

    return true
  }).sort((a: ShopItem, b: ShopItem) => {
    const aLocked = gs.value.trainerLevel < (a.unlockLv || 1) ? 1 : 0
    const bLocked = gs.value.trainerLevel < (b.unlockLv || 1) ? 1 : 0
    if (aLocked !== bLocked) return aLocked - bLocked
    return (a.unlockLv || 1) - (b.unlockLv || 1)
  })
})

const getPrice = (item: ShopItem) => {
  if (activeTab.value === 'trainer-shop') return item.bcPrice
  
  let price = item.price
  if (gs.value.playerClass === 'rocket') {
    price = Math.floor(price * 1.20)
  }
  return price
}

const handleBuy = (item: ShopItem) => {
  if (activeTab.value === 'trainer-shop') {
    shopStore.buyItemBC(item.id)
  } else {
    shopStore.buyItem(item.id)
  }
}

onMounted(() => {
  // Ensure quantities are initialized if needed
})
</script>

<template>
  <div class="shop-view-legacy">
    <!-- RANK STATUS BAR (Legacy Style) -->
    <div class="rank-status-bar">
      <span class="rank-txt">
        ⭐ Rango: <strong class="rank-name">{{ currentRank?.title || 'Desconocido' }}</strong> (Nv. {{ gs.trainerLevel }})
      </span>
      <span class="rank-hint">
        {{ activeTab === 'market' ? 'Más ítems se desbloquean al subir de nivel.' : 'Comprá ítems exclusivos con Battle Coins.' }}
      </span>
    </div>

    <!-- BLACK MARKET (Team Rocket Special) -->
    <BlackMarket v-if="gs.playerClass === 'rocket' && activeTab === 'market'" />

    <!-- MONEY COUNTERS (Legacy style with Press Start) -->
    <div class="money-counters">
      <div
        v-if="activeTab === 'market'"
        class="counter money"
      >
        <span class="label">DINERO:</span>
        <span class="value">₽ {{ (gs.money || 0).toLocaleString() }}</span>
      </div>
      <div
        v-else
        class="counter coins"
      >
        <span class="label">BATTLE COINS:</span>
        <span class="value">{{ (gs.battleCoins || 0).toLocaleString() }} BC</span>
      </div>
    </div>

    <!-- TABS BAR (Legacy Navigation) -->
    <div class="category-tabs">
      <button 
        v-for="cat in shopStore.ITEM_CATEGORIES" 
        :key="cat"
        class="tab-btn-retro"
        :class="{ active: shopStore.marketCategory === cat }"
        @click.stop="shopStore.marketCategory = cat"
      >
        {{ (shopStore.CATEGORY_LABELS as Record<string, string>)[cat] }}
      </button>
    </div>

    <!-- SEARCH BAR -->
    <div class="search-box">
      <input 
        v-model="shopStore.searchQuery"
        type="text" 
        class="retro-input" 
        placeholder="BUSCAR ÍTEM..."
      >
    </div>

    <!-- SHOP GRID -->
    <div class="shop-grid">
      <div 
        v-for="item in displayItems" 
        :key="item.id"
        class="item-card-legacy"
        :class="{ locked: gs.trainerLevel < (item.unlockLv || 1) }"
      >
        <span
          class="tier-tag"
          :class="'tier-' + item.tier"
        >
          {{ (item.tier || 'common').toUpperCase() }}
        </span>
        
        <div class="item-visual">
          <img
            v-if="item.sprite"
            :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
            class="pixel-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
          <span
            v-else
            class="item-emoji"
          >{{ item.icon }}</span>
        </div>

        <div class="item-name">
          {{ item.name.toUpperCase() }}
        </div>
        
        <div
          v-if="item.type"
          class="item-type"
          :class="item.type"
        >
          {{ item.type === 'stone' ? 'PIEDRA' : item.type === 'held' ? 'EQUIPABLE' : 'USABLE' }}
        </div>

        <div class="item-desc">
          {{ item.desc }}
        </div>

        <div
          v-if="gs.trainerLevel < (item.unlockLv || 1)"
          class="lock-info"
        >
          🔒 NV. {{ item.unlockLv }}
        </div>

        <div
          class="item-price"
          :class="{ 'rocket-tax': gs.playerClass === 'rocket' && activeTab === 'market' }"
        >
          <template v-if="activeTab === 'trainer-shop'">
            💰 {{ item.bcPrice }} BC
          </template>
          <template v-else>
            ₽ {{ (getPrice(item) || 0).toLocaleString() }}
            <small v-if="gs.playerClass === 'rocket'">(+20%)</small>
          </template>
        </div>

        <!-- Qty Picker for Normal Market -->
        <div
          v-if="gs.trainerLevel >= (item.unlockLv || 1) && activeTab === 'market'"
          class="qty-picker"
        >
          <label>CANT:</label>
          <input 
            type="number"
            min="1"
            max="999" 
            :value="shopStore.getQuantity(item.id)"
            class="qty-input"
            @input="(e: Event) => shopStore.setQuantity(item.id, (e.target as HTMLInputElement).value)"
          >
        </div>

        <div
          v-if="gs.trainerLevel >= (item.unlockLv || 1) && activeTab === 'market'"
          class="item-total"
        >
          TOTAL: ₽<span>{{ ((getPrice(item) || 0) * shopStore.getQuantity(item.id)).toLocaleString() }}</span>
        </div>

        <button 
          class="buy-btn-retro"
          :disabled="gs.trainerLevel < (item.unlockLv || 1) || (activeTab === 'market' ? gs.money < ((getPrice(item) || 0) * shopStore.getQuantity(item.id)) : (gs.battleCoins || 0) < (item.bcPrice || 0))"
          @click.stop="handleBuy(item)"
        >
          <template v-if="gs.trainerLevel < (item.unlockLv || 1)">
            BLOQUEADO
          </template>
          <template v-else-if="activeTab === 'market' && gs.money < ((getPrice(item) || 0) * shopStore.getQuantity(item.id))">
            SIN FONDOS
          </template>
          <template v-else-if="activeTab === 'trainer-shop' && (gs.battleCoins || 0) < (item.bcPrice || 0)">
            SIN BC
          </template>
          <template v-else>
            COMPRAR {{ activeTab === 'market' ? 'x' + shopStore.getQuantity(item.id) : '' }}
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.shop-view-legacy {
  padding: 0 0 40px;
  background: var(--bg-dark);
}

/* RANK BAR */
.rank-status-bar {
  background: Rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  text-align: center;
  margin-bottom: 25px;

  .rank-txt { font-size: 11px; color: Rgba(168, 85, 247, 1); margin-right: 15px; }
  .rank-name { color: var(--white); text-shadow: 0 0 10px Rgba(168, 85, 247, 0.4); }
  .rank-hint { font-size: 10px; color: var(--gray); }
}

/* MONEY COUNTERS */
.money-counters {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 30px;

  .counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .label { font-size: 9px; color: var(--gray); font-weight: bold; }
    .value { 
      @include pixelated; 
      font-size: 12px; 
    }

    &.money .value { color: var(--yellow); text-shadow: 0 0 15px Rgba(255, 215, 0, 0.3); }
    &.coins .value { color: Rgba(168, 85, 247, 1); text-shadow: 0 0 15px Rgba(168, 85, 247, 0.3); }
  }
}

/* TABS */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 25px;
  background: Rgba(255, 255, 255, 0.03);
  padding: 5px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
}

.tab-btn-retro {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--gray);
  @include pixelated;
  font-size: 7px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;

  &:hover { background: Rgba(255, 255, 255, 0.05); color: var(--white); }
  &.active { background: Rgba(168, 85, 247, 1); color: var(--white); box-shadow: 0 4px 15px Rgba(168, 85, 247, 0.4); }
}

/* SEARCH */
.search-box { margin-bottom: 30px; }
.retro-input {
  width: 100%;
  background: Rgba(0,0,0,0.3);
  border: 2px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 20px;
  color: var(--white);
  @include pixelated;
  font-size: 8px;
  outline: none;
  &:focus { border-color: Rgba(255, 215, 0, 0.3); }
}

/* GRID */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  padding-bottom: 60px;
}

.item-card-legacy {
  background: $card-dark;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid Rgba(255, 255, 255, 0.06);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;

  &:hover:not(.locked) { border-color: Rgba(255, 215, 0, 0.5); transform: TranslateY(-3px); }
  &.locked { opacity: 0.3; filter: Grayscale(1.0); }

  .tier-tag {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 8px;
    font-weight: bold;
    padding: 3px 8px;
    border-radius: 10px;
    
    &.tier-common { background: Rgba(148, 163, 184, 0.1); color: var(--gray); }
    &.tier-rare { background: Rgba(59, 131, 246, 0.1); color: Rgba(96, 165, 250, 1); }
    &.tier-epic { background: Rgba(168, 85, 247, 0.1); color: Rgba(192, 132, 252, 1); }
    &.tier-legend { background: Rgba(234, 179, 8, 0.1); color: var(--yellow); }
  }

  .item-visual {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
    .pixel-sprite { width: 42px; height: 42px; @include sprite-render; filter: Drop-Shadow(0 2px 5px Rgba(0, 0, 0, 0.5)); }
    .item-emoji { font-size: 36px; }
  }

  .item-name {
    @include pixelated;
    font-size: 8px;
    text-align: center;
    margin-bottom: 10px;
    color: var(--white);
    line-height: 1.4;
  }

  .item-desc {
    font-size: 11px;
    color: var(--gray);
    text-align: center;
    margin-bottom: 15px;
    line-height: 1.5;
    flex: 1;
  }

  .item-price {
    @include pixelated;
    font-size: 10px;
    color: var(--yellow);
    text-align: center;
    margin-bottom: 15px;
    &.rocket-tax { color: var(--red); }
    small { font-size: 7px; opacity: 0.7; }
  }

  .qty-picker {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 10px;
    label { font-weight: bold; color: var(--gray); }
    .qty-input {
      width: 60px;
      background: Rgba(0, 0, 0, 0.3);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 5px;
      color: var(--white);
      text-align: center;
      outline: none;
    }
  }

  .item-total {
    text-align: center;
    font-size: 10px;
    color: var(--green-bright);
    font-weight: bold;
    margin-bottom: 15px;
  }

  .buy-btn-retro {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: Linear-Gradient(135deg, var(--yellow), #f59e0b);
    color: var(--black);
    @include pixelated;
    font-size: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) { transform: Scale(1.03); box-shadow: 0 4px 15px Rgba(255, 215, 0, 0.4); }
    &:disabled { background: Rgba(51, 65, 85, 1); color: var(--gray); cursor: not-allowed; }
  }
}
</style>
