<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

function handleReconnect() {
  // Simplemente recargamos para tomar el control de la sesión
  window.location.reload()
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <div class="session-blocked-overlay">
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
        <button class="btn-primary" @click="handleReconnect">
          USAR AQUÍ
        </button>
        <button class="btn-secondary" @click="handleLogout">
          CERRAR SESIÓN
        </button>
      </div>

      <p class="footer">
        ID de sesión: <code>{{ authStore.sessionId.substring(0, 8) }}</code>
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.session-blocked-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(15px) Saturate(1.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.blocked-card {
  background: rgba(28, 28, 30, 0.95);
  border: 1px solid rgba(255, 214, 10, 0.2);
  border-radius: 28px;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8),
              0 0 20px rgba(255, 214, 10, 0.1);
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-header {
  margin-bottom: 24px;
  .warning-icon {
    font-size: 48px;
    filter: drop-shadow(0 0 10px rgba(255, 214, 10, 0.5));
  }
}

h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  color: #ffd60a;
  margin-bottom: 20px;
}

.msg {
  color: #86868b;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 32px;
  font-family: 'Nunito', sans-serif;
  font-weight: 600;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

button {
  padding: 16px;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #ffd60a;
  color: #000;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 214, 10, 0.3);
  }
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #86868b;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

.footer {
  font-size: 8px;
  color: #48484a;
  font-family: 'Press Start 2P', monospace;
  code { color: #bf5af2; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: Scale(0.9); }
  to { opacity: 1; transform: Scale(1.0); }
}
</style>
