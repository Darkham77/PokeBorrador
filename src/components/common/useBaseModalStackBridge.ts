import {
  createBackdropPointerGuard,
  resolveModalCssVars,
  resolveModalDomIds,
  type BackdropPointerGuard,
  type ModalCloseReason,
  type ModalCssVars,
  type ModalStackEntry
} from '@francogp/auditor/modals';
import {
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from 'vue';

import { getModalMetadata, resolveModalDismissMode } from '@/logic/modals/metadata';
import { resolveBaseModalMotion, type PokeVicioModalMeta } from '@/logic/modals/modalEngine';
import { useModalStore } from '@/stores/modals';

const USER_DISMISS_REASONS: readonly ModalCloseReason[] = [
  'escape',
  'backdrop',
  'close-button',
  'back-navigation'
] as const;

const USER_DISMISS_REASON_SET: ReadonlySet<ModalCloseReason> = new Set(USER_DISMISS_REASONS);

export const BaseModalSlotOutlet = defineComponent({
  name: 'BaseModalSlotOutlet',
  setup(_props, { slots }) {
    return () => slots.default?.() ?? null;
  }
});

export interface BaseModalStackBridgeProps {
  readonly id: string;
  readonly closeBtnId: string;
  readonly show: boolean;
  readonly type: string;
  readonly zIndex: number | null;
  readonly overlay: string;
  readonly preventClose: boolean;
  readonly closeOnClickOutside: boolean;
}

export interface BaseModalStackSurfaceRefs {
  readonly rootEl: Readonly<Ref<HTMLElement | null>>;
  readonly backdropEl: ComputedRef<HTMLElement | null>;
  readonly panelEl: Readonly<Ref<HTMLElement | null>>;
}

export interface UseBaseModalStackBridgeReturn {
  readonly activeEntry: ComputedRef<ModalStackEntry<string, PokeVicioModalMeta> | undefined>;
  readonly isSurfaceRendered: ComputedRef<boolean>;
  readonly isClosing: ComputedRef<boolean>;
  readonly isSimplified: ComputedRef<boolean>;
  readonly modalCssVars: ComputedRef<ModalCssVars | undefined>;
  readonly resolvedDomId: ComputedRef<string | undefined>;
  readonly resolvedCloseBtnId: ComputedRef<string | undefined>;
  readonly resolvedFloatingCloseBtnId: ComputedRef<string | undefined>;
  readonly backdropGuard: BackdropPointerGuard;
  readonly requestCloseFromButton: () => void;
}

export function useBaseModalStackBridge(
  props: BaseModalStackBridgeProps,
  surfaceRefs: BaseModalStackSurfaceRefs,
  onEmitClose: () => void
): UseBaseModalStackBridgeReturn {
  const modalStore = useModalStore();
  const injectedModalId = inject<string | null>('modalId', null);
  const injectedSimplified =
    inject<Ref<boolean> | null>('isModalFastMode', null) ??
    inject<Ref<boolean> | null>('isModalPerformanceMode', null);

  const standaloneUid = ref<string | null>(null);

  const isHostedModal = computed<boolean>(() =>
    Boolean(
      injectedModalId && modalStore.stackManager.hasUid(injectedModalId, { includeClosing: true })
    )
  );

  const effectiveModalUid = computed<string>(() =>
    isHostedModal.value && injectedModalId ? injectedModalId : standaloneUid.value || ''
  );

  const activeEntry = computed(() =>
    effectiveModalUid.value ? modalStore.getEntryByUid(effectiveModalUid.value) : undefined
  );

  const openStandaloneEntry = (): void => {
    if (standaloneUid.value && modalStore.stackManager.hasUid(standaloneUid.value)) {
      return;
    }
    if (standaloneUid.value) {
      modalStore.stackManager.forceClose(standaloneUid.value, 'replace');
      standaloneUid.value = null;
    }

    const entry = modalStore.openStandalone({
      kind: props.id || 'StandaloneModal',
      dismissMode: resolveModalDismissMode({
        preventClose: props.preventClose,
        closeOnClickOutside: props.closeOnClickOutside
      }),
      obscuresBackground: false,
      motion: resolveBaseModalMotion(props.type, props.preventClose),
      ...(props.zIndex !== null ? { customZIndex: props.zIndex } : {}),
      canClose: ({ reason }) => {
        if (USER_DISMISS_REASON_SET.has(reason)) {
          onEmitClose();
          return false;
        }
        return true;
      }
    });
    standaloneUid.value = entry.modalUid;
  };

  const closeStandaloneEntry = (): void => {
    if (!standaloneUid.value) return;
    if (modalStore.stackManager.hasUid(standaloneUid.value)) {
      modalStore.stackManager.requestClose(standaloneUid.value, 'programmatic');
    }
  };

  watch(
    () => props.show,
    (visible) => {
      if (isHostedModal.value) return;
      if (visible) openStandaloneEntry();
      else closeStandaloneEntry();
    },
    { immediate: true }
  );

  watch(
    [
      effectiveModalUid,
      () => props.preventClose,
      () => props.closeOnClickOutside,
      () => props.overlay,
      () => props.type,
      () => props.zIndex
    ],
    ([uid]) => {
      if (!uid || !modalStore.stackManager.hasUid(uid)) return;
      const current = modalStore.stackManager.getByUid(uid);
      if (!current) return;

      const obscuresBackground = current.meta.isHosted
        ? props.overlay === 'none'
          ? false
          : (getModalMetadata(current.kind)?.obscuresBackground ?? true)
        : false;

      modalStore.stackManager.updateEntry(uid, {
        dismissMode: resolveModalDismissMode({
          preventClose: props.preventClose,
          closeOnClickOutside: props.closeOnClickOutside
        }),
        obscuresBackground,
        motion: resolveBaseModalMotion(props.type, props.preventClose),
        ...(props.zIndex !== null ? { customZIndex: props.zIndex } : {})
      });
    },
    { immediate: true }
  );

  const unsubscribeCloseStart = modalStore.stackManager.on('close-start', (event) => {
    if (!isHostedModal.value) return;
    if (event.entry?.modalUid !== injectedModalId) return;
    if (event.reason && USER_DISMISS_REASON_SET.has(event.reason)) {
      onEmitClose();
    }
  });

  const isSurfaceRendered = computed<boolean>(() => {
    const entry = activeEntry.value;
    if (!entry) return false;
    if (isHostedModal.value) {
      return props.show || entry.phase === 'closing';
    }
    return true;
  });

  const isClosing = computed<boolean>(() => activeEntry.value?.phase === 'closing');

  const isSimplified = computed<boolean>(() =>
    Boolean(injectedSimplified?.value || activeEntry.value?.isSimplified)
  );

  let unbindSurface: (() => void) | null = null;
  let boundSurfaceUid: string | null = null;

  watch(
    [isSurfaceRendered, effectiveModalUid, surfaceRefs.backdropEl, surfaceRefs.panelEl],
    ([rendered, uid, backdrop, panel]) => {
      if (!rendered || !uid || !panel) {
        if (!rendered && unbindSurface) {
          unbindSurface();
          unbindSurface = null;
          boundSurfaceUid = null;
        }
        return;
      }
      if (boundSurfaceUid === uid) return;
      unbindSurface?.();
      boundSurfaceUid = uid;
      unbindSurface = modalStore.animations.bindSurface(uid, {
        container: surfaceRefs.rootEl.value,
        backdrop: backdrop ?? undefined,
        panel
      });
    },
    { flush: 'post', immediate: true }
  );

  onBeforeUnmount(() => {
    unsubscribeCloseStart();
    unbindSurface?.();
    unbindSurface = null;
    boundSurfaceUid = null;
    if (
      standaloneUid.value &&
      modalStore.stackManager.hasUid(standaloneUid.value, { includeClosing: true })
    ) {
      modalStore.stackManager.forceClose(standaloneUid.value, 'programmatic');
    }
    standaloneUid.value = null;
  });

  const backdropGuard = createBackdropPointerGuard({
    stack: modalStore.stackManager,
    getModalUid: () => effectiveModalUid.value
  });

  const requestCloseFromButton = (): void => {
    if (props.preventClose) return;
    const uid = effectiveModalUid.value;
    if (uid && modalStore.stackManager.hasUid(uid)) {
      modalStore.stackManager.requestClose(uid, 'close-button');
      return;
    }
    onEmitClose();
  };

  const domIds = computed(() => (props.id ? resolveModalDomIds(props.id) : null));
  const resolvedDomId = computed(() => domIds.value?.modalId);
  const resolvedCloseBtnId = computed(() => props.closeBtnId || domIds.value?.closeButtonId);
  const resolvedFloatingCloseBtnId = computed(
    () => props.closeBtnId || domIds.value?.closeButtonId
  );

  const entryZIndex = computed<number | undefined>(() => activeEntry.value?.zIndex);
  const entryBackdropZIndex = computed<number | undefined>(() => activeEntry.value?.backdropZIndex);
  const entryContentZIndex = computed<number | undefined>(() => activeEntry.value?.contentZIndex);

  const modalCssVars = computed<ModalCssVars | undefined>(() => {
    if (
      entryZIndex.value === undefined ||
      entryBackdropZIndex.value === undefined ||
      entryContentZIndex.value === undefined
    ) {
      return undefined;
    }
    return resolveModalCssVars({
      zIndex: entryZIndex.value,
      backdropZIndex: entryBackdropZIndex.value,
      contentZIndex: entryContentZIndex.value
    });
  });

  return {
    activeEntry,
    isSurfaceRendered,
    isClosing,
    isSimplified,
    modalCssVars,
    resolvedDomId,
    resolvedCloseBtnId,
    resolvedFloatingCloseBtnId,
    backdropGuard,
    requestCloseFromButton
  };
}
