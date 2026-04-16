<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social.js'
import { useRouter } from 'vue-router'

const gameStore = useGameStore()
const uiStore = useUIStore()
const socialStore = useSocialStore()
const router = useRouter()

const activeTab = computed({
  get: () => uiStore.activeTab,
  set: (val) => { uiStore.activeTab = val }
})

const migratedTabs = ['gyms', 'daycare', 'team', 'box', 'pokedex', 'bag', 'market', 'trainer-shop', 'social', 'friends', 'events', 'war']

const handleTabChange = (tab, event) => {
  activeTab.value = tab
  
  // Social Center Modal (Phase 24)
  if (['social', 'friends'].includes(tab)) {
    uiStore.toggleSocial()
    return
  }

  // Navigate if it's a route
  if (['team', 'pokedex', 'events', 'war'].includes(tab)) {
    router.push({ name: tab })
  }

  // Only call legacy showTab for non-migrated tabs to avoid DOM crashes
  if (!migratedTabs.includes(tab) && typeof window.showTab === 'function') {
    const btn = event?.target?.closest('.hud-nav-btn') || document.querySelector(`[data-tab="${tab}"]`)
    window.showTab(tab, btn)
  }
  
  if (tab === 'map' && typeof window.renderMaps === 'function') {
    setTimeout(() => {
      const mapList = document.getElementById('map-list')
      if (mapList) {
        window.renderMaps()
        setTimeout(() => {
          if (mapList.innerHTML === '') window.renderMaps()
        }, 300)
      }
    }, 50)
  }
}

const toggleGroupMenu = (event, btn) => {
  if (typeof window.toggleGroupMenu === 'function') {
    window.toggleGroupMenu(event, btn)
  }
}
</script>

<template>
  <div class="hud-nav">
    <!-- 1. MAPA -->
    <button
      class="hud-nav-btn map-btn"
      :class="{ active: activeTab === 'map' }"
      data-tab="map"
      @click="handleTabChange('map', $event)"
    >
      <span>🗺️</span><span>Mapa</span>
    </button>

    <!-- 2. POKÉMON (Grupo) -->
    <div class="hud-group">
      <button
        class="hud-nav-btn group-btn"
        @click="toggleGroupMenu($event, $event.target)"
      >
        <span>🔋</span><span>Pokémon</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'team' }"
          data-tab="team"
          @click="handleTabChange('team', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🐛</span><span>Equipo</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'box' }"
          data-tab="box"
          @click="handleTabChange('box', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>📦</span><span>Caja PC</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'pokedex' }"
          data-tab="pokedex"
          @click="handleTabChange('pokedex', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>📖</span><span>Pokédex</span>
        </button>
      </div>
    </div>

    <!-- 3. ACCESOS DIRECTOS -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'bag' }"
      data-tab="bag"
      @click="handleTabChange('bag', $event)"
    >
      <span>🎒</span><span>Mochila</span>
    </button>
    
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'gyms' }"
      data-tab="gyms"
      @click="handleTabChange('gyms', $event)"
    >
      <span>🏆</span><span>Gims</span>
    </button>

    <button
      class="hud-nav-btn relative-box"
      data-tab="daycare"
      @click="handleTabChange('daycare', $event)"
    >
      <span>🥚</span><span>Crianza</span>
      <span
        id="daycare-nav-badge"
        class="nav-badge-legacy"
      />
    </button>

    <!-- 4. MARKET (Grupo) -->
    <div class="hud-group">
      <button
        class="hud-nav-btn group-btn"
        @click="toggleGroupMenu($event, $event.target)"
      >
        <span>🏪</span><span>Market</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'online-market' }"
          data-tab="online-market"
          @click="handleTabChange('online-market', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🛒</span><span>Global</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'market' }"
          data-tab="market"
          @click="handleTabChange('market', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🏪</span><span>Tienda</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'trainer-shop' }"
          data-tab="trainer-shop"
          @click="handleTabChange('trainer-shop', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🎖️</span><span>BC</span>
        </button>
      </div>
    </div>

    <!-- 5. SOCIAL (Grupo) -->
    <div class="hud-group relative-box">
      <button
        class="hud-nav-btn group-btn"
        @click="toggleGroupMenu($event, $event.target)"
      >
        <span>👥</span><span>Social</span>
        <span
          v-if="socialStore.notifications.total"
          class="badge-pill"
        >{{ socialStore.notifications.total }}</span>
      </button>

      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'friends' }"
          data-tab="friends"
          @click="handleTabChange('friends', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🤝</span><span>Amigos</span>
          <span
            v-if="socialStore.notifications.friends || socialStore.notifications.total"
            class="dot"
          />
        </button>

        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'war' }"
          data-tab="war"
          @click="handleTabChange('war', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>⚔️</span><span>Guerra</span>
        </button>

        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'events' }"
          data-tab="events"
          @click="handleTabChange('events', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
        >
          <span>🏆</span><span>Eventos</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.badge-pill {
  position: absolute; top: 4px; right: 4px; border-radius: 50%;
  background: #ef4444; color: #fff; font-size: 8px; font-weight: 900;
  min-width: 14px; height: 14px; line-height: 14px; text-align: center;
  font-family: 'Press Start 2P', monospace; z-index: 2;
  box-shadow: 0 0 5px rgba(239, 68, 68, 0.4);
}
.dot {
  width: 6px; height: 6px; background: #ef4444; border-radius: 50%;
  margin-left: 8px; box-shadow: 0 0 4px #ef4444;
}

/* Cleanup classes */
.relative-box { position: relative; }
.nav-badge-legacy {
  display: none; position: absolute; top: 4px; right: 4px; 
  background: #ef4444; color: #fff; font-size: 8px; font-weight: 900;
  min-width: 14px; height: 14px; border-radius: 50%; padding: 0; 
  line-height: 14px; text-align: center; font-family: 'Press Start 2P', monospace; z-index: 2;
}
</style>
