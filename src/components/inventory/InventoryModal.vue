<script setup>
import { ref, computed, reactive } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import { useEvolutionStore } from '@/stores/evolution'
import BaseModal from '../common/BaseModal.vue'
import { SHOP_ITEMS } from '@/data/items'
import InventoryItemNode from './InventoryItemNode.vue'
import InventoryTargetOverlay from './InventoryTargetOverlay.vue'

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()
const _evolutionStore = useEvolutionStore()

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

const onItemUsed = () => {
  showTargetOverlay.value = false
  targetingItem.value = null
}

const _getCategoryIcon = (catId) => {
  return categories.find(c => c.id === catId)?.icon || '📦'
}
</script>

<template>
  <BaseModal
    :show="uiStore.isInventoryOpen"
    max-width="700px"
    padding="raw"
    custom-class="inventory-modal"
    @close="close"
  >
    <template #header>
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
    </template>

    <div class="inventory-body">
      <!-- SEARCH & CATEGORIES -->
      <div class="top-controls">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input 
            v-model="bagSearch" 
            type="text" 
            placeholder="Buscar objeto..."
            class="search-input"
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
            <span class="icon">{{ cat.icon }}</span>
            <span class="label">{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- ITEM LIST -->
      <div class="items-section custom-scrollbar">
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
            {{ _getCategoryIcon(bagCategory) }}
          </div>
          <p>{{ bagSearch ? 'No se encontraron objetos' : 'Esta sección está vacía' }}</p>
        </div>
      </div>
    </div>

    <!-- FOOTER ACTIONS -->
    <template #footer>
      <div class="card-footer">
        <template v-if="!multiSelectMode">
          <button 
            class="action-btn sell"
            @click="multiSelectMode = 'sell'"
          >
            Vender a Rocket
          </button>
          <button 
            class="action-btn release"
            @click="multiSelectMode = 'release'"
          >
            Tirar objetos
          </button>
        </template>
        
        <div 
          v-else 
          class="multi-actions"
        >
          <span class="selection-count">
            {{ selectedItems.size }} SELECCIONADOS
          </span>
          <div class="btn-group">
            <button 
              class="cancel-btn" 
              @click="clearSelection(); multiSelectMode = null"
            >
              CANCELAR
            </button>
            <button 
              class="execute-btn"
              :class="multiSelectMode"
              :disabled="selectedItems.size === 0"
              @click="handleMultiExecute"
            >
              {{ multiSelectMode === 'sell' ? 'VENDER' : 'TIRAR' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- OVERLAYS -->
    <InventoryTargetOverlay
      v-if="showTargetOverlay"
      :show="true"
      :item="targetingItem"
      @close="showTargetOverlay = false"
      @select="useOnPokemon"
    />
  </BaseModal>
</template>
