<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <Teleport to="body">
    <transition name="slide-down">
      <div
        v-if="authStore.connectionLost"
        id="connection-lost-warning-pill"
        class="connection-lost-banner pixelated"
      >
        <span class="banner-icon">📶</span>
        <span class="banner-text">CONEXIÓN PERDIDA · Reconectando automáticamente...</span>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.connection-lost-banner {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: Translatex(-50%);
  z-index: calc(var(--z-overlay) - 1);
  background: Rgba(239, 68, 68, 0.92);
  border: 2px solid #fca5a5;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.5px;
  pointer-events: none;
}

.banner-icon {
  font-size: 14px;
  animation: pulse-icon 1.5s infinite;
}

@keyframes pulse-icon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  transform: Translate(-50%, -20px);
  opacity: 0;
}
</style>
