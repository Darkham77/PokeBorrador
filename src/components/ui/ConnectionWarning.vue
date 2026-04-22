<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <transition name="fade">
    <div
      v-if="authStore.connectionLost"
      class="connection-lost-overlay"
    >
      <div class="lost-card">
        <div class="icon-header">
          <span class="wifi-icon pulse">📶</span>
        </div>
        
        <h2 class="press-start">
          CONEXIÓN PERDIDA
        </h2>
        
        <p class="msg">
          Se ha perdido la conexión con el servidor. 
          El juego se reanudará automáticamente en cuanto se restablezca el enlace.
        </p>

        <div class="status-indicator">
          <div class="spinner" />
          <span class="status-text press-start">RECONECTANDO...</span>
        </div>

        <p class="footer">
          Modo: <code>{{ authStore.sessionMode.toUpperCase() }}</code> | 
          Internet: <code :class="{ offline: !authStore.isOnline }">{{ authStore.isOnline ? 'CONECTADO' : 'DESCONECTADO' }}</code>
        </p>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.8s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.connection-lost-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-critical);
  background: rgba(0, 0, 0, 0.85);
  -webkit-backdrop-filter: Blur(15px) Grayscale(0.5);
  backdrop-filter: Blur(15px) Grayscale(0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transform: translateZ(0);
}

.lost-card {
  background: rgba(15, 15, 18, 0.95);
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 0 50px rgba(239, 68, 68, 0.2),
              inset 0 0 20px rgba(239, 68, 68, 0.1);
  animation: glow-red 3s infinite ease-in-out;
}

@keyframes glow-red {
  0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 50px rgba(239, 68, 68, 0.2); }
  50% { border-color: rgba(239, 68, 68, 0.8); box-shadow: 0 0 70px rgba(239, 68, 68, 0.4); }
}

.icon-header {
  margin-bottom: 24px;
  .wifi-icon {
    display: inline-block;
    font-size: 48px;
    filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.5));
  }
}

.pulse {
  animation: pulse-icon 2s infinite ease-in-out;
}

@keyframes pulse-icon {
  0%, 100% { transform: Scale(1); opacity: 1; }
  50% { transform: Scale(1.1); opacity: 0.7; }
}

h2 {
  font-size: 14px;
  color: #ef4444;
  margin-bottom: 20px;
  @include pixelated;
  letter-spacing: 1px;
}

.msg {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 32px;
}

.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(239, 68, 68, 0.1);
  border-top: 3px solid #ef4444;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-text {
  font-size: 8px;
  color: #ef4444;
  @include pixelated;
}

.footer {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Press Start 2P', cursive;
  @include pixelated;
  code { 
    color: #ffd60a; 
    &.offline { color: #ef4444; }
  }
}
</style>
