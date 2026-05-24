<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

const authStore = useAuthStore()
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <PVLoadingOverlay
        v-if="authStore.connectionLost"
        theme="error"
        title="CONEXIÓN PERDIDA"
        message="Se ha perdido la conexión con el servidor. El juego se reanudará automáticamente en cuanto se restablezca el enlace."
        status-text="RECONECTANDO..."
        icon="📶"
        :critical="true"
      >
        <template #footer>
          Modo: <code>{{ authStore.sessionMode.toUpperCase() }}</code> | 
          Internet: <code :class="{ offline: !authStore.isOnline }">{{ authStore.isOnline ? 'CONECTADO' : 'DESCONECTADO' }}</code>
        </template>
      </PVLoadingOverlay>
    </transition>
  </Teleport>
</template>

<style scoped lang="scss">
.fade-enter-active, .fade-leave-active {
  
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

code {
  color: var(--yellow);
  &.offline {
    color: Rgba(239, 68, 68, 1);
  }
}
</style>
