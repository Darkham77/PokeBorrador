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
            'no-blur': !blurOverlay || isSimplified
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
                :class="{ 
                  'is-solid': closeButtonVariant === 'solid',
                  'is-yellow-solid': closeButtonVariant === 'yellow-solid' 
                }"
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
              :class="{ 
                'is-solid': closeButtonVariant === 'solid',
                'is-yellow-solid': closeButtonVariant === 'yellow-solid' 
              }"
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

<script setup lang="ts">

import { ref, watch, computed, inject, onUnmounted, type Ref } from 'vue'
import { useBodyClass } from '@/composables/useBodyClass'
import { useUIStore } from '@/stores/ui'
import { Z_LAYERS } from '@/logic/constants/visuals'

const uiStore = useUIStore()
const isSimplified = inject<Ref<boolean>>('isModalPerformanceMode', ref(false))

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '500px' },
  maxHeight: { type: String, default: '92dvh' },
  closeOnClickOutside: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  type: {
    type: String,
    default: 'center',
    validator: (val: any) => ['center', 'side-left', 'side-right', 'side', 'top', 'down', 'left', 'right', 'fullscreen'].includes(val)
  },
  height: { type: String, default: 'auto' },
  zIndex: { type: Number, default: null }, // If null, use dynamic stacking
  hideHeader: { type: Boolean, default: false },
  padding: { type: String, default: 'standard' },
  customClass: { type: String, default: '' },
  noScroll: { type: Boolean, default: false },
  lockScroll: { type: Boolean, default: true },
  overlay: {
    type: String,
    default: 'dark',
    validator: (val: any) => ['dark', 'none'].includes(val)
  },
  variant: {
    type: String,
    default: 'modern',
    validator: (val: any) => ['modern', 'retro'].includes(val)
  },
  titleColor: { type: String, default: null },
  headerBackground: { type: String, default: null },
  preventClose: { type: Boolean, default: false },
  corners: {
    type: String,
    default: null,
    validator: (val: any) => ['all', 'none', 'top', 'bottom', 'left', 'right'].includes(val)
  },
  showBorder: { type: Boolean, default: true },
  blurOverlay: { type: Boolean, default: true },
  yellowBorder: { type: Boolean, default: false },
  positionMode: {
    type: String,
    default: null, // If null, auto-calculate
    validator: (val: any) => ['stuck', 'floating'].includes(val)
  },
  closeButtonVariant: {
    type: String,
    default: 'transparent',
    validator: (val: any) => ['transparent', 'solid', 'yellow-solid'].includes(val)
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

// Stacking Logic
const modalInstanceId = `modal-${Math.random().toString(36).substr(2, 9)}`
const localShow = ref(props.show)

const computedZIndex = computed(() => {
  if (props.zIndex !== null) return props.zIndex
  const depth = uiStore.getModalDepth(modalInstanceId)
  return Z_LAYERS.MODAL_BASE + (Math.max(0, depth) * Z_LAYERS.MODAL_STEP)
})

watch(() => props.show, (val) => {
  if (val) {
    localShow.value = true
    uiStore.registerModal(modalInstanceId)
  } else {
    // We don't unregister immediately to allow closing animations to finish at the correct depth
    setTimeout(() => {
      if (!props.show) uiStore.unregisterModal(modalInstanceId)
    }, 600)
  }
}, { immediate: true })

onUnmounted(() => {
  uiStore.unregisterModal(modalInstanceId)
})

// Manage scroll locking reactively
useBodyClass('modal-open', computed(() => props.show && props.lockScroll))

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
    height: props.height,
    maxHeight: props.maxHeight 
  }

  // Si es un panel lateral, el maxWidth también controla el width base
  if (['left', 'right', 'side', 'side-left', 'side-right'].includes(props.type)) {
    styles.width = props.maxWidth
    
    // Si está pegado al borde, forzamos altura completa
    if (computedPositionMode.value === 'stuck') {
      styles.height = '100dvh'
      styles.maxHeight = '100dvh'
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
@use "../../styles/components/base-modal" as *;
</style>