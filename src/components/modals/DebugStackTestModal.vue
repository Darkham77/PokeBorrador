<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  number: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close'])
</script>

<template>
  <BaseModal
    :show="true"
    :title="`MODAL TEST #${number}`"
    max-width="340px"
    variant="retro"
    @close="emit('close')"
  >
    <div class="test-content">
      <h1 class="big-number">
        {{ number }}
      </h1>
      <button
        class="pixel-btn"
        @click="emit('close')"
      >
        CERRAR
      </button>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.test-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 30px;
}

.big-number {
  font-family: 'Press Start 2P', cursive;
  font-size: 80px;
  color: $white;
  @include pixelated;
  text-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.pixel-btn {
  width: 100%;
  @include btn-vicio-primary;
  padding: 15px; // Custom padding for this modal
}
</style>
