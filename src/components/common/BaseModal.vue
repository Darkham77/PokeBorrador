<script setup lang="ts">

import { ref, watch, computed, inject, onUnmounted, useSlots, useId, type Ref } from 'vue'
import { gsap } from 'gsap'
import { useBodyClass } from '@/composables/ui/useBodyClass'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { Z_LAYERS } from '@/logic/constants/visuals'
import { ANIM_TIMINGS, ANIM_EASES } from '@/logic/utils/animationRegistry'

import {
  resolveModalPositionMode,
  resolveModalCorners,
  resolveModalCardStyles,
  getModalTweenPosition
} from './baseModalHelper'
import BaseModalHeader from './BaseModalHeader.vue'
import BaseModalFooter from './BaseModalFooter.vue'
import BaseModalOverlay from './BaseModalOverlay.vue'

const MODAL_UNREGISTER_DELAY_SEC = 0.6

const uiStore = useUIStore()
const modalStore = useModalStore()
const isSimplified = inject<Ref<boolean> | null>('isModalFastMode', null) ?? inject<Ref<boolean>>('isModalPerformanceMode', ref(false))
const injectedModalId = inject<string | null>('modalId', null)

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  id: { type: String, default: '' },
  closeBtnId: { type: String, default: '' },
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  emoji: { type: String, default: '' },
  icon: { type: String, default: '' },
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
const modalInstanceId = `modal-${useId()}`
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
    gsap.delayedCall(MODAL_UNREGISTER_DELAY_SEC, () => {
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

  const pos = getModalTweenPosition(props.type, true)
  if (pos.x !== undefined) fromVars.x = pos.x
  if (pos.y !== undefined) fromVars.y = pos.y
  if (pos.scale !== undefined) fromVars.scale = pos.scale

  const resolvedId = props.id || injectedModalId || ''

  gsap.fromTo(el, fromVars, {
    ...toVars,
    onComplete: () => {
      done()
      modalStore.finishOpening(resolvedId)
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

  const pos = getModalTweenPosition(props.type, false)
  if (pos.x !== undefined) toVars.x = pos.x
  if (pos.y !== undefined) toVars.y = pos.y
  if (pos.scale !== undefined) toVars.scale = pos.scale

  const resolvedId = props.id || injectedModalId || ''

  gsap.to(el, {
    ...toVars,
    onComplete: () => {
      done()
      modalStore.finalizeClose(resolvedId)
      if (!props.show) localShow.value = false
    }
  })
}

const computedPositionMode = computed(() => resolveModalPositionMode(props.positionMode, props.type))
const computedCorners = computed(() => resolveModalCorners(props.corners, computedPositionMode.value, props.type))

const cardStyles = computed(() => resolveModalCardStyles({
  type: props.type,
  id: props.id,
  maxWidth: props.maxWidth,
  height: props.height,
  maxHeight: props.maxHeight,
  accentColor: props.accentColor,
  disableZoom: props.disableZoom,
  disableAutoGrow: props.disableAutoGrow,
  appZoom: uiStore.appZoom || 1,
  positionMode: computedPositionMode.value
}))

const isOverlayTransparent = computed(() => props.overlay === 'none')
const isOverlayNoBlur = computed(() => !props.blurOverlay || isSimplified.value)
const isOverlayNoPointerEvents = computed(() => props.overlay === 'none' && !props.closeOnClickOutside)
const contentPaddingClass = computed(() => (props.padding === 'raw' ? 'padding-raw' : 'padding-standard'))

const overlayClasses = computed(() => ({
  transparent: isOverlayTransparent.value,
  'no-blur': isOverlayNoBlur.value
}))

const teleportWrapperClasses = computed(() => [
  { 'no-pointer-events': isOverlayNoPointerEvents.value },
  `type-${props.type}`,
  `position-${computedPositionMode.value}`
])

const modalCardClasses = computed(() => [
  contentPaddingClass.value,
  `variant-${props.variant}`,
  `corners-${computedCorners.value}`,
  {
    'is-fast-mode': isSimplified.value,
    'is-performance-mode': isSimplified.value,
    'no-border': !props.showBorder,
    'yellow-border': props.yellowBorder
  },
  props.customClass
])

const scrollableContentClasses = computed(() => [
  contentPaddingClass.value,
  `variant-${props.variant}`,
  { 'no-scroll': props.noScroll }
])

const headerIconEmoji = computed(() => props.emoji || props.icon)
const headerStyles = computed(() => ({ background: props.headerBackground }))
const titleStyles = computed(() => ({ color: props.titleColor }))

const closeBtnClass = computed(() => ({
  'is-solid': props.closeButtonVariant === 'solid',
  'is-yellow-solid': props.closeButtonVariant === 'yellow-solid'
}))

const resolvedCloseBtnId = computed(() => props.closeBtnId || (props.id ? `${props.id}-close-btn` : undefined))
const resolvedFloatingCloseBtnId = computed(() => (props.id ? `${props.id}-close-btn` : undefined))
const resolvedDomId = computed(() => props.id || undefined)

const slots = useSlots()
const hasHeaderSlot = computed(() => Boolean(slots.header))
const hasHeaderIconSlot = computed(() => Boolean(slots['header-icon']))
const hasFooterSlot = computed(() => Boolean(slots.footer))

const modalRootStyle = computed(() => ({
  zIndex: computedZIndex.value,
  '--modal-zoom': props.disableZoom ? 1 : (uiStore.appZoom || 1)
}))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="localShow"
      class="base-modal-root"
      :style="modalRootStyle"
    >
      <!-- Background Overlay -->
      <BaseModalOverlay
        :show="show"
        :overlay-classes="overlayClasses"
        @click="handleOverlayClick"
      />
      
      <!-- Content Wrapper -->
      <div 
        class="base-modal-teleport-wrapper" 
        :class="teleportWrapperClasses"
      >
        <Transition 
          appear
          :css="false"
          @enter="onContentEnter"
          @leave="onContentLeave"
        >
          <div 
            v-if="show" 
            :id="resolvedDomId"
            class="modal-content-premium base-modal-card"
            :class="modalCardClasses"
            :style="cardStyles"
            @click.stop
          >
            <!-- Header & Floating Close Button -->
            <BaseModalHeader
              :hide-header="hideHeader"
              :title="title"
              :header-icon-emoji="headerIconEmoji"
              :header-styles="headerStyles"
              :title-styles="titleStyles"
              :show-close-button="showCloseButton"
              :close-btn-id="resolvedCloseBtnId"
              :floating-close-btn-id="resolvedFloatingCloseBtnId"
              :close-btn-class="closeBtnClass"
              :prevent-close="preventClose"
              @close="handleClose"
            >
              <template
                v-if="hasHeaderSlot"
                #header
              >
                <slot name="header" />
              </template>
              <template
                v-if="hasHeaderIconSlot"
                #header-icon
              >
                <slot name="header-icon" />
              </template>
            </BaseModalHeader>

            <!-- Content -->
            <div 
              class="modal-scrollable-content"
              :class="scrollableContentClasses"
            >
              <slot />
            </div>

            <!-- Footer -->
            <BaseModalFooter v-if="hasFooterSlot">
              <slot name="footer" />
            </BaseModalFooter>
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
@use "../../styles/components/base-modal" as *;
</style>
