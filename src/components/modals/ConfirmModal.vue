<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
  show?: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: string
  variant?: string
  onConfirm?: () => void
  onCancel?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '¿ESTÁS SEGURO?',
  message: '',
  confirmText: 'ACEPTAR',
  cancelText: 'CANCELAR',
  type: 'primary',
  variant: 'modern'
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()

const clicked = ref(false)

const handleConfirm = () => {
  if (clicked.value) return
  clicked.value = true
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
    :variant="variant"
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
          :class="{ 'is-danger': type === 'danger' }"
          :disabled="clicked"
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

// Retro Yellow Variant Styles
:deep(.variant-retro) {
  .confirm-body p {
    color: $coin-gold; // Gold/Yellow text for retro
    @include pixelated;
    font-size: 12px;
    text-shadow: 2px 2px 0 Rgba(0,0,0,0.5);
  }

  .confirm-footer {
    .btn-cancel {
      border: 2px solid var(--gray);
      background: var(--card-dark);
      color: var(--muted);
    }
    .btn-confirm {
      background: Linear-Gradient(135deg, $coin-gold, #b8860b);
      color: $black;
      border: 2px solid $black;
      box-shadow: 4px 4px 0 Rgba(0,0,0,0.3);
      
      &:hover {
        background: Linear-Gradient(135deg, $white, $coin-gold);
        // Handled by GSAP
      }
    }
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
    
    
    &:active {
      // Handled by GSAP
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
    padding: 14px; 

    &.is-danger {
      background: Linear-Gradient(135deg, var(--red), #dc2626);
      box-shadow: 0 4px 15px Rgba(220, 38, 38, 0.4);
      &:hover {
        background: Linear-Gradient(135deg, #ef4444, #b91c1c);
        box-shadow: 0 6px 20px Rgba(220, 38, 38, 0.5);
      }
    }
  }
}
</style>
