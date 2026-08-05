<template>
  <Teleport to="body">
    <div
      v-if="localShow"
      class="base-modal-root"
      :style="{ zIndex: computedZIndex, '--modal-zoom': disableZoom ? 1 : (uiStore.appZoom || 1) }"
    >
      <!-- Background Overlay -->
      <Transition
        appear
        :css="false"
        @enter="onOverlayEnter"
        @leave="onOverlayLeave"
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
          appear
          :css="false"
          @enter="onContentEnter"
          @leave="onContentLeave"
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
                :id="id ? `${id}-close-btn` : undefined"
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
              :id="id ? `${id}-close-btn` : undefined"
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
import { gsap } from 'gsap'
import { useBodyClass } from '@/composables/ui/useBodyClass'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { Z_LAYERS } from '@/logic/constants/visuals'
import { ANIM_TIMINGS, ANIM_EASES } from '@/logic/utils/animationRegistry'

const uiStore = useUIStore()
const modalStore = useModalStore()
const isSimplified = inject<Ref<boolean>>('isModalPerformanceMode', ref(false))

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  id: { type: String, default: '' },
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '500px' },
  maxHeight: { type: String, default: '92dvh' },
  closeOnClickOutside: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  type: {
    type: String,
    default: 'center',
    validator: (val: string) => ['center', 'side-left', 'side-right', 'side', 'top', 'down', 'left', 'right', 'fullscreen'].includes(val)
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
    validator: (val: string) => ['dark', 'none'].includes(val)
  },
  variant: {
    type: String,
    default: 'modern',
    validator: (val: string) => ['modern', 'retro'].includes(val)
  },
  titleColor: { type: String, default: null },
  headerBackground: { type: String, default: null },
  preventClose: { type: Boolean, default: false },
  corners: {
    type: String,
    default: null,
    validator: (val: string) => ['all', 'none', 'top', 'bottom', 'left', 'right'].includes(val)
  },
  showBorder: { type: Boolean, default: true },
  blurOverlay: { type: Boolean, default: true },
  yellowBorder: { type: Boolean, default: false },
  positionMode: {
    type: String,
    default: null, // If null, auto-calculate
    validator: (val: string) => ['stuck', 'floating'].includes(val)
  },
  closeButtonVariant: {
    type: String,
    default: 'transparent',
    validator: (val: string) => ['transparent', 'solid', 'yellow-solid'].includes(val)
  },
  accentColor: { type: String, default: 'var(--yellow)' },
  disableZoom: { type: Boolean, default: false },
  disableAutoGrow: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

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
  return Z_LAYERS.MODAL + (Math.max(0, depth) * Z_LAYERS.MODAL_STEP)
})

watch(() => props.show, (val) => {
  if (val) {
    localShow.value = true
    uiStore.registerModal(modalInstanceId)
  } else {
    // We don't unregister immediately to allow closing animations to finish at the correct depth
    gsap.delayedCall(0.6, () => {
      if (!props.show) uiStore.unregisterModal(modalInstanceId)
    })
  }
}, { immediate: true })

onUnmounted(() => {
  uiStore.unregisterModal(modalInstanceId)
})

// Manage scroll locking reactively
useBodyClass('modal-open', computed(() => props.show && props.lockScroll))

// GSAP Animation Hooks
const onOverlayEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, 
    { opacity: 0 }, 
    { opacity: 1, duration: ANIM_TIMINGS.MODAL_OPEN, ease: 'none', onComplete: done }
  )
}

const onOverlayLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, duration: ANIM_TIMINGS.MODAL_CLOSE, ease: 'none', onComplete: done })
}

const onContentEnter = (el: Element, done: () => void) => {
  const duration = ANIM_TIMINGS.MODAL_OPEN || 0.4
  const ease = ANIM_EASES.OUT_SOFT || 'power2.out'
  
  const fromVars: gsap.TweenVars = { opacity: 0, x: 0, y: 0, scale: 1 }
  const toVars: gsap.TweenVars = { 
    opacity: 1, 
    x: 0, 
    y: 0, 
    scale: 1,
    duration, 
    ease, 
    onComplete: done 
  }

  // Adjust starting position based on modal type
  if (props.type === 'down') fromVars.y = '100%'
  else if (props.type === 'top') fromVars.y = '-100%'
  else if (props.type === 'left' || props.type === 'side-left') fromVars.x = '-100%'
  else if (props.type === 'right' || props.type === 'side-right' || props.type === 'side') fromVars.x = '100%'
  else {
    fromVars.scale = 0.9
    fromVars.y = 20
  }

  gsap.fromTo(el, fromVars, {
    ...toVars,
    onComplete: () => {
      done()
      modalStore.finishOpening(props.id)
    }
  })
}

const onContentLeave = (el: Element, done: () => void) => {
  const toVars: gsap.TweenVars = { 
    opacity: 0, 
    x: 0, 
    y: 0, 
    scale: 1,
    duration: ANIM_TIMINGS.MODAL_CLOSE, 
    ease: 'power2.in'
  }

  if (props.type === 'down') toVars.y = '100%'
  else if (props.type === 'top') toVars.y = '-100%'
  else if (props.type === 'left' || props.type === 'side-left') toVars.x = '-100%'
  else if (props.type === 'right' || props.type === 'side-right' || props.type === 'side') toVars.x = '100%'
  else {
    toVars.scale = 0.9
    toVars.y = 20
  }

  gsap.to(el, {
    ...toVars,
    onComplete: () => {
      done()
      modalStore.finalizeClose(props.id)
      if (!props.show) localShow.value = false
    }
  })
}



const cardStyles = computed(() => {
  if (props.type === 'fullscreen') return {}
  
  const zoomFactor = props.disableZoom ? 1 : (uiStore.appZoom || 1)

  const isLargeModal = !props.disableAutoGrow && (
                        (props.id === 'inventory' && props.maxWidth !== '480px') || 
                        props.id === 'shop' || 
                        props.id === 'bc-shop' || 
                        props.id === 'war-shop' || 
                        props.id === 'market' ||
                        props.id === 'box' ||
                        props.maxWidth === '900px' || 
                        props.maxWidth === '850px' ||
                        props.maxWidth === '800px'
                      )

  // If it's a large non-combat modal and the viewport height is significant, expand dimensions
  const useLargeScreenRules = isLargeModal && typeof window !== 'undefined' && window.innerHeight >= 900

  // We scale the dvh/vh height target under the zoom so the physical screen occupancy remains constant
  const resolvedHeight = useLargeScreenRules ? `${80 / zoomFactor}dvh` : props.height
  const resolvedMaxHeight = useLargeScreenRules ? `${90 / zoomFactor}dvh` : props.maxHeight
  const resolvedMaxWidth = useLargeScreenRules ? '1100px' : props.maxWidth
  
  // Clamping physical sizes to maximum 95% of screen viewport
  const styles: Record<string, string> = { 
    width: '100%',
    maxWidth: `min(${resolvedMaxWidth}, ${95 / zoomFactor}dvw)`,
    height: resolvedHeight,
    maxHeight: `min(${resolvedMaxHeight}, ${95 / zoomFactor}dvh)`,
    '--modal-accent': props.accentColor
  }

  // Si es un panel lateral, el maxWidth también controla el width base
  if (['left', 'right', 'side', 'side-left', 'side-right'].includes(props.type)) {
    styles.width = `min(${resolvedMaxWidth}, ${95 / zoomFactor}dvw)`
    
    // Si está pegado al borde, forzamos altura completa (clamped if needed, stuck matches screen height)
    if (computedPositionMode.value === 'stuck') {
      styles.height = `${100 / zoomFactor}dvh`
      styles.maxHeight = `${100 / zoomFactor}dvh`
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
