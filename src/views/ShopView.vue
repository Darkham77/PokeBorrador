<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useShopStore } from '@/stores/shop'

const gameStore = useGameStore()
const uiStore = useUIStore()
const shopStore = useShopStore()

const activeTab = computed(() => uiStore.activeTab)
const gs = computed(() => gameStore.state)

// Filter logic
const categories = ['todos', 'pokeballs', 'pociones', 'stones', 'especial', 'held', 'booster', 'utility']
const categoryLabels = {
  todos: 'Todo',
  pokeballs: 'Pokéballs',
  pociones: 'Pociones',
  stones: 'Piedras',
  especial: 'Especial',
  held: 'Equipables',
  booster: 'Potenciadores',
  utility: 'Utilidad'
}

const activeCategory = ref('todos')
const searchQuery = ref('')
const selectedQty = ref({}) // Tracks qty per item id

const displayItems = computed(() => {
  const isTrainerShop = activeTab.value === 'trainer-shop'
  const items = isTrainerShop ? shopStore.trainerShopItems : shopStore.filteredItems
  
  return items.filter(i => {
    if (activeCategory.value !== 'todos' && i.cat !== activeCategory.value) return false
    if (searchQuery.value && !i.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    const aLocked = gs.value.trainerLevel < a.unlockLv
    const bLocked = gs.value.trainerLevel < b.unlockLv
    if (aLocked !== bLocked) return aLocked ? 1 : -1
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

const getQty = (itemId) => selectedQty.value[itemId] || 1
const setQty = (itemId, val) => {
  let v = parseInt(val)
  if (isNaN(v) || v < 1) v = 1
  if (v > 99) v = 99
  selectedQty.value[itemId] = v
}

const handleBuy = (item) => {
  const qty = getQty(item.id)
  const success = shopStore.buyItem(item.id, qty)
  if (success) {
    selectedQty.value[item.id] = 1 // Reset qty
  }
}

// Trainer Rank display logic
const TRAINER_RANKS = [
  { lv: 1, title: 'Novato' }, { lv: 2, title: 'Principiante' }, { lv: 3, title: 'Aprendiz' },
  { lv: 4, title: 'Explorador' }, { lv: 5, title: 'Aventurero' }, { lv: 6, title: 'Veterano' },
  { lv: 7, title: 'Experto' }, { lv: 8, title: 'Maestro' }, { lv: 9, title: 'Gran Maestro' },
  { lv: 10, title: 'Campeón' }, { lv: 11, title: 'As de la Liga' }, { lv: 12, title: 'Entrenador de Elite' },
  { lv: 13, title: 'Gran Campeón' }, { lv: 14, title: 'Leyenda Viviente' }, { lv: 15, title: 'Maestro Pokémon' },
  { lv: 16, title: 'Héroe Regional' }, { lv: 17, title: 'Vencedor Supremo' }, { lv: 18, title: 'Estratega Maestro' },
  { lv: 19, title: 'Guardián de Kanto' }, { lv: 20, title: 'Elegido de los Dioses' }, { lv: 21, title: 'Trascendente' },
  { lv: 22, title: 'Sabio de Combate' }, { lv: 23, title: 'Señor de los Dragones' }, { lv: 24, title: 'Conquistador de Cimas' },
  { lv: 25, title: 'Místico de Kanto' }, { lv: 26, title: 'Soberano de Batalla' }, { lv: 27, title: 'Omnisciente' },
  { lv: 28, title: 'Eterno' }, { lv: 29, title: 'Divinidad Pokémon' }, { lv: 30, title: 'Deidad de Kanto' }
]

const currentRank = computed(() => {
  const lv = gs.value?.trainerLevel || 1
  const rank = TRAINER_RANKS[Math.min(lv - 1, TRAINER_RANKS.length - 1)]
  return rank || { title: 'Desconocido' }
})
</script>

<template>
  <div class="shop-view">
    <!-- Header -->
    <div class="market-trainer-info">
      <div v-if="activeTab === 'market'" class="market-trainer-level">
        <span style="color:var(--purple);">⭐ Rango: <strong>{{ currentRank.title }}</strong> (Nv. {{ gs.trainerLevel }})</span>
        &nbsp;·&nbsp; Más ítems se desbloquean al subir de nivel.
      </div>
      <div v-else class="market-trainer-level">
        <span style="color:var(--purple);">⭐ Rango: <strong>{{ currentRank.title }}</strong> (Nv. {{ gs.trainerLevel }})</span>
        &nbsp;·&nbsp; Comprá ítems exclusivos con Battle Coins.
      </div>
      
      <div class="market-currency-display">
        <div v-if="activeTab === 'market'" class="currency-item">
          <span>₽ {{ gs.money.toLocaleString() }}</span>
        </div>
        <div v-else class="currency-item bc">
          <span><i class="fa-solid fa-coins"></i> {{ (gs.battleCoins || 0).toLocaleString() }} BC</span>
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="market-controls">
      <div id="market-tabs" class="market-tab-bar">
        <button 
          v-for="cat in categories" 
          :key="cat"
          class="market-tab-btn" 
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ categoryLabels[cat] }}
        </button>
      </div>
      
      <div class="market-search">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar ítem..." 
          class="market-search-input"
        >
      </div>
    </div>

    <div v-if="gs.playerClass === 'rocket' && activeTab === 'market'" class="rocket-tax-warning">
      ⚠️ Los reclutas del Team Rocket pagan un 20% más por cargos de "protección".
    </div>

    <!-- Grid -->
    <div class="market-item-grid">
      <div 
        v-for="item in displayItems" 
        :key="item.id"
        class="market-card"
        :class="{ locked: gs.trainerLevel < item.unlockLv }"
      >
        <span class="market-tier-badge" :class="'tier-' + item.tier">{{ item.tier }}</span>
        
        <div class="market-item-icon">
          <img v-if="item.sprite" :src="item.sprite" :alt="item.name" width="40" height="40" style="image-rendering:pixelated;" onerror="this.style.display='none'">
          <span v-else style="font-size:32px">{{ item.icon }}</span>
        </div>
        
        <div class="market-item-name">{{ item.name }}</div>
        <div class="market-item-desc">{{ item.desc }}</div>
        
        <div v-if="gs.trainerLevel < item.unlockLv" class="market-item-unlock">
          🔒 Nv. {{ item.unlockLv }}
        </div>
        
        <div class="market-item-price" :style="{ color: activeTab === 'trainer-shop' ? 'var(--purple)' : 'var(--yellow)' }">
          <template v-if="activeTab === 'trainer-shop'">
            <i class="fa-solid fa-coins"></i> {{ getPrice(item) }} BC
          </template>
          <template v-else>
            ₽ {{ getPrice(item).toLocaleString() }}
          </template>
        </div>

        <!-- Buy Controls -->
        <div v-if="gs.trainerLevel >= item.unlockLv" class="market-buy-controls">
          <div class="qty-selector">
            <button class="qty-btn" @click="setQty(item.id, getQty(item.id) - 1)">-</button>
            <input type="number" :value="getQty(item.id)" @input="setQty(item.id, $event.target.value)" min="1" max="99">
            <button class="qty-btn" @click="setQty(item.id, getQty(item.id) + 1)">+</button>
          </div>
          <button 
            class="market-buy-btn"
            :disabled="activeTab === 'trainer-shop' ? (gs.battleCoins || 0) < getPrice(item) : gs.money < (getPrice(item) * getQty(item.id))"
            @click="handleBuy(item)"
          >
            COMPRAR (₽{{ (getPrice(item) * getQty(item.id)).toLocaleString() }})
          </button>
        </div>
        <button v-else class="market-buy-btn" disabled>🔒 BLOQUEADO</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-view {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.market-trainer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.2);
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}

.market-trainer-level {
  font-size: 11px;
}

.market-currency-display {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--yellow);
}

.currency-item.bc {
  color: var(--purple);
}

.market-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.market-tab-bar {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  padding-bottom: 5px;
}

.market-tab-btn {
  white-space: nowrap;
  padding: 8px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: var(--gray);
  font-size: 10px;
  cursor: pointer;
}

.market-tab-btn.active {
  background: var(--yellow);
  color: var(--darker);
  border-color: var(--yellow);
}

.market-search-input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 10px 15px;
  color: #fff;
  font-size: 12px;
}

.rocket-tax-warning {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
  font-size: 10px;
  color: #ef4444;
}

.market-item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.market-buy-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qty-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 4px;
}

.qty-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.qty-selector input {
  width: 40px;
  text-align: center;
  background: transparent;
  border: none;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.market-buy-btn {
  font-size: 8px !important;
}

.tier-legend { background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; }
.tier-epic { background: linear-gradient(135deg, #BF36FB, #8E24AA); color: #fff; }
.tier-rare { background: linear-gradient(135deg, #0288D1, #03A9F4); color: #fff; }
.tier-common { background: #455A64; color: #fff; }

@media (max-width: 600px) {
  .market-item-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
}
</style>
