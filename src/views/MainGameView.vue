<script setup>
import { computed, onMounted, onUnmounted, ref, watch, defineAsyncComponent } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useWarStore } from '@/stores/war'
import { useEventStore } from '@/stores/events'
import { useAudioStore } from '@/stores/audio'
import { useLivePvPStore } from '@/stores/livePvP'

// Sub-components
import TitleScreen from '@/components/TitleScreen.vue'
import ActionButtons from '@/components/ActionButtons.vue'
import TrainerPanel from '@/components/TrainerPanel.vue'
import HUD_Navigation from '@/components/HUD_Navigation.vue'
import InventoryPills from '@/components/InventoryPills.vue'
import BattleArena from '@/components/BattleArena.vue'
import PvPArena from '@/components/battle/PvPArena.vue'
import TeamHeader from '@/components/team/TeamHeader.vue'
import TeamGrid from '@/components/team/TeamGrid.vue'
import CriminalityBar from '@/components/ui/CriminalityBar.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import BuffsOverlay from '@/components/overlays/BuffsOverlay.vue'
import { useAuthStore } from '@/stores/auth'


// Tab components
import BoxView from '@/components/BoxView.vue'

// Lazy loaded views to fix code splitting warnings
const PokedexView = defineAsyncComponent(() => import('@/views/PokedexView.vue'))
const MapView = defineAsyncComponent(() => import('@/views/MapView.vue'))
const GymsView = defineAsyncComponent(() => import('@/views/GymsView.vue'))
const DaycareView = defineAsyncComponent(() => import('@/views/DaycareView.vue'))
const ShopView = defineAsyncComponent(() => import('@/views/ShopView.vue'))
import GlobalChat from '@/components/social/GlobalChat.vue'
import DirectChatWindow from '@/components/social/DirectChatWindow.vue'
import { useChatStore } from '@/stores/chat'
import GlobalMarket from '@/components/market/GlobalMarket.vue'
import RankedArena from '@/components/social/RankedArena.vue'
import GlobalRanking from '@/components/social/GlobalRanking.vue'




import { phaserBridge } from '@/logic/phaserBridge'


const gameStore = useGameStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const battleStore = useBattleStore()
const chatStore = useChatStore()
const warStore = useWarStore()
const eventStore = useEventStore()
const audioStore = useAudioStore()
const livePvP = useLivePvPStore()

// Sync Weather & Day/Night Cycle with Phaser
watch(() => gameStore.state.dayCycle, (cycle) => {
  phaserBridge.sendCommand('WeatherScene', 'SET_WEATHER', {
    cycle: cycle,
    weather: 'clear' // Expandable to rain/sand later
  })
}, { immediate: true })

const hudRef = ref(null)
const hudHeight = ref(85)
const isHudHidden = ref(false)

const gs = computed(() => gameStore.state)
const activeTab = computed(() => uiStore.activeTab)

// Sync logic watchdog
let watchdog = null
let resizeObserver = null

// Click-outside listener to close HUD menus
function handleOutsideClick(e) {
  const isNavClick = e.target.closest('.hud-group, .nav-group, .group-btn')
  if (!isNavClick) {
    document.querySelectorAll('.hud-group.is-open, .nav-group.is-open').forEach(g => {
      g.classList.remove('is-open')
    })
  }
}

// Scroll listener for dynamic HUD visibility
let lastScrollY = 0
function handleScroll(e) {
  let target = e.target
  if (target === document || target === window) target = document.documentElement
  
  // Only hide/show if the main tab or document is scrolling (ignore inner tiny scrolls)
  if (target.tagName !== 'HTML' && (!target.classList || !target.classList.contains('tab-content'))) {
    return
  }

  const currentScrollY = target.scrollTop
  
  if (currentScrollY <= 50) {
    isHudHidden.value = false
    lastScrollY = currentScrollY
    return
  }

  // Hide on scroll down, show on scroll up (with a 20px threshold)
  if (currentScrollY > lastScrollY + 20) {
    isHudHidden.value = true
    lastScrollY = currentScrollY
  } else if (currentScrollY < lastScrollY - 20) {
    isHudHidden.value = false
    lastScrollY = currentScrollY
  }
}

function updateHudHeight() {
  if (hudRef.value) {
    const innerHud = hudRef.value.querySelector('.hud')
    hudHeight.value = innerHud ? innerHud.offsetHeight : hudRef.value.offsetHeight
  }
}

onMounted(() => {
  // 1. Dynamic HUD Height Tracking
  if (hudRef.value) {
    resizeObserver = new ResizeObserver(() => updateHudHeight())
    resizeObserver.observe(hudRef.value)
  }
  window.addEventListener('resize', updateHudHeight, { passive: true })
  setTimeout(updateHudHeight, 100) // Initial guarantee

  // 2. Load essential game data
  warStore.loadWarData()
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
  livePvP.initInvitePoller()

  // Initial UI state setup
  setTimeout(() => {
    const battleScreen = document.getElementById('battle-screen')
    if (battleScreen) {
      const obs = new MutationObserver(() => {
        const isActive = battleScreen.classList.contains('active')
        document.body.classList.toggle('is-battle-active', isActive)
      })
      obs.observe(battleScreen, { attributes: true, attributeFilter: ['class'] })
      
      if (battleScreen.classList.contains('active')) {
        document.body.classList.add('is-battle-active')
      }
    }
  }, 1200)

  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('scroll', handleScroll, { passive: true, capture: true })

  // Initialize audio context on first user interaction
  const initAudio = () => {
    audioStore.init()
    document.removeEventListener('click', initAudio)
    document.removeEventListener('keydown', initAudio)
  }
  document.addEventListener('click', initAudio, { once: true })
  document.addEventListener('keydown', initAudio, { once: true })
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('scroll', handleScroll, { capture: true })
  window.removeEventListener('resize', updateHudHeight)
  if (watchdog) clearInterval(watchdog)
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<template>
  <TitleScreen />
  

  <div
    id="game-screen"
    class="screen"
    :class="{ active: gs.starterChosen }"
  >
    <!-- HUD PRINCIPAL (RESTAURADO) -->
    <div
      ref="hudRef"
      class="hud-container"
      :class="{ 'hud-hidden': isHudHidden }"
    >
      <div class="hud">
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
      :style="{ paddingTop: Math.max(100, hudHeight + 20) + 'px' }"
    >
      <!-- TAB CONTENTS -->
      <div
        v-show="activeTab === 'map'"
        id="tab-map"
        class="tab-content"
      >
        <MapView />
      </div>

      <div
        v-show="activeTab === 'team'"
        id="tab-team"
        class="tab-content"
      >
        <div class="team-section">
          <TeamHeader />
          <TeamGrid :team="gs.team" />
        </div>
      </div>


      <div
        v-show="activeTab === 'box'"
        id="tab-box"
        class="tab-content"
      >
        <BoxView />
      </div>

      <div
        v-show="activeTab === 'pokedex'"
        id="tab-pokedex"
        class="tab-content"
      >
        <PokedexView />
      </div>


      <div
        v-show="activeTab === 'gyms'"
        id="tab-gyms"
        class="tab-content"
      >
        <GymsView />
      </div>

      <div
        v-show="activeTab === 'daycare'"
        id="tab-daycare"
        class="tab-content"
      >
        <DaycareView v-if="activeTab === 'daycare'" />
      </div>

      <div
        v-show="activeTab === 'market'"
        id="tab-market"
        class="tab-content"
      >
        <ShopView />
      </div>

      <div
        v-show="activeTab === 'trainer-shop'"
        id="tab-trainer-shop"
        class="tab-content"
      >
        <ShopView />
      </div>

      <div
        v-show="activeTab === 'online-market'"
        id="tab-online-market"
        class="tab-content"
      >
        <GlobalMarket v-if="activeTab === 'online-market'" />
      </div>

      <div
        v-show="activeTab === 'arena'"
        id="tab-arena"
        class="tab-content"
      >
        <RankedArena v-if="activeTab === 'arena'" />
      </div>

      <div
        v-show="activeTab === 'ranking'"
        id="tab-ranking"
        class="tab-content"
      >
        <GlobalRanking v-if="activeTab === 'ranking'" />
      </div>

      <BattleArena v-show="battleStore.isBattleActive" />
      <PvPArena v-show="livePvP.battleState.active" />
    </div>

    <!-- MODALS & OVERLAYS -->
    <CriminalityBar />

    <ToastNotification />
    <BuffsOverlay />

    <!-- CHAT GLOBAL (Phase 24) -->
    <GlobalChat />

    <!-- VENTANAS DE CHAT PRIVADO (Phase 24) -->
    <div class="private-chats-container">
      <DirectChatWindow 
        v-for="(chat, friendId) in chatStore.privateChats" 
        :key="friendId"
        :friend-id="friendId"
      />
    </div>


    <!-- SESSION MANAGEMENT -->
  </div>

  <HUD_Navigation 
    v-if="gs.starterChosen"
    class="mobile-only-nav"
    position="bottom" 
  />
</template>

<style scoped lang="scss">
/* Scoped styles for the main container or specific integrated elements */

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible !important;
  padding-left: clamp(10px, 3vw, 24px);
  padding-right: clamp(10px, 3vw, 24px);
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
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.release-hint {
  color: var(--red);
  background: rgba(255, 59, 59, 0.08);
  border: 1px solid rgba(255, 59, 59, 0.2);
}
.overlay-fixed {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.private-chats-container {
  position: fixed;
  right: 20px;
  bottom: 80px; /* Space for bottom nav */
  display: flex;
  flex-direction: row-reverse;
  gap: 10px;
  pointer-events: none;
  z-index: 1000;
  transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  & > * {
    pointer-events: auto;
  }

  @media (max-width: 1380px) {
    bottom: 170px;
  }
}

.mobile-only-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 2000;
}

@media (max-width: 1380px) {
  .mobile-only-nav { display: flex !important; }
  .content-area { padding-bottom: 90px !important; }
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

@media (min-width: 1381px) {
  .mobile-only-nav { display: none; }
}
</style>
