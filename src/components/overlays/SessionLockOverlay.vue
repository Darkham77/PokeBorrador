<script setup lang="ts">
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

const emit = defineEmits<{
  reclaim: []
  dismiss: []
}>()
</script>

<template>
  <PVLoadingOverlay
    theme="default"
    title="SESIÓN BLOQUEADA"
    message="Se ha detectado una sesión más reciente en otra pestaña o dispositivo."
    icon="🔒"
    :show-spinner="false"
  >
    <div class="lock-content">
      <p class="warning-box">
        Este navegador está ahora en modo <strong>SOLO LECTURA</strong>.
      </p>
    </div>

    <template #actions>
      <button
        id="session-lock-reclaim-btn"
        class="action-btn primary reclaim-btn"
        @click.stop="emit('reclaim')"
      >
        TOMAR CONTROL DE ESTA SESIÓN
      </button>
      
      <button
        id="session-lock-dismiss-btn"
        class="risk-btn"
        @click.stop="emit('dismiss')"
      >
        CONTINUAR SIN GUARDAR (RIESGO ALTO)
      </button>
    </template>
  </PVLoadingOverlay>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.lock-content {
  .warning-box {
    margin-top: 10px;
    padding: 12px;
    background: Rgba(0, 150, 255, 0.1);
    border: 1px dashed var(--blue);
    color: var(--blue);
    font-size: 10px;
    @include pixelated;
  }
}

.action-btn {
  width: 100%;
  padding: 16px;
  background: Rgba(255, 255, 255, 0.1);
  font-size: 10px;
  font-family: var(--font-pixel);
  font-weight: bold;
  border-radius: 12px;
  box-shadow: 0 4px 0 Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.2);
  cursor: pointer;
  
  
  &.reclaim-btn {
    background: var(--green);
    color: #111;
    font-weight: 900;
    border-color: $white;
    &:hover {
      background: $white;
      color: var(--green);
      transform: Translatey(-2px);
      box-shadow: 0 6px 0 Rgba(0, 0, 0, 0.2);
    }
  }
}

.risk-btn {
  background: none;
  border: none;
  font-family: var(--font-pixel);
  font-size: 8px;
  color: $white;
  opacity: 0.5;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 8px;
  
  
  &:hover {
    opacity: 1;
    color: #ff3333;
  }
}
</style>

