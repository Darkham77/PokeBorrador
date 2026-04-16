<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { initLegacyBindings } from '@/logic/stateBridge'

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
import CriminalityBar from '@/components/ui/CriminalityBar.vue'


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
import HatchAnimationModal from '@/components/breeding/HatchAnimationModal.vue'


const gameStore = useGameStore()
const uiStore = useUIStore()
const battleStore = useBattleStore()
const chatStore = useChatStore()

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

  // 2. Initialize all legacy window bindings centralized in stateBridge.js
  initLegacyBindings()
  
  // Watchdog sync: ensuring legacy state and Vue store stay aligned during initial load
  const syncFunc = () => {
    if (typeof window.triggerVueSync === 'function') {
      window.triggerVueSync()
    } else if (window.state && typeof gameStore.syncFromLegacy === 'function') {
      gameStore.syncFromLegacy(window.state)
    }
  }
  
  syncFunc()
  watchdog = setInterval(syncFunc, 1000)
  setTimeout(() => clearInterval(watchdog), 10000)

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

    if (typeof window.updateFactionBadge === 'function') {
      window.updateFactionBadge()
    }
  }, 1200)

  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  if (watchdog) clearInterval(watchdog)
  if (resizeObserver) resizeObserver.disconnect()
})

const toggleProfile = () => uiStore.toggleProfile()
const toggleSettings = () => uiStore.toggleSettings()
const toggleLibrary = () => uiStore.toggleLibrary()

const handleTabChange = (tab, event) => {
  uiStore.activeTab = tab
  if (typeof window.showTab === 'function') {
    const btn = event?.target?.closest('.hud-nav-btn') || document.querySelector(`[data-tab="${tab}"]`);
    window.showTab(tab, btn)
  }
}
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
      class="zoom-target"
      :style="{ paddingTop: hudHeight + 'px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }"
    >
      <!-- TAB CONTENTS -->
      <div
        id="tab-map"
        class="tab-content"
        :style="{ display: activeTab === 'map' ? 'block' : 'none' }"
      >
        <MapView />
      </div>

      <div
        id="tab-team"
        class="tab-content"
        :style="{ display: activeTab === 'team' ? 'block' : 'none' }"
      >
        <div class="team-section">
          <TeamHeader />
          <TeamGrid :team="gs.team" />
        </div>
      </div>


      <div
        id="tab-box"
        class="tab-content"
        :style="{ display: activeTab === 'box' ? 'block' : 'none' }"
      >
        <BoxView />
      </div>

      <div
        id="tab-pokedex"
        class="tab-content"
        :style="{ display: activeTab === 'pokedex' ? 'block' : 'none' }"
      >
        <PokedexView />
      </div>

      <div
        id="tab-bag"
        class="tab-content"
        :style="{ display: activeTab === 'bag' ? 'block' : 'none' }"
      >
        <BackpackView />
      </div>

      <div
        id="tab-gyms"
        class="tab-content"
        :style="{ display: activeTab === 'gyms' ? 'block' : 'none' }"
      >
        <GymsView />
      </div>

      <div
        id="tab-daycare"
        class="tab-content"
        :style="{ display: activeTab === 'daycare' ? 'block' : 'none' }"
      >
        <DaycareView v-if="activeTab === 'daycare'" />
      </div>

      <div
        id="tab-market"
        class="tab-content"
        :style="{ display: activeTab === 'market' ? 'block' : 'none' }"
      >
        <ShopView />
      </div>

      <div
        id="tab-trainer-shop"
        class="tab-content"
        :style="{ display: activeTab === 'trainer-shop' ? 'block' : 'none' }"
      >
        <ShopView />
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

    <!-- MODAL SOCIAL (Phase 24) -->
    <SocialCenterModal 
      v-if="uiStore.isSocialOpen" 
      @close="uiStore.isSocialOpen = false"
    />

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


    <!-- LEGACY ESQUELETO (Oculto) -->
    <div style="display:none;">
      <div id="form-login" /><div id="form-signup" /><div id="form-local" /><div id="auth-tabs" /><div id="tab-server-online" />
      <div id="tab-server-local" /><div id="tab-login" /><div id="tab-signup" /><div id="auth-error" /><div id="auth-success" />
      <div id="auth-loading" /><button id="btn-login" /><button id="btn-signup" /><input id="login-email"><input id="login-password">
      <input id="signup-username"><input id="signup-email"><input id="signup-password"><input id="local-username">
    </div>

    <!-- SHARED OVERLAYS (HANDLED BY VUE COMPONENTS) -->
    <div
      id="bag-overlay"
      class="overlay-fixed"
      style="display:none;"
    >
      <div
        id="bag-modal"
        class="overlay-modal-box"
      />
    </div>
    <div
      id="pokedex-modal"
      class="overlay-fixed"
      style="display:none;"
    />
    <div
      id="trade-modal"
      class="overlay-fixed"
      style="display:none;"
    >
      <div class="trade-modal-box" />
    </div>
  </div>

  <MobileNavigation />
</template>

<style scoped>
/* Scoped styles for the main container or specific integrated elements */
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
