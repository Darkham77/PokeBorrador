<script setup>
import { ref, watch } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'INGRESAR VALOR' },
  message: { type: String, default: '' },
  initialValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  confirmText: { type: String, default: 'CONFIRMAR' },
  cancelText: { type: String, default: 'CANCELAR' },
  type: { type: String, default: 'text' }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])
const inputValue = ref(props.initialValue)

// Update internal value when initialValue prop changes (e.g. modal reused)
watch(() => props.initialValue, (newVal) => {
  inputValue.value = newVal
})

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
        :placeholder="placeholder"
        class="prompt-input"
        autofocus
        @keyup.enter="handleConfirm"
      >
    </div>
    
    <template #footer>
      <div class="prompt-footer">
        <button 
          class="btn-cancel" 
          @click.stop="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button 
          class="btn-confirm" 
          @click.stop="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "sass:math";
@use "@/styles/core/tools" as *;

.prompt-body {
  padding: 24px;
  
  p {
    margin: 0 0 16px;
    font-size: 14px;
    color: Rgba(255, 255, 255, 0.7);
    font-family: 'Inter', sans-serif;
  }
  
  .prompt-input {
    width: 100%;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: var(--white);
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    outline: none;
    transition: all 0.2s;
    
    &:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 12px Rgba(255, 214, 10, 0.2);
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
    @include pixelated;
    cursor: pointer;
    transition: all 0.2s;
    @include pixelated;
    
    &:active {
      transform: Scale(0.95);
    }
  }
  
  .btn-cancel {
    background: Rgba(255, 255, 255, 0.05);
    color: Rgba(255, 255, 255, 0.5);
    &:hover {
      background: Rgba(255, 255, 255, 0.1);
      color: var(--white);
    }
  }
  
  .btn-confirm {
    background: var(--yellow);
    color: Rgba(0, 0, 0, 1);
    box-shadow: 0 4px 15px Rgba(255, 214, 10, 0.3);
    &:hover {
      background: $yellow;
    }
  }
}
</style>
