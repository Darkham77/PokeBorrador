<script setup>
import { computed, ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useShopStore } from '@/stores/shopStore'

const gameStore = useGameStore()
const uiStore = useUIStore()
const shopStore = useShopStore()

const activeTab = computed(() => uiStore.activeTab)
const gs = computed(() => gameStore.state)

const currentRank = computed(() => shopStore.getTrainerRank)

const displayItems = computed(() => {
  const isTrainerShop = activeTab.value === 'trainer-shop'
  
  return shopStore.SHOP_ITEMS.filter(item => {
    if (isTrainerShop) {
      if (!item.trainerShop) return false
    } else {
      if (item.market === false) return false
    }

    if (shopStore.marketCategory !== 'todos' && item.cat !== shopStore.marketCategory) return false
    if (shopStore.searchQuery && !item.name.toLowerCase().includes(shopStore.searchQuery.toLowerCase())) return false

    return true
  }).sort((a, b) => {
    const aLocked = gs.value.level < a.unlockLv ? 1 : 0
    const bLocked = gs.value.level < b.unlockLv ? 1 : 0
    if (aLocked !== bLocked) return aLocked - bLocked
    return a.unlockLv - b.unlockLv
  })
})

const getPrice = (item) => {
  if (activeTab.value === 'trainer-shop') return item.bcPrice
  let price = item.price
  if (gs.value.playerClass === 'rocket') {
    price = Math.floor(price * 1.20)
  }
  return price
}

const handleBuy = (item) => {
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
  <div class="shop-view-legacy custom-scrollbar">
    <!-- RANK STATUS BAR (Legacy Style) -->
    <div class="rank-status-bar">
      <span class="rank-txt">
        ⭐ Rango: <strong class="rank-name">{{ currentRank.title }}</strong> (Nv. {{ gs.level }})
      </span>
      <span class="rank-hint">
        {{ activeTab === 'market' ? 'Más ítems se desbloquean al subir de nivel.' : 'Comprá ítems exclusivos con Battle Coins.' }}
      </span>
    </div>

    <!-- MONEY COUNTERS (Legacy style with Press Start) -->
    <div class="money-counters">
      <div
        v-if="activeTab === 'market'"
        class="counter money"
      >
        <span class="label">DINERO:</span>
        <span class="value">₽ {{ gs.money.toLocaleString() }}</span>
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
        @click="shopStore.marketCategory = cat"
      >
        {{ shopStore.CATEGORY_LABELS[cat] }}
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
        :class="{ locked: gs.level < item.unlockLv }"
      >
        <span
          class="tier-tag"
          :class="'tier-' + item.tier"
        >
          {{ item.tier.toUpperCase() }}
        </span>
        
        <div class="item-visual">
          <img
            v-if="item.sprite"
            :src="item.sprite"
            class="pixel-sprite"
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
          v-if="gs.level < item.unlockLv"
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
            ₽ {{ getPrice(item).toLocaleString() }}
            <small v-if="gs.playerClass === 'rocket'">(+20%)</small>
          </template>
        </div>

        <!-- Qty Picker for Normal Market -->
        <div
          v-if="gs.level >= item.unlockLv && activeTab === 'market'"
          class="qty-picker"
        >
          <label>CANT:</label>
          <input 
            type="number"
            min="1"
            max="999" 
            :value="shopStore.getQuantity(item.id)"
            class="qty-input"
            @input="e => shopStore.setQuantity(item.id, e.target.value)"
          >
        </div>

        <div
          v-if="gs.level >= item.unlockLv && activeTab === 'market'"
          class="item-total"
        >
          TOTAL: ₽<span>{{ (getPrice(item) * shopStore.getQuantity(item.id)).toLocaleString() }}</span>
        </div>

        <button 
          class="buy-btn-retro"
          :disabled="gs.level < item.unlockLv || (activeTab === 'market' ? gs.money < (getPrice(item) * shopStore.getQuantity(item.id)) : (gs.battleCoins || 0) < item.bcPrice)"
          @click="handleBuy(item)"
        >
          <template v-if="gs.level < item.unlockLv">
            BLOQUEADO
          </template>
          <template v-else-if="activeTab === 'market' && gs.money < (getPrice(item) * shopStore.getQuantity(item.id))">
            SIN FONDOS
          </template>
          <template v-else-if="activeTab === 'trainer-shop' && (gs.battleCoins || 0) < item.bcPrice">
            SIN BC
          </template>
          <template v-else>
            COMPRAR {{ activeTab === 'market' ? 'x' + marketStore.getQuantity(item.id) : '' }}
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.shop-view-legacy {
  padding: 30px;
  background: #0d1117;
  height: 100%;
  overflow-y: auto;
}

/* RANK BAR */
.rank-status-bar {
  background: rgba(0,0,0,0.3);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  text-align: center;
  margin-bottom: 25px;

  .rank-txt { font-size: 11px; color: #a855f7; margin-right: 15px; }
  .rank-name { color: #fff; text-shadow: 0 0 10px rgba(168, 85, 247, 0.4); }
  .rank-hint { font-size: 10px; color: #64748b; }
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

    .label { font-size: 9px; color: #64748b; font-weight: bold; }
    .value { 
      font-family: 'Press Start 2P', monospace; 
      font-size: 12px; 
    }

    &.money .value { color: #ffd700; text-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
    &.coins .value { color: #a855f7; text-shadow: 0 0 15px rgba(168, 85, 247, 0.3); }
  }
}

/* TABS */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 25px;
  background: rgba(255,255,255,0.03);
  padding: 5px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}

.tab-btn-retro {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: #64748b;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;

  &:hover { background: rgba(255,255,255,0.05); color: #fff; }
  &.active { background: #a855f7; color: #fff; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
}

/* SEARCH */
.search-box { margin-bottom: 30px; }
.retro-input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 14px 20px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  outline: none;
  &:focus { border-color: #ffd70044; }
}

/* GRID */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  padding-bottom: 60px;
}

.item-card-legacy {
  background: #1c2128;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid rgba(255,255,255,0.06);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;

  &:hover:not(.locked) { border-color: #ffd70088; transform: translateY(-3px); }
  &.locked { opacity: 0.3; filter: grayScale(1.0); }

  .tier-tag {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 8px;
    font-weight: bold;
    padding: 3px 8px;
    border-radius: 10px;
    
    &.tier-common { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    &.tier-rare { background: rgba(59, 131, 246, 0.2); color: #60a5fa; }
    &.tier-epic { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    &.tier-legend { background: rgba(234, 179, 8, 0.2); color: #fbbf24; }
  }

  .item-visual {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
    .pixel-sprite { width: 42px; height: 42px; image-rendering: pixelated; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5)); }
    .item-emoji { font-size: 36px; }
  }

  .item-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    text-align: center;
    margin-bottom: 10px;
    color: #fff;
    line-height: 1.4;
  }

  .item-desc {
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
    margin-bottom: 15px;
    line-height: 1.5;
    flex: 1;
  }

  .item-price {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #ffd700;
    text-align: center;
    margin-bottom: 15px;
    &.rocket-tax { color: #f87171; }
    small { font-size: 7px; opacity: 0.7; }
  }

  .qty-picker {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 10px;
    label { font-weight: bold; color: #64748b; }
    .qty-input {
      width: 60px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 5px;
      color: #fff;
      text-align: center;
      outline: none;
    }
  }

  .item-total {
    text-align: center;
    font-size: 10px;
    color: #22c55e;
    font-weight: bold;
    margin-bottom: 15px;
  }

  .buy-btn-retro {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #ffd700, #f59e0b);
    color: #000;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) { transform: #{'Scale(1.03)'}; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); }
    &:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
  }
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
