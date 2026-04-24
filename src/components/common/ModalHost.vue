<script setup>
import { useModalStore } from '@/stores/modals'

const modalStore = useModalStore()
</script>

<template>
  <div class="modal-host">
    <!-- 
      We render all modals in the stack. 
      The BaseModal inside each component handles the Teleport to body.
    -->
    <component
      :is="modal.component"
      v-for="modal in modalStore.stack"
      :key="modal.id"
      v-bind="modal.props"
      :show="!modal.closing"
      @close="modalStore.close(modal.id)"
    />
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
