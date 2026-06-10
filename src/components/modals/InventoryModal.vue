<script setup lang="ts">

import { ref, computed, reactive, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useInventoryStore, type Item } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import { SHOP_ITEMS } from '@/data/items'
import { isValidTarget } from '@/logic/items/itemEffects'
import { isGlobalItem } from '@/logic/providers/itemProvider'
import type { Pokemon } from '@/types/pokemon'

// Sub-components
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import InventoryItemCard from './inventory/InventoryItemCard.vue'
import { useGridTransitions } from '@/composables/useGridTransitions'
import InventoryControls from './inventory/InventoryControls.vue'
import InventoryQuantityModal from './inventory/InventoryQuantityModal.vue'
import InventoryActionMenu from './inventory/InventoryActionMenu.vue'

interface Props { 
  show?: boolean
  battleMode?: boolean
  initialCategory?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  battleMode: false,
  initialCategory: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()
const inventoryStore = useInventoryStore()
const modalStore = useModalStore()

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

// Battle/Target Auto-category selection moved below filteredItems to avoid ReferenceError

// State
const multiSelectMode = ref<string | null>(null)
const selectedItems = reactive(new Map<string, number>()) // name -> qty
const quantitySelectionItem = ref<Item | null>(null)
const itemActionMenu = ref<Item | null>(null) // { item, type: 'sell'|'release'|'menu' }



// Niveles superiores de categorización
const activeMainTab = ref<'productos' | 'materiales'>('productos')

// Observar cambio en pestaña principal para resetear la subcategoría
watch(activeMainTab, () => {
  inventoryStore.activeCategory = 'todos'
})

// Getters
const modalWidth = computed(() => props.battleMode ? '480px' : '800px')
const filteredItems = computed<Item[]>(() => {
  const allItems = (inventoryStore.bagItems as Item[]) || []
  return allItems.filter(item => {
    const cat = item.cat || 'otros'
    const isMaterialCat = ['raw_material', 'refined_material', 'component'].includes(cat)
    if (activeMainTab.value === 'materiales') {
      return isMaterialCat
    } else {
      return !isMaterialCat
    }
  })
})

// Local items state to handle smooth transitions on tab switches
const displayedItems = ref<Item[]>([])
const lastCategory = ref(inventoryStore.activeCategory)
const lastSearchQuery = ref(inventoryStore.searchQuery)
const isCategorySwitching = ref(false)

// Battle/Target Auto-category selection
watch(() => props.show, (val) => {
  if (val) {
    if (props.initialCategory) {
      inventoryStore.activeCategory = props.initialCategory
      if (['raw_material', 'refined_material', 'component'].includes(props.initialCategory)) {
        activeMainTab.value = 'materiales'
      } else {
        activeMainTab.value = 'productos'
      }
    } else if (uiStore.inventoryTarget) {
      inventoryStore.activeCategory = 'utilizables'
      activeMainTab.value = 'productos'
    } else if (props.battleMode) {
      inventoryStore.activeCategory = 'potions'
      activeMainTab.value = 'productos'
    }
    displayedItems.value = [...filteredItems.value]
    
    // Ensure grid is visible when reopening
    nextTick(() => {
      const gridEl = document.querySelector('.inventory-grid-wrapper')
      if (gridEl) {
        gsap.set(gridEl, { opacity: 1, y: 0 })
      }
    })
  }
}, { immediate: true })

watch(() => [inventoryStore.activeCategory, inventoryStore.searchQuery, activeMainTab.value], async ([newCat, newQuery]) => {
  const gridEl = document.querySelector('.inventory-grid-wrapper')
  if (gridEl) {
    isCategorySwitching.value = true
    gsap.killTweensOf(gridEl)
    
    // Fade out the entire grid container
    await gsap.to(gridEl, {
      opacity: 0,
      y: 8,
      duration: 0.12,
      ease: 'power2.out'
    })
    
    // Update local items
    lastCategory.value = newCat as string
    lastSearchQuery.value = newQuery as string
    displayedItems.value = [...filteredItems.value]
    
    // Wait for DOM update
    await nextTick()
    
    // Fade the grid container back in
    await gsap.to(gridEl, {
      opacity: 1,
      y: 0,
      duration: 0.18,
      ease: 'power2.out'
    })
    
    isCategorySwitching.value = false
  } else {
    lastCategory.value = newCat as string
    lastSearchQuery.value = newQuery as string
    displayedItems.value = [...filteredItems.value]
  }
})

watch(() => filteredItems.value, (newVal) => {
  if (!isCategorySwitching.value) {
    displayedItems.value = [...newVal]
  }
}, { deep: true })
const totalObjectsCount = computed(() => {
  const source = props.battleMode 
    ? (filteredItems.value || [])
    : Object.entries(gameStore.state.inventory || {})
        .filter(([, qty]) => (qty as number) > 0)
        .map(([name, qty]) => ({ name, id: name, qty: qty as number }))
  return source.reduce((s, v) => s + (v.qty || 0), 0)
})
const selectedObjectsTotal = computed(() => Array.from(selectedItems.values()).reduce((s, v) => s + v, 0))

// Handlers
const handleItemClick = (item: Item) => {
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

const handleActionSelect = (type: string) => {
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
      if (dbItem.cat === 'held' || dbItem.type === 'held' || (dbItem.cat === 'breeding' && dbItem.id !== 'vigor_restorer' && !dbItem.id.includes('berry'))) {
        const success = inventoryStore.equipItem(dbItem.name, uiStore.inventoryTarget.context, uiStore.inventoryTarget.index)
        if (success) {
          uiStore.notify(`¡${dbItem.name} equipado!`, '🎒')
          uiStore.toggleInventory() // Close inventory after equipping
        }
        else uiStore.notify(`No se pudo equipar`, '⚠️')
      } else {
        const res = inventoryStore.useItem(dbItem.name, uiStore.inventoryTarget.context, uiStore.inventoryTarget.index)
        if (res.success) uiStore.notify(res.message, '✨')
        else uiStore.notify(res.message, '⚠️')
      }
      
      itemActionMenu.value = null
      return
    }

    // Outside combat targetless actions
    if (isGlobalItem(dbItem.name)) {
      const res = inventoryStore.useItem(dbItem.name)
      if (res.success) uiStore.notify(res.message, '✨')
      else uiStore.notify(res.message, '⚠️')
      itemActionMenu.value = null
      return
    }

    const isHeld = dbItem.cat === 'held' || dbItem.type === 'held' || (dbItem.cat === 'breeding' && dbItem.id !== 'vigor_restorer' && !dbItem.id.includes('berry'))
    const validTargets = isHeld
      ? (gameStore.state.team || [])
      : (gameStore.state.team || []).filter((p: Pokemon) => isValidTarget(dbItem.name, p))
    
    if (validTargets.length === 0) {
      if (isHeld) {
        uiStore.notify(`No tienes ningún Pokémon en tu equipo para equipar este objeto`, '⚠️')
      } else {
        uiStore.notify(`Este objeto no tiene objetivos válidos en tu equipo`, '🎒')
      }
      itemActionMenu.value = null
      return
    }

    const battleStore = useBattleStore()
    modalStore.open('PokemonSelection', {
      title: isHeld ? `EQUIPAR ${dbItem.name?.toUpperCase()}` : `USAR ${dbItem.name?.toUpperCase()}`,
      isBattleSwitch: false, // Permitir seleccionar al activo para curaciones
      includeTeam: true,
      allowDead: dbItem.name?.toLowerCase().includes('revivir') || !props.battleMode,
      allowedIds: validTargets.map((p: Pokemon) => p.uid), // ONLY show valid targets
      activePokemonUid: battleStore.isBattleActive ? battleStore.player?.uid : null,
      onConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0) {
          const index = (gameStore.state.team || []).findIndex((p: Pokemon) => p.uid === selected[0]!.uid)
          if (index !== -1) {
            if (isHeld) {
              const success = inventoryStore.equipItem(dbItem.name, 'team', index)
              if (success) uiStore.notify(`¡${dbItem.name} equipado!`, '🎒')
              else uiStore.notify(`No se pudo equipar`, '⚠️')
            } else {
              const res = inventoryStore.useItem(dbItem.name, 'team', index)
              if (res.success) {
                uiStore.notify(res.message, '✨')
                if (props.battleMode) close() // Close inventory ONLY on success in battle
              } else {
                uiStore.notify(res.message, '⚠️')
                // Keep inventory open on failure
              }
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
  if (!mode) return
  
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
      const totalGain = await inventoryStore.processBatchAction(selectedItems, mode as 'sell' | 'release')

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

const handleQuantityConfirm = async (qty: number) => {
  if (quantitySelectionItem.value) {
    const itemName = quantitySelectionItem.value.name
    
    // If NOT in a persistent multi-select session (single action), execute immediately
    if (selectedItems.size === 0) {
      const singleMap = new Map([[itemName, qty]])
      const mode = multiSelectMode.value
      if (mode) {
        const totalGain = await inventoryStore.processBatchAction(singleMap, mode as 'sell' | 'release')
        
        if (mode === 'sell') uiStore.notify(`Venta realizada: +₱${totalGain.toLocaleString()}`, '💰')
        else uiStore.notify('Objeto eliminado', '🗑️')
      }
      
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

const { onBeforeEnter, onEnter, onLeave } = useGridTransitions(isCategorySwitching)


</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : modalWidth"
    variant="retro"
    padding="raw"
    accent-color="var(--red)"
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
            <span class="value">₱{{ formatCurrency(gameStore.state.money) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div 
      class="inventory-modal-container"
      :class="{ 'is-battle-mode': battleMode }"
    >
      <!-- SIDEBAR (Hidden in battle mode) -->
      <UnifiedSidebar
        v-if="!battleMode"
        v-model:active-category="inventoryStore.activeCategory"
        :main-tab="activeMainTab"
      />

      <!-- MAIN CONTENT -->
      <div class="inventory-main">
        <!-- Pestañas Principales en el modal de Mochila -->
        <div
          v-if="!battleMode"
          class="modal-main-tabs"
        >
          <button 
            class="modal-tab-btn" 
            :class="{ active: activeMainTab === 'productos' }" 
            @click.stop="activeMainTab = 'productos'"
          >
            Productos
          </button>
          <button 
            class="modal-tab-btn" 
            :class="{ active: activeMainTab === 'materiales' }" 
            @click.stop="activeMainTab = 'materiales'"
          >
            Materiales
          </button>
        </div>

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
            v-if="displayedItems.length"
            :css="false"
            tag="div"
            class="item-premium-grid"
            @before-enter="onBeforeEnter"
            @enter="onEnter" 
            @leave="onLeave"
          >
            <InventoryItemCard
              v-for="item in displayedItems"
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
      :mode="multiSelectMode || undefined"
      @close="() => { quantitySelectionItem = null; if (selectedItems.size === 0) multiSelectMode = null; }"
      @confirm="handleQuantityConfirm"
    />

    <!-- SINGLE ITEM ACTION MENU -->
    <InventoryActionMenu
      v-if="itemActionMenu"
      :show="!!itemActionMenu"
      :item="itemActionMenu"
      :battle-mode="battleMode"
      @close="itemActionMenu = null"
      @action="handleActionSelect"
    />
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/components/inventory";



.is-battle-mode {
  height: 520px !important;

  .inventory-main {
    border-radius: 0 0 24px 24px;
  }

  :deep(.item-premium-grid) {
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)) !important;
  }
}

.modal-main-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.modal-tab-btn {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  color: var(--gray);
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  @include pixelated;

  &:hover {
    color: var(--white);
    background: Rgba(255, 255, 255, 0.06);
  }

  &.active {
    color: var(--white);
    background: var(--red);
    border-color: var(--red-light);
    box-shadow: 0 0 8px Rgba(239, 68, 68, 0.4);
    text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  }
}
</style>
