<script setup lang="ts">
import { computed } from 'vue'
import { useModalStore, type Modal } from '@/stores/modals'
import ModalHierarchyProvider from '@/components/common/ModalHierarchyProvider.vue'

const modalStore = useModalStore()

/**
 * El modal que se considera "Superior" para restaurar efectos.
 * Es el último modal que NO se está cerrando.
 */
const topActiveModalId = computed(() => {
  const activeModals = modalStore.stack.filter((m: Modal) => !m.closing)
  return activeModals.length > 0 ? activeModals.at(-1)?.id : null
})

const blockingModalIndex = computed(() => {
  // El "principal" es el último modal que ha TERMINADO de abrir y NO se está cerrando.
  // Solo cuando un modal está totalmente visible activamos el modo simplificado debajo.
  for (let i = modalStore.stack.length - 1; i >= 0; i--) {
    const m = modalStore.stack[i]
    if (m && !m.opening && !m.closing) return i
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
      :key="modal.id"
      :is-top="modal.id === topActiveModalId"
      :is-simplified="Number(index) < blockingModalIndex"
    >
      <component
        :is="modal.component"
        v-bind="modal.props"
        :id="modal.id"
        :show="!modal.closing"
        @close="modalStore.close(modal.id)"
      />
    </ModalHierarchyProvider>
  </div>
</template>

<style scoped>
.modal-host {
  /* The host itself is invisible, modals teleport out */
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}
</style>
