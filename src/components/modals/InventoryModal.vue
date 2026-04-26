<script setup>
import { ref, computed, reactive } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import { SHOP_ITEMS } from '@/data/items'

// Sub-components
import InventorySidebar from './inventory/InventorySidebar.vue'
import InventoryItemCard from './inventory/InventoryItemCard.vue'
import InventoryControls from './inventory/InventoryControls.vue'
import InventoryTargetOverlay from './inventory/InventoryTargetOverlay.vue'
import InventoryQuantityModal from './inventory/InventoryQuantityModal.vue'

defineProps({ show: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()

// State
const multiSelectMode = ref(null)
const selectedItems = reactive(new Map()) // name -> qty
const targetingItem = ref(null)
const showTargetOverlay = ref(false)
const quantitySelectionItem = ref(null)
const itemActionMenu = ref(null) // { item, type: 'sell'|'release'|'menu' }

// Getters
const filteredItems = computed(() => inventoryStore.bagItems)
const totalObjectsCount = computed(() => Object.values(gameStore.state.inventory || {}).reduce((s, v) => s + v, 0))
const selectedObjectsTotal = computed(() => Array.from(selectedItems.values()).reduce((s, v) => s + v, 0))

// Handlers
const handleItemClick = (item) => {
  if (multiSelectMode.value) {
    if (selectedItems.has(item.name)) {
      selectedItems.delete(item.name)
    } else {
      // Auto-select the entire stack for bulk actions
      selectedItems.set(item.name, item.qty)
    }
    return
  }

  // If not in multi-mode, open action menu
  itemActionMenu.value = item
}

const handleActionSelect = (type) => {
  const item = itemActionMenu.value
  if (!item) return
  
  if (type === 'use') {
    // Legacy logic for using items
    const dbItem = SHOP_ITEMS.find(i => i.id === item.id || i.name === item.name)
    if (['stones', 'pociones'].includes(dbItem?.cat) || dbItem?.id === 'rare_candy') {
      targetingItem.value = dbItem
      showTargetOverlay.value = true
    } else if (dbItem?.cat === 'held') {
      uiStore.notify(`Equipa este item desde el detalle del Pokémon`, '🎒')
    } else {
      uiStore.notify(`Este objeto no se puede usar desde aquí`, '🚫')
    }
    itemActionMenu.value = null
  } else {
    // Open quantity modal for sell/release
    multiSelectMode.value = type
    quantitySelectionItem.value = item
    itemActionMenu.value = null
  }
}

const handleMultiExecute = async () => {
  if (selectedItems.size === 0) return
  const mode = multiSelectMode.value
  
  let estimatedGain = 0
  if (mode === 'sell') {
    for (const [name, qty] of selectedItems.entries()) {
      const itemInfo = SHOP_ITEMS.find(i => i.name === name)
      if (itemInfo) estimatedGain += Math.floor((itemInfo.price || 0) * 0.5) * qty
    }
  }

  const message = mode === 'sell' 
    ? `¿Estás seguro que deseas vender estos ${selectedItems.size} tipos de objetos por un total de ₱${estimatedGain.toLocaleString()}?`
    : `¿Estás seguro que deseas tirar estos ${selectedItems.size} tipos de objetos?`
  
  uiStore.openConfirm({
    title: `CONFIRMAR ACCIÓN`, 
    message,
    confirmText: mode === 'sell' ? 'VENDER' : 'TIRAR',
    onConfirm: async () => {
      const totalGain = await inventoryStore.processBatchAction(selectedItems, mode)

      if (mode === 'sell') {
        uiStore.notify(`Venta realizada: +₱${totalGain.toLocaleString()}`, '💰')
      } else {
        uiStore.notify('Objetos eliminados correctamente', '🗑️')
      }

      selectedItems.clear()
      multiSelectMode.value = null
    }
  })
}

const handleQuantityConfirm = async (qty) => {
  if (quantitySelectionItem.value) {
    const itemName = quantitySelectionItem.value.name
    
    // If NOT in a persistent multi-select session (single action), execute immediately
    if (selectedItems.size === 0) {
      const singleMap = new Map([[itemName, qty]])
      const mode = multiSelectMode.value
      const totalGain = await inventoryStore.processBatchAction(singleMap, mode)
      
      if (mode === 'sell') uiStore.notify(`Venta realizada: +₱${totalGain.toLocaleString()}`, '💰')
      else uiStore.notify('Objeto eliminado', '🗑️')
      
      multiSelectMode.value = null
    } else {
      // In a persistent multi-select session, just add to selection
      selectedItems.set(itemName, qty)
    }
    
    quantitySelectionItem.value = null
  }
}

const handleCancelSelection = () => {
  selectedItems.clear()
  multiSelectMode.value = null
}

const close = () => { 
  emit('close')
  handleCancelSelection()
  showTargetOverlay.value = false 
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="800px"
    variant="retro"
    padding="raw"
    @close="close"
  >
    <template #header>
      <div class="inventory-modal-header">
        <div class="inv-title-group">
          <div class="title-icon">
            🎒
          </div>
          <div class="title-text-wrap">
            <span class="main-title">MOCHILA</span>
            <span class="sub-title">GESTIÓN DE INVENTARIO</span>
          </div>
        </div>
        
        <div class="header-stats">
          <div class="stat-node">
            <span class="label">OBJETOS TOTALES</span>
            <span class="value">{{ totalObjectsCount }}</span>
          </div>
          <div class="stat-node money">
            <span class="label">MIS CRÉDITOS</span>
            <span class="value">₱{{ gameStore.state.money.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="inventory-modal-container">
      <!-- SIDEBAR -->
      <InventorySidebar />

      <!-- MAIN CONTENT -->
      <div class="inventory-main">
        <!-- CONTROLS -->
        <InventoryControls 
          v-model:multi-select-mode="multiSelectMode"
          :selected-count="selectedObjectsTotal"
          @execute="handleMultiExecute"
          @cancel="handleCancelSelection"
        />

        <!-- GRID AREA -->
        <div class="inventory-grid-wrapper custom-scrollbar">
          <TransitionGroup 
            v-if="filteredItems.length"
            name="list-complete" 
            tag="div" 
            class="item-premium-grid"
          >
            <InventoryItemCard
              v-for="item in filteredItems"
              :key="item.name"
              :item="item"
              :is-selected="selectedItems.has(item.name)"
              :multi-select-mode="!!multiSelectMode"
              @click.stop="handleItemClick(item)"
            />
          </TransitionGroup>

          <!-- EMPTY STATE -->
          <div
            v-else
            class="empty-inventory-state"
          >
            <div class="empty-visual">
              <span class="icon">🔍</span>
            </div>
            <div class="empty-text">
              <h3>No hay resultados</h3>
              <p>{{ inventoryStore.searchQuery ? 'Prueba con otros términos de búsqueda' : 'Esta sección de tu mochila está vacía' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OVERLAYS -->
    <InventoryTargetOverlay
      v-if="showTargetOverlay"
      :show="true"
      :item="targetingItem"
      @close="showTargetOverlay = false"
      @select="async (p, i) => { 
        const res = await inventoryStore.useItem(targetingItem.name, 'team', i); 
        if (res.success) { 
          uiStore.notify(res.msg, '✨'); 
          showTargetOverlay.value = false; 
          targetingItem.value = null 
        } else {
          uiStore.notify(res.msg, '⚠️') 
        }
      }"
    />

    <InventoryQuantityModal
      v-if="quantitySelectionItem"
      :show="!!quantitySelectionItem"
      :item="quantitySelectionItem"
      :mode="multiSelectMode"
      @close="() => { quantitySelectionItem = null; if (selectedItems.size === 0) multiSelectMode = null; }"
      @confirm="handleQuantityConfirm"
    />

    <!-- SINGLE ITEM ACTION MENU -->
    <BaseModal
      v-if="itemActionMenu"
      :show="!!itemActionMenu"
      max-width="300px"
      variant="retro"
      @close="itemActionMenu = null"
    >
      <template #header>
        <div class="action-menu-header">
          {{ itemActionMenu.name }}
        </div>
      </template>
      <div class="action-menu-body">
        <button
          class="menu-btn use"
          @click.stop="handleActionSelect('use')"
        >
          <span class="icon">✨</span> USAR
        </button>
        <button
          class="menu-btn sell"
          @click.stop="handleActionSelect('sell')"
        >
          <span class="icon">💰</span> VENDER
        </button>
        <button
          class="menu-btn danger"
          @click.stop="handleActionSelect('release')"
        >
          <span class="icon">🗑️</span> TIRAR
        </button>
      </div>
    </BaseModal>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/components/inventory";

.action-menu-header {
  @include pixelated;
  font-size: 10px;
  color: var(--yellow);
  text-align: center;
  width: 100%;
}

.action-menu-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 0;

  .menu-btn {
    justify-content: flex-start;
    gap: 14px;
    font-size: 11px;
    height: 52px;
    padding: 0 20px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    background: linear-gradient(to right, Rgba(255, 255, 255, 0.05), transparent);
    transition: all 0.3s ease;
    
    .icon { 
      font-size: 18px; 
      filter: Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.2));
    }

    &.use {
      @include btn-vicio("primary", "md");
      &:hover {
        background: linear-gradient(to right, Rgba(59, 130, 246, 0.2), transparent);
        border-color: #3b82f6;
        color: #60a5fa;
      }
    }

    &.sell {
      @include btn-vicio("warning", "md");
      &:hover {
        background: linear-gradient(to right, Rgba(255, 214, 10, 0.15), transparent);
        border-color: var(--yellow);
        color: var(--yellow);
      }
    }

    &.danger {
      @include btn-vicio("danger", "md");
      &:hover { 
        background: linear-gradient(to right, Rgba(248, 113, 113, 0.2), transparent);
        border-color: #f87171;
        color: #fca5a5;
      }
    }

    &:active {
      transform: Scale(0.96);
    }
  }
}
</style>
