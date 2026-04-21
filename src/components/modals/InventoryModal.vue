<script setup>
import { ref, computed, reactive } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import { SHOP_ITEMS } from '@/data/items'
import InventoryItemNode from './inventory/InventoryItemNode.vue'
import InventoryTargetOverlay from './inventory/InventoryTargetOverlay.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()

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

// Multi-select logic
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

// Item Usage Logic
const targetingItem = ref(null)
const showTargetOverlay = ref(false)

const handleItemAction = (item) => {
  if (multiSelectMode.value) {
    toggleItemSelection(item.name)
    return
  }

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
  
  const mode = multiSelectMode.value
  const actionText = mode === 'sell' ? 'vender' : 'tirar'
  
  uiStore.openConfirm({
    title: `CONFIRMAR ACCIÓN`,
    message: `¿Estás seguro que deseas ${actionText} estos ${selectedItems.size} objetos?`,
    confirmText: mode === 'sell' ? 'VENDER' : 'TIRAR',
    onConfirm: async () => {
      if (mode === 'sell') {
        for (const name of selectedItems) {
          await inventoryStore.sellItem(name, 999)
        }
        uiStore.notify('Venta realizada con éxito', '💰')
      } else {
        for (const name of selectedItems) {
          await inventoryStore.removeItem(name, 999)
        }
        uiStore.notify('Objetos eliminados', '🗑️')
      }
      clearSelection()
    }
  })
}

const close = () => {
  emit('close')
  multiSelectMode.value = null
  selectedItems.clear()
  showTargetOverlay.value = false
}

const totalItems = computed(() => {
  return Object.values(gameStore.state.inventory || {}).reduce((s, v) => s + v, 0)
})

const filteredItems = computed(() => {
  const items = inventoryStore.bagItems || []
  const search = (bagSearch.value || '').toLowerCase()
  
  return items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search)
    const matchesCategory = bagCategory.value === 'todos' || item.cat === bagCategory.value
    return matchesSearch && matchesCategory
  })
})

const handleItemClick = (item) => {
  handleItemAction(item)
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="800px"
    padding="raw"
    @close="close"
  >
    <template #header>
      <div class="inventory-header">
        <div class="title-group">
          <span class="icon">🎒</span>
          <span class="text">MOCHILA</span>
        </div>
        <div class="header-stats">
          <div class="stat">
            <span class="label">CAPACIDAD</span>
            <span class="value">{{ totalItems }}</span>
          </div>
          <div class="stat money">
            <span class="label">SALDO</span>
            <span class="value">₽{{ gameStore.state.money.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="inventory-content">
      <div class="sidebar-categories">
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          class="cat-btn"
          :class="{ active: bagCategory === cat.id }"
          @click="setCategory(cat.id)"
        >
          <span class="icon">{{ cat.icon }}</span>
          <span class="label">{{ cat.label }}</span>
        </button>
      </div>

      <div class="main-bag">
        <div class="bag-controls">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              v-model="bagSearch" 
              type="text" 
              placeholder="Filtrar inventario..."
              class="search-input"
            >
          </div>
        </div>

        <div class="items-area custom-scrollbar">
          <div
            v-if="filteredItems.length"
            class="item-grid"
          >
            <InventoryItemNode
              v-for="item in filteredItems"
              :key="item.name"
              :item="item"
              :is-selected="selectedItems.has(item.name)"
              :multi-select-mode="!!multiSelectMode"
              @click="handleItemClick(item)"
            />
          </div>
          
          <div
            v-else
            class="empty-bag"
          >
            <div class="empty-icon">
              {{ categories.find(c => c.id === bagCategory)?.icon || '📦' }}
            </div>
            <p>{{ bagSearch ? 'No se encontraron coincidencias' : 'Esta sección está vacía' }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="inventory-footer">
        <div
          v-if="!multiSelectMode"
          class="standard-actions"
        >
          <button
            class="action-btn"
            @click="multiSelectMode = 'sell'"
          >
            <span class="icon">💰</span> VENDER A ROCKET
          </button>
          <button
            class="action-btn"
            @click="multiSelectMode = 'release'"
          >
            <span class="icon">🗑️</span> TIRAR OBJETOS
          </button>
        </div>
        
        <div
          v-else
          class="multi-select-actions"
        >
          <div class="selection-info">
            <span class="count">{{ selectedItems.size }}</span> SELECCIONADOS
          </div>
          <div class="action-buttons">
            <button
              class="btn-cancel"
              @click="clearSelection"
            >
              CANCELAR
            </button>
            <button 
              class="btn-execute" 
              :class="multiSelectMode"
              :disabled="selectedItems.size === 0"
              @click="handleMultiExecute"
            >
              {{ multiSelectMode === 'sell' ? 'CONFIRMAR VENTA' : 'CONFIRMAR ELIMINACIÓN' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <InventoryTargetOverlay
      v-if="showTargetOverlay"
      :show="true"
      :item="targetingItem"
      @close="showTargetOverlay = false"
      @select="useOnPokemon"
    />
  </BaseModal>
</template>

<style scoped lang="scss">
@use "sass:math";
@use "@/styles/core/tools" as *;

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 20px;

  .title-group {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .icon { font-size: 24px; }
    .text {
      font-family: 'Press Start 2P', cursive;
      font-size: 14px;
      color: var(--yellow);
      letter-spacing: 2px;
    }
  }

  .header-stats {
    display: flex;
    gap: 20px;
    
    .stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      
      .label {
        font-size: 8px;
        color: rgba(255, 255, 255, 0.3);
        margin-bottom: 4px;
        font-family: 'Press Start 2P', cursive;
      }
      
      .value {
        font-size: 16px;
        font-weight: 800;
        color: #fff;
      }
      
      &.money .value { color: #4ade80; }
    }
  }
}

.inventory-content {
  display: flex;
  height: 500px;
  max-height: 70vh;
}

.sidebar-categories {
  width: 160px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .cat-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    
    .icon { font-size: 18px; }
    .label { font-size: 12px; font-weight: 600; }
    
    &:hover {
      background: rgba(255, 255, 255, 0.03);
      color: #fff;
    }
    
    &.active {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--yellow);
    }
  }
}

.main-bag {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bag-controls {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  .search-box {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0 16px;
    transition: all 0.2s;
    
    &:focus-within {
      border-color: var(--yellow);
      box-shadow: 0 0 12px rgba(250, 204, 21, 0.1);
    }
    
    .search-icon { font-size: 14px; opacity: 0.3; }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      padding: 12px;
      color: #fff;
      outline: none;
      font-size: 14px;
    }
  }
}

.items-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.empty-bag {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.1);
  
  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.2; }
  p { font-size: 14px; }
}

.inventory-footer {
  padding: 16px 24px;
  
  .standard-actions {
    display: flex;
    gap: 12px;
    
    .action-btn {
      flex: 1;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-family: 'Press Start 2P', cursive;
      font-size: 8px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
    }
  }
  
  .multi-select-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .selection-info {
      font-size: 10px;
      font-family: 'Press Start 2P', cursive;
      color: rgba(255, 255, 255, 0.4);
      .count { color: var(--yellow); }
    }
    
    .action-buttons {
      display: flex;
      gap: 12px;
      
      button {
        padding: 12px 20px;
        border-radius: 12px;
        border: none;
        font-family: 'Press Start 2P', cursive;
        font-size: 9px;
        cursor: pointer;
        transition: all 0.2s;
        @include pixelated;
      }
      
      .btn-cancel {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.5);
      }
      
      .btn-execute {
        background: var(--yellow);
        color: #000;
        &:disabled { opacity: 0.3; cursor: not-allowed; }
        
        &.sell { background: #4ade80; }
        &.release { background: #f87171; color: #fff; }
      }
    }
  }
}

</style>
