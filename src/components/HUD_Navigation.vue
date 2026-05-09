<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social'
import { useModalStore } from '@/stores/modals'

interface Props {
  position?: string
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top'
})

const gameStore = useGameStore()
const uiStore = useUIStore()
const socialStore = useSocialStore()

const activeTab = computed({
  get: () => uiStore.activeTab,
  set: (val: string) => { uiStore.activeTab = val }
})

const handleTabChange = (tab: string, _event?: Event) => {
  const modalStore = useModalStore()
  
  if (tab === 'bag') {
    modalStore.open('Inventory')
    return
  }

  if (tab === 'market') {
    modalStore.open('Shop')
    return
  }

  if (tab === 'team') {
    modalStore.open('TeamManagement')
    return
  }
  
  activeTab.value = tab
  
  // Social Center Modal
  if (['social', 'friends'].includes(tab)) {
    uiStore.toggleSocial()
  }
}

const toggleGroupMenu = (name: string) => {
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
      @click.stop="handleTabChange('map')"
    >
      <span class="icon">🗺️</span>
      <span class="nav-item-label">MAPA</span>
    </button>

    <!-- 2. POKÉMON (Grupo) -->
    <div 
      class="hud-group"
      :class="{ 'is-open': uiStore.openHudGroup === 'POKEMON' }"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['team', 'box', 'pokedex'].includes(activeTab) }"
        @click.stop="toggleGroupMenu('POKEMON')"
      >
        <span class="icon">🔋</span>
        <span class="nav-item-label">POKÉMON</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'team' }"
          @click.stop="handleTabChange('team', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">🐛</span><span class="nav-item-label">EQUIPO</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'box' }"
          @click.stop="handleTabChange('box', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">📦</span><span class="nav-item-label">CAJA PC</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'pokedex' }"
          @click.stop="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">📖</span><span class="nav-item-label">POKÉDEX</span>
        </button>
      </div>
    </div>

    <!-- 3. MOCHILA -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'bag' }"
      @click.stop="handleTabChange('bag')"
    >
      <span class="icon">🎒</span>
      <span class="nav-item-label">MOCHILA</span>
    </button>
    
    <!-- 4. GIMS -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'gyms' }"
      @click.stop="handleTabChange('gyms')"
    >
      <span class="icon">🏆</span>
      <span class="nav-item-label">GIMS</span>
    </button>

    <!-- 5. CRIANZA -->
    <button
      class="hud-nav-btn relative-box"
      :class="{ active: activeTab === 'daycare' }"
      @click.stop="handleTabChange('daycare')"
    >
      <span class="icon">🥚</span>
      <span class="nav-item-label">CRIANZA</span>
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
        @click.stop="toggleGroupMenu('MARKET')"
      >
        <span class="icon">🏪</span>
        <span class="nav-item-label">MARKET</span>
      </button>
      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'online-market' }"
          @click.stop="handleTabChange('online-market'); uiStore.openHudGroup = null"
        >
          <span class="icon">🌎</span><span class="nav-item-label">GLOBAL</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'market' }"
          @click.stop="handleTabChange('market'); uiStore.openHudGroup = null"
        >
          <span class="icon">🛒</span><span class="nav-item-label">LOCAL</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'trainer-shop' }"
          @click.stop="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
        >
          <span class="icon">🎖️</span><span class="nav-item-label">BC SHOP</span>
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
        @click.stop="toggleGroupMenu('SOCIAL')"
      >
        <span class="icon">👥</span>
        <span class="nav-item-label">SOCIAL</span>
        <span
          v-if="socialStore.notifications.total"
          class="badge-pill"
        >{{ socialStore.notifications.total }}</span>
      </button>

      <div class="hud-submenu">
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'friends' }"
          @click.stop="handleTabChange('friends'); uiStore.openHudGroup = null"
        >
          <span class="icon">🤝</span><span class="nav-item-label">AMIGOS</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'arena' }"
          @click.stop="handleTabChange('arena'); uiStore.openHudGroup = null"
        >
          <span class="icon">🏟️</span><span class="nav-item-label">ARENA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'ranking' }"
          @click.stop="handleTabChange('ranking'); uiStore.openHudGroup = null"
        >
          <span class="icon">🏅</span><span class="nav-item-label">RANKING</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'war' }"
          @click.stop="handleTabChange('war'); uiStore.openHudGroup = null"
        >
          <span class="icon">🚩</span><span class="nav-item-label">GUERRA</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: activeTab === 'events' }"
          @click.stop="handleTabChange('events'); uiStore.openHudGroup = null"
        >
          <span class="icon">🎁</span><span class="nav-item-label">EVENTOS</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
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
    @include glass-solid(Linear-Gradient(180deg, #161a2e 0%, #0a0c14 100%));
    
    // MULTI-LAYER REFLECTIONS & CONTRAST
    border-top: 1px solid Rgba(255, 255, 255, 0.18);
    box-shadow: 
      0 -10px 50px Rgba(0, 0, 0, 0.7),
      inset 0 1px 0 Rgba(255, 255, 255, 0.1); // Reflection on the top edge
    
    // Reflection parent is handled by position: fixed in parent/mobile class

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: Linear-Gradient(90deg, 
        transparent, 
        Rgba(255, 255, 255, 0.3), 
        transparent
      );
      pointer-events: none;
    }

    .hud-nav-btn {
      flex-direction: column;
      gap: 4px;
      min-width: 50px;
    }

    /* CRITICAL: Ensure submenus are NOT clipped */
    overflow: visible !important;
  }
}

.hud-nav-btn {
  background: Rgba(255,255,255,0.05);
  border: 1px solid Rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 8px 12px;
  color: $white;
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
  .nav-item-label {
    @include pixelated;
    font-weight: 400;
    font-size: clamp(6px, 12cqw, 8px);
    color: Rgba(255, 255, 255, 0.75);
    @include pixelated;
    white-space: nowrap;
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.12);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 2px var(--yellow),
      0 0 15px Rgba(255, 214, 10, 0.4);
    z-index: var(--z-base);
    transform: Translatey(-2px);
  }
  
  &.active {
    background: Rgba(255, 204, 0, 0.15);
    border-color: var(--yellow);
    box-shadow: 
      0 0 0 2px var(--yellow),
      0 0 30px Rgba(255, 214, 10, 0.45),
      inset 0 0 12px Rgba(255, 214, 10, 0.1);
    z-index: var(--z-base);
    .nav-item-label { 
      color: var(--yellow); 
      opacity: 1; 
      text-shadow: 0 0 8px Rgba(255, 214, 10, 0.5); 
    }
  }
}

.hud-group {
  position: relative;
  
  &.is-open .hud-submenu {
    display: flex;
  }

  /* Ensure the group itself doesn't clip children */
  overflow: visible !important;
}

.hud-submenu {
  /* Visibility management */
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  
  position: absolute;
  flex-direction: column;
  gap: 6px;
  @include glass-solid(Linear-Gradient(180deg, #161a2e 0%, #0a0c14 100%));
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 8px;
  z-index: var(--z-modal); // Use modal-level z-index
  width: max-content !important;
  min-width: 0 !important;
  align-items: stretch !important;
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.7);
  overflow: visible;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.2s, transform 0.2s;

  .hud-group.is-open & { 
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    display: flex; // Base layout
  }

  .pos-top & { 
    top: calc(100% + 10px); 
    bottom: auto !important;
    left: 50%; 
    transform: Translatex(-50%) Translatey(-10px); 
  }
  
  .hud-group.is-open.pos-top & {
    transform: Translatex(-50%) Translatey(0);
  }
  
  .pos-bottom & { 
    bottom: calc(100% + 15px); 
    top: auto !important;
    left: 50%; 
    transform: Translatex(-50%) Translatey(10px); 
  }

  .hud-group.is-open.pos-bottom & {
    transform: Translatex(-50%) Translatey(0);
  }

  .hud-nav-btn {
    flex-direction: row !important;
    justify-content: flex-start !important;
    align-items: center !important;
    width: 100% !important;
    min-width: unset !important;
    padding: 10px 14px;
    gap: 10px;
    background: Rgba(255, 255, 255, 0.05);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    white-space: nowrap;
    
    &:hover { 
      background: Rgba(255, 255, 255, 0.1); 
      border-color: var(--yellow);
      box-shadow: 
        0 0 0 2px var(--yellow), 
        0 0 15px Rgba(255, 214, 10, 0.3);
      transform: Translatex(6px);
      z-index: var(--z-base);
    }
    
    &.active {
      background: Rgba(255, 204, 0, 0.12);
      border-color: var(--yellow);
      box-shadow: 
        0 0 0 2px var(--yellow), 
        0 0 25px Rgba(255, 214, 10, 0.4),
        inset 0 0 10px Rgba(255, 214, 10, 0.1);
    }

    .icon { font-size: 14px; }
    .nav-item-label { 
      font-size: 8px; 
      color: $white;
      white-space: nowrap;
      @include pixelated;
    }
    
    &.active .nav-item-label { color: var(--yellow); }
  }
}

@keyframes slideDown {
  from { transform: Translatex(-50%) Translatey(-10px); opacity: 0; }
  to { transform: Translatex(-50%) Translatey(0); opacity: 1; }
}

@keyframes slideUp {
  from { transform: Translatex(-50%) Translatey(10px); opacity: 0; }
  to { transform: Translatex(-50%) Translatey(0); opacity: 1; }
}

.badge-pill {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  @include pixelated;
  font-size: 7px;
  padding: 4px 6px;
  border-radius: 8px;
  box-shadow: 0 2px 8px Rgba(239, 68, 68, 0.4);
}

.relative-box { position: relative; }

@media (max-width: 768px) {
  .hud-nav-btn {
    min-width: 50px;
    padding: 6px 4px;
    .nav-item-label { 
      font-size: 8px; 
      @include pixelated;
    }
  }
}
</style>
