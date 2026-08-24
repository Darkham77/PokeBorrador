<script setup lang="ts">
// fallow-ignore-file security-sink
import { onMounted, ref, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/utils/errorHandler'
import { checkDBCompatibility, DBRouter, type DBCompatibilityResponse, checkAppVersionCompatibility, type AppCompatibilityResponse } from '@/logic/db/dbRouter'

import MainGameView from '@/views/game/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import BattleArena from '@/components/battle/BattleArena.vue'
import PWAManager from '@/components/common/PWAManager.vue'
import SVGFilters from '@/components/common/SVGFilters.vue'
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'
import VersionLockOverlay from '@/components/overlays/VersionLockOverlay.vue'
import SessionLockOverlay from '@/components/overlays/SessionLockOverlay.vue'
import { gameBus } from '@/logic/events/gameBus'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { useLoadingStore } from '@/stores/loading'
import { useBodyClass } from '@/composables/ui/useBodyClass'
import { useWindowListener } from '@/composables/ui/useWindowListener'
import { useAudioStore } from '@/stores/audio'
import { logger } from '@/logic/utils/logger'

import { useProfileStore } from '@/stores/player/profile'
import { useSocialStore } from '@/stores/social/social'
import { useRoute, useRouter } from 'vue-router'
import { useBackNavigation } from '@/composables/system/useBackNavigation'
import { usePWA } from '@/composables/system/usePWA'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const profileStore = useProfileStore()
const socialStore = useSocialStore()
const battleStore = useBattleStore()
const loadingStore = useLoadingStore()
const route = useRoute()
const router = useRouter()

const { 
  needRefresh, 
  isUpdating,
  handleUpdate
} = usePWA()


// Initialize back navigation gesture handler for mobile/hardware back button
useBackNavigation()

declare const __APP_VERSION__: string


const dbIncompatible = ref(false)
const dbVersionInfo = ref<DBCompatibilityResponse | null>(null)
const appIncompatible = ref(false)
const appVersionInfo = ref<AppCompatibilityResponse | null>(null)
// Mutex: prevents concurrent executions of initGameSession() caused by the
// watcher firing while onMounted's async call is still in progress.
const isSessionInitializing = ref(false)
const dismissedLock = computed({
  get: () => uiStore.hasDismissedSessionLock,
  set: (val) => { uiStore.hasDismissedSessionLock = val }
})

const isLoginPage = computed(() => {
  if (typeof window === 'undefined') return false
  const path = router?.currentRoute?.value?.path || route.path
  return window.location?.pathname === '/login' || path === '/login'
})


const isAdventureTestPage = computed(() => {
  if (typeof window === 'undefined') return false
  const path = router?.currentRoute?.value?.path || route.path
  return window.location?.pathname === '/test-aventura' || path === '/test-aventura'
})

const loadingInfo = computed(() => {
  // 1. Centralized Loading Store (Highest Priority)
  if (loadingStore.isActive) {
    const cur = loadingStore.current
    return { 
      active: true, 
      msg: cur?.message || 'Cargando...', 
      sub: cur?.subMessage || '',
      global: cur?.isGlobal || false,
      icon: cur?.icon || '📶'
    }
  }

  // 2. Auth Loading
  if (authStore.loading) {
    return { active: true, msg: 'Iniciando sesión...', sub: 'Conectando con el servidor', global: false, icon: '📶' }
  }
  
  // 3. Game Data & Engine Boot (ULTRA-STICKY GATE)
  // No soltamos la pantalla negra hasta que TODO el motor esté listo
  if (authStore.user && !isLoginPage.value && !isAdventureTestPage.value && (!gameStore.isDataLoaded || !gameStore.isEngineReady)) {
    const msg = !gameStore.isDataLoaded ? 'Cargando datos...' : 'Iniciando motor...'
    
    return { 
      active: true, 
      msg, 
      sub: 'Preparando entorno de juego', 
      global: false,
      icon: !gameStore.isDataLoaded ? '📂' : '⚙️'
    }
  }

  // 4. Manual Overlays
  if (gameStore.state.isOverlayLoading) {
    return { 
      active: true, 
      msg: gameStore.state.overlayMessage || 'Procesando...', 
      sub: 'Por favor, no cierres la ventana',
      global: true,
      icon: '⏳'
    }
  }

  return { active: false, msg: '', sub: '', global: false, icon: '📶' }
})

const isReadyToSeeGame = computed(() => {
  return authStore.user && gameStore.isReady && loadingStore.isGateOpen
})

const showLoadingOverlay = computed(() => {
  if (dbIncompatible.value) return false
  if (isAdventureTestPage.value) return false
  // Show global blocking overlay for updates only if the user is currently logged in/playing.
  // If they are logged out (on the login page), we don't cover the screen with the global loading overlay,
  // allowing the login view to render and present the update option inline.
  if (needRefresh.value && authStore.user) return true

  if (isLoginPage.value) {
    return loadingInfo.value.active
  }

  if (authStore.user) {
    return !gameStore.isReady || !loadingStore.isGateOpen
  }

  return !loadingStore.isGateOpen
})

const initGameSession = async () => {
  if (isSessionInitializing.value) return
  if (authStore.user && !isLoginPage.value && !isAdventureTestPage.value && !gameStore.isReady) {
    isSessionInitializing.value = true
    try {
      const comp = await checkDBCompatibility(gameStore.db as DBRouter) // domain-ok
      if (!comp.compatible) {
        dbIncompatible.value = true
        dbVersionInfo.value = comp
        return
      }

      const appComp = await checkAppVersionCompatibility(gameStore.db as DBRouter) // domain-ok
      if (!appComp.compatible) {
        appVersionInfo.value = appComp
        if (appComp.error === 'OUTDATED_SERVER') {
          appIncompatible.value = true
          return
        } else if (appComp.error === 'OUTDATED_CLIENT') {
          logger.warn('App', `Cliente desactualizado (${appComp.client}) vs Servidor (${appComp.server}). Mostrando botón de actualización manual.`)
          gameBus.emit('PWA_NEED_REFRESH')
          return
        }
      }
      
      await gameStore.loadGame()
      
      if (gameStore.state.activeBattle && !gameStore.state.activeBattle.over) {
        logger.info('App', 'Detectado combate persistente. Restaurando estado...')
        await battleStore.restoreBattle(gameStore.state.activeBattle)
      }
      
      profileStore.syncProfileFromAuth(authStore.user, gameStore.state)
      socialStore.startPresence()
    } finally {
      isSessionInitializing.value = false
    }
  }
}

const updateScrollbarWidth = () => {
  if (typeof window === 'undefined') return
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
}

useWindowListener('resize', updateScrollbarWidth)

onMounted(async () => {
  // 1. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()

  // PWA version check — isolated IIFE so an early return never skips steps 2-5
  await (async () => {
    if (import.meta.env.DEV) return
    try {
    const verUrl = new URL(`${import.meta.env.BASE_URL}version.json`, window.location.origin)
    verUrl.searchParams.set('t', Temporal.Now.instant().epochMilliseconds.toString())
    const response = await fetch(verUrl, {
      cache: 'no-store'
    })
    if (response.ok) {
      const data = await response.json() as { version?: string }
      const serverVersion = data.version || ''
      const clientVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''
      
      if (clientVersion && serverVersion && clientVersion < serverVersion) {
        logger.warn('App', `PWA: Client version (${clientVersion}) is older than server version (${serverVersion}). Presentando cartel de actualización manual.`)
        gameBus.emit('PWA_NEED_REFRESH')
      }
    }
  } catch (e) {
    logger.error('App', 'Failed to check PWA version.json', (e as Error).message)
  }
  })()

  // 2. Recuperar sesión (Autologin)
  if (isLoginPage.value || isAdventureTestPage.value) {
    loadingStore.clearAll() // Limpiar TODO si es login o sandbox
    loadingStore.markAppMounted() // Abrir puerta inmediatamente
  }
  await authStore.checkSession()

  // 3. Check DB Compatibility & Load Game
  await initGameSession()
  
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
  () => [authStore.user, isLoginPage.value, isAdventureTestPage.value],
  async () => {
    await initGameSession()
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
  const target = e.target as HTMLElement | null
  if (!target || typeof target.closest !== 'function') return

  const isInsideModal = target.closest('.base-modal-root, .base-modal-content, .modal-host')
  const isScrollable = (el: HTMLElement) => {
    if (!el || el === document.body || el === document.documentElement) return false
    const style = window.getComputedStyle(el)
    const overflow = style.overflow + style.overflowY + style.overflowX
    return /(auto|scroll)/.test(overflow)
  }

  // Find the nearest scrollable parent
  let curr: HTMLElement | null = target
  let foundScrollable = null
  while (curr && curr !== document.body) {
    if (isScrollable(curr)) {
      foundScrollable = curr
      break
    }
    curr = curr.parentElement
  }

  // CRITICAL: If we are inside a modal or a scrollable view, STOP propagation
  if (foundScrollable || isInsideModal) {
    e.stopPropagation()
    return
  }

  // 2. Only block the event entirely if a modal is open AND we are NOT inside it
  if (uiStore.isAnyBlockingModalOpen) {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
}

// Managed Window Listeners (Safe Lifecycle)
useWindowListener('wheel', blockEvents, { capture: true, passive: false }); // [PureVue-Ignore]
useWindowListener('touchmove', blockEvents, { capture: true, passive: false }); // [PureVue-Ignore]

// Bloqueo de Scroll Global para Modales (Pure Vue Managed)
useBodyClass('modal-open', () => uiStore.isAnyBlockingModalOpen)

const handleRetry = () => {
  window.location.reload()
}

const handleLogout = async () => {
  // Reset all version/compatibility lock flags BEFORE logout so the login
  // page renders cleanly instead of getting stuck on "CONECTANDO..."
  appIncompatible.value = false
  dbIncompatible.value = false
  appVersionInfo.value = null
  dbVersionInfo.value = null
  loadingStore.clearAll()
  loadingStore.markAppMounted()
  await authStore.logout()
}

const handleReclaim = async () => {
  await gameStore.reclaimControl()
  dismissedLock.value = true
}

// GSAP Transitions for Loading Overlay
const onLoadingEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none', onComplete: done })
}

const onLoadingLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, duration: 0.8, ease: 'power2.inOut', onComplete: done })
}
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND (Only visible when game is fully ready and NOT loading) -->
    <div 
      v-show="isReadyToSeeGame || isLoginPage || isAdventureTestPage"
      class="global-background-stars" 
    />

    <!-- GLOBAL LOADING OVERLAY -->
    <Teleport to="body">
      <Transition
        appear
        :css="false"
        @enter="onLoadingEnter"
        @leave="onLoadingLeave"
      >
        <PVLoadingOverlay
          v-if="showLoadingOverlay"
          :title="needRefresh ? 'NUEVA VERSIÓN' : loadingInfo.msg"
          :message="needRefresh ? (gameStore.isReady ? '¡Hay una nueva versión disponible! Para evitar la corrupción de datos en tu partida guardada, debes cerrar tu sesión e instalar la actualización de forma segura desde la pantalla de inicio.' : '¡Hay una nueva versión disponible! Es necesario cerrar tu sesión para poder instalarla y mantener la compatibilidad con el servidor.') : loadingInfo.sub"
          :status-text="needRefresh ? (isUpdating ? 'ACTUALIZANDO...' : 'ACTUALIZACIÓN REQUERIDA') : 'CONECTANDO...'"
          :icon="needRefresh ? '🔄' : loadingInfo.icon"
          :show-spinner="!needRefresh || isUpdating"
          :theme="needRefresh ? 'warning' : 'default'"
          :card-class="loadingInfo.global ? 'global-overlay' : ''"
        >
          <template
            v-if="needRefresh"
            #actions
          >
            <button
              class="pv-button-retro"
              @click.stop="handleUpdate()"
            >
              CERRAR SESIÓN Y ACTUALIZAR
            </button>
          </template>
        </PVLoadingOverlay>
      </Transition>
    </Teleport>

    <template v-if="isLoginPage || isAdventureTestPage">
      <router-view />
    </template>
    
    <template v-else-if="authStore.user">
      <!-- Bloqueo por Versión Outdated -->
      <Teleport
        v-if="dbIncompatible"
        to="body"
      >
        <VersionLockOverlay
          :client-version="dbVersionInfo?.client"
          :target-version="dbVersionInfo?.db"
          lock-type="database"
          @retry="handleRetry"
          @logout="handleLogout"
        />
      </Teleport>

      <!-- Bloqueo por Versión de Compilación Vieja -->
      <Teleport
        v-else-if="appIncompatible"
        to="body"
      >
        <VersionLockOverlay
          :client-version="appVersionInfo?.client"
          :target-version="appVersionInfo?.server"
          lock-type="server"
          @retry="handleRetry"
          @logout="handleLogout"
        />
      </Teleport>

      <template v-else-if="gameStore.isReady">
        <MainGameView v-show="!uiStore.isAnyFullscreenModalOpen" />

        <!-- Bloqueo por Sesión (Last-In-Wins) -->
        <Teleport
          v-if="gameStore.isSaveLocked && !dismissedLock"
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
    <ModalHost />
    <ToastNotification />
    <ConnectionWarning />
    <LivePvPArena />
    <BattleArena />
    <PWAManager />
    
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
