<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { initBaseBridge } from '@/logic/bridges/baseBridge'
import { checkDBCompatibility } from '@/logic/db/dbRouter'

import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import BattleArena from '@/components/BattleArena.vue'
import PWAManager from '@/components/common/PWAManager.vue'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useLoadingStore } from '@/stores/loading'
import { useBodyClass } from '@/composables/useBodyClass'
import { useWindowListener } from '@/composables/useWindowListener'

import { useProfileStore } from '@/stores/profile'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const profileStore = useProfileStore()
const _battleStore = useBattleStore()
const loadingStore = useLoadingStore()
const route = useRoute()
const dbIncompatible = ref(false)
const dbVersionInfo = ref(null)

const isLoginPage = computed(() => {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/login' || route.path === '/login'
})

const loadingInfo = computed(() => {
  // 1. Centralized Loading Store (Highest Priority)
  if (loadingStore.isActive) {
    const cur = loadingStore.current
    return { 
      active: true, 
      msg: cur.message, 
      sub: cur.subMessage,
      global: cur.isGlobal 
    }
  }

  // 2. Auth Loading
  if (authStore.loading) {
    return { active: true, msg: 'Iniciando sesión...', sub: 'Conectando con el servidor', global: false }
  }
  
  // 3. Game Data & Engine Boot (ULTRA-STICKY GATE)
  // No soltamos la pantalla negra hasta que TODO el motor esté listo
  if (authStore.user && !isLoginPage.value && (!gameStore.isDataLoaded || !gameStore.isEngineReady)) {
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
  initBaseBridge()

  // 2. Recuperar sesión (Autologin)
  if (isLoginPage.value) {
    loadingStore.clearAll() // Limpiar TODO si es login
    loadingStore.markAppMounted() // Abrir puerta inmediatamente
  }
  await authStore.checkSession()

  // 3. Check DB Compatibility & Load Game (Omitir si estamos en login para evitar bloqueos)
  if (authStore.user && !isLoginPage.value) {
    const comp = await checkDBCompatibility(gameStore.db)
    if (!comp.compatible) {
      dbIncompatible.value = true
      dbVersionInfo.value = comp
      return // Stop initialization
    }
    
    // Si la DB es compatible, cargar la partida
    await gameStore.loadGame()
    
    // Restaurar combate si existe uno activo en el estado guardado
    if (gameStore.state.activeBattle && !gameStore.state.activeBattle.over) {
      console.log('[App] Detectado combate persistente. Restaurando estado...')
      _battleStore.syncFromLegacy(gameStore.state.activeBattle)
    }
    
    // Sincronizar datos del perfil
    profileStore.syncProfileFromAuth(authStore.user, gameStore.state)
  }
  
  // 4. Restore Zoom Level
  uiStore.setZoom(uiStore.appZoom)
})

// Intercept low-level events to prevent them from reaching background interactions when modals are open
const blockEvents = (e) => {
  if (!e.target || typeof e.target.closest !== 'function') return

  const isInsideModal = e.target.closest('.base-modal-root, .base-modal-content, .modal-host')
  const isScrollable = (el) => {
    if (!el || el === document.body || el === document.documentElement) return false
    const style = window.getComputedStyle(el)
    const overflow = style.overflow + style.overflowY + style.overflowX
    return /(auto|scroll)/.test(overflow)
  }

  // Find the nearest scrollable parent
  let curr = e.target
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
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND (Only visible when game is fully ready and NOT loading) -->
    <div 
      v-show="isReadyToSeeGame || isLoginPage"
      class="global-background-stars" 
    />

    <!-- Pantalla de carga unificada (v-if para sacar del DOM al terminar o si es login) -->
    <div
      v-if="!loadingStore.isGateOpen && !isLoginPage"
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

    <!-- Vistas de Ruta (Login tiene prioridad absoluta) -->
    <template v-if="isLoginPage">
      <router-view />
    </template>
    
    <template v-else-if="authStore.user">
      <template v-if="gameStore.isReady">
        <MainGameView v-show="!uiStore.isAnyFullscreenModalOpen" />
        
        <!-- Bloqueo por Versión Outdated -->
        <div
          v-if="dbIncompatible"
          class="loading-overlay version-lock"
        >
          <div class="lock-icon">
            ⚠️
          </div>
          <h2>SERVIDOR DESACTUALIZADO</h2>
          <p>Tu cliente (v{{ dbVersionInfo.client }}) es más moderno que el servidor (v{{ dbVersionInfo.db }}).</p>
          <p class="admin-note">
            Por favor, contacta al administrador para actualizar la base de datos.
          </p>
          <div
            class="retry-btn"
            @click.stop="handleRetry"
          >
            REINTENTAR
          </div>
        </div>
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
    <svg
      style="visibility: hidden; position: absolute;"
      width="0"
      height="0"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
    >
      <defs>
        <filter id="pixel-outline-optimized">
          <feMorphology
            in="SourceAlpha"
            result="expanded"
            operator="dilate"
            radius="1"
          />
          <feFlood
            flood-color="black"
            result="black"
          />
          <feComposite
            in="black"
            in2="expanded"
            operator="in"
            result="outline"
          />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  </div>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

#vue-app {
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.zoom-target {
  zoom: var(--app-zoom, 1);
  @include gpu-layer;
  will-change: zoom, transform;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
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
  -webkit-backdrop-filter: Blur(8px);
  backdrop-filter: Blur(8px);
  @include gpu-layer;
}


.loader {
  width: 50px;
  height: 50px;
  border: 5px solid Rgba(255, 255, 255, 0.1);
  border-top-color: var(--yellow);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: Rotate(360deg); }
}

.version-lock .lock-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.version-lock h2 {
  color: #ff3333;
  margin-bottom: 15px;
}

.version-lock p {
  margin-top: 5px;
  color: $white;
}

.version-lock .admin-note {
  color: var(--yellow);
  opacity: 0.8;
  font-size: 10px;
}

.retry-btn {
  margin-top: 30px;
  padding: 10px 20px;
  background: #ff3333;
  color: $white;
  cursor: pointer;
  border: 2px solid $white;
  transition: all 0.2s;
}

.retry-btn:hover {
  transform: Scale(1.1);
  background: $white;
  color: #ff3333;
}

</style>