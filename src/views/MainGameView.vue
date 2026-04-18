<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useWarStore } from '@/stores/war'
import { useEventStore } from '@/stores/events'
import { useAudioStore } from '@/stores/audio'

// Sub-components
import TitleScreen from '@/components/TitleScreen.vue'
import TrainerPanel from '@/components/TrainerPanel.vue'
import HUD_Navigation from '@/components/HUD_Navigation.vue'
import InventoryPills from '@/components/InventoryPills.vue'
import BattleArena from '@/components/BattleArena.vue'
import ProfileModal from '@/components/ProfileModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import LibraryModal from '@/components/LibraryModal.vue'
import FactionChoiceModal from '@/components/FactionChoiceModal.vue'
import WarShopModal from '@/components/WarShopModal.vue'
import PassiveTeamEditorModal from '@/components/PassiveTeamEditorModal.vue'
import MobileNavigation from '@/components/MobileNavigation.vue'
import TeamHeader from '@/components/team/TeamHeader.vue'
import TeamGrid from '@/components/team/TeamGrid.vue'
import PokemonDetailModal from '@/components/PokemonDetailModal.vue'
import MoveDetailModal from '@/components/MoveDetailModal.vue'
import TradeView from '@/components/TradeView.vue'
import ClassSelectionModal from '@/components/modals/ClassSelectionModal.vue'
import ClassMissionsModal from '@/components/modals/ClassMissionsModal.vue'
import PokemonSelectionModal from '@/components/modals/PokemonSelectionModal.vue'
import ItemTargetModal from '@/components/modals/ItemTargetModal.vue'
import EvolutionScene from '@/components/evolution/EvolutionScene.vue'
import MoveRelearnerModal from '@/components/modals/MoveRelearnerModal.vue'
import SessionConflictModal from '@/components/auth/SessionConflictModal.vue'
import CriminalityBar from '@/components/ui/CriminalityBar.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useAuthStore } from '@/stores/auth'


// Tab components
import BackpackView from '@/components/BackpackView.vue'
import BoxView from '@/components/BoxView.vue'
import PokedexView from '@/views/PokedexView.vue'
import HealOverlay from '@/components/HealOverlay.vue'
import MapView from '@/views/MapView.vue'
import GymsView from '@/views/GymsView.vue'
import DaycareView from '@/views/DaycareView.vue'
import ShopView from '@/views/ShopView.vue'
import GlobalChat from '@/components/social/GlobalChat.vue'
import SocialCenterModal from '@/components/social/SocialCenterModal.vue'
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

// Sync Weather & Day/Night Cycle with Phaser
watch(() => gameStore.state.dayCycle, (cycle) => {
  phaserBridge.sendCommand('WeatherScene', 'SET_WEATHER', {
    cycle: cycle,
    weather: 'clear' // Expandable to rain/sand later
  })
}, { immediate: true })

const hudRef = ref(null)
const hudHeight = ref(85)

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

onMounted(() => {
  // 1. Dynamic HUD Height Tracking
  if (hudRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height
        hudHeight.value = Math.floor(height + 15) // +15 for the 'top: 15px' in CSS
      }
    })
    resizeObserver.observe(hudRef.value)
  }

  // 2. Load essential game data
  warStore.loadWarData()
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()

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
    >
      <div class="hud">
        <!-- Trainer HUD Left -->
        <TrainerPanel />

        <!-- Navigation HUD Center -->
        <HUD_Navigation />

        <!-- Action Pills Right -->
        <InventoryPills />
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div
      id="zoomable-content"
      class="zoom-target content-area"
      :style="{ paddingTop: hudHeight + 'px' }"
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
        v-show="activeTab === 'bag'"
        id="tab-bag"
        class="tab-content"
      >
        <BackpackView />
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
    </div>

    <!-- MODALS & OVERLAYS -->
    <ProfileModal />
    <SettingsModal />
    <LibraryModal />
    <FactionChoiceModal />
    <WarShopModal />
    <PassiveTeamEditorModal />
    <HealOverlay />
    <PokemonDetailModal />
    <MoveDetailModal />
    <TradeView />
    <ClassSelectionModal />
    <ClassMissionsModal />
    <PokemonSelectionModal />
    <CriminalityBar />
    <ItemTargetModal />
    
    <EvolutionScene v-if="uiStore.isEvolutionOpen" />

    <MoveRelearnerModal 
      v-if="uiStore.isMoveRelearnerOpen"
      :pokemon="uiStore.activePokemonForRelearner"
      @close="uiStore.isMoveRelearnerOpen = false"
      @learned="() => {}"
    />

    <!-- MODAL SOCIAL (Phase 24) -->
    <SocialCenterModal 
      v-if="uiStore.isSocialOpen" 
      @close="uiStore.isSocialOpen = false"
    />

    <ToastNotification />

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
    <SessionConflictModal v-if="authStore.sessionConflict" />

    <!-- LEGACY ESQUELETO (Oculto) -->
    <div
      id="trade-modal"
      class="overlay-fixed hidden-system"
    >
      <div class="trade-modal-box" />
    </div>
  </div>

  <MobileNavigation />
</template>

<style scoped lang="scss">
/* Scoped styles for the main container or specific integrated elements */

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  bottom: 0;
  display: flex;
  flex-direction: row-reverse;
  gap: 10px;
  pointer-events: none;
  z-index: 1000;
  
  & > * {
    pointer-events: auto;
  }
}
</style>
