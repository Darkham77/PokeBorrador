<script setup lang="ts">
import { computed } from 'vue'
import { useModalStore, type Modal } from '@/stores/modals'
import ModalHierarchyProvider from '@/components/common/ModalHierarchyProvider.vue'
import { MODAL_REGISTRY, type ModalRegistryKey } from '@/logic/modals/registry'

const modalStore = useModalStore()

const resolveModalComponent = (modal: Modal) => {
  return modal.component || (modal.name in MODAL_REGISTRY ? MODAL_REGISTRY[modal.name as ModalRegistryKey] : null)
}

/**
 * The modal considered "Top" for restoring effects.
 * It is the last modal that is NOT currently closing.
 */
const topActiveModalId = computed(() => {
  const activeModals = modalStore.stack.filter((m: Modal) => !m.closing)
  return activeModals.length > 0 ? activeModals.at(-1)?.id : null
})

const blockingModalIndex = computed(() => {
  // The "main" modal is the last modal that is NOT closing.
  // We simplify everything underneath the highest active modal to save resources during animations.
  for (let i = modalStore.stack.length - 1; i >= 0; i--) {
    const m = modalStore.stack[i]
    if (m && !m.closing) return i
  }
  return -1
})
</script>

<template>
  <div class="modal-host">
    <!-- 
      We render all modals in the stack. 
      The BaseModal inside each component handles the Teleport to body.
    -->
    <ModalHierarchyProvider
      v-for="(modal, index) in modalStore.stack"
      :id="modal.id"
      :key="modal.id"
      :is-top="modal.id === topActiveModalId"
      :is-simplified="Number(index) < blockingModalIndex"
    >
      <component
        :is="resolveModalComponent(modal)"
        v-bind="modal.props"
        :show="!modal.closing"
        @close="modalStore.close(modal.id)"
      />
    </ModalHierarchyProvider>
  </div>
</template>

<style scoped lang="scss">
.modal-host {
  /* The host itself is invisible, modals teleport out */
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}
</style>
