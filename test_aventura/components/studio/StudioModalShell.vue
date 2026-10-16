<script setup lang="ts">
defineProps<{
  title: string;
  icon?: string;
  maxWidth?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div
    id="studio-modal-shell-div-1"
    role="button"
    tabindex="-1"
    aria-label="Cerrar ventana modal"
    class="modal-backdrop"
    @click.self="emit('close')"
  >
    <div class="modal-card" :style="maxWidth ? { maxWidth } : undefined">
      <header class="modal-header">
        <div class="flex items-center gap-2">
          <span v-if="icon" class="icon text-xl">{{ icon }}</span>
          <h3 class="modal-title">
            {{ title }}
          </h3>
        </div>
        <button id="studio-modal-shell-btn-emit" class="btn-close" @click="emit('close')">
          <span class="emoji-inline">✕</span>
        </button>
      </header>

      <div class="modal-body">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="modal-footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.modal-backdrop {
  position: fixed;
  z-index: var(--z-hud);
  display: flex;
  justify-content: center;
  align-items: center;
  background: Rgb(0 0 0 / 75%);
  inset: 0;
  backdrop-filter: Blur(4px);
}

.modal-card {
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: 540px;
  max-height: 90dvh;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-xl;
  background: var(--slate-900);
  overflow: hidden;
  box-shadow: var(--shadow-2xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--slate-800);
  border-bottom: 1px solid Rgb(255 255 255 / 10%);
}

.modal-title {
  margin: 0;
  color: var(--slate-50);
  font-size: var(--font-15);
  font-weight: 700;
}

.btn-close {
  border: none;
  background: transparent;
  color: var(--slate-400);
  font-size: var(--font-18);
  cursor: pointer;

  &:hover {
    color: var(--white);
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md-alt;
  padding: 16px 20px;
  background: var(--slate-800);
  border-top: 1px solid Rgb(255 255 255 / 10%);
}
</style>
