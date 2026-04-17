<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import { useUIStore } from '@/stores/ui'
import { SHOP_ITEMS } from '@/data/items'

const auth = useAuthStore()
const game = useGameStore()
const pvp = usePvPStore()
const ui = useUIStore()

// Guard de Seguridad solicitado por el usuario
const canAccess = computed(() => {
  if (auth.sessionMode === 'offline') return true
  return auth.user?.role === 'admin'
})

const isOpen = ref(false)
const selectedCategory = ref('stats')

// Stats editing
const debugMoney = ref(10000)
const debugElo = ref(1500)
const debugLevel = ref(50)

// Item search
const searchQuery = ref('')
const filteredItems = computed(() => {
  if (!searchQuery.value) return SHOP_ITEMS.slice(0, 10)
  return SHOP_ITEMS.filter(i => 
    i.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).slice(0, 15)
})

function addMoney() {
  game.state.money += debugMoney.value
  ui.notify(`Debug: +₽${debugMoney.value}`, '💰')
  game.saveGame(false)
}

function setElo() {
  pvp.elo = debugElo.value
  ui.notify(`Debug: ELO fijado en ${debugElo.value}`, '⚔️')
  // Update in DB via router
  game.db.from('profiles').update({ elo_rating: pvp.elo }).eq('id', auth.user.id)
}

async function addItem(item, qty = 10) {
  game.state.inventory[item.name] = (game.state.inventory[item.name] || 0) + qty
  ui.notify(`Debug: +${qty} ${item.name}`, item.icon || '🎒')
  await game.saveGame(false)
}

function setLevel() {
  game.state.level = debugLevel.value
  ui.notify(`Debug: Nivel fijado en ${debugLevel.value}`, '📈')
  game.saveGame(false)
}

function unlockPokedex() {
  // Logic to fill pokedex_entries for all pokemon up to Gen 3
  ui.notify('Debug: Pokedex desbloqueado (simulado)', '📖')
}
</script>

<template>
  <div
    v-if="canAccess"
    class="debug-trigger"
  >
    <button
      class="trigger-btn"
      :class="{ active: isOpen }"
      @click="isOpen = !isOpen"
    >
      <span v-if="!isOpen">🛠️ DEBUG</span>
      <span v-else>✕</span>
    </button>

    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="debug-window"
      >
        <header class="debug-header">
          <h3>PANEL DE DESARROLLO</h3>
          <p
            v-if="auth.sessionMode === 'offline'"
            class="badge offline"
          >
            MODO LOCAL
          </p>
          <p
            v-else
            class="badge admin"
          >
            MODO ADMIN ONLINE
          </p>
        </header>

        <nav class="debug-nav">
          <button 
            v-for="cat in ['stats', 'items', 'pokes']" 
            :key="cat"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat.toUpperCase() }}
          </button>
        </nav>

        <main class="debug-content">
          <!-- STATS SECTION -->
          <div
            v-if="selectedCategory === 'stats'"
            class="debug-grid"
          >
            <div class="debug-card">
              <label>Dinero</label>
              <div class="input-group">
                <input
                  v-model="debugMoney"
                  type="number"
                >
                <button @click="addMoney">
                  AÑADIR
                </button>
              </div>
            </div>

            <div class="debug-card">
              <label>ELO (Arena)</label>
              <div class="input-group">
                <input
                  v-model="debugElo"
                  type="number"
                >
                <button @click="setElo">
                  FIJAR
                </button>
              </div>
            </div>

            <div class="debug-card">
              <label>Nivel Entrenador</label>
              <div class="input-group">
                <input
                  v-model="debugLevel"
                  type="number"
                >
                <button @click="setLevel">
                  FIJAR
                </button>
              </div>
            </div>

            <button
              class="full-btn"
              @click="unlockPokedex"
            >
              DESBLOQUEAR POKEDEX
            </button>
          </div>

          <!-- ITEMS SECTION -->
          <div
            v-if="selectedCategory === 'items'"
            class="items-debug"
          >
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar item..."
              class="search-input"
            >
            <div class="items-grid scrollbar">
              <div
                v-for="item in filteredItems"
                :key="item.id"
                class="debug-item-card"
                @click="addItem(item)"
              >
                <span class="icon">{{ item.icon || '🎒' }}</span>
                <span class="name">{{ item.name }}</span>
                <span class="add">+10</span>
              </div>
            </div>
          </div>

          <!-- POKEMON SECTION -->
          <div
            v-if="selectedCategory === 'pokes'"
            class="empty-state"
          >
            <p>Selector de Pokémon Shiny/Legendarios próximamente...</p>
          </div>
        </main>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.debug-trigger {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 9999;
}

.trigger-btn {
  background: var(--purple, #BF5AF2);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  transition: all 0.2s;
  border: 2px solid rgba(255,255,255,0.2);
}

.trigger-btn.active {
  background: #333;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 14px;
}

.debug-window {
  position: absolute;
  bottom: 50px;
  right: 0;
  width: 320px;
  background: #1a1a1a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
  backdrop-filter: blur(10px);
}

.debug-header {
  padding: 15px;
  background: linear-gradient(to right, #2c2c2e, #1c1c1e);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.debug-header h3 {
  margin: 0;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  letter-spacing: 1px;
}

.badge {
  display: inline-block;
  font-size: 7px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 5px;
  font-weight: bold;
}

.badge.offline { background: #30d158; color: #000; }
.badge.admin { background: #ff453a; color: #fff; }

.debug-nav {
  display: flex;
  background: #111;
  padding: 5px;
}

.debug-nav button {
  flex: 1;
  background: transparent;
  border: none;
  color: #666;
  font-size: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
}

.debug-nav button.active {
  background: rgba(255,255,255,0.05);
  color: var(--purple-light, #EF98FF);
}

.debug-content {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.debug-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.debug-card label {
  display: block;
  font-size: 9px;
  color: #888;
  margin-bottom: 8px;
}

.input-group {
  display: flex;
  gap: 5px;
}

.input-group input {
  flex: 1;
  background: #000;
  border: 1px solid #333;
  color: #fff;
  padding: 8px;
  border-radius: 8px;
  font-size: 12px;
}

.input-group button {
  background: #333;
  border: none;
  color: #fff;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 8px;
  cursor: pointer;
}

.full-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px dashed #444;
  color: #aaa;
  border-radius: 12px;
  font-size: 8px;
  cursor: pointer;
  margin-top: 10px;
}

.search-input {
  width: 100%;
  padding: 10px;
  background: #000;
  border: 1px solid #333;
  color: #fff;
  border-radius: 10px;
  margin-bottom: 10px;
  font-size: 12px;
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 250px;
}

.debug-item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  cursor: pointer;
}

.debug-item-card:hover {
  background: rgba(255,255,255,0.08);
}

.debug-item-card .name { font-size: 11px; flex: 1; }
.debug-item-card .add { font-size: 9px; color: #30d158; font-weight: bold; }

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #555;
  font-size: 10px;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
