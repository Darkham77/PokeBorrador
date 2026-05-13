<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useWindowListener } from '@/composables/useWindowListener'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'

// Sub-components
import BCShopSidebar from './bc-shop/BCShopSidebar.vue'
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

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

const activeTab = ref('todos')
const search = ref('')

interface ShopItem {
  id: string
  name: string
  cat: string
  bcPrice?: number
  desc: string
  sprite: string
  unlockLv?: number
  tier?: string
  icon?: string
  trainerShop?: boolean
}

const filteredItems = computed<ShopItem[]>(() => {
  return (shopStore.SHOP_ITEMS as ShopItem[]).filter(item => {
    if (!item.trainerShop) return false
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    const aLocked = (gameStore.state.trainerLevel || 1) < (a.unlockLv || 1) ? 1 : 0
    const bLocked = (gameStore.state.trainerLevel || 1) < (b.unlockLv || 1) ? 1 : 0
    if (aLocked !== bLocked) return aLocked - bLocked
    return (a.unlockLv || 1) - (b.unlockLv || 1)
  })
})

// GSAP animations orchestration for item grid
const animateGrid = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.bc-shop-item-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.fromTo(cards, 
        { opacity: 0, y: 15, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.3, 
          stagger: 0.03, 
          ease: 'power2.out',
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
    @close="close"
  >
    <!-- Premium Header -->
    <template #header>
      <div class="bc-shop-modal-header">
        <div class="shop-title-group">
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
            <span class="value">🪙 {{ formatCurrency(gameStore.state.battleCoins || 0) }}</span>
          </div>

          <!-- Trainer Level -->
          <div class="stat-node level">
            <span class="shop-stat-label">NIVEL ENTRENADOR</span>
            <span class="value">Nv. {{ gameStore.state.trainerLevel }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="bc-shop-modal-container">
      <!-- Categories Sidebar -->
      <BCShopSidebar v-model:active-category="activeTab" />

      <!-- Main Content Area -->
      <div class="shop-main">
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
