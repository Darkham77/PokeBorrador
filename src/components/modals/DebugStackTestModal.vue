<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

interface Props {
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

const props = withDefaults(defineProps<Props>(), {
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
    :show="true"
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
  align-items: center;
  justify-content: center;
  padding: 0; // Removed to let BaseModal padding show
  gap: 30px;
  background: Rgba(255, 255, 255, 0.05); // Added background to visualize space
  width: 100%;
}

.big-number {
  @include pixelated;
  font-size: 80px;
  color: var(--white);
  @include pixelated;
  text-shadow: 4px 4px 0px Rgba(0, 0, 0, 0.5);
  margin: 0;
}

.pixel-btn {
  width: 100%;
  @include btn-vicio-primary;
  padding: 15px; // Custom padding for this modal
}
</style>
