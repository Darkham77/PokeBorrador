<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGameStateBridge } from '@/logic/stateBridge'
import LegacyInterface from '@/components/LegacyInterface.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()

// Sincronizar usuario con el motor legacy reactivamente
watch(() => authStore.user, (newVal) => {
  window.currentUser = newVal
}, { immediate: true })

onMounted(async () => {
  await authStore.checkSession()
  
  // Sincronizar usuario con el motor legacy
  if (authStore.user) {
    window.currentUser = authStore.user
  }
  
  // Escuchar la señal de listo del motor legacy
  window.addEventListener('game-state-ready', (e) => {
    console.log('[App] Game State Ready Event received:', e.detail?.state);
    gameStore.state.isReady = true;
  });

  // Comprobar si ya estaba listo (Race Condition Guard)
  if (window.legacyGameReady) {
    console.log('[App] Engine was already ready on mount');
    gameStore.state.isReady = true;
  }

  // 3. Inicializar el puente de estado una vez que Vue está listo
  setTimeout(() => {
    try {
      initGameStateBridge()
      console.log('[App] StateBridge initialized successfully')
    } catch (e) {
      console.error('[App] Failed to initialize StateBridge:', e)
    }
  }, 300)
})
</script>

<template>
  <div id="vue-app">
    <template v-if="!authStore.loading">
      <template v-if="authStore.user">
        <!-- Solo mostramos la interfaz si el motor legacy terminó su carga inicial -->
        <LegacyInterface v-if="gameStore.state.isReady" />
        
        <!-- Pantalla de carga mientras el motor lee archivos locales -->
        <div v-else class="loading-overlay">
          <div class="loader"></div>
          <p>Escribiendo tu historia...</p>
        </div>
      </template>
      <!-- El LoginView se renderiza aquí si no hay sesión -->
      <router-view v-else />
    </template>
    
    <div v-show="authStore.loading" class="loading-overlay">
      <div class="loader"></div>
      <p>Cargando Poké Vicio...</p>
    </div>
  </div>
</template>

<style>
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
