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
import InventoryQuantityOverlay from './inventory/InventoryQuantityOverlay.vue'

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

// Getters from store
const filteredItems = computed(() => inventoryStore.bagItems)

// Handlers
const handleItemClick = (item) => {
  if (multiSelectMode.value) {
    if (selectedItems.has(item.name)) {
      selectedItems.delete(item.name)
    } else {
      quantitySelectionItem.value = item
    }
    return
  }

  // --- EGG HANDLING ---
  if (item.isEgg) {
    if (item.ready) {
      uiStore.open('HatchAnimation', { egg: item.eggData })
      emit('close')
    } else {
      uiStore.notify(`Este huevo aún no está listo (${Math.ceil(item.steps)} pasos restantes)`, '🥚')
    }
    return
  }

  const dbItem = SHOP_ITEMS.find(i => i.id === item.id || i.name === item.name)
  if (!dbItem) return
  
  if (['stones', 'pociones'].includes(dbItem.cat) || dbItem.id === 'rare_candy') {
    targetingItem.value = dbItem
    showTargetOverlay.value = true
  } else if (dbItem.cat === 'held') {
    uiStore.notify(`Equipa este item desde el detalle del Pokémon`, '🎒')
  } else {
    uiStore.notify(`Este objeto no se puede usar desde aquí`, '🚫')
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
      for (const [name, qty] of selectedItems.entries()) { 
        if (mode === 'sell') {
          await inventoryStore.sellItem(name, qty) 
        } else {
          await inventoryStore.removeItem(name, qty) 
        }
      }
      uiStore.notify(mode === 'sell' ? 'Venta realizada' : 'Objetos eliminados', mode === 'sell' ? '💰' : '🗑️')
      selectedItems.clear()
      multiSelectMode.value = null
    }
  })
}

const handleQuantityConfirm = (qty) => {
  if (quantitySelectionItem.value) {
    selectedItems.set(quantitySelectionItem.value.name, qty)
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
    max-width="1000px"
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
            <span class="value">{{ Object.values(gameStore.state.inventory || {}).reduce((s, v) => s + v, 0) }}</span>
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
          :selected-count="selectedItems.size"
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

    <InventoryQuantityOverlay
      v-if="quantitySelectionItem"
      :item="quantitySelectionItem"
      :mode="multiSelectMode"
      @close="quantitySelectionItem = null"
      @sell="handleQuantityConfirm"
      @discard="handleQuantityConfirm"
    />
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/inventory";
</style>

