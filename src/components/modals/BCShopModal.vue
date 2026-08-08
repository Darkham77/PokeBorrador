<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import ShopSearchControls from '@/components/common/ShopSearchControls.vue'


import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import BCShopItemCard from './bc-shop/BCShopItemCard.vue'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
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
  isBCShop: true,
  initialCategory: 'todos',
  show: toRef(props, 'show'),
  cardSelector: '.bc-shop-item-card'
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
    accent-color="var(--purple)"
    @close="close"
  >
    <!-- Premium Header -->
    <template #header>
      <div class="bc-shop-modal-header">
        <div class="bc-shop-title-group">
          <span class="title-icon">🎖️</span>
          <div class="title-text-wrap">
            <span class="main-title">BC SHOP</span>
            <span class="sub-title">BATTLE CLUB EXCLUSIVOS</span>
          </div>
        </div>
        
        <div class="header-stats">
          <!-- Battle Coins -->
          <div class="stat-node coins">
            <span class="shop-stat-label">MIS BATTLE COINS</span>
            <span class="value">
              <i class="fas fa-coins currency-icon-purple" />
              {{ formatCurrency(gameStore.state.battleCoins || 0) }}
            </span>
          </div>

          <!-- Trainer Level -->
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
        accent-color="#c084fc"
      />

      <!-- Main Content Area -->
      <div class="shop-main">
        <!-- Pestañas Principales en el modal de Tienda BC -->
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

        <!-- Object Search Bar -->
        <ShopSearchControls
          v-model:search="search"
          v-model:sort-key="sortKey"
          v-model:sort-order="sortOrder"
          placeholder="Buscar artículo exclusivo..."
          accent-color="#c084fc"
        >
          <template #price-icon>
            <!-- Coin stack SVG — same technique as the star, no FA dependency -->
            <!-- // no-magic -->
            <svg
              viewBox="0 0 24 24"
              class="w-4 h-4 text-emerald-400 shrink-0"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Bottom coin -->
              <ellipse
                cx="12"
                cy="17"
                rx="8"
                ry="3"
                opacity="0.7"
              />
              <!-- Middle coin -->
              <ellipse
                cx="12"
                cy="13"
                rx="8"
                ry="3"
                opacity="0.85"
              />
              <!-- Top coin -->
              <ellipse
                cx="12"
                cy="9"
                rx="8"
                ry="3"
              />
              <!-- Vertical sides connecting coins -->
              <rect
                x="4"
                y="9"
                width="16"
                height="4"
                opacity="0"
              />
            </svg>
          </template>
        </ShopSearchControls>

        <!-- Items Grid -->
        <div class="bc-shop-grid-wrapper custom-scrollbar">
          <div 
            v-if="filteredItems.length > 0"
            class="bc-shop-premium-grid"
          >
            <BCShopItemCard
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
            />
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="shop-empty-state"
          >
            <span class="empty-icon">🔍</span>
            <div class="empty-text">
              <h3>Sin resultados</h3>
              <p>Prueba con otros términos de búsqueda en esta sección</p>
            </div>
          </div>
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
    color: var(--white);
    background: var(--purple);
    border-color: var(--purple-light);
    box-shadow: 0 0 8px Rgba(168, 85, 247, 0.4);
    text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  }
}
</style>
