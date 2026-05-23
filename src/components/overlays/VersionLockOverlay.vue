<script setup lang="ts">
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

defineProps<{
  clientVersion?: string | number
  dbVersion?: string | number
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <PVLoadingOverlay
    theme="error"
    title="SERVIDOR DESACTUALIZADO"
    :message="`Tu cliente (v${clientVersion || 0}) es más moderno que el servidor (v${dbVersion || 0}).`"
    icon="⚠️"
    :show-spinner="false"
  >
    <p class="admin-note">
      Por favor, contacta al administrador para actualizar la base de datos.
    </p>

    <template #actions>
      <button
        class="action-btn"
        @click.stop="emit('retry')"
      >
        REINTENTAR
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
  background: Rgba(239, 68, 68, 0.1);
  color: $white;
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  font-weight: bold;
  border-radius: 12px;
  box-shadow: 0 4px 0 Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(239, 68, 68, 0.4);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: Translatey(-2px);
    background: $white;
    color: Rgba(239, 68, 68, 1);
    box-shadow: 0 6px 0 Rgba(0, 0, 0, 0.2);
    border-color: $white;
  }
}
</style>
