<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWindowListener } from '@/composables/useWindowListener'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const shopStore = useShopStore() as any
const gameStore = useGameStore() as any
const uiStore = useUIStore() as any

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

const activeTab = ref('todos')
const search = ref('')

const filteredItems = computed(() => {
  return (shopStore.SHOP_ITEMS as any[]).filter(item => {
    if (item.market === false) return false
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
})

const isUnlocked = (item: any) => gameStore.state.trainerLevel >= (item.unlockLv || 1)

const buy = (item: any) => {
  if (!isUnlocked(item)) {
    uiStore.notify('¡Item bloqueado! Sube tu nivel de entrenador.', '🔒')
    return
  }
  shopStore.buyItem(item.id)
}

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}

const handleQuantityChange = (itemId: string, e: Event) => {
  if (e.target) {
    shopStore.setQuantity(itemId, Number((e.target as HTMLInputElement).value))
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    title="POKÉ MARKET"
    title-color="var(--yellow)"
    header-background="Rgba(26, 28, 46, 1)"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '900px'"
    variant="retro"
    padding="raw"
    @close="emit('close')"
  >
    <div class="shop-container">
      <aside class="sidebar">
        <nav class="categories">
          <button 
            v-for="(label, cat) in shopStore.CATEGORY_LABELS" 
            :key="cat"
            :class="{ active: activeTab === cat }"
            @click.stop="activeTab = String(cat)"
          >
            {{ label }}
          </button>
        </nav>

        <div class="player-stats">
          <div class="money">
            ₽{{ gameStore.state.money }}
          </div>
          <div class="level">
            Nv. Entrenador: {{ gameStore.state.trainerLevel }}
          </div>
        </div>
      </aside>

      <main class="content">
        <header class="content-header">
          <input 
            v-model="search" 
            type="text" 
            placeholder="Buscar objeto..." 
            class="search-bar"
          >
        </header>

        <div class="items-grid scrollbar">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="item-card"
            :class="{ locked: !isUnlocked(item) }"
          >
            <div class="item-visual">
              <img
                :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)"
                :alt="item.name"
                @error="handleImageError"
              >
              <div
                v-if="!isUnlocked(item)"
                class="lock-overlay"
              >
                <span>BLOQUEADO</span>
                <small class="m-badge-level">Nv. {{ item.unlockLv }}</small>
              </div>
            </div>

            <div class="item-info">
              <div class="name">
                {{ item.name }}
              </div>
              <div class="price">
                ₽{{ item.price }}
              </div>
              <p class="desc">
                {{ item.desc }}
              </p>
            </div>

            <div class="item-actions">
              <div class="qty-control">
                <button @click.stop="shopStore.setQuantity(item.id, shopStore.getQuantity(item.id) - 1)">
                  -
                </button>
                <input 
                  type="number" 
                  :value="shopStore.getQuantity(item.id)"
                  @change="e => handleQuantityChange(item.id, e)"
                >
                <button @click.stop="shopStore.setQuantity(item.id, shopStore.getQuantity(item.id) + 1)">
                  +
                </button>
              </div>
              <button
                class="buy-btn"
                @click.stop="buy(item)"
              >
                COMPRAR
              </button>
            </div>
          </div>

          <div
            v-if="filteredItems.length === 0"
            class="empty-state"
          >
            No se encontraron objetos.
          </div>
        </div>
      </main>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "sass:math";
@use "@/styles/core/tools" as *;

.shop-container {
  display: flex;
  height: 600px;
  max-height: 80dvh;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: Rgba(0, 0, 0, 0.2);
  border-right: 1px solid Rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 20px;

  .categories {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    button {
      text-align: left;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      color: Rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
      font-weight: 600;
      
      &:hover {
        background: Rgba(255, 255, 255, 0.03);
        color: var(--white);
      }
      
      &.active {
        background: Rgba(250, 204, 21, 0.1);
        border-color: Rgba(250, 204, 21, 0.3);
        color: var(--yellow);
      }
    }
  }

  .player-stats {
    padding-top: 20px;
    border-top: 1px solid Rgba(255, 255, 255, 0.05);
    
    .money {
      font-size: 18px;
      font-weight: 800;
      color: var(--white);
      margin-bottom: 4px;
    }
    
    .level {
      font-size: 10px;
      color: Rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.content-header {
  padding: 20px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  
  .search-bar {
    width: 100%;
    background: Rgba(0, 0, 0, 0.2);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    border-radius: 12px;
    color: white;
    outline: none;
    transition: all 0.2s;
    
    &:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 12px Rgba(250, 204, 21, 0.15);
    }
  }
}

.items-grid {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.item-card {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;

  &:hover:not(.locked) {
    background: Rgba(255, 255, 255, 0.04);
    border-color: Rgba(250, 204, 21, 0.3);
    transform: Translatey(-2px);
  }

  &.locked {
    opacity: 0.5;
    will-change: transform, filter, opacity;
  filter: Grayscale(1);
  }
}

.item-visual {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  img {
    height: 60px;
    image-rendering: pixelated;
    @include pixelated;
  }
  
  .lock-overlay {
    position: absolute;
    inset: 0;
    background: Rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    
    span {
      @include pixelated;
      font-size: 7px;
      color: Rgba(255, 85, 85, 1);
    }
    
    small {
      font-size: 9px;
      color: var(--white);
      margin-top: 4px;
    }
  }
}

.item-info {
  flex: 1;
  .name {
    font-weight: 700;
    font-size: 15px;
    color: var(--white);
    margin-bottom: 2px;
  }
  .price {
    color: var(--yellow);
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .desc {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
}

.item-actions {
  display: flex;
  gap: 8px;
  
  .qty-control {
    display: flex;
    background: Rgba(0, 0, 0, 0.2);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    overflow: hidden;
    
    button { 
      width: 28px;
      border: none;
      background: transparent;
      color: white;
      cursor: pointer;
      &:hover { background: Rgba(255, 255, 255, 0.1); }
    }
    
    input { 
      width: 32px;
      border: none;
      background: transparent;
      color: white;
      text-align: center;
      font-size: 12px;
      &::-webkit-inner-spin-button { display: none; }
    }
  }

  .buy-btn {
    flex: 1;
    @include btn-vicio-primary;
    padding: 8px;
    border-radius: 10px;
  }
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  color: Rgba(255, 255, 255, 0.2);
  font-size: 14px;
}

@media (max-width: 950px) {
  .shop-container {
    flex-direction: column;
    height: 100%;
    max-height: none;
  }

  .sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
    padding: 12px 16px;

    .categories {
      flex-direction: row;
      overflow-x: auto;
      padding-bottom: 8px;
      gap: 8px;
      
      button {
        white-space: nowrap;
        padding: 8px 12px;
      }
    }

    .player-stats {
      display: none; // Hidden on mobile to save space
    }
  }

  .items-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
}
</style>
