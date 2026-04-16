<script setup lang="js">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useMarketStore } from '@/stores/market'
import { useUIStore } from '@/stores/ui'

const gameStore = useGameStore()
const invStore = useInventoryStore()
const marketStore = useMarketStore()
const uiStore = useUIStore()

const gs = computed(() => gameStore.state)

// Estado local
const searchQuery = ref('')
const activeCategory = ref('all')

// Categorías disponibles
const CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'pokeballs', label: 'Pokéballs' },
  { id: 'pociones', label: 'Pociones' },
  { id: 'etc', label: 'Otros' }
]

// Listado filtrado de objetos
const filteredItems = computed(() => {
  const inventory = gs.value.inventory || {}
  const shopItems = marketStore.SHOP_ITEMS

  return Object.entries(inventory)
    .filter(([name, qty]) => {
      if (qty <= 0) return false
      
      // Filtro de búsqueda
      if (searchQuery.value && !name.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        return false
      }

      // Obtener info del objeto
      const itemInfo = shopItems.find(i => i.name === name)
      if (!itemInfo) return false

      // Filtro de categoría
      if (activeCategory.value === 'all') return true
      if (activeCategory.value === 'pociones') return itemInfo.cat === 'pociones'
      if (activeCategory.value === 'pokeballs') return itemInfo.cat === 'pokeballs'
      if (activeCategory.value === 'etc') return !['pociones', 'pokeballs'].includes(itemInfo.cat)
      
      return true
    })
    .map(([name, qty]) => {
      const itemInfo = shopItems.find(i => i.name === name)
      const isUsable = itemInfo?.cat === 'pociones' || itemInfo?.type === 'stone'
      const canSell = itemInfo && (itemInfo.market !== false || (itemInfo.price && itemInfo.price > 0))
      
      return {
        name,
        qty,
        info: itemInfo,
        isUsable,
        isStone: itemInfo?.type === 'stone',
        canSell,
        tierCls: `tier-${itemInfo?.tier || 'common'}`,
        tierLabel: { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' }[itemInfo?.tier || 'common'],
        typeTag: itemInfo?.type || 'usable',
        typeLabel: { stone: 'Piedra', held: 'Equipable', usable: 'Usable', booster: 'Potenciador' }[itemInfo?.type || 'usable'] || 'Objeto',
        typeColor: { stone: '#f5a623', held: '#7ed321', usable: '#4a90e2', booster: '#ffcc00' }[itemInfo?.type || 'usable'] || '#666'
      }
    })
})

// Acciones
const toggleSellMode = () => {
  invStore.toggleBagSellMode()
}

const toggleItemSelection = (item) => {
  if (!item.canSell) return
  invStore.toggleBagSellSelect(item.name, item.qty)
}

const updateSellQty = (itemName, newQty, maxQty) => {
  const val = parseInt(String(newQty))
  if (isNaN(val)) return
  invStore.updateBagSellQty(itemName, val, maxQty)
}

const calculateTotalGain = computed(() => {
  return invStore.getBagSellTotalGain()
})

const handleUse = (item) => {
  if (item.isStone) {
    invStore.openStoneMenu(item.name)
    return
  }
  invStore.openItemMenu(item.name)
}

const handleConfirmSell = () => {
  const gain = invStore.confirmBagSell()
  if (gain !== false) {
    uiStore.notify(`¡Vendiste los objetos por ₱${gain.toLocaleString()}!`, '💰')
  }
}

const onQtyInputChange = (itemName, event, maxQty) => {
  const target = event.target
  if (target) {
    updateSellQty(itemName, target.value, maxQty)
  }
}
</script>

<template>
  <div class="team-section backpack-view-root">
    <!-- CABECERA -->
    <div class="backpack-header">
      <div class="section-title">
        🎒 Mochila
      </div>
      <div class="header-actions">
        <button
          v-show="!invStore.bagSellMode"
          id="btn-bag-sell-mode"
          class="sell-mode-btn"
          @click="toggleSellMode"
        >
          💰 MODO VENTA
        </button>
        <button
          v-show="invStore.bagSellMode"
          id="btn-bag-confirm-sell"
          class="confirm-sell-btn"
          @click="handleConfirmSell"
        >
          ✅ VENDER SELECCIÓN (₱{{ calculateTotalGain.toLocaleString() }})
        </button>
        <button
          v-show="invStore.bagSellMode"
          id="btn-bag-cancel-sell"
          class="cancel-sell-btn"
          @click="toggleSellMode"
        >
          CANCELAR
        </button>
      </div>
    </div>

    <!-- HINT VENTA -->
    <div
      v-show="invStore.bagSellMode"
      id="bag-sell-hint"
      class="sell-hint"
    >
      Seleccioná los objetos que quieras vender. Recibirás el <strong>50% de su valor</strong>.
    </div>

    <!-- BUSCADOR -->
    <div class="search-container">
      <input
        id="bag-search-input"
        v-model="searchQuery"
        type="text"
        placeholder="Buscar en la mochila..." 
        class="retro-search-input"
      >
    </div>

    <!-- PESTAÑAS -->
    <div
      id="bag-tabs"
      class="market-tab-bar tabs-container"
    >
      <button
        v-for="cat in CATEGORIES"
        :id="`bag-tab-${cat.id}`" 
        :key="cat.id"
        class="market-tab-btn"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- EMPTY STATE -->
    <div
      v-if="filteredItems.length === 0"
      id="bag-empty-warning"
      class="empty-warning"
    >
      <span class="empty-icon">🎁</span>
      <p>No tenés ningún objeto en esta categoría.</p>
    </div>

    <!-- GRID DE OBJETOS -->
    <div
      v-else
      id="bag-grid"
      class="items-grid"
    >
      <div
        v-for="item in filteredItems"
        :key="item.name" 
        class="market-card"
        :class="{ 
          selected: invStore.bagSellSelected[item.name],
          disabled: !item.canSell && invStore.bagSellMode
        }"
        @click="invStore.bagSellMode ? toggleItemSelection(item) : null"
      >
        <span
          class="market-tier-badge"
          :class="item.tierCls"
        >{{ item.tierLabel }}</span>
        
        <div class="market-item-icon">
          <img
            v-if="item.info?.sprite"
            :src="item.info.sprite"
            class="item-img"
          >
          <span
            v-else
            class="item-emoji-fallback"
          >{{ item.info?.icon || '📦' }}</span>
        </div>
        
        <div class="market-item-name">
          {{ item.name }}
        </div>
        
        <div class="type-badge-container">
          <span
            class="type-badge"
            :style="{ 
              background: item.typeColor + '22', 
              color: item.typeColor, 
              border: '1px solid ' + item.typeColor + '44'
            }"
          >
            {{ item.typeLabel }}
          </span>
        </div>
        
        <div class="item-description">
          {{ item.info?.desc || 'Objeto de entrenador.' }}
        </div>

        <!-- MODO NORMAL -->
        <div
          v-if="!invStore.bagSellMode"
          class="item-actions-normal"
        >
          <span class="qty-txt">x{{ item.qty }}</span>
          <button
            v-if="item.isUsable"
            class="use-btn"
            :class="{ 'stone-btn': item.isStone }"
            @click.stop="handleUse(item)"
          >
            USAR
          </button>
        </div>

        <!-- MODO VENTA -->
        <div
          v-else
          class="item-actions-sell"
        >
          <template v-if="invStore.bagSellSelected[item.name]">
            <div
              class="sell-qty-label"
              @click.stop=""
            >
              Cantidad:
            </div>
            <div
              class="sell-qty-controls"
              @click.stop=""
            >
              <button
                class="qty-btn"
                @click="updateSellQty(item.name, invStore.bagSellSelected[item.name] - 1, item.qty)"
              >
                -
              </button>
              <input
                type="number"
                :value="invStore.bagSellSelected[item.name]"
                min="1"
                :max="item.qty" 
                class="qty-input"
                @change="onQtyInputChange(item.name, $event, item.qty)"
              >
              <button
                class="qty-btn"
                @click="updateSellQty(item.name, invStore.bagSellSelected[item.name] + 1, item.qty)"
              >
                +
              </button>
            </div>
            <div class="sell-gain">
              +₱{{ (Math.floor((item.info?.price || 0) * 0.5) * invStore.bagSellSelected[item.name]).toLocaleString() }}
            </div>
          </template>
          <template v-else>
            <div class="sell-price-info">
              Precio venta: ₱{{ Math.floor((item.info?.price || 0) * 0.5).toLocaleString() }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backpack-view-root {
  min-height: 50vh;
}
.backpack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.section-title {
  margin: 0;
}
.sell-mode-btn, .confirm-sell-btn, .cancel-sell-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: white;
}
.sell-mode-btn { background: linear-gradient(135deg, #4caf50, #388e3c); }
.confirm-sell-btn { background: linear-gradient(135deg, #ff9800, #f57c00); }
.cancel-sell-btn { background: rgba(255,255,255,0.1); }

.sell-hint {
  background: rgba(76,175,80,0.1);
  border: 1px solid rgba(76,175,80,0.3);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 11px;
  color: #81c784;
  text-align: center;
}

.search-container { margin-bottom: 14px; }
.retro-search-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-family: 'Nunito', sans-serif;
  outline: none;
}

.tabs-container { margin-bottom: 16px; }

.empty-warning {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  font-size: 12px;
  color: var(--gray);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; display: block; }

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.market-card.disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }
.market-card.selected { border: 2px solid #4caf50; background: rgba(76,175,80,0.05); }

.market-item-icon { margin-bottom: 8px; text-align: center; }
.item-img { width: 40px; height: 40px; image-rendering: pixelated; }
.item-emoji-fallback { font-size: 32px; }

.market-item-name { font-size: 12px; margin-bottom: 4px; text-align: center; }

.type-badge-container { margin-bottom: 8px; text-align: center; }
.type-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
}

.item-description {
  font-size: 10px;
  color: var(--gray);
  margin-bottom: 10px;
  line-height: 1.4;
  min-height: 28px;
  text-align: center;
}

.item-actions-normal, .item-actions-sell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.qty-txt { font-size: 11px; font-weight: 700; color: var(--purple-light); }
.use-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  background: var(--purple);
  color: white;
  box-shadow: 0 2px 8px rgba(199,125,255,0.3);
}
.use-btn.stone-btn {
  background: rgba(255,217,61,0.2);
  color: var(--yellow);
  border: 1px solid rgba(255,217,61,0.3);
}

.item-actions-sell {
  flex-direction: column;
  gap: 5px;
}
.sell-qty-label { font-size: 9px; color: var(--gray); }
.sell-qty-controls { display: flex; align-items: center; gap: 8px; }
.qty-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: white;
  cursor: pointer;
}
.qty-input {
  width: 40px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: white;
  text-align: center;
  font-size: 11px;
  padding: 2px;
}
.sell-gain { font-size: 10px; color: var(--yellow); margin-top: 5px; font-weight: 700; }
.sell-price-info { font-size: 10px; color: var(--gray); }
</style>
