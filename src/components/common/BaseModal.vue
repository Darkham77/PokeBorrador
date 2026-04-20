<script setup>
import { onUnmounted, ref, watch } from 'vue'

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
  }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnClickOutside) {
    handleClose()
  }
}

// Manage body scroll lock and dynamic z-index
const computedZIndex = ref(props.zIndex)

watch(() => props.show, (val) => {
  if (val) {
    document.body.classList.add('modal-open')
    // Calculate z-index based on active modals count
    const activeModals = document.querySelectorAll('.modal-overlay.active').length
    computedZIndex.value = props.zIndex + (activeModals * 10)
  } else {
    // Check if there are other modals open before removing
    const otherModals = document.querySelectorAll('.modal-overlay.active').length
    if (otherModals <= 1) {
      document.body.classList.remove('modal-open')
    }
  }
}, { immediate: true })

onUnmounted(() => {
  const otherModals = document.querySelectorAll('.modal-overlay.active').length
  if (otherModals === 0) {
    document.body.classList.remove('modal-open')
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition 
      :name="type.startsWith('side') ? (type === 'side-left' ? 'slide-left' : 'slide-right') : 'modal-fade'"
      appear
    >
      <div
        v-if="show"
        class="modal-overlay"
        :class="[
          `modal-type-${type}`,
          { 
            'active': show,
            'no-overlay': type.startsWith('side')
          }
        ]"
        :style="{ zIndex: computedZIndex }"
        @click.self="handleOverlayClick"
      >
        <div
          class="modal-content-premium base-modal-card"
          :class="[`type-${type}`, customClass]"
          :style="{ maxWidth: type === 'center' ? maxWidth : 'none' }"
        >
          <!-- Header -->
          <header 
            v-if="!hideHeader && (title || $slots.header || showCloseButton)"
            class="modal-header-premium"
          >
            <slot name="header">
              <span class="modal-title-text">{{ title }}</span>
            </slot>
            
            <button
              v-if="showCloseButton"
              class="modal-close-btn-standard"
              @click="handleClose"
            >
              &times;
            </button>
          </header>

          <button
            v-if="hideHeader && showCloseButton"
            class="modal-close-btn-floating"
            @click="handleClose"
          >
            &times;
          </button>

          <!-- Content -->
          <div 
            class="modal-scrollable-content"
            :class="{ 
              'no-padding': padding === 'raw',
              'no-scroll': noScroll
            }"
            style="display: flex; flex-direction: column;"
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
.base-modal-card {
  &.type-center {
    width: 90%;
    max-height: 90vh;
    margin: auto;
    display: flex;
    flex-direction: column;
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

.modal-overlay.no-overlay {
  background: transparent !important;
  backdrop-filter: none !important;
  pointer-events: none;

  .base-modal-card {
    pointer-events: auto;
    box-shadow: 0 0 50px rgba(0,0,0,0.8);
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
}

.modal-close-btn-standard, .modal-close-btn-floating {
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
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  
  .modal-content-premium {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
  .modal-content-premium {
    transform: Scale(0.9) translateY(20px);
    opacity: 0;
  }
}

.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  .modal-overlay { transition: opacity 0.5s; }
}

.slide-right-enter-from, .slide-right-leave-to {
  .modal-overlay { opacity: 0; }
  .modal-content-premium {
    transform: translateX(100%);
  }
}

.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  .modal-overlay { transition: opacity 0.5s; }
}

.slide-left-enter-from, .slide-left-leave-to {
  .modal-overlay { opacity: 0; }
  .modal-content-premium {
    transform: translateX(-100%);
  }
}

.no-padding {
  padding: 0 !important;
}

.no-scroll {
  overflow-y: hidden !important;
}

/* Body lock */
body.modal-open {
  overflow: hidden !important;
  padding-right: var(--scrollbar-width, 0px);
}
</style>
