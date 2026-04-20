<script setup>
import { ref, computed } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const activeTab = ref('todos')
const search = ref('')

const filteredItems = computed(() => {
  return shopStore.SHOP_ITEMS.filter(item => {
    if (item.market === false) return false
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
})

const isUnlocked = (item) => gameStore.state.trainerLevel >= (item.unlockLv || 1)

const buy = (item) => {
  if (!isUnlocked(item)) {
    uiStore.notify('¡Item bloqueado! Sube tu nivel de entrenador.', '🔒')
    return
  }
  shopStore.buyItem(item.id)
}
</script>

<template>
  <BaseModal
    :show="show"
    title="POKÉ MARKET"
    max-width="900px"
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
            @click="activeTab = cat"
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
              >
              <div
                v-if="!isUnlocked(item)"
                class="lock-overlay"
              >
                <span>BLOQUEADO</span>
                <small>Nv. {{ item.unlockLv }}</small>
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
                <button @click="shopStore.setQuantity(item.id, shopStore.getQuantity(item.id) - 1)">
                  -
                </button>
                <input 
                  type="number" 
                  :value="shopStore.getQuantity(item.id)"
                  @change="e => shopStore.setQuantity(item.id, e.target.value)"
                >
                <button @click="shopStore.setQuantity(item.id, shopStore.getQuantity(item.id) + 1)">
                  +
                </button>
              </div>
              <button
                class="buy-btn"
                @click="buy(item)"
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
@use "sass:math";
@use "@/styles/core/tools" as *;

.shop-container {
  display: flex;
  height: 600px;
  max-height: 80vh;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
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
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
      font-weight: 600;
      
      &:hover {
        background: rgba(255, 255, 255, 0.03);
        color: #fff;
      }
      
      &.active {
        background: rgba(250, 204, 21, 0.1);
        border-color: rgba(250, 204, 21, 0.3);
        color: var(--yellow);
      }
    }
  }

  .player-stats {
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    
    .money {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 4px;
    }
    
    .level {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.3);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  .search-bar {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    border-radius: 12px;
    color: white;
    outline: none;
    transition: all 0.2s;
    
    &:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 12px rgba(250, 204, 21, 0.15);
    }
  }
}

.items-grid {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.item-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;

  &:hover:not(.locked) {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(250, 204, 21, 0.3);
    transform: translateY(-2px);
  }

  &.locked {
    opacity: 0.5;
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
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    
    span {
      font-family: 'Press Start 2P', cursive;
      font-size: 7px;
      color: #ff5555;
    }
    
    small {
      font-size: 9px;
      color: #fff;
      margin-top: 4px;
    }
  }
}

.item-info {
  flex: 1;
  .name {
    font-weight: 700;
    font-size: 15px;
    color: #fff;
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
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
}

.item-actions {
  display: flex;
  gap: 8px;
  
  .qty-control {
    display: flex;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    overflow: hidden;
    
    button { 
      width: 28px;
      border: none;
      background: transparent;
      color: white;
      cursor: pointer;
      &:hover { background: rgba(255, 255, 255, 0.1); }
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
    padding: 8px;
    border-radius: 10px;
    border: none;
    background: var(--yellow);
    color: #000;
    font-weight: 700;
    font-size: 11px;
    font-family: 'Press Start 2P', cursive;
    cursor: pointer;
    @include pixelated;
    
    &:hover {
      background: #ffd60a;
      box-shadow: 0 0 15px rgba(250, 204, 21, 0.3);
    }
  }
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  color: rgba(255, 255, 255, 0.2);
  font-size: 14px;
}

/* Animations */
.scrollbar::-webkit-scrollbar { width: 4px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
</style>
