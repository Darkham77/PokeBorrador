<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import ShopSearchControls from '@/components/common/ShopSearchControls.vue'
import ReputationShopItemCard from './reputation-shop/ReputationShopItemCard.vue'
import { getItemById } from '@/data/inventory/items'

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
const uiStore = useUIStore()

const isSmallScreen = computed(() => uiStore.isSmallScreen)

interface ReputationShopItem {
  id: string
  repCost: number
  givesId: string
  givesQty: number
  tier: 'common' | 'rare' | 'epic' | 'legend'
  cat: string
}

function resolveItemName(item: ReputationShopItem): string {
  const catalogItem = getItemById(item.givesId)
  return catalogItem.name
}

function resolveItemDesc(item: ReputationShopItem): string {
  const catalogItem = getItemById(item.givesId)
  if (!catalogItem.desc) {
    throw new Error(`El objeto '${item.givesId}' de la Tienda de Reputación no tiene descripción configurada en el catálogo.`)
  }
  return catalogItem.desc
}

function resolveItemSprite(item: ReputationShopItem): string {
  const catalogItem = getItemById(item.givesId)
  if (!catalogItem.sprite) {
    throw new Error(`El objeto '${item.givesId}' de la Tienda de Reputación no tiene sprite configurado en el catálogo.`)
  }
  return catalogItem.sprite
}

const REPUTATION_SHOP_ITEMS: ReputationShopItem[] = [
  {
    id: 'repultraball',
    repCost: 15,
    givesId: 'ultraball',
    givesQty: 3,
    tier: 'rare',
    cat: 'pokeballs'
  },
  {
    id: 'reptmearthquake',
    repCost: 50,
    givesId: 'tm26',
    givesQty: 1,
    tier: 'legend',
    cat: 'tms'
  },
  {
    id: 'reprevive',
    repCost: 20,
    givesId: 'revive',
    givesQty: 5,
    tier: 'epic',
    cat: 'potions'
  },
  {
    id: 'repfullheal',
    repCost: 15,
    givesId: 'fullheal',
    givesQty: 3,
    tier: 'rare',
    cat: 'potions'
  },
  {
    id: 'repivscanner',
    repCost: 40,
    givesId: 'ivscanner',
    givesQty: 1,
    tier: 'epic',
    cat: 'tools'
  },
  {
    id: 'repstarpiece',
    repCost: 30,
    givesId: 'starpiece',
    givesQty: 3,
    tier: 'rare',
    cat: 'otros'
  }
]

const reputation = computed(() => {
  return Number(gameStore.state.classData?.reputation) || 0
})

const activeTab = ref('todos')
const search = ref('')
const sortKey = ref<'name' | 'price' | 'rarity'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

const filteredItems = computed<(ReputationShopItem & { name: string; desc: string; sprite: string })[]>(() => {
  const items = REPUTATION_SHOP_ITEMS.filter(item => {
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    if (search.value && !resolveItemName(item).toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  }).map(item => ({
    ...item,
    name: resolveItemName(item),
    desc: resolveItemDesc(item),
    sprite: resolveItemSprite(item),
  }))

  return [...items].sort((a, b) => {
    let comp = 0
    if (sortKey.value === 'price') {
      comp = (a.repCost || 0) - (b.repCost || 0)
    } else if (sortKey.value === 'rarity') {
      const tiers: Record<string, number> = { common: 0, rare: 1, epic: 2, legend: 3 }
      const aT = tiers[a.tier || 'common'] ?? 0
      const bT = tiers[b.tier || 'common'] ?? 0
      comp = bT - aT
    } else {
      comp = a.name.localeCompare(b.name)
    }
    return sortOrder.value === 'asc' ? comp : -comp
  })
})

const availableCategories = computed<string[]>(() => {
  const cats = new Set<string>()
  for (const item of REPUTATION_SHOP_ITEMS) {
    cats.add(item.cat)
  }
  return Array.from(cats)
})

const animateGrid = () => {
  nextTick(() => {
    // [PureVue-Ignore] — direct DOM query required by GSAP to animate dynamic card list
    const cards = document.querySelectorAll('.rep-shop-item-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.fromTo(cards, 
        { opacity: 0, y: 15, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.2, 
          stagger: 0.02, 
          ease: 'power1.out',
          clearProps: 'transform,scale'
        }
      )
    }
  })
}

watch([activeTab, search], () => {
  animateGrid()
})

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
    accent-color="#3b82f6"
    @close="close"
  >
    <!-- Header -->
    <template #header>
      <div class="rep-shop-modal-header">
        <div class="rep-shop-title-group">
          <span class="title-icon">🎖️</span>
          <div class="title-text-wrap">
            <span class="main-title">TIENDA DE REPUTACIÓN</span>
            <span class="sub-title">EXCLUSIVO PARA EL ENTRENADOR DE RUTA</span>
          </div>
        </div>
        
        <div class="header-stats">
          <div class="stat-node reputation">
            <span class="shop-stat-label">MI REPUTACIÓN</span>
            <span class="value">
              <span class="rep-star-icon">★</span>
              {{ reputation }}
            </span>
          </div>

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
        main-tab="productos"
        :available-categories="availableCategories"
        accent-color="#3b82f6"
      />

      <!-- Contenido Principal -->
      <div class="shop-main">
        <!-- Buscador de Objetos -->
        <ShopSearchControls
          v-model:search="search"
          v-model:sort-key="sortKey"
          v-model:sort-order="sortOrder"
          placeholder="Buscar objeto por reputación..."
          accent-color="#3b82f6"
        >
          <template #price-icon>
            <!-- Center star vertically using SVG -->
            <svg
              viewBox="0 0 24 24"
              style="width: 10px; height: 10px; display: block;"
              fill="currentColor"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </template>
        </ShopSearchControls>

        <!-- Rejilla de Objetos -->
        <div class="rep-shop-grid-wrapper custom-scrollbar">
          <div 
            v-if="filteredItems.length > 0"
            class="rep-shop-premium-grid"
          >
            <ReputationShopItemCard
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
            <span class="empty-text">
              <h3>Sin resultados</h3>
              <p>Prueba con otros términos de búsqueda en esta sección</p>
            </span>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
</style>
