<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGameStateBridge } from '@/logic/stateBridge'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LocalDebugPanel from '@/components/admin/LocalDebugPanel.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import EvolutionScene from '@/components/evolution/EvolutionScene.vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { usePlayerClassStore } from '@/stores/playerClass'

const authStore = useAuthStore()
const gameStore = useGameStore()
const livePvP = useLivePvPStore()
const classStore = usePlayerClassStore()

// Sincronizar usuario con el motor legacy reactivamente
watch(() => authStore.user, (newVal) => {
  window.currentUser = newVal
}, { immediate: true })

onMounted(async () => {
  // 0. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()

  await authStore.checkSession()
  
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

  // 3. Inicializar el puente de estado una vez que Vue está listo
  setTimeout(() => {
    try {
      initGameStateBridge()
      console.log('[App] StateBridge initialized successfully')
    } catch (e) {
      console.error('[App] Failed to initialize StateBridge:', e)
    }
  }, 300)

  // 4. Global Loading Hooks para el motor Legacy
  window.showLoading = (msg = 'Preparando aventura...') => {
    gameStore.state.overlayMessage = msg
    gameStore.state.isOverlayLoading = true
  }
  window.hideLoading = () => {
    gameStore.state.isOverlayLoading = false
  }
})
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND -->
    <div class="stars" />

    <template v-if="!authStore.loading">
      <template v-if="authStore.user">
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
</style>
