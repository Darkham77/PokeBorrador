<script setup>
import { onMounted, watch, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initLegacyBindings } from '@/logic/stateBridge'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { checkDBCompatibility } from '@/logic/db/dbRouter'
import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LocalDebugPanel from '@/components/admin/LocalDebugPanel.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import EvolutionScene from '@/components/evolution/EvolutionScene.vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { usePlayerClassStore } from '@/stores/playerClass'
import PhaserGame from '@/components/game/PhaserGame.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()
const livePvP = useLivePvPStore()
const classStore = usePlayerClassStore()
const dbIncompatible = ref(false)
const dbVersionInfo = ref(null)

// Sincronizar usuario con el motor legacy reactivamente
watch(() => authStore.user, (newVal) => {
  window.currentUser = newVal
}, { immediate: true })

onMounted(async () => {
  // 1. Inicializar el puente de estado INMEDIATAMENTE para evitar race conditions con Phaser
  try {
    initLegacyBindings()
    console.log('[App] Legacy Bindings initialized early')
  } catch (e) {
    console.error('[App] Failed to initialize Legacy Bindings:', e)
  }

  // 2. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()

  // 3. Recuperar sesión (Autologin)
  await authStore.checkSession()

  // 2. Check DB Compatibility & Load Game
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

  // Sincronizar usuario con el motor legacy
  if (authStore.user) {
    window.currentUser = authStore.user
  }
  
  // Escuchar la señal de listo del motor legacy
  window.addEventListener('game-state-ready', (e) => {
    console.log('[App] Game State Ready Event received:', e.detail?.state);
    gameStore.state.isReady = true;
    classStore.syncTheme();
  });

  // Comprobar si ya estaba listo (Race Condition Guard)
  if (window.legacyGameReady) {
    console.log('[App] Engine was already ready on mount');
    gameStore.state.isReady = true;
    livePvP.initInvitePoller()
  }

  window.addEventListener('game-state-ready', () => {
    livePvP.initInvitePoller()
  })

  // 4. Global Loading Hooks para el motor Legacy
  window.showLoading = (msg = 'Preparando aventura...') => {
    gameStore.state.overlayMessage = msg
    gameStore.state.isOverlayLoading = true
  }
  window.hideLoading = () => {
    gameStore.state.isOverlayLoading = false
  }
})

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
        <MainGameView v-if="gameStore.state.isReady" />
        
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
    <ConnectionWarning />
    <LocalDebugPanel />
    <LivePvPArena />
    <EvolutionScene />
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
  transform: scale(1.1);
  background: #fff;
  color: #ff3333;
}

.phaser-background {
  position: fixed;
  inset: 0;
  z-index: 0;
}
</style>
