<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const authStore = useAuthStore() as any

function handleReconnect() {
  window.location.reload()
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="show"
        class="session-blocked-overlay"
      >
        <div class="blocked-card">
          <div class="icon-header">
            <span class="warning-icon">⚠️</span>
          </div>
          
          <h2>SESIÓN DUPLICADA</h2>
          
          <p class="msg">
            Parece que has iniciado sesión en otra pestaña o dispositivo. 
            Para proteger tus datos, esta sesión ha sido bloqueada.
          </p>
  
          <div class="actions">
            <button
              class="btn-vicio-primary"
              @click.stop="handleReconnect"
            >
              USAR AQUÍ
            </button>
            <button
              class="btn-vicio-danger"
              @click.stop="handleLogout"
            >
              CERRAR SESIÓN
            </button>
          </div>
  
          <p class="footer">
            ID de sesión: <code>{{ authStore.sessionId.substring(0, 8) }}</code>
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
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.session-blocked-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-critical);
  background: Rgba(0, 0, 0, 0.9);
  -webkit-backdrop-filter: Blur(20px);
  backdrop-filter: Blur(20px);
  @include gpu-layer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  @include gpu-layer;
}

.blocked-card {
  background: Rgba(20, 20, 22, 0.9);
  border: 1px solid Rgba(255, 214, 10, 0.3);
  border-radius: 32px;
  width: 100%;
  max-width: 420px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 40px 80px Rgba(0, 0, 0, 0.9),
              0 0 40px Rgba(255, 214, 10, 0.1);
  @include gpu-layer;
}

.icon-header {
  margin-bottom: 32px;
  .warning-icon {
    font-size: 56px;
    filter: Drop-Shadow(0 0 20px Rgba(255, 214, 10, 0.6));
  }
}

h2 {
  @include pixelated;
  font-size: 16px;
  color: $yellow;
  margin-bottom: 24px;
  @include pixelated;
}

.msg {
  color: Rgba(255, 255, 255, 0.6);
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 40px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.footer {
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.2);
  @include pixelated;
  @include pixelated;
  code { color: $purple; }
}
</style>