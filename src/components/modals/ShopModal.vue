<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import SortControls from '@/components/common/SortControls.vue'

// Sub-components
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import ShopItemCard from './shop/ShopItemCard.vue'

interface Props {
  show?: boolean
  initialCategory?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialCategory: 'todos'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

import { useShopLogic } from '@/composables/inventory/useShopLogic'
import { toRef } from 'vue'

const {
  activeMainTab,
  activeTab,
  search,
  sortKey,
  sortOrder,
  filteredItems,
  availableCategories
} = useShopLogic({
  isBCShop: false,
  initialCategory: props.initialCategory,
  show: toRef(props, 'show'),
  cardSelector: '.shop-item-card'
})

const close = () => {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '900px'"
    variant="retro"
    padding="raw"
    @close="close"
  >
    <!-- Cabecera Premium Unificada -->
    <template #header>
      <div class="shop-modal-header">
        <div class="shop-title-group">
          <span class="title-icon">🛒</span>
          <div class="title-text-wrap">
            <span class="main-title">POKÉ MARKET</span>
            <span class="sub-title">TIENDA DE OBJETOS</span>
          </div>
        </div>
        
        <div class="header-stats">
          <!-- Mis Créditos -->
          <div class="stat-node money">
            <span class="shop-stat-label">MIS CRÉDITOS</span>
            <span class="value">₽{{ formatCurrency(gameStore.state.money) }}</span>
          </div>

          <!-- Nivel Entrenador -->
          <div class="stat-node level">
            <span class="shop-stat-label">NIVEL ENTRENADOR</span>
            <span class="value">Nv. {{ gameStore.state.trainerLevel }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="shop-modal-container">
      <!-- Sidebar de Categorías -->
      <UnifiedSidebar
        v-model:active-category="activeTab"
        :main-tab="activeMainTab"
        :available-categories="availableCategories"
        accent-color="var(--yellow)"
      />

      <!-- Contenido Principal -->
      <div class="shop-main">
        <!-- Pestañas Principales en el modal de Tienda -->
        <div class="modal-main-tabs">
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

        <!-- Buscador de Objetos -->
        <div class="shop-search-wrapper">
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input 
              v-model="search" 
              type="text" 
              placeholder="Buscar objeto por nombre..." 
              class="shop-search-bar"
            >
          </div>
          <SortControls
            v-model="sortKey"
            v-model:sort-order="sortOrder"
          />
        </div>

        <!-- Rejilla de Objetos -->
        <div class="shop-grid-wrapper custom-scrollbar">
          <div 
            v-if="filteredItems.length > 0"
            class="shop-premium-grid"
          >
            <ShopItemCard
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
            />
          </div>

          <!-- Empty State -->
          <section
            v-else
            class="shop-empty-state"
          >
            <span class="empty-icon">🔍</span>
            <div class="empty-text">
              <h3>Sin resultados</h3>
              <p>Prueba con otros términos de búsqueda en esta sección</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

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
    color: #000000;
    font-weight: bold;
    background: var(--yellow);
    border-color: var(--yellow-light);
    box-shadow: 0 0 8px Rgba(234, 179, 8, 0.4);
    text-shadow: none;
  }
}
</style>
