<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, defineAsyncComponent, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useBodyClass } from '@/composables/ui/useBodyClass'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { useWarStore } from '@/stores/war'
import { useEventStore } from '@/stores/events'
import { useLivePvPStore } from '@/stores/livePvP'
import { useBreedingStore } from '@/stores/breeding'
import { useLoadingStore } from '@/stores/loading'
import { useMainLayout } from '@/composables/ui/useMainLayout'
import { logger } from '@/logic/utils/logger'
import { preloadShowdownWorker } from '@/logic/battle/showdownWorkerClient.ts'
import { HUD_HEIGHT_UPDATE_DELAY_SEC } from '@/logic/constants/animations.ts'

// Sub-components
import TitleScreen from '@/components/game/TitleScreen.vue'
import ActionButtons from '@/components/ui/ActionButtons.vue'
import TrainerPanel from '@/components/profile/TrainerPanel.vue'
import HUD_Navigation from '@/components/ui/HUD_Navigation.vue'
import InventoryPills from '@/components/inventory/InventoryPills.vue'
const PvPArena = defineAsyncComponent(() => import('@/components/battle/PvPArena.vue'))
import CriminalityBar from '@/components/ui/CriminalityBar.vue'
import BuffsOverlay from '@/components/overlays/BuffsOverlay.vue'
import HUD_SidebarLeft from '@/components/ui/HUD_SidebarLeft.vue'
const LocalDebugPanel = defineAsyncComponent(() => import('@/components/admin/LocalDebugPanel.vue'))

// Tab components
const BoxView = defineAsyncComponent(() => import('@/components/box/BoxView.vue'))

// Lazy loaded views
const HomeView = defineAsyncComponent(() => import('@/views/game/HomeView.vue'))
const PokedexView = defineAsyncComponent(() => import('@/views/pokemon/PokedexView.vue'))
const MapView = defineAsyncComponent(() => import('@/views/game/MapView.vue'))
const GymsView = defineAsyncComponent(() => import('@/views/game/GymsView.vue'))
const BagView = defineAsyncComponent(() => import('@/views/inventory/BagView.vue'))

const GlobalChat = defineAsyncComponent(() => import('@/components/social/GlobalChat.vue'))
const DirectChatWindow = defineAsyncComponent(() => import('@/components/social/DirectChatWindow.vue'))
import { useChatStore } from '@/stores/social/chat'

const gameStore = useGameStore()
const uiStore = useUIStore()
const battleStore = useBattleStore()
const chatStore = useChatStore()
const warStore = useWarStore()
const eventStore = useEventStore()
const livePvP = useLivePvPStore()
const breedingStore = useBreedingStore()

// --- Refs for Layout ---
const hudRef = ref<HTMLElement | null>(null)
const hudBottomRef = ref<HTMLElement | null>(null)
const innerHudRef = ref<HTMLElement | null>(null)

// --- Composable Layout ---
const {
  hudHeight,
  hudBottomHeight,
  isHudHidden,
  updateHudHeight
} = useMainLayout(hudRef, hudBottomRef, innerHudRef)

// Managed Body Classes
useBodyClass('is-battle-active', () => battleStore.isBattleActive)

const gs = computed(() => gameStore.state)
const activeTab = computed(() => uiStore.activeTab)

onMounted(() => {
  logger.info('MainGameView', 'MOUNTED. activeTab:', activeTab.value)
  
  // Initial height calculation
  updateHudHeight()
  gsap.delayedCall(HUD_HEIGHT_UPDATE_DELAY_SEC, updateHudHeight) 

  // Load essential game data
  warStore.loadWarData()
  eventStore.fetchEvents()
  eventStore.checkPendingAwards(true)
  livePvP.initInvitePoller()
  breedingStore.checkDailyReset()
  // Preload Showdown simulation worker in background
  preloadShowdownWorker()

  // Signal that DOM is ready
  const loadingStore = useLoadingStore()
  loadingStore.markAppMounted()
})

onUnmounted(() => {
  logger.info('MainGameView', 'UNMOUNTED.')
  breedingStore.cleanupBackgroundPoller()
})

watch(() => gs.value.starterChosen, (val) => {
  if (val) {
    nextTick(() => {
      const el = document.getElementById('game-screen')
      if (el) {
        if (typeof window !== 'undefined' && window.__E2E__) {
          gsap.set(el, { opacity: 1, y: 0 })
          return
        }
        const MAIN_GAME_TRANSITION_Y_PX = 10
        gsap.fromTo(el,
          { opacity: 0, y: MAIN_GAME_TRANSITION_Y_PX },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
        )
      }
    })
  }
}, { immediate: true })

</script>

<template>
  <div class="main-game-view-root">
    <TitleScreen />
  
    <div
      v-show="gs.starterChosen"
      id="game-screen"
      class="screen"
    >
      <!-- HUD PRINCIPAL -->
      <div
        ref="hudRef"
        class="hud-container main-hud-desktop"
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
        <KeepAlive :include="['HomeView', 'MapView', 'PokedexView', 'BagView', 'BoxView']">
          <div
            v-if="activeTab === 'home'"
            key="home"
            class="tab-content"
          >
            <HomeView />
            <div class="hud-spacer-bottom" />
          </div>

          <div
            v-else-if="activeTab === 'map'"
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
        </KeepAlive>

        <!-- SECONDARY VIEWS -->
        <div
          v-if="activeTab === 'gyms'"
          key="gyms"
          class="tab-content"
        >
          <GymsView />
          <div class="hud-spacer-bottom" />
        </div>
      </div>

      <!-- HUD SIDEBAR (HERRAMIENTAS IZQUIERDA) -->
      <HUD_SidebarLeft
        class="hud-sidebar-tools"
      >
        <GlobalChat />
        <LocalDebugPanel />
      </HUD_SidebarLeft>

      <!-- HUD INFERIOR (NAVIGATION MOBILE) -->
      <div 
        v-if="gs.starterChosen"
        ref="hudBottomRef"
        class="hud-bottom-wrapper"
        :class="{ 'hud-visible-active': isHudHidden }"
      >
        <HUD_Navigation 
          class="mobile-only-nav"
          position="bottom" 
        />
      </div>

      <!-- OVERLAYS GLOBALES -->
      <div class="global-overlays">
        <BuffsOverlay />
        <CriminalityBar />
        <DirectChatWindow 
          v-for="(_chat, friendId) in chatStore.privateChats" 
          :key="friendId"
          :friend-id="(friendId as string)"
        />
      </div>

      <!-- BATTLE ARENA (ABOVE ALL) -->
      <PvPArena v-if="battleStore.isBattleActive" />
    </div>
  </div>
</template>

<style lang="scss">
@use "../../styles/views/main-game-view" as *;
</style>
