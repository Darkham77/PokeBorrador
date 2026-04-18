<script setup>
import { ref, computed } from 'vue'
import { useShopStore } from '@/stores/shopStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const activeTab = ref('todos')
const search = ref('')

const filteredItems = computed(() => {
  return shopStore.SHOP_ITEMS.filter(item => {
    // Basic availability check
    if (item.market === false) return false
    
    // Category filter
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false
    
    // Search filter
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
  <div
    class="shop-overlay"
    @click.self="uiStore.closeModal()"
  >
    <div class="shop-container animate-slide-in">
      <aside class="sidebar">
        <div class="shop-title">
          POKÉ MARKET
        </div>
        
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
          <button
            class="close-btn"
            @click="uiStore.closeModal()"
          >
            ✕
          </button>
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
                :src="item.sprite"
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
            No se encontraron objetos en esta categoría.
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.shop-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000;
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);
}

.shop-container {
  width: min(900px, 95%);
  height: min(600px, 90vh);
  background: #0f172a;
  border-radius: 24px;
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.sidebar {
  width: 200px; background: rgba(255, 255, 255, 0.02);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column; padding: 20px;

  .shop-title {
    font-family: 'Press Start 2P', cursive; font-size: 10px; color: #facc15;
    margin-bottom: 30px; text-align: center;
  }

  .categories {
    flex: 1; display: flex; flex-direction: column; gap: 8px;
    button {
      text-align: left; padding: 12px; border-radius: 12px; border: none;
      background: transparent; color: #666; cursor: pointer; transition: all 0.2s;
      font-size: 14px; font-weight: 600;
      &:hover { background: rgba(255, 255, 255, 0.03); color: #fff; }
      &.active { background: #facc15; color: #000; }
    }
  }

  .player-stats {
    padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.05);
    .money { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 5px; }
    .level { font-size: 10px; color: #666; }
  }
}

.content { flex: 1; display: flex; flex-direction: column; background: #0f172a; }

.content-header {
  padding: 20px; display: flex; gap: 15px; align-items: center;
  background: rgba(0,0,0,0.2);
  
  .search-bar {
    flex: 1; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px; border-radius: 12px; color: white; outline: none;
    &:focus { border-color: #facc15; }
  }

  .close-btn { background: none; border: none; color: #666; font-size: 24px; cursor: pointer; &:hover { color: white; } }
}

.items-grid {
  flex: 1; overflow-y: auto; padding: 20px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;
}

.item-card {
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 15px;
  transition: all 0.2s;

  &:hover:not(.locked) {
    background: rgba(255, 255, 255, 0.04); border-color: rgba(250, 204, 21, 0.3);
    transform: translateY(-4px);
  }

  &.locked { opacity: 0.6; filter: grayscale(1); }
}

.item-visual {
  height: 100px; display: flex; align-items: center; justify-content: center;
  position: relative;
  img { height: 80px; image-rendering: pixelated; }
  
  .lock-overlay {
    position: absolute; inset: 0; background: rgba(0,0,0,0.6);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border-radius: 12px;
    span { font-family: 'Press Start 2P', cursive; font-size: 8px; color: #f87171; }
    small { font-size: 10px; color: #fff; margin-top: 5px; }
  }
}

.item-info {
  flex: 1;
  .name { font-weight: 800; font-size: 16px; color: #fff; margin-bottom: 4px; }
  .price { color: #facc15; font-weight: 700; font-size: 14px; margin-bottom: 10px; }
  .desc { font-size: 12px; color: #666; line-height: 1.4; }
}

.item-actions {
  display: flex; gap: 10px;
  
  .qty-control {
    display: flex; background: rgba(255, 255, 255, 0.05); border-radius: 10px; overflow: hidden;
    button { 
      width: 30px; border: none; background: transparent; color: white; cursor: pointer;
      &:hover { background: rgba(255, 255, 255, 0.1); }
    }
    input { 
      width: 40px; border: none; background: transparent; color: white; text-align: center;
      &::-webkit-inner-spin-button { display: none; }
    }
  }

  .buy-btn {
    flex: 1; padding: 10px; border-radius: 10px; border: none;
    background: #facc15; color: #000; font-weight: 800; cursor: pointer;
    &:hover { background: #eab308; }
  }
}

.empty-state {
  grid-column: 1 / -1; text-align: center; padding: 100px; color: #444; font-size: 18px;
}

.animate-slide-in { animation: slideIn 0.3s ease-out; }
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.scrollbar::-webkit-scrollbar { width: 6px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
</style>
