<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { checkDBCompatibility, DBRouter, type DBCompatibilityResponse } from '@/logic/db/dbRouter'

import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import BattleArena from '@/components/BattleArena.vue'
import PWAManager from '@/components/common/PWAManager.vue'
import SVGFilters from '@/components/common/SVGFilters.vue'
import VersionLockOverlay from '@/components/overlays/VersionLockOverlay.vue'
import SessionLockOverlay from '@/components/overlays/SessionLockOverlay.vue'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useLoadingStore } from '@/stores/loading'
import { useBodyClass } from '@/composables/useBodyClass'
import { useWindowListener } from '@/composables/useWindowListener'
import { logger } from '@/logic/utils/logger'

import { useProfileStore } from '@/stores/profile'
import { useSocialStore } from '@/stores/social'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const profileStore = useProfileStore()
const socialStore = useSocialStore()
const battleStore = useBattleStore()
const loadingStore = useLoadingStore()
const route = useRoute()
const dbIncompatible = ref(false)
const dbVersionInfo = ref<DBCompatibilityResponse | null>(null)
const dismissedLock = computed({
  get: () => uiStore.hasDismissedSessionLock,
  set: (val) => { uiStore.hasDismissedSessionLock = val }
})

const isLoginPage = computed(() => {
  if (typeof window === 'undefined') return false
  return window.location?.pathname === '/login' || route.path === '/login'
})

const isSandboxPage = computed(() => {
  if (typeof window === 'undefined') return false
  return window.location?.pathname === '/showdown-sandbox' || route.path === '/showdown-sandbox'
})

const loadingInfo = computed(() => {
  // 1. Centralized Loading Store (Highest Priority)
  if (loadingStore.isActive) {
    const cur = loadingStore.current
    return { 
      active: true, 
      msg: cur?.message || 'Cargando...', 
      sub: cur?.subMessage || '',
      global: cur?.isGlobal || false
    }
  }

  // 2. Auth Loading
  if (authStore.loading) {
    return { active: true, msg: 'Iniciando sesión...', sub: 'Conectando con el servidor', global: false }
  }
  
  // 3. Game Data & Engine Boot (ULTRA-STICKY GATE)
  // No soltamos la pantalla negra hasta que TODO el motor esté listo
  if (authStore.user && !isLoginPage.value && !isSandboxPage.value && (!gameStore.isDataLoaded || !gameStore.isEngineReady)) {
    const msg = !gameStore.isDataLoaded ? 'Cargando datos...' : 'Iniciando motor...'
    
    return { 
      active: true, 
      msg, 
      sub: 'Preparando entorno de juego', 
      global: false 
    }
  }

  // 4. Manual Overlays
  if (gameStore.state.isOverlayLoading) {
    return { 
      active: true, 
      msg: gameStore.state.overlayMessage || 'Procesando...', 
      sub: 'Por favor, no cierres la ventana',
      global: true 
    }
  }

  return { active: false, msg: '', sub: '', global: false }
})

const isReadyToSeeGame = computed(() => {
  return authStore.user && loadingStore.isGateOpen
})

onMounted(async () => {
  // 1. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()


  // 2. Recuperar sesión (Autologin)
  if (isLoginPage.value || isSandboxPage.value) {
    loadingStore.clearAll() // Limpiar TODO si es login o sandbox
    loadingStore.markAppMounted() // Abrir puerta inmediatamente
  }
  await authStore.checkSession()

  // 3. Check DB Compatibility & Load Game (Omitir si estamos en login o sandbox para evitar bloqueos)
  if (authStore.user && !isLoginPage.value && !isSandboxPage.value) {
    const comp = await checkDBCompatibility(gameStore.db as unknown as DBRouter)
    if (!comp.compatible) {
      dbIncompatible.value = true
      dbVersionInfo.value = comp
      return // Stop initialization
    }
    
    // Si la DB es compatible, cargar la partida
    await gameStore.loadGame()
    
    // Restaurar combate si existe uno activo en el estado guardado
    if (gameStore.state.activeBattle && !gameStore.state.activeBattle.over) {
      logger.info('App', 'Detectado combate persistente. Restaurando estado...')
      battleStore.restoreBattle(gameStore.state.activeBattle)
    }
    
    // Sincronizar datos del perfil
    profileStore.syncProfileFromAuth(authStore.user!, gameStore.state)
    
    // Iniciar presencia social globalmente para reportar estado online
    socialStore.startPresence()
  }
  
  // 4. Restore & Sync Zoom Level
  uiStore.setZoom(uiStore.appZoom)
})

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

const handleReclaim = async () => {
  await gameStore.reclaimControl()
  dismissedLock.value = true
}

// GSAP Transitions for Loading Overlay
const loaderTween = ref<gsap.core.Tween | null>(null)

const onLoadingEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none', onComplete: done })
  
  const loaderEl = el.querySelector('.loader')
  if (loaderEl) {
    if (loaderTween.value) loaderTween.value.kill()
    loaderTween.value = gsap.to(loaderEl, {
      rotation: 360,
      duration: 1,
      repeat: -1,
      ease: 'none'
    })
  }
}

const onLoadingLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, duration: 0.8, ease: 'power2.inOut', onComplete: () => {
    if (loaderTween.value) {
      loaderTween.value.kill()
      loaderTween.value = null
    }
    done()
  } })
}
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND (Only visible when game is fully ready and NOT loading) -->
    <div 
      v-show="isReadyToSeeGame || isLoginPage || isSandboxPage"
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
        <div
          v-if="!loadingStore.isGateOpen && (!isLoginPage || loadingInfo.active) && !dbIncompatible && !isSandboxPage"
          class="loading-overlay"
          :class="{ 'global-overlay': loadingInfo.global }"
        >
          <div class="loader" />
          <p>{{ loadingInfo.msg }}</p>
          <span 
            v-if="loadingInfo.sub" 
            class="sub-text"
          >
            {{ loadingInfo.sub }}
          </span>
        </div>
      </Transition>
    </Teleport>

    <!-- Vistas de Ruta (Login y Sandbox tienen prioridad absoluta) -->
    <template v-if="isLoginPage || isSandboxPage">
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
          :db-version="dbVersionInfo?.db"
          @retry="handleRetry"
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

.zoom-target {
  zoom: var(--app-zoom, 1);
  @include gpu-layer;
  will-change: zoom, transform;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: $black;
  z-index: var(--z-max);
  color: var(--yellow);
  @include pixelated;
  font-size: 12px;
  text-align: center;
}

.loading-overlay p {
  margin-top: 25px;
  margin-bottom: 10px;
}

.loading-overlay .sub-text {
  font-size: 8px;
  opacity: 0.6;
  text-transform: uppercase;
}

.loading-overlay.global-overlay {
  background: Rgba(0, 0, 0, 0.95);
  -webkit-will-change: opacity;
  will-change: opacity;
  @include gpu-layer;
}


.loader {
  width: 50px;
  height: 50px;
  border: 5px solid Rgba(255, 255, 255, 0.1);
  border-top-color: var(--yellow);
  border-radius: 50%;
}

/* Overlays are styled inside their respective SFC components */

</style>
