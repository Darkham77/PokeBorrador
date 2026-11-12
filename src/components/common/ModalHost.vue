<script setup lang="ts">
import ModalHierarchyProvider from '@/components/common/ModalHierarchyProvider.vue';
import { MODAL_REGISTRY, type ModalRegistryKey } from '@/logic/modals/registry';
import { useModalStore, type Modal } from '@/stores/modals';

const modalStore = useModalStore();

const resolveModalComponent = (modal: Modal): unknown => {
  return (
    modal.component ||
    (modal.name in MODAL_REGISTRY ? MODAL_REGISTRY[modal.name as ModalRegistryKey] : null)
  );
};
</script>

<template>
  <div class="modal-host">
    <ModalHierarchyProvider
      v-for="modal in modalStore.stack"
      :id="modal.id"
      :key="modal.id"
      :is-top="modal.isActiveTop"
      :is-simplified="modal.isSimplified"
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
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}
</style>
