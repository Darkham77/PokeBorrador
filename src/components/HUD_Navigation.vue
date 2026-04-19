<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social.js'

const props = defineProps({
  position: { type: String, default: 'top' } // 'top' or 'bottom'
})

const gameStore = useGameStore()
const uiStore = useUIStore()
const socialStore = useSocialStore()
const _router = useRouter()

const activeTab = computed({
  get: () => uiStore.activeTab,
  set: (val) => { uiStore.activeTab = val }
})

const migratedTabs = ['gyms', 'daycare', 'team', 'box', 'pokedex', 'bag', 'market', 'trainer-shop', 'social', 'friends', 'events', 'war', 'arena', 'ranking']

const handleTabChange = (tab, event) => {
  // Navigation blocks
  if (tab === 'bag') {
    uiStore.isInventoryOpen = true
    return
  }
  
  activeTab.value = tab
  
  // Social Center Modal
  if (['social', 'friends'].includes(tab)) {
    uiStore.toggleSocial()
    return
  }

  // Legacy tab sync
  if (!migratedTabs.includes(tab) && typeof window.showTab === 'function') {
    const btn = event?.target?.closest('.hud-nav-btn')
    window.showTab(tab, btn)
  }
  
  if (tab === 'map' && typeof window.renderMaps === 'function') {
    setTimeout(() => {
      if (document.getElementById('map-list')) window.renderMaps()
    }, 50)
  }
}

const toggleGroupMenu = (event) => {
  const group = event.target.closest('.hud-group')
  if (!group) return
  
  // Close others
  document.querySelectorAll('.hud-group').forEach(el => {
    if (el !== group) el.classList.remove('is-open')
  })
  
  group.classList.toggle('is-open')
}
</script>

<template>
  <div
    class="hud-nav"
    :class="[`pos-${position}`]"
  >
    <!-- 1. MAPA -->
    <button
      class="hud-nav-btn map-btn"
      :class="{ active: activeTab === 'map' }"
      data-tab="map"
      @click="handleTabChange('map', $event)"
    >
      <span class="icon">🗺️</span>
      <span class="label">MAPA</span>
    </button>

    <!-- 2. POKÉMON (Grupo) -->
    <div class="hud-group">
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['team', 'box', 'pokedex'].includes(activeTab) }"
        @click="toggleGroupMenu($event)"
      >
        <span class="icon">🔋</span>
        <span class="label">POKÉMON</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'team' }"
          @click="handleTabChange('team', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🐛</span><span>EQUIPO</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'box' }"
          @click="handleTabChange('box', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>📦</span><span>CAJA PC</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'pokedex' }"
          @click="handleTabChange('pokedex', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>📖</span><span>POKÉDEX</span>
        </button>
      </div>
    </div>

    <!-- 3. MOCHILA -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'bag' }"
      @click="handleTabChange('bag', $event)"
    >
      <span class="icon">🎒</span>
      <span class="label">MOCHILA</span>
    </button>
    
    <!-- 4. GIMS -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'gyms' }"
      @click="handleTabChange('gyms', $event)"
    >
      <span class="icon">🏆</span>
      <span class="label">GIMS</span>
    </button>

    <!-- 5. CRIANZA -->
    <button
      class="hud-nav-btn relative-box"
      :class="{ active: activeTab === 'daycare' }"
      @click="handleTabChange('daycare', $event)"
    >
      <span class="icon">🥚</span>
      <span class="label">CRIANZA</span>
      <span
        v-if="gameStore.state.eggs?.length"
        class="badge-pill"
      >{{ gameStore.state.eggs.length }}</span>
    </button>

    <!-- 6. MARKET (Grupo) -->
    <div class="hud-group">
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['online-market', 'market', 'trainer-shop'].includes(activeTab) }"
        @click="toggleGroupMenu($event)"
      >
        <span class="icon">🏪</span>
        <span class="label">MARKET</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'online-market' }"
          @click="handleTabChange('online-market', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🛒</span><span>GLOBAL</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'market' }"
          @click="handleTabChange('market', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🏪</span><span>TIENDA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'trainer-shop' }"
          @click="handleTabChange('trainer-shop', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🎖️</span><span>BC SHOP</span>
        </button>
      </div>
    </div>

    <!-- 7. SOCIAL (Grupo) -->
    <div class="hud-group relative-box">
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['friends', 'arena', 'ranking', 'war', 'events'].includes(activeTab) }"
        @click="toggleGroupMenu($event)"
      >
        <span class="icon">👥</span>
        <span class="label">SOCIAL</span>
        <span
          v-if="socialStore.notifications.total"
          class="badge-pill"
        >{{ socialStore.notifications.total }}</span>
      </button>

      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'friends' }"
          @click="handleTabChange('friends', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🤝</span><span>AMIGOS</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'arena' }"
          @click="handleTabChange('arena', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>⚔️</span><span>ARENA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'ranking' }"
          @click="handleTabChange('ranking', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🏅</span><span>RANKING</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'war' }"
          @click="handleTabChange('war', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>⚔️</span><span>GUERRA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'events' }"
          @click="handleTabChange('events', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🏆</span><span>EVENTOS</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hud-nav {
  display: flex;
  gap: 8px;
  align-items: center;
  
  &.pos-bottom {
    justify-content: space-around;
    width: 100%;
    height: 70px;
    padding: 0 10px;
    background: linear-gradient(to top, rgba(10, 12, 20, 0.98), rgba(22, 26, 46, 0.95));
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);

    .hud-nav-btn {
      flex-direction: column;
      gap: 4px;
      min-width: 50px;
    }
  }
}

.hud-nav-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 8px 12px;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 60px;
  transition: all 0.2s;
  position: relative;

  .icon { font-size: 16px; }
  .label { font-family: 'Press Start 2P', monospace; font-size: 7px; opacity: 0.8; }

  &:hover {
    background: rgba(255,255,255,0.1);
    border-color: var(--yellow);
  }

  &.active {
    background: rgba(255, 204, 0, 0.1);
    border-color: var(--yellow);
    box-shadow: 0 0 10px rgba(255, 204, 0, 0.2);
    .label { color: var(--yellow); opacity: 1; }
  }
}

.hud-group {
  position: relative;
  
  &.is-open .hud-submenu {
    display: flex;
  }
}

.hud-submenu {
  display: none;
  position: absolute;
  flex-direction: column;
  gap: 4px;
  background: rgba(20,20,20,0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 8px;
  z-index: 100;
  min-width: 140px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);

  .pos-top & { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
  .pos-bottom & { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }

  .hud-nav-btn {
    flex-direction: row;
    justify-content: flex-start;
    width: 100%;
    padding: 10px 16px;
    gap: 12px;
    background: transparent;
    border: none;
    
    &:hover { background: rgba(255,255,255,0.05); }
    .label { font-size: 8px; }
  }
}

.badge-pill {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 4px 6px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.relative-box { position: relative; }

@media (max-width: 768px) {
  .hud-nav-btn {
    min-width: 50px;
    padding: 6px 4px;
    .label { font-size: 6px; }
  }
}
</style>
