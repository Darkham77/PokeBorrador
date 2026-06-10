<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'


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

const shopStore = useShopStore()
const gameStore = useGameStore()

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

// Niveles superiores de categorización
const activeMainTab = ref<'productos' | 'materiales'>('productos')

const activeTab = ref('todos')
const search = ref('')

interface ShopItem {
  id: string
  name: string
  cat: string
  bcPrice?: number
  price?: number
  desc: string
  sprite: string
  unlockLv?: number
  tier?: string
  icon?: string
  trainerShop?: boolean
  market?: boolean
  showInBCShop?: boolean
  showInNormalShop?: boolean
}

const filteredItems = computed<ShopItem[]>(() => {
  return (shopStore.SHOP_ITEMS as ShopItem[]).filter(item => {
    if (!item.showInBCShop) return false

    const resolvedCat = item.cat || 'otros'
    const isMaterialCat = ['raw_material', 'refined_material', 'component'].includes(resolvedCat)
    if (activeMainTab.value === 'materiales') {
      if (!isMaterialCat) return false
    } else {
      if (isMaterialCat) return false
    }
    if (activeTab.value !== 'todos' && resolvedCat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    const aLocked = (gameStore.state.trainerLevel || 1) < (a.unlockLv || 1) ? 1 : 0
    const bLocked = (gameStore.state.trainerLevel || 1) < (b.unlockLv || 1) ? 1 : 0
    if (aLocked !== bLocked) return aLocked - bLocked
    return (a.unlockLv || 1) - (b.unlockLv || 1)
  })
})

const availableCategories = computed<string[]>(() => {
  const cats = new Set<string>()
  for (const item of (shopStore.SHOP_ITEMS as ShopItem[])) {
    if (!item.showInBCShop) continue
    cats.add(item.cat || 'otros')
  }
  return Array.from(cats)
})

// GSAP animations orchestration for item grid
const animateGrid = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.bc-shop-item-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      
      const maxAnimate = Math.min(cards.length, 24)
      const cardsToAnimate = Array.from(cards).slice(0, maxAnimate)
      const remainingCards = Array.from(cards).slice(maxAnimate)
      
      if (remainingCards.length > 0) {
        gsap.set(remainingCards, { opacity: 1, y: 0, scale: 1 })
      }
      
      gsap.fromTo(cardsToAnimate, 
        { opacity: 0, y: 15, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.2, 
          stagger: 0.01, 
          ease: 'power1.out',
          clearProps: 'transform,scale'
        }
      )
    }
  })
}

// Trigger animation on tab or search change
watch([activeTab, search], () => {
  animateGrid()
})

// Trigger on modal open and reset filters
watch(() => props.show, (val) => {
  if (val) {
    activeTab.value = 'todos'
    search.value = ''
    animateGrid()
  }
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
        <div class="shop-search-wrapper">
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input 
              v-model="search" 
              type="text" 
              placeholder="Buscar artículo exclusivo..." 
              class="shop-search-bar"
            >
          </div>
        </div>

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
