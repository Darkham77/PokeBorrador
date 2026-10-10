<script setup lang="ts">
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

const _VERSION_LOCK_TYPES = ['database', 'server'] as const
type VersionLockType = (typeof _VERSION_LOCK_TYPES)[number]

defineProps<{
  clientVersion?: string | number
  targetVersion?: string | number
  lockType: VersionLockType
}>()

const emit = defineEmits<{
  retry: []
  logout: []
}>()
</script>

<template>
  <PVLoadingOverlay
    theme="error"
    :title="lockType === 'server' ? 'COMPILACIÓN DEL SERVIDOR ANTIGUA' : 'SERVIDOR DESACTUALIZADO'"
    :message="lockType === 'server' 
      ? `Tu cliente (compilación ${clientVersion || 'N/A'}) es más moderno que el servidor (compilación ${targetVersion || 'N/A'}).`
      : `Tu cliente (v${clientVersion || 0}) es más moderno que el servidor (v${targetVersion || 0}).`"
    icon="⚠️"
    :show-spinner="false"
  >
    <p class="admin-note">
      {{ lockType === 'server'
        ? 'Por favor, espera a que el servidor web sea actualizado con la última compilación.'
        : 'Por favor, contacta al administrador para actualizar la base de datos.'
      }}
    </p>

    <template #actions>
      <button
        id="version-lock-retry-btn"
        class="action-btn"
        @click.stop="emit('retry')"
      >
        REINTENTAR
      </button>
      <button
        id="version-lock-logout-btn"
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
  font-size: var(--font-10);
  line-height: 1.4;
  opacity: 0.8;
  margin-top: 10px;
}

.action-btn {
  width: 100%;
  padding: 16px;
  border: 1px solid Rgb(239 68 68 / 40%);
  border-radius: $radius-xl;
  background: Rgb(239 68 68 / 10%);
  color: $white;
  font-family: var(--font-pixel);
  font-size: var(--font-10);
  font-weight: bold;
  box-shadow: $shadow-retro-btn;
  cursor: pointer;
  

  &:hover {
    background: $white;
    color: Rgb(239 68 68 / 100%);
    transform: Translatey(-2px);
    box-shadow: $shadow-retro-btn-hover;
    border-color: $white;
  }
}

.secondary-btn {
  background: Rgb(255 255 255 / 5%);
  color: Rgb(255 255 255 / 70%);
  border-color: Rgb(255 255 255 / 20%);

  &:hover {
    background: Rgb(255 255 255 / 15%);
    color: $white;
    border-color: Rgb(255 255 255 / 50%);
    box-shadow: $shadow-retro-btn-hover;
  }
}
</style>
