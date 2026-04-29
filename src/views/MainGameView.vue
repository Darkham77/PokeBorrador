// [PureVue-Ignore-Length]
<script setup>
import { computed, onMounted, onUnmounted, ref, watch, defineAsyncComponent } from 'vue'
import { useWindowListener, useDocumentListener } from '@/composables/useWindowListener'
import { useBodyClass } from '@/composables/useBodyClass'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useWarStore } from '@/stores/war'
import { useEventStore } from '@/stores/events'
import { useAudioStore } from '@/stores/audio'
import { useLivePvPStore } from '@/stores/livePvP'
import { useBreedingStore } from '@/stores/breeding'

// Sub-components
import TitleScreen from '@/components/TitleScreen.vue'
import ActionButtons from '@/components/ActionButtons.vue'
import TrainerPanel from '@/components/TrainerPanel.vue'
import HUD_Navigation from '@/components/HUD_Navigation.vue'
import InventoryPills from '@/components/InventoryPills.vue'
import PvPArena from '@/components/battle/PvPArena.vue'
import CriminalityBar from '@/components/ui/CriminalityBar.vue'
import BuffsOverlay from '@/components/overlays/BuffsOverlay.vue'
import HUD_SidebarLeft from '@/components/ui/HUD_SidebarLeft.vue'
import LocalDebugPanel from '@/components/admin/LocalDebugPanel.vue'


// Tab components
import BoxView from '@/components/BoxView.vue'

// Lazy loaded views to fix code splitting warnings
const PokedexView = defineAsyncComponent(() => import('@/views/PokedexView.vue'))
const MapView = defineAsyncComponent(() => import('@/views/MapView.vue'))
const GymsView = defineAsyncComponent(() => import('@/views/GymsView.vue'))
const DaycareView = defineAsyncComponent(() => import('@/views/DaycareView.vue'))
const ShopView = defineAsyncComponent(() => import('@/views/ShopView.vue'))
const BagView = defineAsyncComponent(() => import('@/views/BagView.vue'))
const EventsView = defineAsyncComponent(() => import('@/views/EventsView.vue'))
const SocialView = defineAsyncComponent(() => import('@/views/SocialView.vue'))

import GlobalChat from '@/components/social/GlobalChat.vue'
import DirectChatWindow from '@/components/social/DirectChatWindow.vue'
import { useChatStore } from '@/stores/chat'
import GlobalMarket from '@/components/market/GlobalMarket.vue'
import RankedArena from '@/components/social/RankedArena.vue'
import GlobalRanking from '@/components/social/GlobalRanking.vue'




import { phaserBridge } from '@/logic/phaserBridge'


const gameStore = useGameStore()
const uiStore = useUIStore()
const battleStore = useBattleStore()
const chatStore = useChatStore()
const warStore = useWarStore()
const eventStore = useEventStore()
const audioStore = useAudioStore()
const livePvP = useLivePvPStore()
const breedingStore = useBreedingStore()

// Sync Weather & Day/Night Cycle with Phaser
watch(() => gameStore.state.dayCycle, (cycle) => {
  phaserBridge.sendCommand('WeatherScene', 'SET_WEATHER', {
    cycle: cycle,
    weather: 'clear' // Expandable to rain/sand later
  })
}, { immediate: true })

// Managed Body Classes
useBodyClass('is-battle-active', () => battleStore.isBattleActive)

const hudRef = ref(null)
const hudBottomRef = ref(null)
const innerHudRef = ref(null)
const hudHeight = ref(110) // Updated to a more realistic default to minimize the initial jump
const hudBottomHeight = ref(gameStore.state.starterChosen ? 80 : 0)
const isHudHidden = ref(false)

const gs = computed(() => gameStore.state)
const activeTab = computed(() => uiStore.activeTab)

// Sync logic watchdog
let watchdog = null
let resizeObserver = null

// Click-outside listener to close HUD menus
function handleOutsideClick(e) {
  if (!uiStore.openHudGroup) return;

  // Check if click is inside EITHER the top HUD or the bottom HUD
  const isInsideTopHud = hudRef.value?.contains(e.target);
  const isInsideBottomHud = hudBottomRef.value?.$el ? hudBottomRef.value.$el.contains(e.target) : hudBottomRef.value?.contains?.(e.target);
  
  if (!isInsideTopHud && !isInsideBottomHud) {
    uiStore.openHudGroup = null
  }
}

// Scroll listener for dynamic HUD visibility (THROTTLED for performance)
let lastScrollY = 0
let scrollTicking = false
function handleScroll(e) {
  if (scrollTicking) return
  scrollTicking = true
  
  requestAnimationFrame(() => {
    let target = e.target
    if (target === document || target === window) target = document.documentElement
    
    if (target.tagName !== 'HTML' && (!target.classList || !target.classList.contains('tab-content'))) {
      scrollTicking = false
      return
    }

    const currentScrollY = target.scrollTop
    
    if (currentScrollY <= 50) {
      if (isHudHidden.value) isHudHidden.value = false
      lastScrollY = currentScrollY
      scrollTicking = false
      return
    }

    // Hide on scroll down, show on scroll up (with a 40px threshold for stability)
    const diff = currentScrollY - lastScrollY
    if (Math.abs(diff) > 40) {
      const nextHidden = diff > 0
      if (isHudHidden.value !== nextHidden) {
        isHudHidden.value = nextHidden
      }
      lastScrollY = currentScrollY
    }
    
    scrollTicking = false
  })
}

let isUpdatingHeight = false
function updateHudHeight() {
  if (isUpdatingHeight) return
  isUpdatingHeight = true
  
  requestAnimationFrame(() => {
    let newHeight = 0
    if (innerHudRef.value) {
      newHeight = innerHudRef.value.offsetHeight
    } else if (hudRef.value) {
      newHeight = hudRef.value.offsetHeight
    }

    // Only update if change is significant (> 2px) to avoid micro-reflows
    if (Math.abs(hudHeight.value - newHeight) > 2) {
      hudHeight.value = newHeight
    }
    
    // Update bottom HUD height
    const bottomEl = hudBottomRef.value?.$el || hudBottomRef.value
    const newBottomHeight = bottomEl ? bottomEl.offsetHeight : 0
    if (Math.abs(hudBottomHeight.value - newBottomHeight) > 2) {
      hudBottomHeight.value = newBottomHeight
    }
    
    isUpdatingHeight = false
  })
}

onMounted(() => {
  console.log('[MainGameView] MOUNTED. activeTab:', activeTab.value)
  
  // Initial height calculation: Immediate + Short delay for dynamic content
  updateHudHeight()
  setTimeout(updateHudHeight, 100) 

  // 2. Load essential game data
  warStore.loadWarData()
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
  livePvP.initInvitePoller()
  breedingStore.checkDailyReset()
})

onUnmounted(() => {
  console.log('[MainGameView] UNMOUNTED.')
})

// REFACTORED: Only update on TRUE window resize
let lastWindowWidth = window.innerWidth
useWindowListener('resize', () => {
  if (window.innerWidth !== lastWindowWidth) {
    lastWindowWidth = window.innerWidth
    updateHudHeight()
  }
}, { passive: true })

useWindowListener('scroll', handleScroll, { passive: true, capture: true })
useDocumentListener('click', handleOutsideClick)

// Initialize audio context on first user interaction
const initAudio = () => {
  audioStore.init()
  document.removeEventListener('click', initAudio)
  document.removeEventListener('keydown', initAudio)
}
useDocumentListener('click', initAudio, { once: true })
useDocumentListener('keydown', initAudio, { once: true })

onUnmounted(() => {
  if (watchdog) clearInterval(watchdog)
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<template>
  <div class="main-game-view-root">
    <TitleScreen />
  

    <div
      v-show="gs.starterChosen"
      id="game-screen"
      class="screen"
    >
      <!-- HUD PRINCIPAL (RESTAURADO) -->
      <div
        ref="hudRef"
        class="hud-container"
        :class="{ 'hud-hidden': isHudHidden }"
      >
        <div 
          ref="innerHudRef"
          class="hud"
        >
          <!-- 1. Entrenador (Siempre Arriba) -->
          <TrainerPanel class="hud-left" />

          <!-- 2. Botones Especiales -->
          <ActionButtons class="hud-actions" />

          <!-- 3. Navegación -->
          <HUD_Navigation class="hud-center" />

          <!-- 4. Inventario (Baja < 670px) -->
          <InventoryPills class="hud-right" />
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div
        id="zoomable-content"
        class="zoom-target content-area"
        :style="{ 
          '--hud-top-padding': Math.max(90, hudHeight + 15) + 'px',
          '--hud-bottom-padding': (hudBottomHeight > 0 ? (hudBottomHeight + 20) : 0) + 'px'
        }"
      >
        <!-- CORE VIEWS (KEPT ALIVE) -->
        <KeepAlive :include="['MapView', 'PokedexView', 'BagView', 'BoxView']">
          <div
            v-if="activeTab === 'map'"
            key="map"
            class="tab-content"
          >
            <MapView />
            <div class="hud-spacer-bottom" />
          </div>

          <div
            v-else-if="activeTab === 'pokedex'"
            key="pokedex"
            class="tab-content"
          >
            <PokedexView />
            <div class="hud-spacer-bottom" />
          </div>

          <div
            v-else-if="activeTab === 'bag'"
            key="bag"
            class="tab-content"
          >
            <BagView />
            <div class="hud-spacer-bottom" />
          </div>

          <div
            v-else-if="activeTab === 'box'"
            key="box"
            class="tab-content"
          >
            <BoxView />
            <div class="hud-spacer-bottom" />
          </div>

          <div
            v-else-if="activeTab === 'gyms'"
            key="gyms"
            class="tab-content"
          >
            <GymsView />
            <div class="hud-spacer-bottom" />
          </div>

          <div
            v-else-if="activeTab === 'daycare'"
            key="daycare"
            class="tab-content"
          >
            <DaycareView />
            <div class="hud-spacer-bottom" />
          </div>
        </KeepAlive>

        <div
          v-if="activeTab === 'market'"
          id="tab-market"
          class="tab-content"
        >
          <ShopView />
          <div class="hud-spacer-bottom" />
        </div>

        <div
          v-if="activeTab === 'trainer-shop'"
          id="tab-trainer-shop"
          class="tab-content"
        >
          <ShopView />
          <div class="hud-spacer-bottom" />
        </div>

        <div
          v-if="activeTab === 'online-market'"
          id="tab-online-market"
          class="tab-content"
        >
          <GlobalMarket v-if="activeTab === 'online-market'" />
          <div class="hud-spacer-bottom" />
        </div>

        <div
          v-if="activeTab === 'events'"
          id="tab-events"
          class="tab-content"
        >
          <EventsView />
          <div class="hud-spacer-bottom" />
        </div>

        <div
          v-if="activeTab === 'social'"
          id="tab-social"
          class="tab-content"
        >
          <SocialView />
          <div class="hud-spacer-bottom" />
        </div>

        <div
          v-if="activeTab === 'arena'"
          id="tab-arena"
          class="tab-content"
        >
          <RankedArena v-if="activeTab === 'arena'" />
          <div class="hud-spacer-bottom" />
        </div>

        <div
          v-if="activeTab === 'ranking'"
          id="tab-ranking"
          class="tab-content"
        >
          <GlobalRanking v-if="activeTab === 'ranking'" />
          <div class="hud-spacer-bottom" />
        </div>

        <PvPArena v-show="livePvP.battleState.active" />
      </div>

      <!-- MODALS & OVERLAYS -->
      <CriminalityBar />

      <BuffsOverlay />

      <!-- SIDEBAR IZQUIERDA (BARRA DE HERRAMIENTAS) -->
      <HUD_SidebarLeft>
        <GlobalChat />
        <LocalDebugPanel />
      </HUD_SidebarLeft>

      <!-- VENTANAS DE CHAT PRIVADO (Phase 24) -->
      <div class="private-chats-container">
        <DirectChatWindow 
          v-for="(chat, friendId) in chatStore.privateChats" 
          :key="friendId"
          :friend-id="friendId"
        />
      </div>
    </div>

    <div 
      v-if="gs.starterChosen"
      ref="hudBottomRef"
      class="hud-bottom-wrapper"
    >
      <HUD_Navigation 
        class="mobile-only-nav"
        position="bottom" 
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

/* Scoped styles for the main container or specific integrated elements */

#game-screen {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible !important; 
  position: relative;
  padding: 0; 
}

.tab-content {
  position: absolute;
  inset: 0;
  display: block; // Switched to block to fix padding-bottom scroll issue
  min-height: 0; // Fixes flex scroll collapse
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: var(--hud-top-padding, 180px);
  padding-bottom: var(--hud-bottom-padding, 100px);
  padding-inline: var(--ui-h-padding);
  box-sizing: border-box;
  @include gpu-layer;
}

.hud-bottom-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: var(--z-navigation);
  
  & > * {
    pointer-events: auto;
  }
}

.hud-spacer-bottom {
  height: var(--hud-bottom-padding, 80px);
  min-height: 80px;
  width: 100%;
  flex-shrink: 0;
  pointer-events: none;
}

.hidden-system {
  display: none !important;
}
.hint-banner {
  font-size: 11px;
  margin-bottom: 12px;
  border-radius: 10px;
  padding: 10px 14px;
}
.rocket-hint {
  color: var(--red);
  background: Rgba(239, 68, 68, 0.08);
  border: 1px solid Rgba(239, 68, 68, 0.2);
}
.release-hint {
  color: var(--red);
  background: Rgba(239, 68, 68, 0.08);
  border: 1px solid Rgba(239, 68, 68, 0.2);
}
.overlay-fixed {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.9);
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transform: translateZ(0);
}

.private-chats-container {
  position: fixed;
  right: 20px;
  bottom: 80px; /* Space for bottom nav */
  display: flex;
  flex-direction: row-reverse;
  gap: 10px;
  pointer-events: none;
  z-index: var(--z-hud);
  transform: translateZ(0);
  transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  & > * {
    pointer-events: auto;
  }

  @include responsive(hud-mobile) {
    bottom: 170px;
  }
}

.mobile-only-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: var(--z-navigation);
  transform: translateZ(0);
}

@include responsive(hud-mobile) {
  .mobile-only-nav { display: flex !important; }
}

/* Zoom-style shrink for extremely narrow screens (< 467px) */
@media (max-width: 467px) {
  .mobile-only-nav { zoom: 0.9; }
}
@media (max-width: 420px) {
  .mobile-only-nav { zoom: 0.8; }
}
@media (max-width: 380px) {
  .mobile-only-nav { zoom: 0.7; }
}
@media (max-width: 340px) {
  .mobile-only-nav { zoom: 0.6; }
}

@media (min-width: 1411px) {
  .mobile-only-nav { display: none; }
}
</style>
