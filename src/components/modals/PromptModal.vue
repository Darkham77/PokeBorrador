<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'INGRESAR VALOR' },
  message: { type: String, default: '' },
  initialValue: { type: String, default: '' },
  type: { type: String, default: 'text' }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])
const inputValue = ref(props.initialValue)

const handleConfirm = () => {
  emit('confirm', inputValue.value)
  emit('close')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="title"
    max-width="400px"
    @close="handleCancel"
  >
    <div class="prompt-body">
      <p v-if="message">
        {{ message }}
      </p>
      <input 
        v-model="inputValue"
        :type="type"
        class="prompt-input"
        autofocus
        @keyup.enter="handleConfirm"
      >
    </div>
    
    <template #footer>
      <div class="prompt-footer">
        <button 
          class="btn-cancel" 
          @click="handleCancel"
        >
          CANCELAR
        </button>
        <button 
          class="btn-confirm" 
          @click="handleConfirm"
        >
          CONFIRMAR
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "sass:math";
@use "@/styles/core/tools" as *;

.prompt-body {
  padding: 24px;
  
  p {
    margin: 0 0 16px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Inter', sans-serif;
  }
  
  .prompt-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    outline: none;
    transition: all 0.2s;
    
    &:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 12px rgba(255, 214, 10, 0.2);
    }
  }
}

.prompt-footer {
  display: flex;
  gap: 12px;
  
  button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    font-family: 'Press Start 2P', cursive;
    cursor: pointer;
    transition: all 0.2s;
    @include pixelated;
    
    &:active {
      transform: Scale(0.95);
    }
  }
  
  .btn-cancel {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.5);
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
  
  .btn-confirm {
    background: var(--yellow);
    color: #000;
    box-shadow: 0 4px 15px rgba(255, 214, 10, 0.3);
    &:hover {
      background: #ffd60a;
    }
  }
}
</style>
