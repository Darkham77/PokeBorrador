<template>
  <Teleport to="body">
    <div
      v-if="localShow"
      class="base-modal-root"
      :style="{ zIndex: computedZIndex }"
    >
      <!-- Background Overlay -->
      <Transition
        name="fade-overlay"
        appear
      >
        <div 
          v-if="show" 
          class="modal-overlay" 
          :class="{ 'transparent': overlay === 'none' }"
          @click="handleOverlayClick" 
        />
      </Transition>
      
      <!-- Content Wrapper -->
      <div 
        v-if="localShow"
        class="base-modal-teleport-wrapper" 
        :class="[{ 'no-pointer-events': overlay === 'none' && !closeOnClickOutside }, `type-${type}`]"
      >
        <Transition 
          :name="type.startsWith('side') ? (type === 'side-left' ? 'slide-left' : 'slide-right') : 'modal-zoom'"
          appear
          type="transition"
          :duration="500"
          @after-leave="onContentLeave"
        >
          <div 
            v-if="show"
            class="modal-content-premium base-modal-card"
            :class="[
              padding === 'raw' ? 'padding-raw' : 'padding-standard', 
              `variant-${variant}`,
              customClass
            ]"
            :style="cardStyles"
            @click.stop
          >
            <!-- Header -->
            <header
              v-if="!hideHeader"
              class="modal-header-premium"
              :style="{ background: headerBackground }"
            >
              <slot name="header">
                <div class="modal-header-left">
                  <slot name="header-icon" />
                  <div class="modal-title-stack">
                    <h2 
                      class="modal-title-text"
                      :style="{ color: titleColor }"
                    >
                      {{ title }}
                    </h2>
                  </div>
                </div>
              </slot>
              
              <button
                v-if="showCloseButton"
                class="modal-close-btn"
                :disabled="preventClose"
                @click="handleClose"
              >
                <div class="close-icon-wrapper" />
              </button>
            </header>

            <!-- Floating Close Button -->
            <button
              v-else-if="showCloseButton"
              class="modal-close-btn-floating"
              :disabled="preventClose"
              @click="handleClose"
            >
              <div class="close-icon-wrapper" />
            </button>

            <!-- Content -->
            <div 
              class="modal-scrollable-content"
              :class="[
                padding === 'raw' ? 'padding-raw' : 'padding-standard',
                `variant-${variant}`,
                { 'no-scroll': noScroll }
              ]"
            >
              <slot />
            </div>

            <!-- Footer -->
            <footer
              v-if="$slots.footer"
              class="modal-footer-premium"
            >
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '500px' },
  closeOnClickOutside: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  type: {
    type: String,
    default: 'center',
    validator: (val) => ['center', 'side-left', 'side-right', 'side'].includes(val)
  },
  zIndex: { type: Number, default: 11000 },
  hideHeader: { type: Boolean, default: false },
  padding: { type: String, default: 'standard' },
  customClass: { type: String, default: '' },
  noScroll: { type: Boolean, default: false },
  lockScroll: { type: Boolean, default: true },
  overlay: {
    type: String,
    default: 'dark',
    validator: (val) => ['dark', 'none'].includes(val)
  },
  variant: {
    type: String,
    default: 'modern',
    validator: (val) => ['modern', 'retro'].includes(val)
  },
  titleColor: { type: String, default: null },
  headerBackground: { type: String, default: null },
  preventClose: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm', 'cancel', 'submit'])

const handleClose = () => {
  if (props.preventClose) return
  emit('close')
}
const handleOverlayClick = () => { 
  if (props.closeOnClickOutside && !props.preventClose) handleClose() 
}

const computedZIndex = ref(props.zIndex)
const localShow = ref(props.show)

watch(() => props.show, (val) => {
  if (val) {
    localShow.value = true
    computedZIndex.value = props.zIndex
    if (props.lockScroll) document.body.classList.add('modal-open')
  } else {
    // We don't set localShow = false here to allow the leave transition to play
    if (props.lockScroll) document.body.classList.remove('modal-open')
  }
}, { immediate: true })

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (props.lockScroll) {
    document.body.classList.remove('modal-open')
  }
})

const onContentLeave = () => {
  if (!props.show) {
    localShow.value = false
  }
}

const cardStyles = computed(() => {
  if (props.type === 'center') return { maxWidth: props.maxWidth }
  return {}
})
</script>

<style lang="scss">
@use "@/styles/core/tools" as *;

.base-modal-root {
  position: fixed;
  inset: 0;
  display: block;
  pointer-events: none; // Ensure the root doesn't block clicks/scrolls
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: Blur(10px);
  z-index: 1;
  pointer-events: auto;
  // GPU Acceleration
  transform: TranslateZ(0);
  will-change: opacity;

  &.transparent {
    background: transparent !important;
    backdrop-filter: none !important;
    pointer-events: none !important;
  }
}

.base-modal-teleport-wrapper {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;

  &.type-side, &.type-side-right {
    justify-content: flex-end;
    align-items: stretch;
  }

  &.type-side-left {
    justify-content: flex-start;
    align-items: stretch;
  }

  &.no-pointer-events {
    pointer-events: none !important;
    
    // Ensure the card itself still catches events
    .base-modal-card {
      pointer-events: auto !important;
    }
  }
}

.base-modal-card {
  position: relative;
  pointer-events: auto;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-font-smoothing: none;
  opacity: 1;
  transform: Translate3d(0, 0, 0);
  will-change: transform, opacity;

  // GPU Acceleration via mixin or direct property
  @include gpu-layer;

  .type-center & {
    width: 95%;
    max-height: 92vh;
    border-radius: 24px;
  }
  
  .type-side &, .type-side-right & {
    width: 440px;
    max-width: 95vw;
    height: 100vh;
    max-height: 100vh !important;
    border-radius: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .type-side-left & {
    width: 440px;
    max-width: 95vw;
    height: 100vh;
    max-height: 100vh !important;
    border-radius: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  &.variant-retro {
    background: #1a1c2e !important;
    border: 2px solid var(--yellow) !important;
    border-radius: 4px !important;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(255, 217, 61, 0.1);

    .type-center & {
      border-radius: 30px !important;
    }
  }
}

.modal-header-premium {
  padding: 16px 24px;
  min-height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-title-text {
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  color: var(--yellow, #ffd700);
  letter-spacing: 1px;
  @include pixelated;
}

.modal-close-btn, .modal-close-btn-floating {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  .close-icon-wrapper {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    transition: inherit;
    border: 1px solid rgba(255, 255, 255, 0.05);

    &::before, &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 2px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 2px;
      transition: inherit;
    }

    &::before { transform: Translate(-50%, -50%) Rotate(45deg); }
    &::after { transform: Translate(-50%, -50%) Rotate(-45deg); }
  }
  
  &:hover {
    transform: Scale(1.1);
    transform-origin: center;
    
    .close-icon-wrapper {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
      transform: Rotate(180deg);

      &::before, &::after {
        background: #ef4444;
      }
    }
  }

  &:active {
    transform: Scale(0.9);
  }
}

.modal-close-btn-floating {
  position: absolute;
  top: 16px;
  right: 16px;
}

.modal-footer-premium {
  padding: 16px 32px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

/* Transitions */
.fade-overlay-enter-active, .fade-overlay-leave-active {
  transition: opacity 0.4s ease !important;
}
.fade-overlay-enter-from, .fade-overlay-leave-to {
  opacity: 0 !important;
}

.modal-zoom-enter-active, .modal-zoom-leave-active,
.slide-right-enter-active, .slide-right-leave-active,
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-zoom-enter-from, .modal-zoom-leave-to {
  opacity: 0;
  transform: Translate3d(0, 0, 0) Scale(0.95);
}

.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: Translate3d(100%, 0, 0);
}

.slide-left-enter-from, .slide-left-leave-to {
  opacity: 0;
  transform: Translate3d(-100%, 0, 0);
}

.modal-scrollable-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  @include smooth-scroll;
  
  &.padding-standard { 
    padding: 16px; 
    &.variant-retro { padding: 20px; }
  }
  
  &.padding-raw { padding: 0 !important; }
}

.no-scroll { overflow-y: hidden !important; }

body.modal-open {
  overflow: hidden !important;
}
</style>
