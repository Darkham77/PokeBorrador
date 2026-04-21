<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

// Sub-components
import DebugStatsTab from './debug/DebugStatsTab.vue'
import DebugItemsTab from './debug/DebugItemsTab.vue'
import DebugTimeTab from './debug/DebugTimeTab.vue'
import DebugModalsTab from './debug/DebugModalsTab.vue'

const auth = useAuthStore()
const game = useGameStore()
const ui = useUIStore()

const canAccess = computed(() => {
  if (auth.sessionMode === 'offline') return true
  return auth.user?.role === 'admin'
})

function securityCheck() {
  if (auth.sessionMode === 'online' && auth.user?.role !== 'admin') {
    console.error('[SECURITY] Unauthorized debug access detected. Banning user and force logout.')
    const userId = auth.user?.id
    if (userId) {
      game.db.from('profiles').update({ 
        is_banned: true, 
        ban_reason: 'Intento de uso indebido de herramientas de debug' 
      }).eq('id', userId).then(() => {
        console.log('[SECURITY] DB Ban applied.')
      })
    }
    auth.logout()
    return false
  }
  return true
}

const isOpen = ref(false)
const selectedCategory = ref('stats')

// EXPOSE DEBUG TOOLS FOR UNIT TESTS (Secure Wrapped)
if (typeof window !== 'undefined') {
  window.__VITE_DEBUG__ = {
    game,
    ui,
    setMoney: (val) => { if (securityCheck()) game.state.money = val },
    setLevel: (val) => { if (securityCheck()) game.state.trainerLevel = val },
    setMockTime: (d) => { if (securityCheck()) game.db.setMockTime(d) },
    resetTime: () => { if (securityCheck()) game.db.resetTime() }
  }
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
      <template v-if="!isOpen">
        <span class="icon">🛠️</span>
        <span class="label">DEBUG</span>
      </template>
      <span v-else>✕</span>
    </button>

    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="debug-window"
        @wheel.stop
        @touchstart.stop
        @touchmove.stop
        @mousedown.stop
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
            v-for="cat in ['stats', 'items', 'pokes', 'time', 'modals']" 
            :key="cat"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat.toUpperCase() }}
          </button>
        </nav>

        <main 
          class="debug-content"
          @wheel.stop
        >
          <DebugStatsTab
            v-if="selectedCategory === 'stats'"
            :security-check="securityCheck"
          />
          <DebugItemsTab
            v-if="selectedCategory === 'items'"
            :security-check="securityCheck"
          />
          <DebugTimeTab
            v-if="selectedCategory === 'time'"
            :security-check="securityCheck"
          />
          <DebugModalsTab
            v-if="selectedCategory === 'modals'"
            :security-check="securityCheck"
          />
          
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-trigger {
  position: relative;
  z-index: var(--z-max);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.trigger-btn {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  font-family: 'Press Start 2P', monospace;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    transform: translateY(-2px) Scale(1.05);
    box-shadow: 0 12px 30px rgba(124, 58, 237, 0.5);
  }

  &.active {
    background: #1f1f23;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  }
}

.debug-window {
  position: absolute;
  bottom: 60px;
  left: 0;
  width: max-content;
  min-width: 340px;
  max-width: 95vw;
  @include glass-solid(rgba(15, 23, 42, 0.9));
  -webkit-backdrop-filter: Blur(25px);
  backdrop-filter: Blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
}

.debug-header {
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-family: 'Press Start 2P', monospace;
    @include pixelated;
    font-size: 10px;
    color: #fff;
    letter-spacing: 0.5px;
  }
}

.badge {
  font-size: 7px;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 800;
  text-transform: uppercase;
  font-family: 'Press Start 2P', monospace;
  @include pixelated;

  &.offline { background: rgba(52, 211, 153, 0.2); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
  &.admin { background: rgba(248, 113, 113, 0.2); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
}

.debug-nav {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  gap: 4px;

  button {
    flex: 1;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-family: 'Press Start 2P', monospace;
    @include pixelated;
    font-size: 7px;
    padding: 10px 4px;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s;

    &:hover { color: #fff; background: rgba(255, 255, 255, 0.05); }
    &.active {
      background: rgba(124, 58, 237, 0.15);
      color: #c084fc;
      box-shadow: inset 0 0 10px rgba(124, 58, 237, 0.1);
    }
  }
}

.debug-content {
  padding: 20px;
  max-height: 450px;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-family: 'Press Start 2P', monospace;
  @include pixelated;
  font-size: 7px;
  line-height: 1.6;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(30px) Scale(0.95);
  opacity: 0;
}
</style>
