<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
  id?: string
  show?: boolean
  number: number
  type?: string
  variant?: string
  hideHeader?: boolean
  corners?: string | null
  showBorder?: boolean
  blurOverlay?: boolean
  yellowBorder?: boolean
  overlay?: string
  maxWidth?: string
  padding?: string
  positionMode?: string | null
}

withDefaults(defineProps<Props>(), {
  id: 'debug-stack-test-modal',
  show: true,
  type: 'center',
  variant: 'modern',
  hideHeader: false,
  corners: null,
  showBorder: true,
  blurOverlay: true,
  yellowBorder: false,
  overlay: 'dark',
  maxWidth: '340px',
  padding: 'standard',
  positionMode: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <BaseModal
    :id="id"
    :show="show"
    :title="`MODAL TEST #${number}`"
    :type="type"
    :variant="variant"
    :hide-header="hideHeader"
    :corners="corners || undefined"
    :show-border="showBorder"
    :blur-overlay="blurOverlay"
    :yellow-border="yellowBorder"
    :overlay="overlay"
    :max-width="maxWidth"
    :padding="padding"
    :position-mode="positionMode || undefined"
    @close="emit('close')"
  >
    <div class="test-content">
      <h1 class="big-number">
        {{ number }}
      </h1>
      <button
        class="pixel-btn"
        @click.stop="emit('close')"
      >
        CERRAR
      </button>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.test-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 30px;
  width: 100%;
  padding: 0; // Removed to let BaseModal padding show
  background: rgb(255 255 255 / 5%); // Added background to visualize space
}

.big-number {
  @include pixelated;
  @include pixelated;

  margin: 0;
  color: var(--white);
  font-size: 80px;
  text-shadow: 4px 4px 0 rgb(0 0 0 / 50%);
}

.pixel-btn {
  @include btn-vicio-primary;

  width: 100%;
  padding: 15px; // Custom padding for this modal
}
</style>
