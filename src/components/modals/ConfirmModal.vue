<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '¿ESTÁS SEGURO?' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'ACEPTAR' },
  cancelText: { type: String, default: 'CANCELAR' }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

const handleConfirm = () => {
  emit('confirm')
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
    variant="retro"
    padding="raw"
    @close="handleCancel"
  >
    <div class="confirm-body">
      <p>{{ message }}</p>
    </div>
    
    <template #footer>
      <div class="confirm-footer">
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

.confirm-body {
  padding: 24px;
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: Rgba(255, 255, 255, 0.8);
    font-family: 'Inter', sans-serif;
    text-align: center;
  }
}

.confirm-footer {
  display: flex;
  gap: 12px;
  
  button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-size: 10px;
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
    @include btn-vicio-primary;
    padding: 14px; // Keep more compact for confirm modal
  }
}
</style>
