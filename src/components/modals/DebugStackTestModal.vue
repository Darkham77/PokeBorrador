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
  color: #fff;
  @include pixelated;
  text-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.pixel-btn {
  width: 100%;
  padding: 15px;
  background: var(--yellow, #ffd700);
  border: none;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  @include pixelated;
  cursor: pointer;
  color: #000;
  box-shadow: 0 4px 0 #b39700;
  transition: all 0.2s;
  
  &:hover {
    background: #ffeb3b;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: none;
  }
}
</style>
