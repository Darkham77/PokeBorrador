<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social.js'
import { useModalStore } from '@/stores/modals'

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

const handleTabChange = (tab) => {
  const modalStore = useModalStore()
  
  if (tab === 'bag') {
    modalStore.open('Inventory')
    return
  }

  if (tab === 'market') {
    modalStore.open('Shop')
    return
  }
  
  activeTab.value = tab
  
  // Social Center Modal
  if (['social', 'friends'].includes(tab)) {
    uiStore.toggleSocial()
  }
}

const toggleGroupMenu = (name) => {
  uiStore.toggleHudGroup(name)
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
      @click="handleTabChange('map')"
    >
      <span class="icon">🗺️</span>
      <span class="label">MAPA</span>
    </button>

    <!-- 2. POKÉMON (Grupo) -->
    <div 
      class="hud-group"
      :class="{ 'is-open': uiStore.openHudGroup === 'POKEMON' }"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['team', 'box', 'pokedex'].includes(activeTab) }"
        @click="toggleGroupMenu('POKEMON')"
      >
        <span class="icon">🔋</span>
        <span class="label">POKÉMON</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'team' }"
          @click="handleTabChange('team', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">🐛</span><span class="label">EQUIPO</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'box' }"
          @click="handleTabChange('box', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">📦</span><span class="label">CAJA PC</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'pokedex' }"
          @click="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">📖</span><span class="label">POKÉDEX</span>
        </button>
      </div>
    </div>

    <!-- 3. MOCHILA -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'bag' }"
      @click="handleTabChange('bag')"
    >
      <span class="icon">🎒</span>
      <span class="label">MOCHILA</span>
    </button>
    
    <!-- 4. GIMS -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'gyms' }"
      @click="handleTabChange('gyms')"
    >
      <span class="icon">🏆</span>
      <span class="label">GIMS</span>
    </button>

    <!-- 5. CRIANZA -->
    <button
      class="hud-nav-btn relative-box"
      :class="{ active: activeTab === 'daycare' }"
      @click="handleTabChange('daycare')"
    >
      <span class="icon">🥚</span>
      <span class="label">CRIANZA</span>
      <span
        v-if="gameStore.state.eggs?.length"
        class="badge-pill"
      >{{ gameStore.state.eggs.length }}</span>
    </button>

    <!-- 6. MARKET (Grupo) -->
    <div 
      class="hud-group"
      :class="{ 'is-open': uiStore.openHudGroup === 'MARKET' }"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['online-market', 'market', 'trainer-shop'].includes(activeTab) }"
        @click="toggleGroupMenu('MARKET')"
      >
        <span class="icon">🏪</span>
        <span class="label">MARKET</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'online-market' }"
          @click="handleTabChange('online-market'); uiStore.openHudGroup = null"
        >
          <span class="icon">🛒</span><span class="label">GLOBAL</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'market' }"
          @click="handleTabChange('market'); uiStore.openHudGroup = null"
        >
          <span class="icon">🏪</span><span class="label">TIENDA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'trainer-shop' }"
          @click="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
        >
          <span class="icon">🎖️</span><span class="label">BC SHOP</span>
        </button>
      </div>
    </div>

    <!-- 7. SOCIAL (Grupo) -->
    <div 
      class="hud-group relative-box"
      :class="{ 'is-open': uiStore.openHudGroup === 'SOCIAL' }"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['friends', 'arena', 'ranking', 'war', 'events'].includes(activeTab) }"
        @click="toggleGroupMenu('SOCIAL')"
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
          @click="handleTabChange('friends'); uiStore.openHudGroup = null"
        >
          <span class="icon">🤝</span><span class="label">AMIGOS</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'arena' }"
          @click="handleTabChange('arena'); uiStore.openHudGroup = null"
        >
          <span class="icon">⚔️</span><span class="label">ARENA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'ranking' }"
          @click="handleTabChange('ranking'); uiStore.openHudGroup = null"
        >
          <span class="icon">🏅</span><span class="label">RANKING</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'war' }"
          @click="handleTabChange('war'); uiStore.openHudGroup = null"
        >
          <span class="icon">⚔️</span><span class="label">GUERRA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'events' }"
          @click="handleTabChange('events'); uiStore.openHudGroup = null"
        >
          <span class="icon">🏆</span><span class="label">EVENTOS</span>
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
    
    // GLASSMORPHISM ENHANCED
    background: linear-gradient(180deg, 
      rgba(30, 41, 59, 0.98) 0%, 
      rgba(15, 23, 42, 0.96) 100%
    );
    -webkit-backdrop-filter: blur(35px);
    backdrop-filter: blur(35px);
    
    // MULTI-LAYER REFLECTIONS & CONTRAST
    border-top: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 
      0 -10px 50px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.1); // Reflection on the top edge
    
    // Reflection parent is handled by position: fixed in parent/mobile class

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.3), 
        transparent
      );
      pointer-events: none;
    }

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

  padding: 8px 12px;
  
  .icon { font-size: 16px; }
  .label {
    font-family: 'Press Start 2P', cursive;
    font-weight: 400;
    font-size: clamp(6px, 12cqw, 8px);
    color: rgba(255, 255, 255, 0.75);
    @include pixelated;
    white-space: nowrap;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 2px var(--yellow),
      0 0 15px rgba(255, 214, 10, 0.4);
    z-index: 2;
    transform: translateY(-2px);
  }
  
  &.active {
    background: rgba(255, 204, 0, 0.15);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 2px var(--yellow),
      0 0 30px rgba(255, 214, 10, 0.45),
      inset 0 0 12px rgba(255, 214, 10, 0.1);
    z-index: 3;
    .label { 
      color: var(--yellow); 
      opacity: 1; 
      text-shadow: 0 0 8px rgba(255, 214, 10, 0.5); 
    }
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
  gap: 6px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 8px;
  z-index: 100;
  width: max-content !important;
  min-width: 0 !important;
  align-items: stretch !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  overflow: visible;

  .hud-group.is-open & { display: flex !important; }

  .pos-top & { 
    top: calc(100% + 10px); 
    left: 50%; 
    transform: translateX(-50%); 
    animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .pos-bottom & { 
    bottom: calc(100% + 10px); 
    left: 50%; 
    transform: translateX(-50%); 
    animation: slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hud-nav-btn {
    flex-direction: row !important;
    justify-content: flex-start !important;
    align-items: center !important;
    width: 100% !important;
    min-width: unset !important;
    padding: 10px 14px;
    gap: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    white-space: nowrap;
    
    &:hover { 
      background: rgba(255, 255, 255, 0.1); 
      border-color: var(--yellow);
      box-shadow: 
        0 0 0 2px var(--yellow), 
        0 0 15px rgba(255, 214, 10, 0.3);
      transform: translateX(6px);
      z-index: 2;
    }
    
    &.active {
      background: rgba(255, 204, 0, 0.12);
      border-color: var(--yellow);
      box-shadow: 
        0 0 0 2px var(--yellow), 
        0 0 25px rgba(255, 214, 10, 0.4),
        inset 0 0 10px rgba(255, 214, 10, 0.1);
    }

    .icon { font-size: 14px; }
    .label { 
      font-size: 8px; 
      color: #fff;
      white-space: nowrap;
      @include pixelated;
    }
    
    &.active .label { color: var(--yellow); }
  }
}

@keyframes slideDown {
  from { transform: translateX(-50%) translateY(-10px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateX(-50%) translateY(10px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
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
    .label { 
      font-size: 8px; 
      @include pixelated;
    }
  }
}
</style>
