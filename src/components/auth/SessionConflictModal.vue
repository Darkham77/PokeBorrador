<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import PVLoadingOverlay from '@/components/common/PVLoadingOverlay.vue';
import { useGsapTransition } from '@/composables/ui/useGsapTransition';

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: false
});

defineOptions({
  inheritAttrs: false
});

defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();
const { beforeEnter, enter, leave } = useGsapTransition({ type: 'fade' });

function handleReconnect() {
  window.location.reload();
}

async function handleLogout() {
  await authStore.logout();
}
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @before-enter="beforeEnter" @enter="enter" @leave="leave">
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
            id="session-conflict-reclaim-btn"
            class="action-btn reclaim-btn"
            @click.stop="handleReconnect"
          >
            <span class="emoji">▶</span> USAR AQUÍ
          </button>
          <button
            id="session-conflict-logout-btn"
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
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.action-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: $radius-2xl;
  background: Rgb(255 255 255 / 10%);
  font-family: var(--font-pixel);
  font-size: var(--font-11);
  font-weight: 900;
  cursor: pointer;
  box-shadow: $shadow-retro-btn;

  &.reclaim-btn {
    border: 1px solid Rgb(255 255 255 / 20%);
    background: var(--yellow);
    color: var(--black);
    box-shadow: var(--shadow-card);

    &:hover {
      background: $white;
      transform: Translatey(-2px);
      box-shadow: var(--shadow-card);
    }
  }

  &.danger-btn {
    border: 1px solid Rgb(255 59 59 / 30%);
    background: Rgb(255 59 59 / 10%);
    color: var(--red);

    &:hover {
      background: var(--red);
      color: $white;
      transform: Translatey(-2px);
      box-shadow: var(--shadow-card);
    }
  }
}

code {
  color: $purple;
}
</style>
