<script setup lang="ts">
import { gsap } from 'gsap';
import { ref, watch, computed, inject, onUnmounted, useSlots, useId, type Ref } from 'vue';

import { useBodyClass } from '@/composables/ui/useBodyClass';
import { Z_LAYERS } from '@/logic/constants/visuals';
import { ANIM_TIMINGS, ANIM_EASES } from '@/logic/utils/animationRegistry';
import { useModalStore } from '@/stores/modals';
import { useUIStore } from '@/stores/ui';

import BaseModalFooter from './BaseModalFooter.vue';
import BaseModalHeader from './BaseModalHeader.vue';
import {
  resolveModalPositionMode,
  resolveModalCorners,
  resolveModalCardStyles,
  getModalTweenPosition
} from './baseModalHelper';
import BaseModalOverlay from './BaseModalOverlay.vue';

const MODAL_UNREGISTER_DELAY_SEC = 0.6;

const uiStore = useUIStore();
const modalStore = useModalStore();
const isSimplified =
  inject<Ref<boolean> | null>('isModalFastMode', null) ??
  inject<Ref<boolean>>('isModalPerformanceMode', ref(false));
const injectedModalId = inject<string | null>('modalId', null);

defineOptions({
  inheritAttrs: false
});

interface BaseModalProps {
  id?: string;
  closeBtnId?: string;
  show?: boolean;
  title?: string;
  emoji?: string;
  icon?: string;
  maxWidth?: string;
  maxHeight?: string;
  closeOnClickOutside?: boolean;
  showCloseButton?: boolean;
  type?: string;
  height?: string;
  zIndex?: number | null;
  hideHeader?: boolean;
  padding?: string;
  customClass?: string;
  noScroll?: boolean;
  lockScroll?: boolean;
  overlay?: string;
  variant?: string;
  titleColor?: string | null;
  headerBackground?: string | null;
  preventClose?: boolean;
  corners?: string | null;
  showBorder?: boolean;
  blurOverlay?: boolean;
  yellowBorder?: boolean;
  positionMode?: string | null;
  closeButtonVariant?: string;
  accentColor?: string;
  disableZoom?: boolean;
  disableAutoGrow?: boolean;
}

const props = withDefaults(defineProps<BaseModalProps>(), {
  id: '',
  closeBtnId: '',
  show: false,
  title: '',
  emoji: '',
  icon: '',
  maxWidth: '500px',
  maxHeight: '92dvh',
  closeOnClickOutside: true,
  showCloseButton: true,
  type: 'center',
  height: 'auto',
  zIndex: null,
  hideHeader: false,
  padding: 'standard',
  customClass: '',
  noScroll: false,
  lockScroll: true,
  overlay: 'dark',
  variant: 'modern',
  titleColor: null,
  headerBackground: null,
  preventClose: false,
  corners: null,
  showBorder: true,
  blurOverlay: true,
  yellowBorder: false,
  positionMode: null,
  closeButtonVariant: 'transparent',
  accentColor: 'var(--yellow)',
  disableZoom: false,
  disableAutoGrow: false
});

const emit = defineEmits<{
  close: [];
}>();

const handleClose = (): void => {
  if (props.preventClose) return;
  emit('close');
};
const handleOverlayClick = (): void => {
  if (props.closeOnClickOutside && !props.preventClose) handleClose();
};

// Stacking Logic
const modalInstanceId = `modal-${useId()}`;
const localShow = ref(props.show);

const computedZIndex = computed(() => {
  if (props.zIndex !== null) return props.zIndex;
  const depth = uiStore.getModalDepth(modalInstanceId);
  return Z_LAYERS.MODAL + Math.max(0, depth) * Z_LAYERS.MODAL_STEP;
});

watch(
  () => props.show,
  (val) => {
    if (val) {
      localShow.value = true;
      uiStore.registerModal(modalInstanceId);
    } else {
      // We don't unregister immediately to allow closing animations to finish at the correct depth
      gsap.delayedCall(MODAL_UNREGISTER_DELAY_SEC, () => {
        if (!props.show) uiStore.unregisterModal(modalInstanceId);
      });
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  uiStore.unregisterModal(modalInstanceId);
});

// Manage scroll locking reactively
useBodyClass(
  'modal-open',
  computed(() => props.show && props.lockScroll)
);

// GSAP Animation Hooks
const onContentEnter = (el: Element, done: () => void): void => {
  const duration = ANIM_TIMINGS.MODAL_OPEN || 0.4;
  const ease = ANIM_EASES.OUT_SOFT || 'power2.out';

  const fromVars: gsap.TweenVars = { opacity: 0, x: 0, y: 0, scale: 1 };
  const toVars: gsap.TweenVars = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    duration,
    ease,
    onComplete: done
  };

  const pos = getModalTweenPosition(props.type, true);
  if (pos.x !== undefined) fromVars.x = pos.x;
  if (pos.y !== undefined) fromVars.y = pos.y;
  if (pos.scale !== undefined) fromVars.scale = pos.scale;

  const resolvedId = props.id || injectedModalId || '';

  gsap.fromTo(el, fromVars, {
    ...toVars,
    onComplete: () => {
      done();
      modalStore.finishOpening(resolvedId);
    }
  });
};

const onContentLeave = (el: Element, done: () => void): void => {
  const toVars: gsap.TweenVars = {
    opacity: 0,
    x: 0,
    y: 0,
    scale: 1,
    duration: ANIM_TIMINGS.MODAL_CLOSE,
    ease: 'power2.in'
  };

  const pos = getModalTweenPosition(props.type, false);
  if (pos.x !== undefined) toVars.x = pos.x;
  if (pos.y !== undefined) toVars.y = pos.y;
  if (pos.scale !== undefined) toVars.scale = pos.scale;

  const resolvedId = props.id || injectedModalId || '';

  gsap.to(el, {
    ...toVars,
    onComplete: () => {
      done();
      modalStore.finalizeClose(resolvedId);
      if (!props.show) localShow.value = false;
    }
  });
};

const computedPositionMode = computed(() =>
  resolveModalPositionMode(props.positionMode, props.type)
);
const computedCorners = computed(() =>
  resolveModalCorners(props.corners, computedPositionMode.value, props.type)
);

const cardStyles = computed(() =>
  resolveModalCardStyles({
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
  })
);

const isOverlayTransparent = computed(() => props.overlay === 'none');
const isOverlayNoBlur = computed(() => !props.blurOverlay || isSimplified.value);
const isOverlayNoPointerEvents = computed(
  () => props.overlay === 'none' && !props.closeOnClickOutside
);
const contentPaddingClass = computed(() =>
  props.padding === 'raw' ? 'padding-raw' : 'padding-standard'
);

const overlayClasses = computed(() => ({
  transparent: isOverlayTransparent.value,
  'no-blur': isOverlayNoBlur.value
}));

const teleportWrapperClasses = computed(() => [
  { 'no-pointer-events': isOverlayNoPointerEvents.value },
  `type-${props.type}`,
  `position-${computedPositionMode.value}`
]);

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
]);

const scrollableContentClasses = computed(() => [
  contentPaddingClass.value,
  `variant-${props.variant}`,
  { 'no-scroll': props.noScroll }
]);

const headerIconEmoji = computed(() => props.emoji || props.icon);
const headerStyles = computed(() =>
  props.headerBackground ? { background: props.headerBackground } : undefined
);
const titleStyles = computed(() => (props.titleColor ? { color: props.titleColor } : undefined));

const closeBtnClass = computed(() => ({
  'is-solid': props.closeButtonVariant === 'solid',
  'is-yellow-solid': props.closeButtonVariant === 'yellow-solid'
}));

const resolvedCloseBtnId = computed(
  () => props.closeBtnId || (props.id ? `${props.id}-close-btn` : undefined)
);
const resolvedFloatingCloseBtnId = computed(() => (props.id ? `${props.id}-close-btn` : undefined));
const resolvedDomId = computed(() => props.id || undefined);

const slots = useSlots();
const hasHeaderSlot = computed(() => Boolean(slots.header));
const hasHeaderIconSlot = computed(() => Boolean(slots['header-icon']));
const hasFooterSlot = computed(() => Boolean(slots.footer));

const modalRootStyle = computed(() => ({
  zIndex: computedZIndex.value,
  '--modal-zoom': props.disableZoom ? 1 : uiStore.appZoom || 1
}));
</script>

<template>
  <Teleport to="body">
    <div v-if="localShow" class="base-modal-root" :style="modalRootStyle">
      <!-- Background Overlay -->
      <BaseModalOverlay
        id="base-modal-basemodaloverlay-overlayclick"
        :show="show"
        :overlay-classes="overlayClasses"
        @click="handleOverlayClick"
      />

      <!-- Content Wrapper -->
      <div class="base-modal-teleport-wrapper" :class="teleportWrapperClasses">
        <Transition appear :css="false" @enter="onContentEnter" @leave="onContentLeave">
          <div
            v-if="show"
            :id="resolvedDomId"
            tabindex="-1"
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
              <template v-if="hasHeaderSlot" #header>
                <slot name="header" />
              </template>
              <template v-if="hasHeaderIconSlot" #header-icon>
                <slot name="header-icon" />
              </template>
            </BaseModalHeader>

            <!-- Content -->
            <div class="modal-scrollable-content" :class="scrollableContentClasses">
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
@use '../../styles/components/base-modal' as *;
</style>
