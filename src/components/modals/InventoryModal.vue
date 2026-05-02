<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useWindowListener } from '@/composables/useWindowListener'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import { SHOP_ITEMS } from '@/data/items'
import { isValidTarget } from '@/logic/items/itemEffects'

// Sub-components
import InventorySidebar from './inventory/InventorySidebar.vue'
import InventoryItemCard from './inventory/InventoryItemCard.vue'
import InventoryControls from './inventory/InventoryControls.vue'
import InventoryQuantityModal from './inventory/InventoryQuantityModal.vue'

const props = defineProps({ 
  show: { type: Boolean, default: false },
  battleMode: { type: Boolean, default: false },
  initialCategory: { type: String, default: null }
})
const emit = defineEmits(['close'])

const gameStore = useGameStore()
const uiStore = useUIStore()
const inventoryStore = useInventoryStore()
const modalStore = useModalStore()

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

// Battle Mode auto-category
watch(() => props.show, (val) => {
  if (val) {
    if (props.initialCategory) {
      inventoryStore.activeCategory = props.initialCategory
    } else if (props.battleMode) {
      inventoryStore.activeCategory = 'pociones'
    }
  }
}, { immediate: true })

// State
const multiSelectMode = ref(null)
const selectedItems = reactive(new Map()) // name -> qty
const quantitySelectionItem = ref(null)
const itemActionMenu = ref(null) // { item, type: 'sell'|'release'|'menu' }

// Getters
const modalWidth = computed(() => props.battleMode ? '480px' : '800px')
const filteredItems = computed(() => inventoryStore.bagItems)
const totalObjectsCount = computed(() => {
  const source = props.battleMode ? filteredItems.value : Object.entries(gameStore.state.inventory || {}).map(([name, qty]) => ({ name, qty }))
  return source.reduce((s, v) => s + (v.qty || 0), 0)
})
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

  if (props.battleMode) {
    itemActionMenu.value = item
    handleActionSelect('use')
    return
  }

  // If not in multi-mode, open action menu
  itemActionMenu.value = item
}

const handleActionSelect = (type) => {
  const item = itemActionMenu.value
  if (!item) return
  
  if (type === 'use') {
    const dbItem = SHOP_ITEMS.find(i => i.id === item.id || i.name === item.name)
    
    if (!dbItem) {
      uiStore.notify(`Error: Objeto "${item.name}" no reconocido.`, '⚠️')
      itemActionMenu.value = null
      return
    }
    
    // Battle Mode: Handle Pokeballs directly
    if (props.battleMode && dbItem.cat === 'pokeballs') {
      const battleStore = useBattleStore()
      battleStore.useItemInBattle(dbItem.name)
      itemActionMenu.value = null
      close()
      return
    }

    if (uiStore.inventoryTarget) {
      // Logic for pre-selected target
      if (dbItem.cat === 'held' || dbItem.type === 'held') {
        const success = inventoryStore.equipItem(dbItem.name, uiStore.inventoryTarget.context, uiStore.inventoryTarget.index)
        if (success) uiStore.notify(`¡${dbItem.name} equipado!`, '🎒')
        else uiStore.notify(`No se pudo equipar`, '⚠️')
      } else {
        const res = inventoryStore.useItem(dbItem.name, uiStore.inventoryTarget.context, uiStore.inventoryTarget.index)
        if (res.success) uiStore.notify(res.msg, '✨')
        else uiStore.notify(res.msg, '⚠️')
      }
      
      itemActionMenu.value = null
      return
    }

    // Traditional targeting if no pre-selected target
    const validTargets = gameStore.state.team.filter(p => isValidTarget(dbItem.name, p))
    
    if (validTargets.length === 0) {
      uiStore.notify(`Este objeto no tiene objetivos válidos en tu equipo`, '🎒')
      itemActionMenu.value = null
      return
    }

    const battleStore = useBattleStore()
    modalStore.open('PokemonSelection', {
      title: `USAR ${dbItem.name?.toUpperCase()}`,
      isBattleSwitch: false, // Permitir seleccionar al activo para curaciones
      includeTeam: true,
      allowDead: dbItem.name?.toLowerCase().includes('revivir') || !props.battleMode,
      allowedIds: validTargets.map(p => p.uid), // ONLY show valid targets
      activePokemonUid: battleStore.isBattleActive ? battleStore.player?.uid : null,
      onConfirm: (selected) => {
        if (selected && selected.length > 0) {
          const index = gameStore.state.team.findIndex(p => p.uid === selected[0].uid)
          if (index !== -1) {
            const res = inventoryStore.useItem(dbItem.name, 'team', index)
            if (res.success) {
              uiStore.notify(res.msg, '✨')
              if (props.battleMode) close() // Close inventory ONLY on success in battle
            } else {
              uiStore.notify(res.msg, '⚠️')
              // Keep inventory open on failure
            }
          }
        }
      }
    })
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

  const totalQty = Array.from(selectedItems.values()).reduce((s, v) => s + v, 0)
  const itemsText = totalQty === 1 ? '1 objeto' : `${totalQty} objetos`
  
  const message = mode === 'sell' 
    ? `¿Estás seguro que deseas vender ${itemsText} por un total de ₱${estimatedGain.toLocaleString()}?`
    : `¿Estás seguro que deseas tirar ${itemsText}?`
  
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
  uiStore.inventoryTarget = null
}
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : modalWidth"
    variant="retro"
    padding="raw"
    :no-scroll="!!battleMode"
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
            <span class="inv-stat-label">OBJETOS TOTALES</span>
            <span class="value">{{ totalObjectsCount }}</span>
          </div>
          <div 
            v-if="!battleMode"
            class="stat-node money"
          >
            <span class="inv-stat-label">MIS CRÉDITOS</span>
            <span class="value">₱{{ gameStore.state.money.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <div 
      class="inventory-modal-container"
      :class="{ 'is-battle-mode': battleMode }"
    >
      <!-- SIDEBAR (Hidden in battle mode) -->
      <InventorySidebar v-if="!battleMode" />

      <!-- MAIN CONTENT -->
      <div class="inventory-main">
        <!-- CONTROLS (Hidden in battle mode) -->
        <InventoryControls 
          v-if="!battleMode"
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
      max-width="320px"
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
          v-if="uiStore.inventoryTarget"
          class="menu-btn vicio-primary"
          @click.stop="handleActionSelect('use')"
        >
          <span class="icon">✨</span> USAR / EQUIPAR
        </button>
        <button
          v-if="!battleMode"
          class="menu-btn vicio-warning"
          @click.stop="handleActionSelect('sell')"
        >
          <span class="icon">💰</span> VENDER
        </button>
        <button
          v-if="!battleMode"
          class="menu-btn vicio-danger"
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
  gap: 12px;
  padding: 16px 0;

  .menu-btn {
    width: 100%;
    margin-bottom: 8px;
    
    &.vicio-primary { @include btn-vicio('primary', 'md', true); }
    &.vicio-warning { @include btn-vicio('primary', 'md', true); }
    &.vicio-danger  { @include btn-vicio('danger', 'md', true); }
    
    .icon { font-size: 16px; }
  }
}

.is-battle-mode {
  height: 520px !important;

  .inventory-main {
    border-radius: 0 0 24px 24px;
  }

  :deep(.item-premium-grid) {
    grid-template-columns: repeat(4, 1fr) !important;
  }
}
</style>
