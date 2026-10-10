<script setup lang="ts">
import { computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useGameStore } from '@/stores/game'
import { useBagDataLoader } from '@/loaders/bagDataLoader'
import { formatCurrency } from '@/logic/utils/formatters'
import { gsap } from 'gsap'
import BagItemCard from '@/components/inventory/BagItemCard.vue'
import { ITEM_CATEGORIES, type BagMainTab } from '@/types/inventory/items'

const inventoryStore = useInventoryStore()
const gameStore = useGameStore()
const { data: _bagSummary } = useBagDataLoader()

// Niveles superiores de categorización
const activeMainTab = computed({
  get: () => inventoryStore.activeMainTab,
  set: (val) => { inventoryStore.activeMainTab = val }
})

const _BAG_SUBCATEGORY_FILTERS = ['todos', ...ITEM_CATEGORIES] as const
type BagSubcategoryFilter = (typeof _BAG_SUBCATEGORY_FILTERS)[number]

// Definición de subcategorías por pestaña principal
const subcategoriesByMainTab: Record<BagMainTab, { id: BagSubcategoryFilter; label: string; icon: string }[]> = {
  productos: [
    { id: 'todos', label: 'Todo', icon: '📦' },
    { id: 'stones', label: 'Piedras', icon: '💎' },
    { id: 'pokeballs', label: 'Pokéballs', icon: '⚪' },
    { id: 'potions', label: 'Curativos', icon: '🧪' },
    { id: 'combat_held', label: 'Held Combate', icon: '🎒' },
    { id: 'breeding_held', label: 'Crianza', icon: '🥚' },
    { id: 'machinery', label: 'Maquinaria', icon: '🏭' },
    { id: 'tools', label: 'Herramientas', icon: '🛠️' },
    { id: 'tms', label: 'Discos MT', icon: '📀' },
    { id: 'otros', label: 'Otros', icon: '✨' }
  ],
  materiales: [
    { id: 'todos', label: 'Todo', icon: '📦' },
    { id: 'raw_material', label: 'Materia Prima', icon: '🪵' },
    { id: 'refined_material', label: 'Materia Refinada', icon: '🪙' },
    { id: 'component', label: 'Componentes', icon: '⚙️' }
  ]
}

const currentSubcategories = computed(() => {
  return subcategoriesByMainTab[activeMainTab.value]
})

// Observar cambio en pestaña principal para resetear la subcategoría
watch(activeMainTab, () => {
  inventoryStore.activeCategory = 'todos'
})

import type { ItemId } from '@/data/inventory/items'

const filteredBagItems = computed(() => {
  return inventoryStore.bagItems
})

const onUseItem = (itemId: ItemId) => {
  inventoryStore.useItem(itemId)
}

// GSAP Interactions
const onMainTabClick = (tabId: BagMainTab) => {
  activeMainTab.value = tabId
}

const onTabClick = (catId: BagSubcategoryFilter) => {
  inventoryStore.activeCategory = catId
}

const onItemClick = (itemId: ItemId, qty: number, event: MouseEvent) => {
  if (inventoryStore.bagSellMode) {
    inventoryStore.toggleBagSellItem(itemId, qty)
    const target = event.currentTarget as HTMLElement
    const isSelected = !!inventoryStore.bagSellSelected[itemId]
    
    gsap.to(target, {
      borderColor: isSelected ? 'var(--green-bright)' : 'rgba(255, 255, 255, 0.08)',
      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.06)',
      duration: 0.2,
      overwrite: 'auto'
    })
  }
}

const onSellModeMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onSellModeMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onMainTabMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  if (!target.classList.contains('active')) {
    gsap.to(target, {
      color: '#ffffff',
      duration: 0.2,
      overwrite: 'auto'
    })
  }
}

const onMainTabMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  if (!target.classList.contains('active')) {
    gsap.to(target, {
      color: 'var(--gray)',
      duration: 0.2,
      overwrite: 'auto'
    })
  }
}
</script>

<template>
  <div class="bag-view">
    <div class="bag-container">
      <!-- Header -->
      <div class="bag-header">
        <div class="title-section">
          <span class="emoji">🎒</span>
          <h1>Mochila</h1>
        </div>
        <div class="money-badge">
          ₽{{ formatCurrency(gameStore.state.money) }}
        </div>
      </div>

      <!-- Top-Level Tabs -->
      <div class="main-tabs-row">
        <button
          id="bag-view-btn-productos"
          class="main-tab-btn"
          :class="{ active: activeMainTab === 'productos' }"
          @click.stop="onMainTabClick('productos')"
          @mouseenter="onMainTabMouseEnter"
          @mouseleave="onMainTabMouseLeave"
        >
          Productos
        </button>
        <button
          id="bag-view-btn-materiales"
          class="main-tab-btn"
          :class="{ active: activeMainTab === 'materiales' }"
          @click.stop="onMainTabClick('materiales')"
          @mouseenter="onMainTabMouseEnter"
          @mouseleave="onMainTabMouseLeave"
        >
          Materiales
        </button>
      </div>

      <!-- Search & Tabs -->
      <div class="controls-section">
        <div class="search-bar">
          <input
            id="bag-view-input-searchquery" 
            v-model="inventoryStore.searchQuery" 
            type="text" 
            placeholder="Buscar objeto..."
            class="search-input"
          >
        </div>
        <div class="tabs-row scroll-hide">
          <button
            v-for="cat in currentSubcategories" 
            id="bag-view-btn-cat-label" 
            :key="cat.id"
            :class="['tab-btn', { active: inventoryStore.activeCategory === cat.id }]"
            @click.stop="onTabClick(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Sell Mode Overlay (Sticky) -->
      <div
        v-if="inventoryStore.bagSellMode"
        class="sell-actions"
      >
        <div class="sell-info">
          MODO VENTA: <span class="text-green">Ganancia +₽{{ formatCurrency(inventoryStore.getBagSellTotalGain()) }}</span>
        </div>
        <div class="sell-buttons">
          <button
            id="bag-view-btn-confirmar-venta" 
            class="btn-vicio-success btn-vicio-sm" 
            :disabled="Object.keys(inventoryStore.bagSellSelected).length === 0"
            @click.stop="inventoryStore.confirmBagSell"
          >
            Confirmar Venta
          </button>
          <button
            id="bag-view-btn-cancelar"
            class="btn-vicio-neutral btn-vicio-sm"
            @click.stop="inventoryStore.toggleBagSellMode"
          >
            Cancelar
          </button>
        </div>
      </div>

      <!-- Items Grid -->
      <div class="items-wrapper scroll-custom">
        <div
          v-if="filteredBagItems.length === 0"
          class="empty-state"
        >
          <span class="emoji empty-icon">🔍</span>
          <p>No se encontraron objetos en esta categoría.</p>
        </div>

        <div
          v-else
          class="items-grid"
        >
          <BagItemCard
            v-for="item in filteredBagItems"
            id="bag-view-bagitemcard-itemclick"
            :key="item.id"
            :item="item"
            :is-selected="!!inventoryStore.bagSellSelected[item.id]"
            :sell-mode="inventoryStore.bagSellMode"
            :sell-qty="inventoryStore.bagSellSelected[item.id] ?? undefined"
            @use="onUseItem"
            @click="onItemClick(item.id, Number(item.qty), $event)"
            @qty-click="inventoryStore.toggleBagSellItem(item.id, Number(item.qty))"
            @update-qty="(val: number | string) => inventoryStore.updateBagSellQty(item.id, val, Number(item.qty))"
          />
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="!inventoryStore.bagSellMode"
        class="bag-footer"
      >
        <button
          id="bag-view-btn-vender-objetos"
          class="btn-sell-mode"
          @mouseenter="onSellModeMouseEnter"
          @mouseleave="onSellModeMouseLeave"
          @click.stop="inventoryStore.toggleBagSellMode"
        >
          <span class="emoji">💰</span> Vender Objetos
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.bag-view {
  display: flex;
  justify-content: center;
  padding: 0;
  background: Radial-Gradient(circle at top left, Rgb(59 130 246 / 5%), transparent),
              Radial-Gradient(circle at bottom right, Rgb(16 185 129 / 5%), transparent);
}

.bag-container {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
  width: 100%;
  max-width: 800px;
  min-height: 0;
}

.main-tabs-row {
  display: flex;
  gap: $spacing-md;
  border-bottom: 2px solid Rgb(255 255 255 / 5%);
  padding-bottom: 8px;
}

.main-tab-btn {
  @include pixelated;

  position: relative;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--gray);
  font-size: var(--font-14);
  cursor: pointer;

  &:hover {
    color: var(--white);
  }

  &.active {
    color: var(--purple-light);
    font-weight: bold;

    &::after {
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 3px;
      border-radius: $radius-xs;
      background: var(--purple);
      content: '';
      box-shadow: var(--shadow-glow-yellow-sm);
    }
  }
}

.bag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.title-section h1 {
  @include pixelated;

  margin: 0;
  color: var(--white);
  font-size: var(--font-16);
}

.icon { font-size: var(--font-24); }

.money-badge {
  @include pixelated;

  padding: 8px 16px;
  border: 1px solid Rgb(34 197 94 / 30%);
  border-radius: $radius-3xl;
  background: Rgb(34 197 94 / 15%);
  color: var(--green-bright);
  font-size: var(--font-10);
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 5%);
  color: var(--white);
  outline: none;
}

.tabs-row {
  display: flex;
  gap: $spacing-sm;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-lg-alt;
  background: Rgb(255 255 255 / 5%);
  color: var(--gray);
  font-size: var(--font-11);
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(.active) {
    background: Rgb(255 255 255 / 10%);
    color: var(--white);
    border-color: Rgb(255 255 255 / 20%);
  }

  &.active {
    background: var(--purple);
    color: var(--white);
    border-color: var(--purple-light);
    box-shadow: var(--shadow-glow-amber);
  }
}

.items-wrapper {
  @include gpu-layer;
}

.items-grid {
  display: grid;
  gap: $spacing-lg;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.sell-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid Rgb(16 185 129 / 20%);
  border-radius: $radius-2xl;
  background: Rgb(16 185 129 / 10%);
}

.sell-buttons { display: flex; gap: $spacing-sm; }

.btn-sell-mode {
  @include pixelated;

  width: 100%;
  padding: 14px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 5%);
  color: var(--white);
  font-size: var(--font-10);
  cursor: pointer;
}

</style>

<style lang="scss">
.scroll-hide {
  &::-webkit-scrollbar { display: none; }
}
</style>
