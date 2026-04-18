<script setup>
import { onMounted, watch, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { checkDBCompatibility } from '@/logic/db/dbRouter'
import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LocalDebugPanel from '@/components/admin/LocalDebugPanel.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import EvolutionScene from '@/components/evolution/EvolutionScene.vue'
import LibraryModal from '@/components/ui/LibraryModal.vue'
import ShopView from '@/components/ShopView.vue'
import PokemonCenterView from '@/components/PokemonCenterView.vue'
import InventoryModal from '@/components/inventory/InventoryModal.vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { usePlayerClassStore } from '@/stores/playerClass'
import MoveLearningModal from '@/components/modals/MoveLearningModal.vue'
import PhaserGame from '@/components/game/PhaserGame.vue'
import { useUIStore } from '@/stores/ui'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import PromptModal from '@/components/modals/PromptModal.vue'
import SpecialItemModals from '@/components/modals/SpecialItemModals.vue'

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
  
  // Escuchar la señal de listo del motor legacy (Mantenido solo para Phaser si es necesario, pero desacoplado de stores)
  window.addEventListener('game-state-ready', (e) => {
    console.log('[App] Game State Ready Event received');
    gameStore.state.isReady = true;
    classStore.syncTheme();
    livePvP.initInvitePoller()
  });

  // Comprobar si ya estaba listo (Race Condition Guard)
  if (window.legacyGameReady) {
    gameStore.state.isReady = true;
    livePvP.initInvitePoller()
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
    <LibraryModal />
    <ShopView v-if="uiStore.isShopOpen" />
    <PokemonCenterView v-if="uiStore.isPokemonCenterOpen" />
    <InventoryModal v-if="uiStore.isInventoryOpen" />
    <MoveLearningModal v-if="uiStore.isMoveLearningOpen" />
    <ConfirmModal />
    <PromptModal />
    <SpecialItemModals />
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
