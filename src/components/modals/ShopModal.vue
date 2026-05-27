<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useWindowListener } from '@/composables/useWindowListener'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'

// Sub-components
import ShopSidebar from './shop/ShopSidebar.vue'
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

const shopStore = useShopStore()
const gameStore = useGameStore()

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

const activeTab = ref(props.initialCategory || 'todos')
const search = ref('')

interface ShopItem {
  id: string
  name: string
  cat: string
  price: number
  desc: string
  sprite: string
  unlockLv?: number
  market?: boolean
}

const filteredItems = computed<ShopItem[]>(() => {
  return (shopStore.SHOP_ITEMS as ShopItem[]).filter(item => {
    if (item.market === false) return false
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
})

// Orquestación de animaciones GSAP para la rejilla de objetos
const animateGrid = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.shop-item-card')
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

// Disparar animación al cambiar de pestaña o buscar
watch([activeTab, search], () => {
  animateGrid()
})

// Disparar al abrir el modal y resetear filtros
watch(() => props.show, (val) => {
  if (val) {
    activeTab.value = props.initialCategory || 'todos'
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
      <ShopSidebar v-model:active-category="activeTab" />

      <!-- Contenido Principal -->
      <div class="shop-main">
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
