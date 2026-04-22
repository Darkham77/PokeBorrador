<script setup>
import { onMounted, ref, watch } from 'vue'
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
import { useBodyClass } from '@/composables/useBodyClass'
import { useWindowListener } from '@/composables/useWindowListener'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const dbIncompatible = ref(false)
const dbVersionInfo = ref(null)

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
  if (uiStore.isAnyBlockingModalOpen) {
    // If the event doesn't come from inside an element with allowed scroll, stop it
    const isInsideScrollable = e.target.closest('.library-content, .library-sidebar, .modal-scrollable-content, .chat-panel, .chat-messages, .profile-content-scrollable, .error-overlay, .error-card, .error-stack')
    
    if (!isInsideScrollable) {
      console.log('[App] Blocking event on:', e.target.className || e.target.id)
      e.preventDefault();
      e.stopImmediatePropagation();
    } else {
      // If we are inside, stop propagation so it doesn't reach window (where Phaser listens)
      e.stopPropagation();
    }
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
      v-if="authStore.loading || (authStore.user && !gameStore.isReady)"
      class="loading-overlay"
    >
      <div class="loader" />
      <p>{{ authStore.loading ? 'Iniciando sesión...' : 'Escribiendo tu historia...' }}</p>
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

    <!-- Overlay Global para Sincronización y Procesos Largos -->
    <div
      v-if="gameStore.state.isOverlayLoading"
      class="loading-overlay global-overlay"
    >
      <div class="loader" />
      <p>{{ gameStore.state.overlayMessage }}</p>
      <span class="sub-text">Por favor, no cierres la ventana</span>
    </div>

    <!-- Error Global UI -->
    <ErrorOverlay />
    <ModalHost />
    <ToastNotification />
    <ConnectionWarning />
    <LivePvPArena />
  </div>
</template>

<style>
#vue-app {
  min-height: 100vh;
}

.zoom-target {
  zoom: var(--app-zoom, 1);
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
