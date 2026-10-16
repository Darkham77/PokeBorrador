<script setup lang="ts">
import { ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';

interface Props {
  show?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: string;
  variant?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

withDefaults(defineProps<Props>(), {
  show: false,
  title: '¿ESTÁS SEGURO?',
  message: '',
  confirmText: 'ACEPTAR',
  cancelText: 'CANCELAR',
  type: 'primary',
  variant: 'modern',
  onConfirm: undefined,
  onCancel: undefined
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
}>();

const clicked = ref(false);

const handleConfirm = () => {
  if (clicked.value) return;
  clicked.value = true;
  emit('confirm');
  emit('close');
};

const handleCancel = () => {
  emit('cancel');
  emit('close');
};
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
        <button id="cancel-modal-btn" class="btn-cancel" @click.stop="handleCancel">
          {{ cancelText }}
        </button>
        <button
          id="confirm-modal-btn"
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
@use '@/styles/core/_mixins' as *;
@use 'sass:math';
@use '@/styles/core/tools' as *;

.confirm-body {
  padding: 24px;

  p {
    margin: 0;
    color: Rgb(255 255 255 / 80%);
    font-family: $font-family-ui;
    font-size: var(--font-14);
    line-height: 1.6;
    text-align: center;
  }
}

// Retro Yellow Variant Styles
:deep(.variant-retro) {
  .confirm-body p {
    @include pixelated;

    color: $coin-gold; // Gold/Yellow text for retro
    font-size: var(--font-12);
    text-shadow: 2px 2px 0 Rgb(0 0 0 / 50%);
  }

  .confirm-footer {
    .btn-cancel {
      border: 2px solid var(--gray);
      background: var(--card-dark);
      color: var(--muted);
    }
    .btn-confirm {
      border: 2px solid var(--black);
      background: Linear-Gradient(135deg, $coin-gold, #b8860b);
      color: $black;
      box-shadow: var(--shadow-card);

      &:hover {
        background: Linear-Gradient(135deg, $white, $coin-gold);

        // Handled by GSAP
      }
    }
  }
}

.confirm-footer {
  display: flex;
  gap: $spacing-md;

  button {
    @include pixelated;

    padding: 14px;
    border: none;
    border-radius: $radius-xl;
    font-size: var(--font-10);
    font-weight: 700;
    flex: 1;
    cursor: pointer;

    &:active {
      // Handled by GSAP
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
    @include btn-vicio-primary;

    padding: 14px;

    &.is-danger {
      background: Linear-Gradient(135deg, var(--red), var(--red-600));
      box-shadow: var(--shadow-md);
      &:hover {
        background: Linear-Gradient(135deg, var(--red-light), var(--red-600));
        box-shadow: var(--shadow-card);
      }
    }
  }
}
</style>
