<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useGameStore } from '@/stores/game'
import { formatCurrency } from '@/logic/utils/formatters'
import { gsap } from 'gsap'
import BagItemCard from '@/components/inventory/BagItemCard.vue'

const inventoryStore = useInventoryStore()
const gameStore = useGameStore()

// Niveles superiores de categorización
const activeMainTab = ref<'productos' | 'materiales'>('productos')

// Definición de subcategorías por pestaña principal
const subcategoriesByMainTab = {
  productos: [
    { id: 'todos', label: 'Todo', icon: '📦' },
    { id: 'utilizables', label: 'Utilizables', icon: '💊' },
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

const filteredBagItems = computed(() => {
  const allItems = inventoryStore.bagItems
  return allItems.filter(item => {
    // Si la pestaña principal es 'productos', deben ser tier 3 (o no tener tier, por defecto tier 3 es producto)
    // Si la pestaña principal es 'materiales', deben ser tier 0, 1 o 2 (o sea, raw_material, refined_material, component)
    const cat = item.cat || 'otros'
    const isMaterialCat = ['raw_material', 'refined_material', 'component'].includes(cat)
    if (activeMainTab.value === 'materiales') {
      return isMaterialCat
    } else {
      return !isMaterialCat
    }
  })
})

const onUseItem = (name: string) => {
  inventoryStore.useItem(name)
}

// GSAP Interactions
const onMainTabClick = (tabId: 'productos' | 'materiales') => {
  activeMainTab.value = tabId
}

const onTabClick = (catId: string, event: MouseEvent) => {
  inventoryStore.activeCategory = catId
  const target = event.currentTarget as HTMLElement
  
  const tabs = target.parentElement?.querySelectorAll('.tab-btn')
  if (tabs) {
    tabs.forEach(tab => {
      if (tab !== target) {
        gsap.to(tab, {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--gray)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          duration: 0.2,
          overwrite: 'auto'
        })
      }
    })
  }
  
  gsap.to(target, {
    backgroundColor: 'var(--purple)',
    color: 'var(--white)',
    borderColor: 'var(--purple-light)',
    duration: 0.2,
    overwrite: 'auto'
  })
}

const onItemClick = (itemName: string, qty: number, event: MouseEvent) => {
  if (inventoryStore.bagSellMode) {
    inventoryStore.toggleBagSellSelect(itemName, qty)
    const target = event.currentTarget as HTMLElement
    const isSelected = !!inventoryStore.bagSellSelected[itemName]
    
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
</script>

<template>
  <div class="bag-view">
    <div class="bag-container">
      <!-- Header -->
      <div class="bag-header">
        <div class="title-section">
          <span class="icon">🎒</span>
          <h1>Mochila</h1>
        </div>
        <div class="money-badge">
          ₽{{ formatCurrency(gameStore.state.money) }}
        </div>
      </div>

      <!-- Top-Level Tabs -->
      <div class="main-tabs-row">
        <button
          class="main-tab-btn"
          :class="{ active: activeMainTab === 'productos' }"
          @click.stop="onMainTabClick('productos')"
        >
          Productos
        </button>
        <button
          class="main-tab-btn"
          :class="{ active: activeMainTab === 'materiales' }"
          @click.stop="onMainTabClick('materiales')"
        >
          Materiales
        </button>
      </div>

      <!-- Search & Tabs -->
      <div class="controls-section">
        <div class="search-bar">
          <input 
            v-model="inventoryStore.searchQuery" 
            type="text" 
            placeholder="Buscar objeto..."
            class="search-input"
          >
        </div>
        <div class="tabs-row scroll-hide">
          <button 
            v-for="cat in currentSubcategories" 
            :key="cat.id"
            :class="['tab-btn', { active: inventoryStore.activeCategory === cat.id }]"
            @click.stop="onTabClick(cat.id, $event)"
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
            class="btn btn-green" 
            :disabled="Object.keys(inventoryStore.bagSellSelected).length === 0"
            @click.stop="inventoryStore.confirmBagSell"
          >
            Confirmar Venta
          </button>
          <button
            class="btn btn-gray"
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
          <span class="empty-icon">🔍</span>
          <p>No se encontraron objetos en esta categoría.</p>
        </div>

        <div
          v-else
          class="items-grid"
        >
          <BagItemCard
            v-for="item in filteredBagItems"
            :key="item.name"
            :item="item"
            :is-selected="!!inventoryStore.bagSellSelected[item.name]"
            :sell-mode="inventoryStore.bagSellMode"
            :sell-qty="inventoryStore.bagSellSelected[item.name]"
            @use="onUseItem"
            @click="onItemClick(item.name, Number(item.qty), $event)"
            @qty-click="inventoryStore.toggleBagSellSelect(item.name, Number(item.qty))"
            @update-qty="(val) => inventoryStore.updateBagSellQty(item.name, val, Number(item.qty))"
          />
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="!inventoryStore.bagSellMode"
        class="bag-footer"
      >
        <button
          class="btn-sell-mode"
          @mouseenter="onSellModeMouseEnter"
          @mouseleave="onSellModeMouseLeave"
          @click.stop="inventoryStore.toggleBagSellMode"
        >
          💰 Vender Objetos
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.bag-view {
  padding: 0;
  background: Radial-Gradient(circle at top left, Rgba(59, 130, 246, 0.05), transparent),
              Radial-Gradient(circle at bottom right, Rgba(16, 185, 129, 0.05), transparent);
  display: flex;
  justify-content: center;
}

.bag-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 20px;
}

.main-tabs-row {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
}

.main-tab-btn {
  background: transparent;
  border: none;
  color: var(--gray);
  font-size: 14px;
  padding: 8px 16px;
  cursor: pointer;
  @include pixelated;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    color: var(--white);
  }

  &.active {
    color: var(--purple-light);
    font-weight: bold;

    &::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 3px;
      background: var(--purple);
      border-radius: 2px;
      box-shadow: 0 0 8px var(--purple-light);
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
  gap: 12px;
}

.title-section h1 {
  @include pixelated;
  font-size: 16px;
  color: var(--white);
  margin: 0;
}

.icon { font-size: 24px; }

.money-badge {
  background: Rgba(34, 197, 94, 0.15);
  border: 1px solid Rgba(34, 197, 94, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  color: var(--green-bright);
  @include pixelated;
  font-size: 10px;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--white);
  outline: none;
}

.tabs-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--gray);
  font-size: 11px;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--purple);
  color: var(--white);
  border-color: var(--purple-light);
}

.items-wrapper {
  @include gpu-layer;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.sell-actions {
  background: Rgba(16, 185, 129, 0.1);
  border: 1px solid Rgba(16, 185, 129, 0.2);
  padding: 16px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sell-buttons { display: flex; gap: 8px; }

.btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
}

.btn-green { background: var(--green-bright); color: var(--white); }
.btn-gray { background: Rgba(255, 255, 255, 0.1); color: var(--white); }

.btn-sell-mode {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  @include pixelated;
  font-size: 10px;
  cursor: pointer;
}

</style>

<style lang="scss">
.scroll-hide {
  &::-webkit-scrollbar { display: none; }
}
</style>
