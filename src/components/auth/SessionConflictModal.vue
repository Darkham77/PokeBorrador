<script setup>
import { useAuthStore } from '@/stores/auth'

defineProps({
  show: { type: Boolean, default: false }
})

const authStore = useAuthStore()

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
              @click="handleReconnect"
            >
              USAR AQUÍ
            </button>
            <button
              class="btn-vicio-danger"
              @click="handleLogout"
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
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: Blur(20px) Saturate(1.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  @include gpu-layer;
}

.blocked-card {
  background: rgba(20, 20, 22, 0.9);
  border: 1px solid rgba(255, 214, 10, 0.3);
  border-radius: 32px;
  width: 100%;
  max-width: 420px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.9),
              0 0 40px rgba(255, 214, 10, 0.1);
  @include gpu-layer;
}

.icon-header {
  margin-bottom: 32px;
  .warning-icon {
    font-size: 56px;
    filter: Drop-Shadow(0 0 20px rgba(255, 214, 10, 0.6));
  }
}

h2 {
  font-family: 'Press Start 2P', cursive;
  font-size: 16px;
  color: $yellow;
  margin-bottom: 24px;
  @include pixelated;
}

.msg {
  color: rgba(255, 255, 255, 0.6);
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
  color: rgba(255, 255, 255, 0.2);
  font-family: 'Press Start 2P', cursive;
  @include pixelated;
  code { color: $purple; }
}
</style>
