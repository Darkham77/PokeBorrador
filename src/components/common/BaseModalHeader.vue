<script setup lang="ts">
import type { CSSProperties } from 'vue'

const props = withDefaults(defineProps<{
  hideHeader?: boolean
  title?: string
  headerIconEmoji?: string
  headerStyles?: CSSProperties | Record<string, string | number>
  titleStyles?: CSSProperties | Record<string, string | number>
  showCloseButton?: boolean
  closeBtnId?: string // infra-id-ok: DOM element identifier for testing locators
  floatingCloseBtnId?: string // infra-id-ok: DOM element identifier for floating close button
  closeBtnClass?: Record<string, boolean>
  preventClose?: boolean
}>(), {
  hideHeader: false,
  title: '',
  headerIconEmoji: '',
  headerStyles: undefined,
  titleStyles: undefined,
  showCloseButton: true,
  closeBtnId: undefined,
  floatingCloseBtnId: undefined,
  closeBtnClass: () => ({}),
  preventClose: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleClose = () => {
  if (props.preventClose) return
  emit('close')
}
</script>

<template>
  <header
    v-if="!hideHeader"
    class="modal-header-premium"
    :style="headerStyles"
  >
    <template v-if="$slots.header">
      <slot name="header" />
    </template>
    <template v-else>
      <div class="modal-header-left">
        <slot name="header-icon">
          <span
            v-if="headerIconEmoji"
            class="emoji modal-header-emoji"
          >{{ headerIconEmoji }}</span>
        </slot>
        <div class="modal-title-stack">
          <h2
            class="modal-title-text"
            :style="titleStyles"
          >
            {{ title }}
          </h2>
        </div>
      </div>
    </template>

    <button
      v-if="showCloseButton"
      :id="closeBtnId"
      class="modal-close-btn"
      :class="closeBtnClass"
      :disabled="preventClose"
      @click.stop="handleClose"
    >
      <div class="close-icon-wrapper" />
    </button>
  </header>

  <!-- Floating Close Button when header is hidden -->
  <button
    v-else-if="showCloseButton"
    :id="floatingCloseBtnId"
    class="modal-close-btn-floating"
    :class="closeBtnClass"
    :disabled="preventClose"
    @click.stop="handleClose"
  >
    <div class="close-icon-wrapper" />
  </button>
</template>

<style lang="scss">
@use "@/styles/components/base-modal" as *;
</style>
