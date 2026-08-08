<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useUIStore } from '@/stores/ui'
import { useWarStore } from '@/stores/war'
import { SHOP_ITEMS } from '@/data/inventory/items'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import ShopSearchControls from '@/components/common/ShopSearchControls.vue'
import WarShopItemCard from './WarShopItemCard.vue'

import type { ShopItem } from '@/types/inventory/items'

const uiStore = useUIStore()
const warStore = useWarStore()
const gameStore = useGameStore()

const WAR_SHOP_CARD_INITIAL_OPACITY = 0;
const WAR_SHOP_CARD_INITIAL_Y_OFFSET = 15;
const WAR_SHOP_CARD_INITIAL_SCALE = 0.95;

const WAR_SHOP_GRID_ANIM_STAGGER_SEC = 0.02

const isOpen = computed({
  get: () => uiStore.isWarShopOpen,
  set: (val: boolean) => { uiStore.isWarShopOpen = val }
})

const isSmallScreen = computed(() => uiStore.isSmallScreen)

const activeTab = ref('todos')
const search = ref('')
const sortKey = ref<'name' | 'price' | 'rarity'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

const filteredItems = computed<ShopItem[]>(() => {
  const coins = warStore.warCoins || 0
  const trainerLevel = gameStore.state.trainerLevel || 1

  const items = (SHOP_ITEMS as readonly ShopItem[]).filter(item => { // domain-ok
    if (!item.showInWarShop) return false
    const resolvedCat = item.cat || 'otros'
    if (activeTab.value !== 'todos' && resolvedCat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })

  return [...items].sort((a, b) => {
    let comp = 0
    if (sortKey.value === 'price') {
      comp = (a.warPrice || 0) - (b.warPrice || 0)
    } else if (sortKey.value === 'rarity') {
      const tiers: Record<string, number> = { common: 0, rare: 1, epic: 2, legend: 3 }
      const aT = tiers[a.tier || 'common'] ?? 0
      const bT = tiers[b.tier || 'common'] ?? 0
      comp = bT - aT
    } else {
      // Default auto sorting (by unlock level and affordability if not overridden)
      const aUnlocked = trainerLevel >= (a.unlockLv || 1)
      const bUnlocked = trainerLevel >= (b.unlockLv || 1)
      const aAffordable = coins >= (a.warPrice || 0)
      const bAffordable = coins >= (b.warPrice || 0)

      const aCanBuy = aUnlocked && aAffordable
      const bCanBuy = bUnlocked && bAffordable

      if (aCanBuy !== bCanBuy) {
        comp = aCanBuy ? -1 : 1
      } else if (aUnlocked !== bUnlocked) {
        comp = aUnlocked ? -1 : 1
      } else if ((a.unlockLv || 1) !== (b.unlockLv || 1)) {
        comp = (a.unlockLv || 1) - (b.unlockLv || 1)
      } else {
        comp = (a.warPrice || 0) - (b.warPrice || 0)
      }
    }
    return sortOrder.value === 'asc' ? comp : -comp
  })
})

const availableCategories = computed<string[]>(() => {
  const cats = new Set<string>()
  for (const item of (SHOP_ITEMS as readonly ShopItem[])) { // domain-ok
    if (!item.showInWarShop) continue
    cats.add(item.cat || 'otros')
  }
  return Array.from(cats)
})

const animateGrid = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.war-shop-item-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.fromTo(cards, 
        { opacity: WAR_SHOP_CARD_INITIAL_OPACITY, y: WAR_SHOP_CARD_INITIAL_Y_OFFSET, scale: WAR_SHOP_CARD_INITIAL_SCALE },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.2, 
          stagger: WAR_SHOP_GRID_ANIM_STAGGER_SEC, 
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

watch(() => isOpen.value, (val) => {
  if (val) {
    activeTab.value = 'todos'
    search.value = ''
    animateGrid()
  }
})

const closeWarShop = () => {
  isOpen.value = false
}

// Shim for legacy code
if (typeof window !== 'undefined') {
  Reflect.set(window, 'showWarShop', () => {
    isOpen.value = true
  })
  Reflect.set(window, 'closeWarShop', () => {
    isOpen.value = false
  })
  Reflect.set(window, 'renderWarShop', () => {
    // No-op, Vue handles reactivity
  })
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '900px'"
    variant="retro"
    padding="raw"
    accent-color="#ef4444"
    header-background="rgba(20, 10, 10, 0.9)"
    @close="closeWarShop"
  >
    <!-- Premium Header -->
    <template #header>
      <div class="war-shop-modal-header">
        <div class="war-shop-title-group">
          <span class="title-icon">🚩</span>
          <div class="title-text-wrap">
            <span class="main-title">TIENDA DE GUERRA</span>
            <span class="sub-title">CANJE DE MONEDAS FACCIONARIAS</span>
          </div>
        </div>
        
        <div class="header-stats">
          <!-- Monedas -->
          <div class="stat-node coins">
            <span class="shop-stat-label">MIS MONEDAS</span>
            <span class="value">
              <i class="fa-solid fa-bolt-lightning currency-icon-red" />
              {{ warStore.warCoins }}
            </span>
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
        main-tab="productos"
        :available-categories="availableCategories"
        accent-color="#ef4444"
      />

      <!-- Contenido Principal -->
      <div class="shop-main">
        <!-- Buscador de Objetos -->
        <ShopSearchControls
          v-model:search="search"
          v-model:sort-key="sortKey"
          v-model:sort-order="sortOrder"
          placeholder="Buscar artículo de guerra..."
          accent-color="#ef4444"
        >
          <template #price-icon>
            <i
              class="fa-solid fa-bolt-lightning sort-label"
              style="font-size: 8px; line-height: 1; color: #ef4444;"
            />
          </template>
        </ShopSearchControls>

        <!-- Rejilla de Objetos -->
        <div class="shop-grid-wrapper custom-scrollbar">
          <!-- Hint Message Banner -->
          <div class="war-shop-hint-banner">
            <span class="info-icon">ℹ️</span>
            <span class="hint-text">Gana monedas participando en la Dominancia de Kanto.</span>
          </div>

          <div 
            v-if="filteredItems.length > 0"
            class="shop-premium-grid"
          >
            <WarShopItemCard
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
.war-shop-hint-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: Rgba(239, 68, 68, 0.05);
  border: 1px solid Rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  margin-bottom: 16px;
  
  .info-icon {
    color: #ef4444;
    font-size: 14px;
    display: flex;
    align-items: center;
  }
  
  .hint-text {
    font-size: 11px;
    color: #cbd5e1;
    font-style: italic;
  }
}
</style>
