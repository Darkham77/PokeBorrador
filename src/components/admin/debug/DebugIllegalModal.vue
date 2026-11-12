<script setup lang="ts">
import {
  createBackdropPointerGuard,
  resolveModalCssVars,
  type ModalCloseReason
} from '@francogp/auditor/modals';
import { computed, onBeforeUnmount } from 'vue';

import { useModalStore } from '@/stores/modals';

defineProps<{
  title: string;
  description: string;
  issues: string[];
  emoji?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const USER_DISMISS_REASONS: readonly ModalCloseReason[] = [
  'escape',
  'backdrop',
  'close-button',
  'back-navigation'
] as const;
const USER_DISMISS_REASON_SET: ReadonlySet<ModalCloseReason> = new Set(USER_DISMISS_REASONS);

const modalStore = useModalStore();

const standaloneEntry = modalStore.openStandalone({
  kind: 'DebugIllegalPokemon',
  dismissMode: 'any',
  obscuresBackground: false,
  canClose: ({ reason }) => {
    if (USER_DISMISS_REASON_SET.has(reason)) {
      emit('close');
      return false;
    }
    return true;
  }
});

const modalCssVars = computed(() => {
  const current = modalStore.getEntryByUid(standaloneEntry.modalUid) ?? standaloneEntry;
  return resolveModalCssVars(current);
});

const backdropGuard = createBackdropPointerGuard({
  stack: modalStore.stackManager,
  getModalUid: () => standaloneEntry.modalUid
});

onBeforeUnmount(() => {
  if (modalStore.stackManager.hasUid(standaloneEntry.modalUid, { includeClosing: true })) {
    modalStore.stackManager.forceClose(standaloneEntry.modalUid, 'programmatic');
  }
});
</script>

<template>
  <div
    id="debug-illegal-pokemon-modal"
    class="creator-illegal-modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    :style="modalCssVars"
    @pointerdown="backdropGuard.onPointerDown"
    @pointerup="backdropGuard.onPointerUp"
    @pointercancel="backdropGuard.onPointerCancel"
  >
    <div class="creator-illegal-modal">
      <div class="modal-header">
        <h4 class="illegal-title">
          <span v-if="emoji" class="emoji">{{ emoji }}</span> {{ title }}
        </h4>
      </div>
      <p class="illegal-desc">
        {{ description }}
      </p>
      <ul class="illegal-list">
        <li v-for="(issue, i) in issues" :key="i" class="illegal-item">
          <span class="emoji">❌</span> {{ issue }}
        </li>
      </ul>
      <div class="modal-footer">
        <button
          id="debug-illegal-modal-close-btn"
          class="btn-vicio-primary md"
          @click="emit('close')"
        >
          ENTENDIDO
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.creator-illegal-modal-overlay {
  position: fixed;
  z-index: var(--modal-z, var(--z-modal));
  display: flex;
  justify-content: center;
  align-items: center;
  background: Rgb(0 0 0 / 75%);
  inset: 0;
}

.creator-illegal-modal {
  width: 90%;
  max-width: 500px;
  padding: 1.5rem;
  border: 2px solid var(--red-light);
  border-radius: $radius-lg;
  background: var(--slate-800);
  color: var(--white);
  box-shadow: var(--shadow-glow-red-lg);
}

.illegal-title {
  margin: 0 0 0.75rem;
  color: var(--red-light);
  font-size: var(--font-18);
  font-weight: bold;
}

.illegal-desc {
  color: var(--slate-300);
  font-size: var(--font-14);
  margin-bottom: 1rem;
}

.illegal-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  max-height: 250px;
  margin: 0 0 1.25rem;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.illegal-item {
  padding: 0.5rem;
  background: Rgb(255 68 68 / 10%);
  color: var(--red-300);
  font-size: var(--font-14);
  border-left: 3px solid var(--red-light);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
