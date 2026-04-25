<script setup>
import { computed } from 'vue'
import { useModalStore } from '@/stores/modals'
import ModalHierarchyProvider from '@/components/common/ModalHierarchyProvider.vue'

const modalStore = useModalStore()

/**
 * El modal que se considera "Superior" para restaurar efectos.
 * Es el último modal que NO se está cerrando.
 */
const topActiveModalId = computed(() => {
  const activeModals = modalStore.stack.filter(m => !m.closing)
  return activeModals.length > 0 ? activeModals[activeModals.length - 1].id : null
})

/**
 * El modal que está "Bloqueando" el performance de los de abajo.
 * Solo bloquea si ya terminó su animación de apertura (!opening).
 */
const blockingModalIndex = computed(() => {
  // Buscamos el índice del último modal que está totalmente abierto y no cerrándose
  for (let i = modalStore.stack.length - 1; i >= 0; i--) {
    const m = modalStore.stack[i]
    if (!m.opening && !m.closing) return i
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
      :is-simplified="index < blockingModalIndex"
    >
      <component
        :is="modal.component"
        v-bind="modal.props"
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
