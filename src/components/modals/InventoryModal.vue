<script setup lang="ts">

import { ref, computed, reactive, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'

import { getItemById } from '@/data/inventory/items'
import { isGlobalItem } from '@/logic/providers/itemProvider'
import { isEquippableHeldItem, mapInventoryToItems, type Item as InventoryListItem } from '@/stores/inventory/inventoryHelpers'
import {
  filterBattleItemsByCategoryAndQuery,
  filterUtilizableBattleItems,
  calculateEstimatedGain,
  resolveValidPokemonTargets,
} from './inventoryModalHelper'
import type { Item, ItemDiscardAction } from '@/types/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'

// Sub-components
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import InventoryItemCard from './inventory/InventoryItemCard.vue'
import { useGridTransitions } from '@/composables/ui/useGridTransitions'
import InventoryControls from './inventory/InventoryControls.vue'
import InventoryModalHeader from './InventoryModalHeader.vue'
import InventoryQuantityModal from './inventory/InventoryQuantityModal.vue'
import InventoryActionMenu from './inventory/InventoryActionMenu.vue'

interface Props { 
  id?: string
  show?: boolean
  battleMode?: boolean
  initialCategory?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  id: 'inventory',
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
import type { ItemId } from '@/data/inventory/items'

const selectedItems = reactive(new Map<ItemId, number>())
const quantitySelectionItem = ref<InventoryListItem | null>(null)
const itemActionMenu = ref<InventoryListItem | null>(null) // { item, type: 'sell'|'release'|'menu' }



// Local states for battle mode to prevent overwriting/sharing state with main inventory
const battleActiveCategory = ref('potions')
const battleActiveMainTab = ref<'productos' | 'materiales'>('productos')
const battleSearchQuery = ref('')

// Niveles superiores de categorización (Mochila normal)
const activeMainTab = computed({
  get: () => inventoryStore.activeMainTab,
  set: (val) => { inventoryStore.activeMainTab = val }
})

// Observar cambio en pestaña principal para resetear la subcategoría
watch(activeMainTab, () => {
  if (!props.battleMode) {
    inventoryStore.activeCategory = 'todos'
  }
})

// Getters
const modalWidth = computed(() => props.battleMode ? '480px' : '800px')
const filteredItems = computed<InventoryListItem[]>(() => {
  if (props.battleMode) {
    const inventory = gameStore.state.inventory || {}
    const isBattleActive = useBattleStore().isBattleActive
    let items = mapInventoryToItems(inventory, isBattleActive, battleActiveMainTab.value)

    if (battleActiveCategory.value === 'utilizables') {
      items = [...filterUtilizableBattleItems(
        items,
        uiStore.inventoryTarget,
        gameStore.state.team,
        gameStore.state.box,
        isBattleActive,
      )]
    }

    return filterBattleItemsByCategoryAndQuery(items, battleActiveCategory.value, battleSearchQuery.value)
  }
  
  return inventoryStore.bagItems || []
})

// Local items state to handle smooth transitions on tab switches
const displayedItems = ref<InventoryListItem[]>([])
const lastCategory = ref(props.battleMode ? battleActiveCategory.value : inventoryStore.activeCategory)
const isCategorySwitching = ref(false)

// Battle/Target Auto-category selection
watch(() => props.show, (val) => {
  if (val) {
    if (props.battleMode) {
      battleSearchQuery.value = ''
      battleActiveCategory.value = 'potions'
      battleActiveMainTab.value = 'productos'
    } else {
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
      }
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

watch(() => props.battleMode 
  ? [battleActiveCategory.value, battleSearchQuery.value, battleActiveMainTab.value]
  : [inventoryStore.activeCategory, inventoryStore.searchQuery, activeMainTab.value], 
  async ([newCat]) => {
    if (!props.show) {
      lastCategory.value = newCat as string
      displayedItems.value = [...filteredItems.value]
      return
    }
    const gridEl = document.querySelector('.inventory-grid-wrapper')
    if (gridEl) {
      isCategorySwitching.value = true
      gsap.killTweensOf(gridEl)
      
const GSAP_CATEGORY_FADE_OUT_DURATION_SEC = 0.12
const GSAP_CATEGORY_FADE_IN_DURATION_SEC = 0.18

      // Fade out the entire grid container
      await gsap.to(gridEl, {
        opacity: 0,
        y: 8,
        duration: GSAP_CATEGORY_FADE_OUT_DURATION_SEC,
        ease: 'power2.out'
      })
      
      // Update local items
      lastCategory.value = newCat as string
      displayedItems.value = [...filteredItems.value]
      
      // Wait for DOM update
      await nextTick()
      
      // Fade the grid container back in
      await gsap.to(gridEl, {
        opacity: 1,
        y: 0,
        duration: GSAP_CATEGORY_FADE_IN_DURATION_SEC,
        ease: 'power2.out'
      })
      
      isCategorySwitching.value = false
    } else {
      lastCategory.value = newCat as string
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
        .filter((entry): entry is [string, number] => entry[1] !== undefined && entry[1] > 0)
        .map(([name, qty]) => ({ name, id: name, qty }))
  return source.reduce((s, v) => s + (v.qty || 0), 0)
})
const selectedObjectsTotal = computed(() => Array.from(selectedItems.values()).reduce((s, v) => s + v, 0))

// Handlers
const handleItemClick = (item: InventoryListItem) => {
  if (multiSelectMode.value) {
    if (selectedItems.has(item.id)) {
      selectedItems.delete(item.id)
    } else {
      // Auto-select the entire stack for bulk actions
      selectedItems.set(item.id, item.qty)
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

function applyTargetedItem(dbItem: Item, target: NonNullable<typeof uiStore.inventoryTarget>) {
  if (isEquippableHeldItem(dbItem)) {
    const success = inventoryStore.equipItem(dbItem.id, target.context, target.index)
    if (success) {
      uiStore.notify(`¡${dbItem.name} equipado!`, '🎒')
      uiStore.toggleInventory()
    } else {
      uiStore.notify('No se pudo equipar', '⚠️')
    }
  } else {
    const res = inventoryStore.useItem(dbItem.id, target.context, target.index)
    uiStore.notify(res.message, res.success ? '✨' : '⚠️')
  }
}

function openTargetSelectionModal(dbItem: Item, validTargets: Pokemon[]) {
  const isHeld = isEquippableHeldItem(dbItem)
  const battleStore = useBattleStore()
  modalStore.open('PokemonSelection', {
    title: isHeld ? `EQUIPAR ${dbItem.name?.toUpperCase()}` : `USAR ${dbItem.name?.toUpperCase()}`,
    isBattleSwitch: false,
    includeTeam: true,
    allowDead: dbItem.name?.toLowerCase().includes('revivir') || !props.battleMode,
    allowedIds: validTargets.map((p: Pokemon) => p.uid),
    activePokemonUid: battleStore.isBattleActive ? battleStore.player?.uid : null,
    onConfirm: (selected: Pokemon[]) => {
      if (!selected || selected.length === 0) return
      const index = (gameStore.state.team || []).findIndex((p: Pokemon) => p.uid === selected[0]!.uid)
      if (index === -1) return
      if (isHeld) {
        const success = inventoryStore.equipItem(dbItem.id, 'team', index)
        uiStore.notify(success ? `¡${dbItem.name} equipado!` : 'No se pudo equipar', success ? '🎒' : '⚠️')
      } else {
        const res = inventoryStore.useItem(dbItem.id, 'team', index)
        uiStore.notify(res.message, res.success ? '✨' : '⚠️')
        if (res.success && props.battleMode) close()
      }
    }
  })
}

function executeItemUse(item: InventoryListItem) {
  const dbItem = getItemById(item.id)
  if (!dbItem) {
    uiStore.notify(`Error: Objeto "${item.name}" no reconocido.`, '⚠️')
    return
  }

  if (props.battleMode && dbItem.cat === 'pokeballs') {
    useBattleStore().useItemInBattle(dbItem.id)
    close()
    return
  }

  if (uiStore.inventoryTarget) {
    applyTargetedItem(dbItem, uiStore.inventoryTarget)
    return
  }

  if (isGlobalItem(dbItem.id)) {
    const res = inventoryStore.useItem(dbItem.id)
    uiStore.notify(res.message, res.success ? '✨' : '⚠️')
    return
  }

  const validTargets = resolveValidPokemonTargets(dbItem, gameStore.state.team || [])
  if (validTargets.length === 0) {
    const isHeld = isEquippableHeldItem(dbItem)
    uiStore.notify(
      isHeld ? 'No tienes ningún Pokémon en tu equipo para equipar este objeto' : 'Este objeto no tiene objetivos válidos en tu equipo',
      isHeld ? '⚠️' : '🎒'
    )
    return
  }

  openTargetSelectionModal(dbItem, validTargets)
}

const handleActionSelect = (type: string) => {
  const item = itemActionMenu.value
  if (!item) return
  itemActionMenu.value = null

  if (type === 'use') {
    executeItemUse(item)
  } else {
    multiSelectMode.value = type
    quantitySelectionItem.value = item
  }
}

const handleMultiExecute = async () => {
  if (selectedItems.size === 0) return
  const mode = multiSelectMode.value
  if (!mode) return

  const estimatedGain = mode === 'sell' ? calculateEstimatedGain(selectedItems) : 0
  const totalQty = Array.from(selectedItems.values()).reduce((s, v) => s + v, 0)
  const itemsText = totalQty === 1 ? '1 objeto' : `${totalQty} objetos`

  const message = mode === 'sell'
    ? `¿Estás seguro que deseas vender ${itemsText} por un total de ₱${estimatedGain.toLocaleString()}?`
    : `¿Estás seguro que deseas tirar ${itemsText}?`

  uiStore.openConfirm({
    title: 'CONFIRMAR ACCIÓN',
    message,
    confirmText: mode === 'sell' ? 'VENDER' : 'TIRAR',
    onConfirm: async () => {
      const totalGain = await inventoryStore.processBatchAction(selectedItems, mode as ItemDiscardAction)
      uiStore.notify(
        mode === 'sell' ? `Venta realizada: +₱${totalGain.toLocaleString()}` : 'Objetos eliminados correctamente',
        mode === 'sell' ? '💰' : '🗑️'
      )
      selectedItems.clear()
      multiSelectMode.value = null
    }
  })
}

const handleQuantityConfirm = async (qty: number) => {
  if (quantitySelectionItem.value) {
    const itemId = quantitySelectionItem.value.id
    
    // If NOT in a persistent multi-select session (single action), execute immediately
    if (selectedItems.size === 0) {
      const singleMap = new Map([[itemId, qty]])
      const mode = multiSelectMode.value
      if (mode) {
        const totalGain = await inventoryStore.processBatchAction(singleMap, mode as ItemDiscardAction)
        
        if (mode === 'sell') uiStore.notify(`Venta realizada: +₱${totalGain.toLocaleString()}`, '💰')
        else uiStore.notify('Objeto eliminado', '🗑️')
      }
      
      multiSelectMode.value = null
    } else {
      // In a persistent multi-select session, just add to selection
      selectedItems.set(itemId, qty)
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
    :id="id || 'inventory'"
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
      <InventoryModalHeader
        :total-objects-count="totalObjectsCount"
        :battle-mode="battleMode"
        :money="gameStore.state.money"
      />
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
        accent-color="var(--red)"
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

        <!-- SEARCH BAR FOR BATTLE MODE -->
        <div
          v-else
          class="battle-search-section"
        >
          <div class="search-input-wrap">
            <span class="emoji search-icon">🔍</span>
            <input
              v-model="battleSearchQuery"
              type="text"
              placeholder="Buscar objeto..."
              class="premium-search-input"
            >
            <button
              v-if="battleSearchQuery"
              class="clear-btn"
              @click.stop="battleSearchQuery = ''"
            >
              ×
            </button>
          </div>
        </div>

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
              :key="item.id"
              :item="item"
              :is-selected="selectedItems.has(item.id)"
              :multi-select-mode="!!multiSelectMode"
              :sell-mode="multiSelectMode === 'sell'"
              @click.stop="handleItemClick(item)"
            />
          </TransitionGroup>

          <!-- EMPTY STATE -->
          <div
            v-else
            class="empty-inventory-state"
          >
            <div class="empty-visual">
              <span class="emoji icon">🔍</span>
            </div>
            <div class="empty-text">
              <h3>No hay resultados</h3>
              <p>{{ (battleMode ? battleSearchQuery : inventoryStore.searchQuery) ? 'Prueba con otros términos de búsqueda' : 'Esta sección de tu mochila está vacía' }}</p>
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

<style scoped src="./InventoryModal.styles.scss" lang="scss"></style>
