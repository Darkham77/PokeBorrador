<script setup>
import { ref, watch, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: '500px'
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  },
  showCloseButton: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'center', // 'center', 'side-left', 'side-right'
    validator: (val) => ['center', 'side-left', 'side-right', 'side'].includes(val)
  },
  zIndex: {
    type: Number,
    default: 11000
  },
  hideHeader: {
    type: Boolean,
    default: false
  },
  padding: {
    type: String,
    default: 'standard' // 'standard' or 'raw'
  },
  customClass: {
    type: String,
    default: ''
  },
  noScroll: {
    type: Boolean,
    default: false
  },
  lockScroll: {
    type: Boolean,
    default: true
  },
  overlay: {
    type: String,
    default: 'dark', // 'dark' or 'none'
    validator: (val) => ['dark', 'none'].includes(val)
  },
  variant: {
    type: String,
    default: 'modern', // 'modern' or 'retro'
    validator: (val) => ['modern', 'retro'].includes(val)
  }
})

const emit = defineEmits(['close', 'confirm', 'cancel', 'submit'])

const handleClose = () => {
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnClickOutside) {
    handleClose()
  }
}

const computedZIndex = ref(props.zIndex)

const cardStyles = computed(() => {
  if (props.type === 'center') {
    return { maxWidth: props.maxWidth }
  }
  return {}
})

const localShow = ref(props.show)

watch(() => props.show, (val) => {
  if (val) {
    localShow.value = true
    computedZIndex.value = props.zIndex
  } else {
    // Wait for animations to finish before removing root from DOM
    // 500ms covers the 400ms CSS transitions comfortably
    setTimeout(() => {
      if (!props.show) {
        localShow.value = false
      }
    }, 500)
  }
}, { immediate: true })

const onTransitionEnd = () => {
  // Keeping this as a secondary safety, but the watch now handles the main logic
  if (!props.show) {
    localShow.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="localShow"
      class="base-modal-root"
      :style="{ zIndex: computedZIndex }"
    >
      <!-- Background Overlay (Always Fixed) -->
      <Transition
        name="fade-overlay"
        appear
        @after-leave="onTransitionEnd"
      >
        <div 
          v-if="show && overlay === 'dark'" 
          class="modal-overlay" 
          @click="handleOverlayClick" 
        />
      </Transition>
      
      <!-- Content Wrapper (Flex Centered) -->
      <Transition 
        :name="type.startsWith('side') ? (type === 'side-left' ? 'slide-left' : 'slide-right') : 'modal-zoom'"
        appear
        @after-leave="onTransitionEnd"
      >
        <div 
          v-if="show"
          class="base-modal-teleport-wrapper" 
          :class="[{ 'no-pointer-events': overlay === 'none' }, `type-${type}`]"
        >
          <div 
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
            >
              <slot name="header">
                <div class="modal-header-left">
                  <slot name="header-icon" />
                  <div class="modal-title-stack">
                    <h2 class="modal-title-text">
                      {{ title }}
                    </h2>
                  </div>
                </div>
              </slot>
              
              <button
                v-if="showCloseButton"
                class="modal-close-btn"
                @click="handleClose"
              >
                &times;
              </button>
            </header>

            <!-- Floating Close Button (Only if header is hidden) -->
            <button
              v-else-if="showCloseButton"
              class="modal-close-btn-floating"
              @click="handleClose"
            >
              &times;
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
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

.base-modal-root {
  position: fixed;
  inset: 0;
  display: block;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: Blur(10px);
  z-index: 1;
  pointer-events: auto;
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
}

.base-modal-card {
  position: relative;
  pointer-events: auto;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  
  // Prevent half-pixel blurring on centered modals
  backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-font-smoothing: none;

  .type-center & {
    width: 95%;
    max-height: 94vh;
    border-radius: 20px;
  }
  
  .type-side &, .type-side-right & {
    width: 440px;
    max-width: 95vw;
    height: 100vh;
    border-radius: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .type-side-left & {
    width: 440px;
    max-width: 95vw;
    height: 100vh;
    border-radius: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Variants */
  &.variant-retro {
    border: 2px solid var(--yellow) !important;
    border-radius: 30px !important;
    background: #1a1c2e !important;
  }
}

.modal-header-premium {
  padding: 24px 32px 16px;
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
  color: rgba(255, 255, 255, 0.4);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 100;
  
  &:hover {
    color: $white;
    transform: Rotate(90deg);
  }
}

.modal-close-btn-floating {
  position: absolute;
  top: 20px;
  right: 20px;
}

.modal-footer-premium {
  padding: 16px 32px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

/* Transitions */
.fade-overlay-enter-active, .fade-overlay-leave-active {
  transition: opacity 0.4s ease;
}
.fade-overlay-enter-from, .fade-overlay-leave-to {
  opacity: 0;
}

.modal-zoom-enter-active, .modal-zoom-leave-active,
.slide-right-enter-active, .slide-right-leave-active,
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-zoom-enter-from, .modal-zoom-leave-to {
  opacity: 0;
  transform: Scale(0.9);
}

.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: TranslateX(100%);
}

.slide-left-enter-from, .slide-left-leave-to {
  opacity: 0;
  transform: TranslateX(-100%);
}

.modal-scrollable-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  position: relative;
  
  &.padding-standard { 
    padding: 16px; 
    
    &.variant-retro {
      padding: 20px;
    }
  }
  
  &.padding-raw { padding: 0 !important; }
}

.no-scroll { overflow-y: hidden !important; }

body.modal-open {
  overflow: hidden !important;
}
</style>
