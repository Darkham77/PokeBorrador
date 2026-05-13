<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import { useWindowListener } from '@/composables/useWindowListener'
import BaseModal from '@/components/common/BaseModal.vue'
import { formatCurrency } from '@/logic/utils/formatters'

// Subcomponents
import MarketExplorer from '../market/MarketExplorer.vue'
import MarketFilters from '../market/MarketFilters.vue'
import MarketPublish from '../market/MarketPublish.vue'
import MarketMyItems from '../market/MarketMyItems.vue'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const gameStore = useGameStore()
const gtsStore = useGTSStore()

const activeTab = ref('explore') // 'explore' | 'publish' | 'my_items'

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => {
  isSmallScreen.value = window.innerWidth <= 950
}
useWindowListener('resize', handleResize)

const TABS = [
  { id: 'explore', label: 'EXPLORAR', icon: '🔍' },
  { id: 'publish', label: 'PUBLICAR', icon: '🚀' },
  { id: 'my_items', label: 'MIS ITEMS', icon: '📦' }
]

onMounted(async () => {
  await Promise.all([
    gtsStore.fetchListings(),
    gtsStore.fetchUserData()
  ])
  if (authStore.sessionMode === 'online') {
    gtsStore.initRealtime()
  }
  animateGrid()
})

onUnmounted(() => {
  gtsStore.stopRealtime()
})

// GSAP Grid stagger animation
const animateGrid = () => {
  nextTick(() => {
    // 1. Target explorer cards
    const explorerCards = document.querySelectorAll('.listing-card')
    if (explorerCards.length > 0) {
      gsap.killTweensOf(explorerCards)
      gsap.fromTo(explorerCards,
        { opacity: 0, y: 12, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.25,
          stagger: 0.02,
          ease: 'power2.out',
          clearProps: 'transform,scale'
        }
      )
    }

    // 2. Target user's active publications cards
    const myCards = document.querySelectorAll('.my-listing-card')
    if (myCards.length > 0) {
      gsap.killTweensOf(myCards)
      gsap.fromTo(myCards,
        { opacity: 0, x: -15 },
        {
          opacity: 1,
          x: 0,
          duration: 0.22,
          stagger: 0.03,
          ease: 'power2.out',
          clearProps: 'transform'
        }
      )
    }
  })
}

// Watch active tab or listings change to animate items grid
watch([activeTab, () => gtsStore.listings, () => gtsStore.myListings], () => {
  animateGrid()
})

const close = () => {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '950px'"
    variant="retro"
    padding="raw"
    @close="close"
  >
    <!-- Cabecera Premium GTS -->
    <template #header>
      <div class="gts-modal-header">
        <div class="gts-title-group">
          <span class="title-icon">🛸</span>
          <div class="title-text-wrap">
            <span class="main-title">
              GLOBAL TRADE STATION
              <span
                v-if="authStore.sessionMode === 'offline'"
                class="offline-badge"
              >MERCADO LOCAL</span>
            </span>
            <span class="sub-title">MERCADO MUNDIAL DE ENTRENADORES</span>
          </div>
        </div>
        
        <div class="header-stats">
          <!-- Mis Créditos -->
          <div class="stat-node money">
            <span class="gts-stat-label">MIS CRÉDITOS</span>
            <span class="value">₽{{ formatCurrency(gameStore.state.money) }}</span>
          </div>

          <!-- Publicaciones activas -->
          <div class="stat-node listings-limit">
            <span class="gts-stat-label">PUBLICACIONES</span>
            <span class="value">{{ gtsStore.activeMyListings.length }} / {{ gtsStore.MAX_LISTINGS }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Contenedor del Modal GTS -->
    <div class="gts-modal-container">
      <!-- Sidebar de Secciones -->
      <aside class="gts-sidebar">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="cat-btn"
          :class="{ active: activeTab === tab.id }"
          @click.stop="activeTab = tab.id"
        >
          <div class="cat-icon-frame">
            <span>{{ tab.icon }}</span>
          </div>
          <span class="cat-label">{{ tab.label }}</span>
          
          <div 
            v-if="activeTab === tab.id"
            class="active-indicator"
          />
        </button>
      </aside>

      <!-- Panel Principal -->
      <div class="gts-main">
        <!-- Contenido activo del GTS -->
        <div class="gts-main-view">
          <!-- Vista de Explorar Ofertas -->
          <template v-if="activeTab === 'explore'">
            <MarketFilters context="explore" />
            <MarketExplorer />
          </template>

          <!-- Vista de Publicación de Oferta -->
          <template v-else-if="activeTab === 'publish'">
            <MarketPublish />
          </template>

          <!-- Vista de Mis Publicaciones y Ventas -->
          <template v-else-if="activeTab === 'my_items'">
            <MarketMyItems />
          </template>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
