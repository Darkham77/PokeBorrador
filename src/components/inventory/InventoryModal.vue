<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUIStore } from '@/stores/ui'
import { useEvolutionStore } from '@/stores/evolution'
import { SHOP_ITEMS } from '@/data/items'
import { getSpriteUrl } from '@/data/spriteMapping'

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()
const evolutionStore = useEvolutionStore()

const isOpen = computed(() => uiStore.isInventoryOpen)
const bagCategory = computed(() => inventoryStore.bagCategory)
const bagSearch = computed({
  get: () => inventoryStore.bagSearch,
  set: (val) => inventoryStore.bagSearch = val
})

const categories = [
  { id: 'todos', label: 'Todos', icon: '📦' },
  { id: 'pokeballs', label: 'Balls', icon: '⚪' },
  { id: 'pociones', label: 'Cura', icon: '🧪' },
  { id: 'stones', label: 'Piedras', icon: '💎' },
  { id: 'held', label: 'Equipo', icon: '🎒' },
  { id: 'breeding', label: 'Crianza', icon: '🥚' },
  { id: 'especial', label: 'Otros', icon: '✨' }
]

const setCategory = (cat) => {
  inventoryStore.bagCategory = cat
}

// Multi-select logic for selling/releasing
const multiSelectMode = ref(null) // 'sell' or 'release'
const selectedItems = reactive(new Set())

const toggleItemSelection = (itemName) => {
  if (selectedItems.has(itemName)) {
    selectedItems.delete(itemName)
  } else {
    selectedItems.add(itemName)
  }
}

const clearSelection = () => {
  selectedItems.clear()
  multiSelectMode.value = null
}

const startMultiAction = (mode) => {
  multiSelectMode.value = mode
  selectedItems.clear()
}

// Item Usage Logic
const targetingItem = ref(null)
const showTargetOverlay = ref(false)

const handleItemAction = (item) => {
  if (multiSelectMode.value) {
    toggleItemSelection(item.name)
    return
  }

  // Usable items logic
  const dbItem = SHOP_ITEMS.find(i => i.id === item.id)
  if (!dbItem) return

  if (dbItem.cat === 'stones' || dbItem.id === 'rare_candy' || dbItem.cat === 'pociones') {
    targetingItem.value = dbItem
    showTargetOverlay.value = true
  } else if (dbItem.cat === 'held') {
    uiStore.notify(`Equipa este item desde el detalle del Pokémon`, '🎒')
  } else {
    uiStore.notify(`Este objeto no se puede usar desde aquí`, '🚫')
  }
}

const useOnPokemon = async (pokemon, index) => {
  if (!targetingItem.value) return
  
  const itemName = targetingItem.value.name
  const result = await inventoryStore.useItem(itemName, 'team', index)
  
  if (result.success) {
    uiStore.notify(result.msg, '✨')
    showTargetOverlay.value = false
    targetingItem.value = null
  } else {
    uiStore.notify(result.msg, '⚠️')
  }
}

const handleMultiExecute = async () => {
  if (selectedItems.size === 0) return
  
  if (multiSelectMode.value === 'sell') {
    const totalItems = Array.from(selectedItems).length
    if (confirm(`¿Vender ${totalItems} tipos de objetos al Equipo Rocket? (Obtendrás el 50% de su valor)`)) {
      for (const name of selectedItems) {
        await inventoryStore.sellItem(name, 999) // 999 sells all
      }
      uiStore.notify('Venta realizada con éxito', '💰')
    }
  } else if (multiSelectMode.value === 'release') {
    if (confirm(`¿Seguro que quieres tirar estos objetos? No se pueden recuperar.`)) {
      for (const name of selectedItems) {
        await inventoryStore.removeItem(name, 999)
      }
      uiStore.notify('Objetos eliminados', '🗑️')
    }
  }
  
  clearSelection()
  multiSelectMode.value = null
}

const close = () => {
  uiStore.isInventoryOpen = false
  multiSelectMode.value = null
  selectedItems.clear()
  showTargetOverlay.value = false
}

// Stats for header
const totalItems = computed(() => {
  return Object.values(gameStore.state.inventory || {}).reduce((s, v) => s + v, 0)
})

const getCategoryIcon = (catId) => {
  return categories.find(c => c.id === catId)?.icon || '📦'
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="inventory-overlay"
      @click.self="close"
    >
      <div class="inventory-card animate-slide-up">
        <header class="card-header">
          <div class="header-main">
            <div class="title-group">
              <span class="icon">🎒</span>
              <h1>MOCHILA</h1>
            </div>
            <div class="stats">
              <div class="stat-pill">
                <span class="label">OBJETOS:</span>
                <span class="value">{{ totalItems }}</span>
              </div>
              <div class="stat-pill money">
                <span class="label">DINERO:</span>
                <span class="value">₽{{ gameStore.state.money.toLocaleString() }}</span>
              </div>
            </div>
          </div>
          <button
            class="close-btn"
            @click="close"
          >
            ✕
          </button>
        </header>

        <div class="inventory-body">
          <!-- SEARCH & CATEGORIES -->
          <div class="top-controls">
            <div class="search-bar">
              <span class="search-icon">🔍</span>
              <input 
                v-model="bagSearch" 
                type="text" 
                placeholder="Buscar en la mochila..."
                @focus="multiSelectMode = null"
              >
            </div>
            
            <div class="category-tabs scrollbar-h">
              <button 
                v-for="cat in categories" 
                :key="cat.id"
                class="cat-tab"
                :class="{ active: bagCategory === cat.id }"
                @click="setCategory(cat.id)"
              >
                <span class="cat-icon">{{ cat.icon }}</span>
                <span class="cat-label">{{ cat.label }}</span>
              </button>
            </div>
          </div>

          <!-- ITEM GRID -->
          <div class="item-grid-container scrollbar">
            <div
              v-if="inventoryStore.bagItems.length > 0"
              class="item-grid"
            >
              <div 
                v-for="item in inventoryStore.bagItems" 
                :key="item.name"
                class="item-node"
                :class="{ 
                  selected: selectedItems.has(item.name),
                  'multi-mode': multiSelectMode
                }"
                @click="handleItemAction(item)"
              >
                <div class="item-icon-wrap">
                  <img
                    :src="item.sprite"
                    :alt="item.name"
                    class="item-sprite"
                    onerror="this.style.display='none'"
                  >
                  <span
                    v-if="!item.sprite"
                    class="fallback-icon"
                  >{{ item.icon }}</span>
                  <span class="quantity">x{{ item.qty }}</span>
                </div>
                <div class="item-info">
                  <div class="item-name">
                    {{ item.name }}
                  </div>
                  <div class="item-desc">
                    {{ item.desc }}
                  </div>
                </div>
                
                <div
                  v-if="multiSelectMode"
                  class="selection-indicator"
                >
                  <div
                    class="check"
                    :class="{ checked: selectedItems.has(item.name) }"
                  >
                    <span v-if="selectedItems.has(item.name)">✓</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="empty-bag"
            >
              <div class="empty-icon">
                🏜️
              </div>
              <p>No hay objetos en esta categoría</p>
            </div>
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <footer class="card-footer">
          <template v-if="!multiSelectMode">
            <button
              class="action-btn sell"
              @click="startMultiAction('sell')"
            >
              <span class="icon">🚀</span>
              Venta Rocket
            </button>
            <button
              class="action-btn release"
              @click="startMultiAction('release')"
            >
              <span class="icon">🗑️</span>
              Tirar Objetos
            </button>
          </template>
          <template v-else>
            <div class="multi-actions">
              <span class="selection-count">{{ selectedItems.size }} seleccionados</span>
              <div class="btn-group">
                <button
                  class="cancel-btn"
                  @click="multiSelectMode = null"
                >
                  Cancelar
                </button>
                <button 
                  class="execute-btn" 
                  :class="multiSelectMode" 
                  :disabled="selectedItems.size === 0"
                  @click="handleMultiExecute"
                >
                  {{ multiSelectMode === 'sell' ? 'Confirmar Venta' : 'Confirmar Descarte' }}
                </button>
              </div>
            </div>
          </template>
        </footer>
      </div>

      <!-- TARGET OVERLAY -->
      <Transition name="fade">
        <div
          v-if="showTargetOverlay"
          class="target-overlay"
          @click.self="showTargetOverlay = false"
        >
          <div class="target-card animate-pop">
            <header class="target-header">
              <div class="item-preview">
                <img
                  :src="targetingItem.sprite"
                  class="mini-sprite"
                >
                <div>
                  <div class="label">
                    USAR OBJETO:
                  </div>
                  <div class="name">
                    {{ targetingItem.name }}
                  </div>
                </div>
              </div>
              <button
                class="close-target"
                @click="showTargetOverlay = false"
              >
                ✕
              </button>
            </header>
            
            <p class="target-hint">
              ¿En qué Pokémon quieres usarlo?
            </p>
            
            <div class="team-grid">
              <div 
                v-for="(poke, index) in gameStore.state.team" 
                :key="poke.uid"
                class="target-node"
                @click="useOnPokemon(poke, index)"
              >
                <div class="poke-sprite-wrap">
                  <img
                    :src="getSpriteUrl(poke.id, poke.isShiny)"
                    class="poke-sprite"
                  >
                </div>
                <div class="poke-info">
                  <div class="poke-name">
                    {{ poke.name }}
                  </div>
                  <div class="poke-meta">
                    Nv. {{ poke.level }} · HP {{ poke.hp }}/{{ poke.maxHp }}
                  </div>
                  <div class="hp-bar">
                    <div
                      class="hp-fill"
                      :style="{ width: (poke.hp/poke.maxHp*100) + '%' }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.inventory-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.inventory-card {
  width: min(700px, 100%);
  height: 85vh;
  background: #0f172a;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 30px 100px rgba(0,0,0,0.8);
}

.card-header {
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .header-main {
    .title-group {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      
      .icon { font-size: 24px; }
      h1 {
        font-family: 'Press Start 2P', cursive;
        font-size: 18px;
        color: var(--yellow);
        letter-spacing: 2px;
        margin: 0;
      }
    }

    .stats {
      display: flex;
      gap: 12px;
      
      .stat-pill {
        background: rgba(255, 255, 255, 0.05);
        padding: 6px 12px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 800;
        display: flex;
        gap: 6px;
        
        .label { color: #64748b; }
        .value { color: #f1f5f9; }
        
        &.money .value { color: var(--yellow); }
      }
    }
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #64748b;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.1); color: white; transform: rotate(90deg); }
  }
}

.inventory-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 32px;
  overflow: hidden;
}

.top-controls {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .search-bar {
    position: relative;
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 16px;
    }
    input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 14px 14px 14px 48px;
      border-radius: 16px;
      color: white;
      font-size: 15px;
      transition: all 0.2s;
      &:focus { border-color: var(--yellow); background: rgba(255, 255, 255, 0.08); outline: none; }
    }
  }

  .category-tabs {
    display: flex;
    gap: 8px;
    padding-bottom: 8px;
    overflow-x: auto;
    
    .cat-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      
      .cat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; }
      
      &:hover { background: rgba(255, 255, 255, 0.06); color: #94a3b8; }
      &.active {
        background: rgba(255, 214, 10, 0.1);
        border-color: var(--yellow);
        color: var(--yellow);
        transform: translateY(-2px);
      }
    }
  }
}

.item-grid-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
}

.item-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.item-node {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  &.selected {
    border-color: var(--yellow);
    background: rgba(255, 214, 10, 0.05);
  }

  .item-icon-wrap {
    width: 60px;
    height: 60px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    .item-sprite { width: 40px; height: 40px; image-rendering: pixelated; }
    .fallback-icon { font-size: 24px; }
    
    .quantity {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background: var(--yellow);
      color: #000;
      font-size: 9px;
      font-family: 'Press Start 2P', cursive;
      padding: 2px 6px;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
  }

  .item-info {
    flex: 1;
    .item-name { font-weight: 800; font-size: 15px; color: #f1f5f9; margin-bottom: 4px; }
    .item-desc { font-size: 11px; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  }

  .selection-indicator {
    .check {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      
      &.checked {
        background: var(--yellow);
        border-color: var(--yellow);
        span { color: #000; font-weight: 900; }
      }
    }
  }
}

.card-footer {
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.03);
    color: #94a3b8;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover { background: rgba(255, 255, 255, 0.08); color: white; transform: translateY(-2px); }
    &.sell:hover { border-color: #f87171; color: #f87171; }
    &.release:hover { border-color: #94a3b8; }
  }

  .multi-actions {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .selection-count { font-size: 12px; font-weight: 800; color: var(--yellow); }
    
    .btn-group {
      display: flex;
      gap: 12px;
      
      button {
        padding: 10px 20px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
        border: none;
      }
      
      .cancel-btn { background: rgba(255, 255, 255, 0.05); color: #64748b; }
      .execute-btn {
        background: var(--yellow);
        color: #000;
        &.sell { background: #ef4444; color: white; }
        &:disabled { opacity: 0.3; cursor: not-allowed; }
      }
    }
  }
}

.empty-bag {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #334155;
  
  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
  p { font-size: 14px; font-weight: 600; }
}

/* Target Overlay */
.target-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.target-card {
  width: 100%;
  max-width: 400px;
  background: #1e293b;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  
  .item-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .mini-sprite { width: 32px; height: 32px; image-rendering: pixelated; }
    .label { font-size: 8px; font-weight: 800; color: #64748b; }
    .name { font-size: 14px; font-weight: 800; color: var(--yellow); }
  }
  
  .close-target { background: none; border: none; color: #475569; font-size: 18px; cursor: pointer; }
}

.target-hint { font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 16px; }

.team-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-node {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover { background: rgba(255, 255, 255, 0.08); border-color: var(--yellow); }
  
  .poke-sprite { width: 48px; height: 48px; image-rendering: pixelated; }
  
  .poke-info {
    flex: 1;
    .poke-name { font-weight: 800; font-size: 14px; color: white; margin-bottom: 2px; }
    .poke-meta { font-size: 10px; color: #64748b; margin-bottom: 4px; }
    
    .hp-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      .hp-fill { height: 100%; background: #22c55e; }
    }
  }
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.animate-pop { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }

.scrollbar::-webkit-scrollbar { width: 6px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
.scrollbar-h::-webkit-scrollbar { height: 4px; }
.scrollbar-h::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
</style>
