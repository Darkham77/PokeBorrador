<script setup lang="ts">
const emit = defineEmits<{
  reclaim: []
  dismiss: []
}>()
</script>

<template>
  <div class="loading-overlay session-lock-overlay">
    <div class="lock-icon-wrapper">
      <span class="lock-emoji">🔒</span>
    </div>
  
    <h2 class="lock-title">
      SESIÓN BLOQUEADA
    </h2>
  
    <div class="lock-content">
      <p>Se ha detectado una sesión más reciente en otra pestaña o dispositivo.</p>
      <p class="warning-box">
        Este navegador está ahora en modo <strong>SOLO LECTURA</strong>.
      </p>
    </div>

    <div class="lock-actions">
      <div
        class="retry-btn primary reclaim-btn"
        @click.stop="emit('reclaim')"
      >
        TOMAR CONTROL DE ESTA SESIÓN
      </div>
    
      <div
        class="risk-btn"
        @click.stop="emit('dismiss')"
      >
        CONTINUAR SIN GUARDAR (RIESGO ALTO)
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.loading-overlay {
  position: fixed;
  inset: 0;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: $black;
  z-index: var(--z-max);
  color: var(--yellow);
  @include pixelated;
  font-size: 12px;
  text-align: center;
}

.session-lock-overlay {
  background: rgba(0, 0, 0, 0.95);
  -webkit-will-change: opacity;
  will-change: opacity;
  border: 2px solid var(--blue);
  box-shadow: inset 0 0 50px rgba(0, 150, 255, 0.2), 0 0 100px rgba(0, 100, 255, 0.3);
  padding: 40px;
  
  .lock-icon-wrapper {
    margin-bottom: 30px;
    filter: drop-shadow(0 0 20px rgba(0, 150, 255, 0.6));
    animation: lock-pulse 2s ease-in-out infinite;
  }

  .lock-emoji {
    font-size: 80px;
    display: block;
    line-height: 1;
  }
  
  .lock-title {
    color: var(--blue);
    font-size: 24px;
    letter-spacing: 2px;
    text-shadow: 0 0 15px rgba(0, 150, 255, 0.8);
    margin-bottom: 25px;
  }

  .lock-content {
    max-width: 400px;
    margin-bottom: 35px;
    
    p {
      color: $white;
      font-size: 11px;
      line-height: 1.6;
      margin: 10px 0;
    }

    .warning-box {
      margin-top: 20px;
      padding: 12px;
      background: rgba(0, 150, 255, 0.1);
      border: 1px dashed var(--blue);
      color: var(--blue);
      font-size: 10px;
      @include pixelated;
    }
  }

  .lock-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
    max-width: 350px;
  }
  
  .retry-btn {
    margin: 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 10px;
    font-weight: bold;
    border-radius: 4px;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.2s;
    
    &.primary {
      background: var(--blue);
      border-color: $white;
      color: $white;
    }

    &.reclaim-btn {
      background: var(--green);
      color: $dark;
      font-weight: 900;
    }
    
    &:hover {
      background: $white;
      color: var(--blue);
      transform: translateY(-2px);
      box-shadow: 0 6px 0 rgba(0, 0, 0, 0.2);
    }
  }

  .risk-btn {
    font-size: 8px;
    color: $white;
    opacity: 0.5;
    cursor: pointer;
    text-decoration: underline;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
      color: #ff3333;
    }
  }
}

@keyframes lock-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
