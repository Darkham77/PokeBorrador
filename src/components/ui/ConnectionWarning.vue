<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <Teleport to="body">
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
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
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
  background: Rgba(0, 0, 0, 0.85);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(15px);
  backdrop-filter: Blur(15px);
  @include gpu-layer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transform: Translatez(0);
}

.lost-card {
  background: Rgba(15, 15, 18, 0.95);
  border: 2px solid Rgba(239, 68, 68, 0.4);
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 0 50px Rgba(239, 68, 68, 0.2),
              inset 0 0 20px Rgba(239, 68, 68, 0.1);
  animation: glow-red 3s infinite ease-in-out;
}

@keyframes glow-red {
  0%, 100% { border-color: Rgba(239, 68, 68, 0.4); box-shadow: 0 0 50px Rgba(239, 68, 68, 0.2); }
  50% { border-color: Rgba(239, 68, 68, 0.8); box-shadow: 0 0 70px Rgba(239, 68, 68, 0.4); }
}

.icon-header {
  margin-bottom: 24px;
  .wifi-icon {
    display: inline-block;
    font-size: 48px;
    will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 15px Rgba(239, 68, 68, 0.5));
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
  color: Rgba(239, 68, 68, 1);
  margin-bottom: 20px;
  @include pixelated;
  letter-spacing: 1px;
}

.msg {
  color: Rgba(255, 255, 255, 0.7);
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
  border: 3px solid Rgba(239, 68, 68, 0.1);
  border-top: 3px solid Rgba(239, 68, 68, 1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: Rotate(0deg); }
  100% { transform: Rotate(360deg); }
}

.status-text {
  font-size: 8px;
  color: Rgba(239, 68, 68, 1);
  @include pixelated;
}

.footer {
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.3);
  @include pixelated;
  code { 
    color: var(--yellow); 
    &.offline { color: Rgba(239, 68, 68, 1); }
  }
}
</style>
