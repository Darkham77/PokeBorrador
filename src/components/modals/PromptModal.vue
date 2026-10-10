<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
  show?: boolean
  title?: string
  message?: string
  initialValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  type?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: 'INGRESAR VALOR',
  message: '',
  initialValue: '',
  placeholder: '',
  confirmText: 'CONFIRMAR',
  cancelText: 'CANCELAR',
  type: 'text'
})

const emit = defineEmits<{
  (e: 'confirm', val: string): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()

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
        id="prompt-modal-input"
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
          id="prompt-modal-cancel-btn"
          class="btn-cancel" 
          @click.stop="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button 
          id="prompt-modal-confirm-btn"
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
    color: Rgb(255 255 255 / 70%);
    font-family: $font-family-ui;
    font-size: var(--font-14);
  }
  
  .prompt-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: $radius-xl;
    background: Rgb(0 0 0 / 30%);
    color: var(--white);
    font-family: $font-family-ui;
    font-size: var(--font-16);
    outline: none;
    
    
    &:focus {
      border-color: var(--yellow);
      box-shadow: var(--shadow-glow-amber);
    }
  }
}

.prompt-footer {
  display: flex;
  gap: $spacing-md;
  
  button {
    @include pixelated;
    @include pixelated;

    padding: 14px;
    border: none;
    border-radius: $radius-xl;
    font-size: var(--font-9);
    font-weight: 700;
    flex: 1;
    cursor: pointer;
    
    &:active {
      transform: Scale(0.95);
    }
  }
  
  .btn-cancel {
    background: Rgb(255 255 255 / 5%);
    color: Rgb(255 255 255 / 50%);
    &:hover {
      background: Rgb(255 255 255 / 10%);
      color: var(--white);
    }
  }
  
  .btn-confirm {
    background: var(--yellow);
    color: Rgb(0 0 0 / 100%);
    box-shadow: var(--shadow-md);
    &:hover {
      background: $yellow;
    }
  }
}
</style>
