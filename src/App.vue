<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { initBaseBridge } from '@/logic/bridges/baseBridge'
import { checkDBCompatibility } from '@/logic/db/dbRouter'
import { phaserBridge } from '@/logic/phaserBridge'
import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import { usePlayerClassStore } from '@/stores/playerClass'
import PhaserGame from '@/components/game/PhaserGame.vue'
import { useUIStore } from '@/stores/ui'
import { useLoadingStore } from '@/stores/loading'
import { useBodyClass } from '@/composables/useBodyClass'
import { useWindowListener } from '@/composables/useWindowListener'

import { useProfileStore } from '@/stores/profile'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const profileStore = useProfileStore()
const classStore = usePlayerClassStore()
const loadingStore = useLoadingStore()
const dbIncompatible = ref(false)
const dbVersionInfo = ref(null)

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

  // 2. Legacy/Automatic states (Backwards Compatibility)
  if (authStore.loading) {
    return { active: true, msg: 'Iniciando sesión...', sub: 'Conectando con el servidor', global: false }
  }
  
  if (authStore.user && !gameStore.isReady) {
    let msg = 'Escribiendo tu historia...'
    if (!gameStore.isDataLoaded) msg = 'Cargando datos...'
    else if (!gameStore.isEngineReady) msg = 'Cargando motor...'
    return { active: true, msg, sub: 'Preparando entorno de juego', global: false }
  }

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

onMounted(async () => {
  // 1. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()
  initBaseBridge()

  // 2. Recuperar sesión (Autologin)
  await authStore.checkSession()

  // 3. Check DB Compatibility & Load Game
  if (authStore.user) {
    const comp = await checkDBCompatibility(gameStore.db)
    if (!comp.compatible) {
      dbIncompatible.value = true
      dbVersionInfo.value = comp
      return // Stop initialization
    }
    
    // Si la DB es compatible, cargar la partida
    await gameStore.loadGame()
    
    // Sincronizar datos del perfil
    profileStore.syncProfileFromAuth(authStore.user, gameStore.state)
  }
  
  // Escuchar la señal de listo del motor legacy
  window.addEventListener('game-state-ready', (_e) => {
    console.log('[App] Game State Ready Event received');
    gameStore.isEngineReady = true;
    classStore.syncTheme();
  });

  // Comprobar si ya estaba listo (Race Condition Guard)
  if (window.legacyGameReady) {
    gameStore.isEngineReady = true;
  }

  // 4. Restore Zoom Level
  uiStore.setZoom(uiStore.appZoom)
})

// Intercept low-level events to prevent them from reaching Phaser when modals are open
const blockEvents = (e) => {
  // 1. Determine if we are inside a Vue UI element (including modals and views)
  // If we are inside ANY part of a modal or a scrollable view, we must stop propagation to Phaser
  // but ALLOW the browser to handle the event (bubbling) unless it's a blocking area.
  
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
  while (curr && curr !== document.body && curr.id !== 'phaser-container') {
    if (isScrollable(curr)) {
      foundScrollable = curr
      break
    }
    curr = curr.parentElement
  }

  // CRITICAL: If we are inside a modal or a scrollable view, STOP propagation to Phaser
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

// Sync Phaser Input State
watch(() => uiStore.isAnyBlockingModalOpen, (val) => {
  phaserBridge.setInputEnabled(!val)
})

const handleRetry = () => {
  window.location.reload()
}
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND -->
    <div class="stars" />

    <!-- Pantalla de carga unificada -->
    <div
      v-if="loadingInfo.active"
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

    <!-- Capa de Juego (Phaser debe cargar en segundo plano para disparar isReady) -->
    <template v-if="authStore.user">
      <PhaserGame class="phaser-background" />
      
      <template v-if="gameStore.isReady">
        <MainGameView />
        
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
            @click="handleRetry"
          >
            REINTENTAR
          </div>
        </div>
      </template>
    </template>

    <!-- El LoginView se renderiza aquí si no hay sesión y terminó de cargar auth -->
    <router-view v-else-if="!authStore.loading" />


    <!-- Error Global UI -->
    <ErrorOverlay />
    <ModalHost />
    <ToastNotification />
    <ConnectionWarning />
    <LivePvPArena />
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
  font-family: 'Press Start 2P', monospace;
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
  background: rgba(0, 0, 0, 0.95);
  -webkit-backdrop-filter: Blur(8px);
  backdrop-filter: Blur(8px);
  @include gpu-layer;
}


.loader {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.1);
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

.phaser-background {
  position: fixed;
  inset: 0;
  z-index: 0;
}
</style>
