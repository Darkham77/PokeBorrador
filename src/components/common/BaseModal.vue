// [PureVue-Ignore-Length]
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
          :class="{ 
            'transparent': overlay === 'none',
            'no-blur': !blurOverlay
          }"
          @click.stop="handleOverlayClick" 
        />
      </Transition>
      
      <!-- Content Wrapper -->
      <div 
        v-if="localShow"
        class="base-modal-teleport-wrapper" 
        :class="[
          { 'no-pointer-events': overlay === 'none' && !closeOnClickOutside }, 
          `type-${type}`,
          `position-${computedPositionMode}`
        ]"
      >
        <Transition 
          :name="transitionName"
          :css="type !== 'fullscreen'"
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
              `corners-${computedCorners}`,
              { 
                'is-performance-mode': isSimplified,
                'no-border': !showBorder,
                'yellow-border': yellowBorder
              },
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
                @click.stop="handleClose"
              >
                <div class="close-icon-wrapper" />
              </button>
            </header>



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

            <!-- Floating Close Button -->
            <button
              v-if="hideHeader && showCloseButton"
              class="modal-close-btn-floating"
              :disabled="preventClose"
              @click.stop="handleClose"
            >
              <div class="close-icon-wrapper" />
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, inject } from 'vue'
import { useBodyClass } from '@/composables/useBodyClass'

const isSimplified = inject('isModalPerformanceMode', ref(false))

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '500px' },
  maxHeight: { type: String, default: '92vh' },
  closeOnClickOutside: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  type: {
    type: String,
    default: 'center',
    validator: (val) => ['center', 'side-left', 'side-right', 'side', 'top', 'down', 'left', 'right', 'fullscreen'].includes(val)
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
  preventClose: { type: Boolean, default: false },
  corners: {
    type: String,
    default: null,
    validator: (val) => ['all', 'none', 'top', 'bottom', 'left', 'right'].includes(val)
  },
  showBorder: { type: Boolean, default: true },
  blurOverlay: { type: Boolean, default: true },
  yellowBorder: { type: Boolean, default: false },
  positionMode: {
    type: String,
    default: null, // If null, auto-calculate
    validator: (val) => ['stuck', 'floating'].includes(val)
  }
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

// Manage scroll locking reactively
useBodyClass('modal-open', computed(() => props.show && props.lockScroll))

watch(() => props.show, (val) => {
  if (val) {
    localShow.value = true
    computedZIndex.value = props.zIndex
  }
}, { immediate: true })

const onContentLeave = () => {
  if (!props.show) {
    localShow.value = false
  }
}

const transitionName = computed(() => {
  if (props.type === 'fullscreen') return 'none'
  if (props.type === 'top') return 'slide-down'
  if (props.type === 'down') return 'slide-up'
  if (props.type === 'side-left' || props.type === 'left') return 'slide-left'
  if (props.type === 'side-right' || props.type === 'right' || props.type === 'side') return 'slide-right'
  return 'modal-zoom'
})

const cardStyles = computed(() => {
  if (props.type === 'fullscreen') return {}
  
  const styles = { 
    width: '100%',
    maxWidth: props.maxWidth,
    maxHeight: props.maxHeight 
  }

  // Si es un panel lateral, el maxWidth también controla el width base
  if (['left', 'right', 'side', 'side-left', 'side-right'].includes(props.type)) {
    styles.width = props.maxWidth
    
    // Si está pegado al borde, forzamos altura completa
    if (computedPositionMode.value === 'stuck') {
      styles.height = '100vh'
      styles.maxHeight = '100vh'
    }
  }

  return styles
})

const computedPositionMode = computed(() => {
  if (props.positionMode) return props.positionMode
  if (['left', 'right', 'side', 'side-left', 'side-right', 'fullscreen'].includes(props.type)) return 'stuck'
  return 'floating'
})

const computedCorners = computed(() => {
  if (props.corners) return props.corners
  
  // If floating, usually all corners are rounded
  if (computedPositionMode.value === 'floating') return 'all'

  if (props.type === 'center') return 'all'
  if (props.type === 'top') return 'bottom'
  if (props.type === 'down') return 'top'
  if (props.type === 'left' || props.type === 'side-left') return 'right'
  if (props.type === 'right' || props.type === 'side-right' || props.type === 'side') return 'left'
  if (props.type === 'fullscreen') return 'none'
  return 'none'
})
</script>

<style lang="scss">
@use "@/styles/core/_mixins" as *;
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
  background: Rgba(0, 0, 0, 0.7);
  -webkit-backdrop-filter: Blur(10px); backdrop-filter: Blur(10px);
  z-index: var(--z-base);
  pointer-events: auto;
  // GPU Acceleration
  transform: TranslateZ(0);
  will-change: opacity;

  &.transparent {
    background: transparent !important;
    -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
    pointer-events: none !important;
  }

  &.no-blur {
    -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
  }
}

.base-modal-teleport-wrapper {
  position: fixed;
  inset: 0;
  z-index: var(--z-base);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;

  &.type-side, &.type-side-right, &.type-right {
    justify-content: flex-end;
    align-items: stretch;
  }

  &.type-side-left, &.type-left {
    justify-content: flex-start;
    align-items: stretch;
  }

  &.type-top {
    justify-content: center;
    align-items: flex-start;
  }

  &.type-down {
    justify-content: center;
    align-items: flex-end;
  }

  &.type-fullscreen {
    justify-content: stretch;
    align-items: stretch;
  }

  // Position Modes overrides
  &.position-stuck {
    &.type-top { padding-top: 0 !important; }
    &.type-down { padding-bottom: 0 !important; }
    &.type-left, &.type-right, &.type-side, &.type-side-left, &.type-side-right { 
      align-items: stretch !important; 
      padding: 0 !important;
    }
  }

  &.position-floating {
    &.type-top { padding-top: 4vh !important; }
    &.type-down { padding-bottom: 4vh !important; }
    &.type-left, &.type-right, &.type-side, &.type-side-left, &.type-side-right { 
      align-items: center !important; 
      padding: 2vh !important;
    }
    
    // Floating panels shouldn't be full height
    .base-modal-card {
      height: auto !important;
      max-height: 95vh !important;
    }
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
  box-shadow: 0 40px 100px Rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  background: Linear-Gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-font-smoothing: none;
  opacity: 1;
  transform: Translate3d(0, 0, 0);
  will-change: transform, opacity;

  // GPU Acceleration via mixin or direct property
  @include gpu-layer;

  .type-center & {
    // Width gestionado por cardStyles
  }
  
  .type-side &, .type-side-right &, .type-right & {
    border-left: 1px solid Rgba(255, 255, 255, 0.1);
  }

  .type-side-left &, .type-left & {
    border-right: 1px solid Rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 480px) {
    .error-footer {
      flex-direction: column;
    }

    .error-btn {
      width: 100%;
      justify-content: center;
    }
  }

  .type-top & {
    width: 95%;
    border-top: none;
  }

  .type-down & {
    width: 95%;
    border-bottom: none;
  }

  .type-fullscreen & {
    width: 100vw;
    height: 100vh;
    max-width: 100vw !important;
    max-height: 100vh !important;
    border-radius: 0;
    border: none;
  }

  // Border & Corners Logic
  &.no-border { border: none !important; }
  &.yellow-border { border: 2px solid var(--yellow) !important; }

  &.corners-all { border-radius: 24px !important; }
  &.corners-none { border-radius: 0 !important; }
  &.corners-top { border-radius: 24px 24px 0 0 !important; }
  &.corners-bottom { border-radius: 0 0 24px 24px !important; }
  &.corners-left { border-radius: 24px 0 0 24px !important; }
  &.corners-right { border-radius: 0 24px 24px 0 !important; }

  &.variant-retro {
    background: Rgba(26, 28, 46, 1) !important;
    border: 2px solid var(--yellow) !important;
    border-radius: 4px !important;
    box-shadow: 0 0 30px Rgba(0, 0, 0, 0.8), inset 0 0 20px Rgba(255, 217, 61, 0.1);

    .type-center & {
      border-radius: 30px !important;
    }
  }

  &.is-performance-mode {
    filter: Brightness(0.6) Blur(1px); // Slightly darker and blurred
    pointer-events: none !important;
    
    // Kill all animations and transitions for performance
    &, * {
      transition: none !important;
      animation: none !important;
      @include gpu-layer; 
    }

    // Optional: Hide non-essential decorative elements if they have a class
    .sparkle, .glow, .aura {
      display: none !important;
    }

    // Hide heavy visual elements
    .modal-close-btn, .modal-close-btn-floating {
      display: none !important;
    }
  }
}

.modal-header-premium {
  padding: 16px 24px;
  min-height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-title-text {
  @include pixelated;
  font-size: 12px;
  color: var(--yellow, $coin-gold);
  letter-spacing: 1px;
  @include pixelated;
}

.modal-close-btn, .modal-close-btn-floating {
  @include btn-close-premium;
}

.modal-close-btn-floating {
  position: absolute;
  top: 16px;
  right: 16px;
}

.modal-footer-premium {
  padding: 16px 32px 24px;
  border-top: 1px solid Rgba(255, 255, 255, 0.05);
  background: Rgba(0, 0, 0, 0.2);
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
.slide-left-enter-active, .slide-left-leave-active,
.slide-down-enter-active, .slide-down-leave-active,
.slide-up-enter-active, .slide-up-leave-active {
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

.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: Translate3d(0, -100%, 0);
}

.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: Translate3d(0, 100%, 0);
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
