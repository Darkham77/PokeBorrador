<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { defineResilientAsyncComponent } from '@/logic/utils/resilientComponent'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/utils/errorHandler'

const MainGameView = defineResilientAsyncComponent(() => import('@/views/game/MainGameView.vue'))
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
const BattleArena = defineResilientAsyncComponent(() => import('@/components/battle/BattleArena.vue'))
import PWAManager from '@/components/common/PWAManager.vue'
import SVGFilters from '@/components/common/SVGFilters.vue'
import AppLoadingOverlayHost from '@/components/overlays/AppLoadingOverlayHost.vue'
const AppVersionLockHost = defineResilientAsyncComponent(() => import('@/components/overlays/AppVersionLockHost.vue'))
const SessionLockOverlay = defineResilientAsyncComponent(() => import('@/components/overlays/SessionLockOverlay.vue'))
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { useLoadingStore } from '@/stores/loading'
import { useBodyClass } from '@/composables/ui/useBodyClass'
import { useWindowListener } from '@/composables/ui/useWindowListener'
import { useAudioStore } from '@/stores/audio'
import { logger } from '@/logic/utils/logger'

import { useProfileStore } from '@/stores/player/profile'
import { useSocialStore } from '@/stores/social/social'
import { useRouter } from 'vue-router'
import { useBackNavigation } from '@/composables/system/useBackNavigation'
import { usePWA } from '@/composables/system/usePWA'
import { useRetroGamepad } from '@/composables/system/useRetroGamepad'
import { useUpdateStore } from '@/stores/update'
import { useAppRouteGate } from '@/composables/system/useAppRouteGate.ts'
import {
  resolveAppLoadingInfo,
  shouldShowLoadingOverlay,
  resolveUpdateOverlayMessage
} from '@/composables/system/appLoadingHelper.ts'
import {
  checkClientPwaVersion,
  handleGlobalBlockEvent,
  shouldInitSession,
  runSessionInitialization
} from '@/composables/system/appSessionHelper.ts'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const profileStore = useProfileStore()
const socialStore = useSocialStore()
const battleStore = useBattleStore()
const loadingStore = useLoadingStore()
const updateStore = useUpdateStore()
const router = useRouter()

const { isLoginPage, isStandaloneDevPage } = useAppRouteGate()

const { 
  needRefresh, 
  isUpdating,
  handleUpdate
} = usePWA()

// Initialize back navigation gesture handler for mobile/hardware back button
useBackNavigation()
// Initialize retro controller and gamepad support
useRetroGamepad()

declare const __APP_VERSION__: string

const dbIncompatible = computed(() => updateStore.modalType === 'db_outdated')
const dbVersionInfo = computed(() => updateStore.versionInfo ? { client: updateStore.versionInfo.client, db: updateStore.versionInfo.db || updateStore.versionInfo.server, compatible: false } : null)
const appIncompatible = computed(() => updateStore.modalType === 'server_outdated')
const appVersionInfo = computed(() => updateStore.versionInfo ? { client: updateStore.versionInfo.client, server: updateStore.versionInfo.server, compatible: false, error: 'OUTDATED_SERVER' as const } : null)
// Mutex: prevents concurrent executions of initGameSession() caused by the
// watcher firing while onMounted's async call is still in progress.
const isSessionInitializing = ref(false)
const dismissedLock = computed({
  get: () => uiStore.hasDismissedSessionLock,
  set: (val) => { uiStore.hasDismissedSessionLock = val }
})

const loadingInfo = computed(() => {
  return resolveAppLoadingInfo({
    loadingStoreActive: loadingStore.isActive,
    loadingStoreCurrent: loadingStore.current,
    authLoading: authStore.loading,
    hasUser: Boolean(authStore.user),
    isLoginPage: isLoginPage.value,
    isStandaloneDevPage: isStandaloneDevPage.value,
    isDataLoaded: gameStore.isDataLoaded,
    isEngineReady: gameStore.isEngineReady,
    isOverlayLoading: gameStore.state.isOverlayLoading,
    overlayMessage: gameStore.state.overlayMessage
  })
})

const isReadyToSeeGame = computed(() => {
  return authStore.user && gameStore.isReady && loadingStore.isGateOpen
})

const showLoadingOverlay = computed(() => {
  return shouldShowLoadingOverlay({
    updateModalType: updateStore.modalType,
    isStandaloneDevPage: isStandaloneDevPage.value,
    isUpdateAvailable: updateStore.isUpdateAvailable,
    hasUser: Boolean(authStore.user),
    isLoginPage: isLoginPage.value,
    loadingActive: loadingInfo.value.active,
    gameReady: gameStore.isReady,
    isGateOpen: loadingStore.isGateOpen
  })
})

const overlayTitle = computed(() => (needRefresh.value ? 'NUEVA VERSIÓN' : loadingInfo.value.msg))
const overlayMessage = computed(() => (needRefresh.value ? resolveUpdateOverlayMessage(gameStore.isReady) : loadingInfo.value.sub))
const overlayStatusText = computed(() => {
  if (!needRefresh.value) return 'CONECTANDO...'
  return isUpdating.value ? 'ACTUALIZANDO...' : 'ACTUALIZACIÓN REQUERIDA'
})
const overlayIcon = computed(() => (needRefresh.value ? '🔄' : loadingInfo.value.icon))
const overlayShowSpinner = computed(() => !needRefresh.value || isUpdating.value)
const overlayTheme = computed<'warning' | 'default'>(() => (needRefresh.value ? 'warning' : 'default'))
const overlayCardClass = computed(() => (loadingInfo.value.global ? 'global-overlay' : ''))

const showGlobalStars = computed(() => isReadyToSeeGame.value || isLoginPage.value || isStandaloneDevPage.value)
const showSessionLock = computed(() => Boolean(gameStore.isSaveLocked && !dismissedLock.value))

const initGameSession = async () => {
  if (!shouldInitSession({
    isInitializing: isSessionInitializing.value,
    isStandaloneDev: isStandaloneDevPage.value,
    hasUser: Boolean(authStore.user),
    isLogin: isLoginPage.value,
    isGameReady: gameStore.isReady
  })) {
    return
  }
  isSessionInitializing.value = true
  try {
    await runSessionInitialization({
      gameStore,
      updateStore,
      battleStore,
      router,
      uiStore,
      authStore,
      profileStore,
      socialStore
    })
  } finally {
    isSessionInitializing.value = false
  }
}

const updateScrollbarWidth = () => {
  if (typeof window === 'undefined') return
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
}

const checkPwaVersion = async () => {
  const clientVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''
  await checkClientPwaVersion(clientVersion, updateStore)
}

useWindowListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkPwaVersion()
  }
})

useWindowListener('resize', updateScrollbarWidth)

onMounted(async () => {
  // 1. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()

  // PWA version check — isolated call so errors never block session init
  await checkPwaVersion()

  // 2. Recuperar sesión (Autologin)
  if (isLoginPage.value || isStandaloneDevPage.value) {
    loadingStore.clearAll() // Limpiar TODO si es login o sandbox
    loadingStore.markAppMounted() // Abrir puerta inmediatamente
  }
  await authStore.checkSession()

  // 3. Check DB Compatibility & Load Game
  if (!isStandaloneDevPage.value) {
    await initGameSession()
  }
  
  // 4. Restore & Sync Zoom Level
  uiStore.setZoom(uiStore.appZoom)
  
  // 5. Calculate scrollbar width for responsive positioning
  updateScrollbarWidth()

  // 6. Initialize audio context on first user interaction globally
  const audioStore = useAudioStore()
  const initAudio = () => {
    audioStore.init()
    audioStore.resume()
    document.removeEventListener('click', initAudio, { capture: true })
    document.removeEventListener('keydown', initAudio, { capture: true })
  }
  document.addEventListener('click', initAudio, { once: true, capture: true })
  document.addEventListener('keydown', initAudio, { once: true, capture: true })
})

// Sincronizar estado de la partida reactivamente al cambiar de ruta o usuario
watch(
  () => [authStore.user, isLoginPage.value, isStandaloneDevPage.value],
  async () => {
    if (!isStandaloneDevPage.value) {
      await initGameSession()
    }
  }
)

// RE-APPLY ZOOM on login/user changes to prevent PWA resolution glitches
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    logger.info('App', 'Usuario detectado, re-aplicando escala visual...')
    uiStore.setZoom(uiStore.appZoom)
  } else {
    // Detener pings de presencia si el usuario cierra sesión
    socialStore.stopPresence()
  }
})

// Intercept low-level events to prevent them from reaching background interactions when modals are open
const blockEvents = (e: Event) => {
  handleGlobalBlockEvent(e, uiStore.isAnyBlockingModalOpen, isStandaloneDevPage.value)
}

// Managed Window Listeners (Safe Lifecycle)
useWindowListener('wheel', blockEvents, { capture: true, passive: false }); // [PureVue-Ignore]
useWindowListener('touchmove', blockEvents, { capture: true, passive: false }); // [PureVue-Ignore]

// Bloqueo de Scroll Global para Modales (Pure Vue Managed)
useBodyClass('modal-open', () => uiStore.isAnyBlockingModalOpen)

const handleRetry = () => {
  updateStore.retryCheck()
}

const handleLogout = async () => {
  loadingStore.clearAll()
  loadingStore.markAppMounted()
  await updateStore.exitToLogin()
}

const handleReclaim = async () => {
  await gameStore.reclaimControl()
  dismissedLock.value = true
}

</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND (Only visible when game is fully ready and NOT loading) -->
    <div 
      v-show="showGlobalStars"
      class="global-background-stars" 
    />

    <!-- GLOBAL LOADING OVERLAY -->
    <AppLoadingOverlayHost
      :show="showLoadingOverlay"
      :title="overlayTitle"
      :message="overlayMessage"
      :status-text="overlayStatusText"
      :icon="overlayIcon"
      :show-spinner="overlayShowSpinner"
      :theme="overlayTheme"
      :card-class="overlayCardClass"
      :need-refresh="needRefresh"
      @update="handleUpdate({ forceNoSave: true, targetPath: 'login' })"
    />

    <template v-if="isLoginPage || isStandaloneDevPage">
      <router-view />
    </template>
    
    <template v-else-if="authStore.user">
      <!-- Bloqueo por Versión (Base de Datos o Servidor) -->
      <AppVersionLockHost
        v-if="dbIncompatible || appIncompatible"
        :db-incompatible="dbIncompatible"
        :app-incompatible="appIncompatible"
        :db-version-info="dbVersionInfo"
        :app-version-info="appVersionInfo"
        @retry="handleRetry"
        @logout="handleLogout"
      />

      <template v-else-if="gameStore.isReady">
        <MainGameView v-show="!uiStore.isAnyFullscreenModalOpen" />

        <!-- Bloqueo por Sesión (Last-In-Wins) -->
        <Teleport
          v-if="showSessionLock"
          to="body"
        >
          <SessionLockOverlay
            @reclaim="handleReclaim"
            @dismiss="dismissedLock = true"
          />
        </Teleport>
      </template>
    </template>

    <router-view v-else-if="!authStore.loading" />

    <!-- Error Global UI -->
    <ErrorOverlay />
    <ToastNotification />
    <template v-if="!isStandaloneDevPage">
      <ModalHost />
      <ConnectionWarning />
      <BattleArena />
      <PWAManager />
    </template>
    
    <!-- Optimized SVG Filters for Pixel Art -->
    <SVGFilters />
  </div>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

#vue-app {
  width: 100dvw;
  height: 100dvh;
  max-width: 100dvw;
  max-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none !important;
  overscroll-behavior-x: none !important;
  overscroll-behavior-y: none !important;
  position: relative;
  margin: 0;
  padding: 0;
  background: $darker;
}

.pwa-progress-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.pwa-progress-container {
  width: 100%;
  height: 16px;
  background: Rgba(0, 0, 0, 0.5);
  border: 2px solid var(--yellow);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.pwa-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--yellow) 0%, #ffc107 100%);
  box-shadow: 0 0 8px var(--yellow);
}

.pwa-progress-text {
  font-family: var(--font-pixel);
  font-size: 8px;
  color: #fff;
  text-shadow: 1px 1px 0 #000;
  @include pixelated;
}

.pv-button-retro {
  @include pixelated;
  background: var(--yellow);
  color: black;
  border: none;
  padding: 12px 24px;
  font-size: 12px;
  cursor: pointer;
  
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 4px 0 #b39200;
  margin-top: 15px;
  
  &:hover {
    transform: Translatey(-2px);
    box-shadow: 0 6px 0 #b39200;
  }
  
  &:active {
    transform: Translatey(2px);
    box-shadow: 0 0 0 #b39200;
  }
}

.zoom-target {
  zoom: var(--app-zoom, 1);
  @include gpu-layer;
  will-change: zoom, transform;
}

/* Overlays are styled inside their respective SFC components */

</style>
