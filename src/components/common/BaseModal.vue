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
    default: 'raw' // 'standard' or 'raw'
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

watch(() => props.show, (val) => {
  if (val) {
    // Basic z-index handling if needed, but ModalHost renders in order
    computedZIndex.value = props.zIndex
  }
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition 
      :name="type.startsWith('side') ? (type === 'side-left' ? 'slide-left' : 'slide-right') : 'modal-zoom'"
      appear
    >
      <div 
        v-if="show" 
        class="base-modal-teleport-wrapper" 
        :class="{ 'no-pointer-events': overlay === 'none' }"
        :style="{ zIndex: computedZIndex }"
      >
        <div 
          v-if="overlay === 'dark'" 
          class="modal-overlay active" 
          @click="handleOverlayClick" 
        />
        
        <div 
          class="modal-content-premium base-modal-card"
          :class="[`type-${type}`, padding === 'raw' ? 'padding-raw' : 'padding-standard', customClass]"
          :style="cardStyles"
          @click.stop
        >
          <!-- Floating Close Button -->
          <button
            v-if="hideHeader && showCloseButton"
            class="modal-close-btn-floating"
            @click="handleClose"
          >
            &times;
          </button>

          <!-- Header -->
          <header
            v-if="!hideHeader"
            class="modal-header-premium"
          >
            <div class="modal-header-left">
              <slot name="header-icon" />
              <div class="modal-title-stack">
                <h2 class="modal-title-text">
                  {{ title }}
                </h2>
              </div>
            </div>
            <button
              v-if="showCloseButton"
              class="modal-close-btn"
              @click="handleClose"
            >
              &times;
            </button>
          </header>

          <!-- Content -->
          <div 
            class="modal-scrollable-content"
            :class="[
              padding === 'raw' ? 'padding-raw' : 'padding-standard',
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
  </Teleport>
</template>

<style lang="scss">
/* Global modal styles are in _modals.scss, but base component specific ones here */
.base-modal-teleport-wrapper {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  // Forces a new stacking context for fixed children
  transform: translateZ(0);
  pointer-events: auto;

  &.no-pointer-events {
    pointer-events: none !important;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  z-index: 1 !important;
  pointer-events: auto;
}

.base-modal-card {
  position: fixed;
  z-index: 2 !important;
  pointer-events: auto;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &.padding-raw {
    // We keep the shell styles but let children reach the edges
  }
  
  &.type-center {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 95%;
    max-height: 94vh;
  }
  
  &.type-side, &.type-side-right {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    border-radius: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  &.type-side-left {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    border-radius: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
}



.modal-header-premium {
  padding: 24px 32px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
    color: #fff;
    transform: rotate(90deg);
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
.modal-zoom-enter-active, .modal-zoom-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  .modal-overlay { transition: opacity 0.4s ease; }
  .modal-content-premium { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
}

.modal-zoom-enter-from, .modal-zoom-leave-to {
  opacity: 0;
  .modal-overlay { opacity: 0; }
  .modal-content-premium {
    transform: translate(-50%, -40%) Scale(0.8);
    opacity: 0;
  }
}

/* Side Sliding Transitions (Generalizing as requested) */
.slide-right-enter-active, .slide-right-leave-active,
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  .modal-overlay { transition: opacity 0.4s ease; }
  .modal-content-premium { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
}

.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  .modal-overlay { opacity: 0; }
  .modal-content-premium { transform: translateX(100%); }
}

.slide-left-enter-from, .slide-left-leave-to {
  opacity: 0;
  .modal-overlay { opacity: 0; }
  .modal-content-premium { transform: translateX(-100%); }
}

.modal-scrollable-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: relative;
  
  &.padding-standard { padding: 32px; }
  &.padding-raw { 
    padding: 0 !important; 
    margin: 0 !important;
    min-height: 0;
  }
}

.no-padding { padding: 0 !important; }
.no-scroll { overflow-y: hidden !important; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

/* Body lock */
body.modal-open {
  overflow: hidden !important;
}
</style>
