<script setup>
import { onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { checkDBCompatibility } from '@/logic/db/dbRouter'
import { phaserBridge } from '@/logic/phaserBridge'
import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LocalDebugPanel from '@/components/admin/LocalDebugPanel.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { usePlayerClassStore } from '@/stores/playerClass'
import PhaserGame from '@/components/game/PhaserGame.vue'
import { useUIStore } from '@/stores/ui'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const livePvP = useLivePvPStore()
const classStore = usePlayerClassStore()
const dbIncompatible = ref(false)
const dbVersionInfo = ref(null)

onMounted(async () => {
  // 1. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()

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

  // Interceptar eventos de bajo nivel para evitar que lleguen a Phaser
  const blockEvents = (e) => {
    if (uiStore.isAnyBlockingModalOpen) {
      // Si el evento no viene de dentro de un elemento con scroll permitido, pararlo
      const isInsideScrollable = e.target.closest('.library-content, .library-sidebar, .modal-scrollable-content, .chat-panel, .chat-messages, .profile-content-scrollable, .error-overlay, .error-card, .error-stack')
      
      if (!isInsideScrollable) {
        console.log('[App] Blocking event on:', e.target.className || e.target.id)
        e.preventDefault();
        e.stopImmediatePropagation();
      } else {
        // Si estamos dentro, detenemos la propagación para que no llegue a window (donde escucha Phaser)
        e.stopPropagation();
      }
    }
  }

  window.addEventListener('wheel', blockEvents, { capture: true, passive: false });
  window.addEventListener('touchmove', blockEvents, { capture: true, passive: false });

  // 4. Restore Zoom Level
  uiStore.setZoom(uiStore.appZoom)

  // ── PUENTE DE COMPATIBILIDAD LEGADO ─────────────────────────────────────────
  // Estos shims aseguran que los llamados desde el código legado o atributos onclick
  // actualicen el store de Vue en lugar de intentar manipular el DOM directamente.
  window.toggleSettings = () => {
    uiStore.isSettingsOpen = !uiStore.isSettingsOpen
  }
  window.toggleProfile = () => {
    uiStore.isProfileOpen = !uiStore.isProfileOpen
  }
  window.toggleCosmetics = () => {
    uiStore.isCosmeticsModalOpen = !uiStore.isCosmeticsModalOpen
  }
})

// Bloqueo de Scroll Global para Modales
watch(() => uiStore.isAnyBlockingModalOpen, (val) => {
  console.log('[App] Blocking state changed:', val)
  if (val) {
    document.body.classList.add('modal-open')
    phaserBridge.setInputEnabled(false)
  } else {
    document.body.classList.remove('modal-open')
    phaserBridge.setInputEnabled(true)
  }
}, { immediate: true })

const handleRetry = () => {
  window.location.reload()
}
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND -->
    <div class="stars" />

    <template v-if="!authStore.loading">
      <template v-if="authStore.user">
        <PhaserGame class="phaser-background" />
        
        <!-- Solo mostramos la interfaz si el motor legacy terminó su carga inicial -->
        <MainGameView v-if="gameStore.isReady" />
        
        <!-- Pantalla de carga mientras el motor lee archivos locales -->
        <div
          v-else
          class="loading-overlay"
        >
          <div class="loader" />
          <p>Escribiendo tu historia...</p>
        </div>

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
            Por favor, contacta al administrador para que actualice la base de datos.
          </p>
          <div
            class="retry-btn"
            @click="handleRetry"
          >
            REINTENTAR
          </div>
        </div>
      </template>
      <!-- El LoginView se renderiza aquí si no hay sesión -->
      <router-view v-else />
    </template>
    
    <div
      v-show="authStore.loading"
      class="loading-overlay"
    >
      <div class="loader" />
      <p>Cargando Poké Vicio...</p>
    </div>

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
    <ConnectionWarning />
    <LocalDebugPanel />
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
  background: #000;
  z-index: 99999;
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
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
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
  to { transform: rotate(360deg); }
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
  color: #fff;
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
  color: #fff;
  cursor: pointer;
  border: 2px solid #fff;
  transition: all 0.2s;
}

.retry-btn:hover {
  transform: Scale(1.1);
  background: #fff;
  color: #ff3333;
}

.phaser-background {
  position: fixed;
  inset: 0;
  z-index: 0;
}
</style>
