<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemTierLabel, getItemTierColor } from '@/logic/utils/itemTierResolver'

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
  name: string
  repCost: number
  desc: string
  sprite: string
  givesId: string
  givesQty: number
  tier: 'common' | 'rare' | 'epic' | 'legend'
  cat: string
}

const REPUTATION_SHOP_ITEMS: ReputationShopItem[] = [
  {
    id: 'rep_ultra_ball',
    name: 'Ultra Ball x3',
    repCost: 15,
    desc: 'Otorga 3x Ultra Ball. Excelente ratio de captura.',
    sprite: 'crafting/tier3/ultra_ball',
    givesId: 'ultra_ball',
    givesQty: 3,
    tier: 'rare',
    cat: 'pokeballs'
  },
  {
    id: 'rep_tm_earthquake',
    name: 'MT26 Terremoto',
    repCost: 50,
    desc: 'Otorga el movimiento Terremoto (MT26). Tipo Tierra devastador.',
    sprite: 'crafting/tier3/tm_ground',
    givesId: 'tm26',
    givesQty: 1,
    tier: 'legend',
    cat: 'tms'
  },
  {
    id: 'rep_revive',
    name: 'Revivir x5',
    repCost: 20,
    desc: 'Otorga 5x Revivir. Revive y cura un 50% de los PS máximos.',
    sprite: 'crafting/tier3/revive',
    givesId: 'revive',
    givesQty: 5,
    tier: 'epic',
    cat: 'potions'
  },
  {
    id: 'rep_full_heal',
    name: 'Cura Total x3',
    repCost: 15,
    desc: 'Otorga 3x Cura Total. Cura cualquier problema de estado.',
    sprite: 'crafting/tier3/full_heal',
    givesId: 'full_heal',
    givesQty: 3,
    tier: 'rare',
    cat: 'potions'
  },
  {
    id: 'rep_iv_scanner',
    name: 'Escáner de IVs',
    repCost: 40,
    desc: 'Consumible (1 hora). Muestra el IV total del Pokémon enemigo salvaje en combate.',
    sprite: 'crafting/tier3/poke_radar',
    givesId: 'iv_scanner',
    givesQty: 1,
    tier: 'epic',
    cat: 'tools'
  },
  {
    id: 'rep_star_piece',
    name: 'Trozo Estrella x3',
    repCost: 30,
    desc: 'Otorga 3x Trozo Estrella. Valioso mineral que se vende caro en la tienda.',
    sprite: 'crafting/tier0/star_piece',
    givesId: 'star_piece',
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

const filteredItems = computed<ReputationShopItem[]>(() => {
  return REPUTATION_SHOP_ITEMS.filter(item => {
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
})

const availableCategories = computed<string[]>(() => {
  const cats = new Set<string>()
  for (const item of REPUTATION_SHOP_ITEMS) {
    cats.add(item.cat)
  }
  return Array.from(cats)
})

const buy = async (item: ReputationShopItem) => {
  if (gameStore.state.playerClass !== 'entrenador') {
    uiStore.notify('Solo los Entrenadores pueden comprar en esta tienda.', '🔒')
    return
  }

  if (reputation.value < item.repCost) {
    uiStore.notify('No tienes suficiente Reputación.', '⚠️')
    return
  }

  // Deduct cost and add reward
  if (!gameStore.state.classData) {
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: { date: '', items: [], purchased: [] }
    }
  }
  gameStore.state.classData.reputation = reputation.value - item.repCost

  if (!gameStore.state.inventory) {
    gameStore.state.inventory = {}
  }
  gameStore.state.inventory[item.givesId] = (gameStore.state.inventory[item.givesId] || 0) + item.givesQty

  // Extra handling for Poke Balls
  if (item.givesId === 'ultra_ball') {
    gameStore.state.balls = (gameStore.state.balls || 0) + item.givesQty
  }

  // Chiptune/audio notification
  try {
    const audioStore = await import('@/stores/audio').then(m => m.useAudioStore())
    audioStore.victoryTrainer ? audioStore.victoryTrainer() : null
  } catch (e) {
    console.error('Audio trigger error:', e)
  }

  uiStore.notify(`¡Canjeaste ${item.name}!`, '🏆')
  gameStore.scheduleSave()
}

const animateGrid = () => {
  nextTick(() => {
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

    <div class="rep-shop-modal-container">
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
        <div class="shop-search-wrapper">
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input 
              v-model="search" 
              type="text" 
              placeholder="Buscar objeto por reputación..." 
              class="shop-search-bar"
            >
          </div>
        </div>

        <!-- Rejilla de Objetos -->
        <div class="rep-shop-grid-wrapper custom-scrollbar">
          <div 
            v-if="filteredItems.length > 0"
            class="rep-shop-premium-grid"
          >
            <div 
              v-for="item in filteredItems" 
              :key="item.id"
              class="rep-shop-item-card"
              :class="['tier-' + item.tier, { 'insufficient-funds': reputation < item.repCost }]"
              :style="{ '--tier-color': getItemTierColor(item.tier) }"
            >
              <!-- Tier Tag -->
              <span
                class="tier-tag"
                :class="'tier-' + item.tier"
              >
                {{ getItemTierLabel(item.tier) }}
              </span>

              <div class="item-card-top">
                <div class="item-visual-box">
                  <img
                    :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
                    :alt="item.name"
                    @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                  >
                </div>

                <div class="item-meta-box">
                  <h4 class="item-name">
                    {{ item.name }}
                  </h4>
                  <div class="item-price-wrapper rep-price">
                    <span class="rep-star-icon">★</span>
                    <span class="price-val">{{ item.repCost }} REP</span>
                  </div>
                </div>
              </div>

              <p class="item-desc">
                {{ item.desc }}
              </p>

              <div class="item-actions">
                <button
                  class="btn-vicio-info btn-vicio-sm w-full"
                  :disabled="reputation < item.repCost"
                  @click.stop="buy(item)"
                >
                  {{ reputation >= item.repCost ? 'CANJEAR' : 'SIN REPUTACIÓN' }}
                </button>
              </div>
            </div>
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

.rep-shop-modal-container {
  height: 65dvh;
  max-height: 650px;
}
</style>
