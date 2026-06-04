<script setup lang="ts">
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

defineProps<{
  clientVersion?: string
  serverVersion?: string
}>()

const emit = defineEmits<{
  retry: []
  logout: []
}>()
</script>

<template>
  <PVLoadingOverlay
    theme="error"
    title="COMPILACIÓN DEL SERVIDOR ANTIGUA"
    :message="`Tu cliente (compilación ${clientVersion || 'N/A'}) es más moderno que el servidor (compilación ${serverVersion || 'N/A'}).`"
    icon="⚠️"
    :show-spinner="false"
  >
    <p class="admin-note">
      Por favor, espera a que el servidor web sea actualizado con la última compilación.
    </p>

    <template #actions>
      <button
        class="action-btn"
        @click.stop="emit('retry')"
      >
        REINTENTAR
      </button>
      <button
        class="action-btn secondary-btn"
        @click.stop="emit('logout')"
      >
        VOLVER AL LOGIN
      </button>
    </template>
  </PVLoadingOverlay>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.admin-note {
  color: var(--yellow);
  opacity: 0.8;
  font-size: 10px;
  margin-top: 10px;
  line-height: 1.4;
}

.action-btn {
  width: 100%;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  color: $white;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  font-weight: bold;
  border-radius: 12px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(239, 68, 68, 0.4);
  cursor: pointer;
  

  &:hover {
    transform: translateY(-2px);
    background: $white;
    color: rgba(239, 68, 68, 1);
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.2);
    border-color: $white;
  }
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: $white;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.2);
  }
}
</style>
