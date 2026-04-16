<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const retry = () => {
  window.location.reload()
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="authStore.connectionLost"
      class="connection-warning-overlay"
    >
      <div class="warning-card">
        <div class="icon-container">
          <span class="wifi-icon">📶</span>
          <span class="cross-mark">/</span>
        </div>
        
        <h2>CONEXIÓN PERDIDA</h2>
        
        <p>
          Se ha perdido la conexión con los servidores de <strong>Supabase</strong>.
          Para proteger la integridad de tus datos en modo Online, el juego ha sido pausado.
        </p>
        
        <div class="info-box">
          <p>⚠️ <strong>Aviso:</strong> El sistema no cambiará automáticamente al modo Offline para evitar la duplicación de datos.</p>
        </div>

        <button
          class="retry-btn"
          @click="retry"
        >
          REINTENTAR CONEXIÓN
        </button>
        
        <p class="footer-note">
          Si el problema persiste, verifica tu conexión a internet.
        </p>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.connection-warning-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.warning-card {
  background: #1a1c23;
  border: 2px solid #ef4444;
  border-radius: 24px;
  max-width: 400px;
  width: 100%;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.2);
  
  h2 {
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    color: #ef4444;
    margin: 20px 0;
  }
  
  p {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 16px;
    
    strong {
      color: #fff;
    }
  }
}

.icon-container {
  position: relative;
  font-size: 48px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .wifi-icon { filter: grayscale(1); opacity: 0.5; }
  .cross-mark {
    position: absolute;
    color: #ef4444;
    font-weight: bold;
    font-size: 64px;
    transform: rotate(45deg);
  }
}

.info-box {
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 24px;
  
  p {
    font-size: 12px;
    margin: 0;
    color: #f87171;
  }
}

.retry-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: #ef4444;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  
  &:hover {
    background: #dc2626;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.footer-note {
  font-size: 11px !important;
  margin-top: 16px;
  opacity: 0.6;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
