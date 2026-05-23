<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
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
      <PVLoadingOverlay
        v-if="show"
        theme="warning"
        title="SESIÓN ABIERTA EN OTRO LUGAR"
        message="Parece que abriste el juego en otra pestaña o navegador. Para jugar aquí, debés cerrar las otras instancias."
        icon="⚠️"
        :show-spinner="false"
        :critical="true"
      >
        <template #actions>
          <button
            class="action-btn reclaim-btn"
            @click.stop="handleReconnect"
          >
            ▶ USAR AQUÍ
          </button>
          <button
            class="action-btn danger-btn"
            @click.stop="handleLogout"
          >
            CERRAR SESIÓN
          </button>
        </template>

        <template #footer>
          ID de sesión: <code>{{ authStore.sessionId.substring(0, 8) }}</code>
        </template>
      </PVLoadingOverlay>
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

.action-btn {
  width: 100%;
  padding: 16px;
  background: Rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-family: 'Press Start 2P', monospace;
  font-weight: 900;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 0 Rgba(0, 0, 0, 0.3);

  &.reclaim-btn {
    background: var(--yellow);
    color: #111;
    border: 1px solid Rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 20px Rgba(255, 214, 10, 0.2);

    &:hover {
      background: $white;
      transform: Translatey(-2px);
      box-shadow: 0 12px 24px Rgba(255, 255, 255, 0.3);
    }
  }

  &.danger-btn {
    background: Rgba(255, 59, 59, 0.1);
    color: var(--red);
    border: 1px solid Rgba(255, 59, 59, 0.3);

    &:hover {
      background: var(--red);
      color: $white;
      transform: Translatey(-2px);
      box-shadow: 0 8px 16px Rgba(255, 59, 59, 0.2);
    }
  }
}

code {
  color: $purple;
}
</style>
