<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social'
import { useModalStore } from '@/stores/modals'
import { useGTSStore } from '@/stores/gts'
import { useBreedingStore } from '@/stores/breeding'
import { useEventStore } from '@/stores/events'

interface Props {
  position?: string
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top'
})

const gameStore = useGameStore()
const uiStore = useUIStore()
const socialStore = useSocialStore()
const modalStore = useModalStore()
const gtsStore = useGTSStore()
const breedingStore = useBreedingStore()
const eventStore = useEventStore()
const navRef = ref<HTMLElement | null>(null)

const activeTab = computed({
  get: () => uiStore.activeTab,
  set: (val: string) => { uiStore.activeTab = val }
})

const totalSocialNotifications = computed(() => {
  return socialStore.notifications.total +
         gameStore.state.claimQueue.length +
         eventStore.pendingAwards.length
})

const handleTabChange = (tab: string, _event?: Event) => {
  if (tab === 'bag') {
    modalStore.open('Inventory')
    return
  }

  if (tab === 'market') {
    modalStore.open('Shop')
    return
  }

  if (tab === 'online-market') {
    modalStore.open('GlobalMarket')
    return
  }

  if (tab === 'trainer-shop') {
    modalStore.open('BCShop')
    return
  }

  if (tab === 'war-shop') {
    uiStore.isWarShopOpen = true
    return
  }

  if (tab === 'team') {
    modalStore.open('TeamManagement')
    return
  }

  if (tab === 'daycare') {
    modalStore.open('Daycare')
    return
  }

  if (['social', 'friends'].includes(tab)) {
    const initialTab = (socialStore.notifications.trades > 0 && (socialStore.notifications.chats + socialStore.notifications.friends) === 0)
      ? 'trades'
      : (socialStore.notifications.friends > 0 && socialStore.notifications.chats === 0)
        ? 'requests'
        : 'friends'
    modalStore.open('SocialCenter', { initialTab })
    return
  }

  if (tab === 'missions') {
    modalStore.open('EventMissions')
    return
  }

  if (tab === 'ranking') {
    modalStore.open('Ranking')
    return
  }

  if (tab === 'arena') {
    modalStore.open('Arena')
    return
  }
  
  activeTab.value = tab
  uiStore.openHudGroup = null // Close any open group when switching tabs
}

const toggleGroupMenu = (name: string) => {
  uiStore.toggleHudGroup(name)
}

const handleClickOutside = (event: MouseEvent) => {
  if (navRef.value && !navRef.value.contains(event.target as Node)) {
    uiStore.openHudGroup = null
  }
}

// GSAP Animations
const beforeEnter = (el: Element) => {
  gsap.set(el, { 
    opacity: 0, 
    xPercent: -50,
    y: props.position === 'top' ? -20 : 20,
    scale: 0.8,
    transformOrigin: props.position === 'top' ? 'top center' : 'bottom center'
  })
}

const enter = (el: Element, done: () => void) => {
  gsap.to(el, { 
    opacity: 1, 
    xPercent: -50,
    y: 0,
    scale: 1,
    duration: 0.12, 
    ease: 'power2.out',
    onComplete: done 
  })
}

const leave = (el: Element, done: () => void) => {
  gsap.to(el, { 
    opacity: 0, 
    xPercent: -50,
    y: props.position === 'top' ? -10 : 10,
    scale: 0.9,
    duration: 0.1, 
    ease: 'power2.in',
    onComplete: done 
  })
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="navRef"
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
      class="hud-group relative-box"
      @mouseleave="uiStore.openHudGroup === 'POKEMON' && (uiStore.openHudGroup = null)"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['box', 'pokedex'].includes(activeTab) || uiStore.openHudGroup === 'POKEMON' || modalStore.isOpen('TeamManagement') || modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
        @click.stop="toggleGroupMenu('POKEMON')"
      >
        <span class="icon">⚡</span>
        <span class="nav-item-label">POKÉMON</span>
        <span
          v-if="breedingStore.fulfillableMissionsCount > 0"
          class="badge-pill"
        >{{ breedingStore.fulfillableMissionsCount }}</span>
      </button>
      
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
      >
        <div 
          v-if="uiStore.openHudGroup === 'POKEMON'"
          class="hud-submenu"
        >
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('TeamManagement') }"
            @click.stop="handleTabChange('team', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">⚡</span><span class="nav-item-label">EQUIPO</span>
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
            :class="{ active: modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
            @click.stop="handleTabChange('missions'); uiStore.openHudGroup = null"
          >
            <span class="icon">📜</span><span class="nav-item-label">MISIONES</span>
            <span
              v-if="breedingStore.fulfillableMissionsCount > 0"
              class="badge-pill"
            >{{ breedingStore.fulfillableMissionsCount }}</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: activeTab === 'pokedex' }"
            @click.stop="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">📖</span><span class="nav-item-label">POKÉDEX</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 3. MOCHILA -->
    <button
      class="hud-nav-btn"
      :class="{ active: modalStore.isOpen('Inventory') }"
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
      class="hud-group relative-box"
      @mouseleave="uiStore.openHudGroup === 'MARKET' && (uiStore.openHudGroup = null)"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: uiStore.openHudGroup === 'MARKET' || modalStore.isOpen('GlobalMarket') || modalStore.isOpen('Shop') || modalStore.isOpen('BCShop') || modalStore.isOpen('WarShop') }"
        @click.stop="toggleGroupMenu('MARKET')"
      >
        <span class="icon">🏪</span>
        <span class="nav-item-label">MARKET</span>
        <span
          v-if="gtsStore.unseenSalesCount > 0"
          class="badge-pill"
        >{{ gtsStore.unseenSalesCount }}</span>
      </button>
      
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
      >
        <div 
          v-if="uiStore.openHudGroup === 'MARKET'"
          class="hud-submenu"
        >
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('GlobalMarket') }"
            @click.stop="handleTabChange('online-market'); uiStore.openHudGroup = null"
          >
            <span class="icon">🌎</span><span class="nav-item-label">GLOBAL</span>
            <span
              v-if="gtsStore.unseenSalesCount > 0"
              class="badge-pill"
            >{{ gtsStore.unseenSalesCount }}</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Shop') }"
            @click.stop="handleTabChange('market'); uiStore.openHudGroup = null"
          >
            <span class="icon">🛒</span><span class="nav-item-label">LOCAL</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('BCShop') }"
            @click.stop="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">🎖️</span><span class="nav-item-label">BC SHOP</span>
          </button>
          <button
            class="hud-nav-btn war-shop-nav-btn"
            :class="{ active: modalStore.isOpen('WarShop') }"
            @click.stop="handleTabChange('war-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">🚩</span><span class="nav-item-label">GUERRA</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 7. SOCIAL (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseleave="uiStore.openHudGroup === 'SOCIAL' && (uiStore.openHudGroup = null)"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: modalStore.isOpen('Arena') || modalStore.isOpen('Ranking') || uiStore.openHudGroup === 'SOCIAL' || modalStore.isOpen('SocialCenter') || modalStore.isOpen('WorldEvents') || modalStore.isOpen('FactionWar') }"
        @click.stop="toggleGroupMenu('SOCIAL')"
      >
        <span class="icon">👪</span>
        <span class="nav-item-label">SOCIAL</span>
        <span
          v-if="totalSocialNotifications > 0"
          class="badge-pill"
        >{{ totalSocialNotifications }}</span>
      </button>

      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
      >
        <div 
          v-if="uiStore.openHudGroup === 'SOCIAL'"
          class="hud-submenu"
        >
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('SocialCenter') }"
            @click.stop="handleTabChange('friends'); uiStore.openHudGroup = null"
          >
            <span class="icon">🤝</span><span class="nav-item-label">AMIGOS</span>
            <span
              v-if="(socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length) > 0"
              class="badge-pill"
            >{{ socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length }}</span>
          </button>

          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Arena') }"
            @click.stop="handleTabChange('arena'); uiStore.openHudGroup = null"
          >
            <span class="icon">🏟️</span><span class="nav-item-label">ARENA</span>
            <span
              v-if="socialStore.notifications.battles > 0"
              class="badge-pill"
            >{{ socialStore.notifications.battles }}</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Ranking') }"
            @click.stop="handleTabChange('ranking'); uiStore.openHudGroup = null"
          >
            <span class="icon">🏅</span><span class="nav-item-label">RANKING</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('FactionWar') }"
            @click.stop="modalStore.open('FactionWar'); uiStore.openHudGroup = null"
          >
            <span class="icon">⚔️</span><span class="nav-item-label">DOMINANCIA</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('WorldEvents') }"
            @click.stop="modalStore.open('WorldEvents'); uiStore.openHudGroup = null"
          >
            <span class="icon">🎁</span><span class="nav-item-label">EVENTOS</span>
            <span
              v-if="eventStore.pendingAwards.length > 0"
              class="badge-pill"
            >{{ eventStore.pendingAwards.length }}</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
.hud-nav {
  display: flex;
  gap: 8px;
  align-items: center;
  
  &.pos-bottom {
    justify-content: center;
    width: max-content;
    max-width: calc(100% - 16px);
    margin: 0 auto;
    height: 70px;
    
    // PREMIUM SHELL ENHANCED
    @include shell-premium(linear-gradient(180deg, #161a2e 0%, #0a0c14 100%));
    border-radius: 20px 20px 0 0;
    padding: 10px 24px;
    gap: 15px;
    box-sizing: border-box;

    @media (max-width: 480px) {
      padding: 10px 12px;
      gap: 6px;
      border-radius: 16px 16px 0 0;
    }
    
    // MULTI-LAYER REFLECTIONS & CONTRAST
    box-shadow: 
      0 10px 40px Rgba(0, 0, 0, 0.6),
      0 -10px 50px Rgba(0, 0, 0, 0.7),
      inset 0 1px 0 Rgba(255, 255, 255, 0.1); // Reflection on the top edge
    
    // Reflection parent is handled by position: fixed in parent/mobile class

    .hud-nav-btn {
      flex-direction: column;
      gap: 4px;
      min-width: 50px;

      @media (max-width: 480px) {
        min-width: 38px;
        padding: 6px 2px;

        .icon {
          font-size: 14px;
        }
        .nav-item-label {
          font-size: 7px;
        }
      }
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
  overflow: visible !important;
}

.hud-submenu {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 8px;
  z-index: var(--z-modal);
  width: max-content !important;
  min-width: 0 !important;
  align-items: stretch !important;
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.7);
  overflow: visible;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 20px;
    background: transparent;
  }
}

.pos-top .hud-submenu {
  top: calc(100% + 5px);
  bottom: auto !important;
  left: 50%;
  transform: Translatex(-50%);
  
  &::before { top: -15px; }
}

.pos-bottom .hud-submenu {
  bottom: calc(100% + 5px);
  top: auto !important;
  left: 50%;
  transform: Translatex(-50%);
  
  &::before { bottom: -15px; }
}

.hud-submenu .hud-nav-btn {
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
    box-shadow: 0 0 0 2px var(--yellow), 0 0 15px Rgba(255, 214, 10, 0.3);
    transform: Translatex(6px);
    z-index: var(--z-base);
  }
  
  &.active {
    background: Rgba(255, 204, 0, 0.12);
    border-color: var(--yellow);
    box-shadow: 0 0 0 2px var(--yellow), 0 0 25px Rgba(255, 214, 10, 0.4), inset 0 0 10px Rgba(255, 214, 10, 0.1);
  }

  .icon { font-size: 14px; }
  .nav-item-label { 
    font-size: 8px; 
    color: $white;
    white-space: nowrap;
    @include pixelated;
  }
  
  &.active .nav-item-label { color: var(--yellow); }

  &.war-shop-nav-btn:hover {
    border-color: var(--red);
    box-shadow: 0 0 0 2px var(--red), 0 0 15px Rgba(239, 68, 68, 0.3);
    .nav-item-label { color: var(--red); }
  }
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
