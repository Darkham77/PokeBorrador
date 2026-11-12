<script setup lang="ts">
import { computed, ref, useSlots } from 'vue';

import { useBodyClass } from '@/composables/ui/useBodyClass';
import { useUIStore } from '@/stores/ui';

import BaseModalFooter from './BaseModalFooter.vue';
import BaseModalHeader from './BaseModalHeader.vue';
import {
  resolveModalCardStyles,
  resolveModalCorners,
  resolveModalPositionMode
} from './baseModalHelper';
import BaseModalOverlay from './BaseModalOverlay.vue';
import { BaseModalSlotOutlet, useBaseModalStackBridge } from './useBaseModalStackBridge';

const uiStore = useUIStore();

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

const rootRef = ref<HTMLElement | null>(null);
const overlayRef = ref<InstanceType<typeof BaseModalOverlay> | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const backdropEl = computed<HTMLElement | null>(() => overlayRef.value?.backdropEl ?? null);

const {
  isSurfaceRendered,
  isClosing,
  isSimplified,
  modalCssVars,
  resolvedDomId,
  resolvedCloseBtnId,
  resolvedFloatingCloseBtnId,
  backdropGuard,
  requestCloseFromButton
} = useBaseModalStackBridge(
  props,
  {
    rootEl: rootRef,
    backdropEl,
    panelEl: panelRef
  },
  () => emit('close')
);

useBodyClass(
  'modal-open',
  computed(() => isSurfaceRendered.value && !isClosing.value && props.lockScroll)
);

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
  {
    'no-pointer-events': isOverlayNoPointerEvents.value,
    'is-closing': isClosing.value
  },
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

const slots = useSlots();
const hasHeaderSlot = computed(() => Boolean(slots.header));
const hasHeaderIconSlot = computed(() => Boolean(slots['header-icon']));
const hasFooterSlot = computed(() => Boolean(slots.footer));

const modalRootStyle = computed(() => ({
  ...modalCssVars.value,
  '--modal-zoom': props.disableZoom ? 1 : uiStore.appZoom || 1
}));
</script>

<template>
  <Teleport to="body">
    <div v-if="isSurfaceRendered" ref="rootRef" class="base-modal-root" :style="modalRootStyle">
      <BaseModalOverlay
        id="base-modal-basemodaloverlay-overlayclick"
        ref="overlayRef"
        :show="isSurfaceRendered"
        :is-closing="isClosing"
        :overlay-classes="overlayClasses"
        @pointerdown="backdropGuard.onPointerDown"
        @pointerup="backdropGuard.onPointerUp"
        @pointercancel="backdropGuard.onPointerCancel"
      />

      <div class="base-modal-teleport-wrapper" :class="teleportWrapperClasses">
        <div
          :id="resolvedDomId"
          ref="panelRef"
          tabindex="-1"
          class="modal-content-premium base-modal-card"
          :class="modalCardClasses"
          :style="cardStyles"
          @click.stop
        >
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
            @close="requestCloseFromButton"
          >
            <template v-if="hasHeaderSlot" #header>
              <slot name="header" />
            </template>
            <template v-if="hasHeaderIconSlot" #header-icon>
              <slot name="header-icon" />
            </template>
          </BaseModalHeader>

          <div class="modal-scrollable-content" :class="scrollableContentClasses">
            <BaseModalSlotOutlet>
              <slot />
            </BaseModalSlotOutlet>
          </div>

          <BaseModalFooter v-if="hasFooterSlot">
            <slot name="footer" />
          </BaseModalFooter>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
@use '../../styles/components/base-modal' as *;
</style>
