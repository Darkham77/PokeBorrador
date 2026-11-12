import type {
  ModalCloseReason,
  ModalCloseResult,
  ModalDomController,
  ModalOpenOptions,
  ModalStackEntry,
  ModalStackSnapshot
} from '@francogp/auditor/modals';
import { defineStore } from 'pinia';
import { computed, markRaw, shallowRef, type Component } from 'vue';

import { getModalMetadata, resolveModalDismissMode } from '@/logic/modals/metadata';
import {
  createPokeVicioModalDomController,
  createPokeVicioModalRuntime,
  resolveBaseModalMotion,
  type PokeVicioModalMeta
} from '@/logic/modals/modalEngine';
import { logger } from '@/logic/utils/logger';

export interface Modal {
  readonly id: string;
  readonly name: string;
  readonly component?: Component;
  readonly props: Record<string, unknown>;
  readonly opening: boolean;
  readonly closing: boolean;
  readonly zIndex: number;
  readonly backdropZIndex: number;
  readonly contentZIndex: number;
  readonly isActiveTop: boolean;
  readonly isSimplified: boolean;
}

function toModalView(entry: ModalStackEntry<string, PokeVicioModalMeta>): Modal {
  return {
    id: entry.modalUid,
    name: entry.kind,
    component: entry.meta.component,
    props: entry.meta.props,
    opening: entry.phase === 'opening',
    closing: entry.phase === 'closing',
    zIndex: entry.zIndex,
    backdropZIndex: entry.backdropZIndex,
    contentZIndex: entry.contentZIndex,
    isActiveTop: entry.isActiveTop,
    isSimplified: entry.isSimplified
  };
}

export const useModalStore = defineStore('modals', () => {
  const runtime = createPokeVicioModalRuntime();
  const stackManager = markRaw(runtime.stack);
  const animations = markRaw(runtime.animations);

  const snapshot = shallowRef<ModalStackSnapshot<string, PokeVicioModalMeta>>(
    stackManager.getSnapshot()
  );

  stackManager.subscribe((nextSnapshot) => {
    snapshot.value = nextSnapshot;
  });

  const stack = computed<Modal[]>(() =>
    snapshot.value.entries.filter((entry) => entry.meta.isHosted).map(toModalView)
  );

  const obscuresBackground = computed<boolean>(() => snapshot.value.obscuresBackground);

  const open = (
    name: string,
    props: Record<string, unknown> = {},
    customComponent?: Component
  ): string | null => {
    const metadata = getModalMetadata(name);
    const propPreventClose = props.preventClose === true;
    const propCloseOutside = props.closeOnClickOutside !== false;
    const modalType = typeof props.type === 'string' ? props.type : 'center';

    const dismissMode =
      metadata?.dismissMode ??
      resolveModalDismissMode({
        preventClose: propPreventClose,
        closeOnClickOutside: propCloseOutside
      });
    const shouldObscure = props.overlay === 'none' ? false : (metadata?.obscuresBackground ?? true);

    const result = stackManager.tryOpen({
      kind: name,
      singletonPolicy: metadata?.singletonPolicy ?? 'allow-multiple',
      dismissMode,
      obscuresBackground: shouldObscure,
      motion: resolveBaseModalMotion(modalType, propPreventClose),
      meta: {
        props,
        component: customComponent ? markRaw(customComponent) : undefined,
        isHosted: true
      }
    });

    if (!result.created) {
      logger.warn('ModalStore', `Modal "${name}" is already open. Ignoring duplicate request.`);
      return null;
    }

    return result.entry.modalUid;
  };

  const openStandalone = (
    options: Omit<ModalOpenOptions<string, PokeVicioModalMeta>, 'meta'> & {
      readonly props?: Record<string, unknown>;
    }
  ): ModalStackEntry<string, PokeVicioModalMeta> => {
    const { props = {}, ...rest } = options;
    return stackManager.open({
      ...rest,
      obscuresBackground: rest.obscuresBackground ?? false,
      meta: {
        props,
        isHosted: false
      }
    });
  };

  const finishOpening = (id: string): void => {
    if (!id) return;
    stackManager.completeOpen(id);
  };

  const close = (identifier: string, reason: ModalCloseReason = 'programmatic'): void => {
    if (!identifier) return;
    if (stackManager.hasUid(identifier)) {
      stackManager.requestClose(identifier, reason);
      return;
    }
    stackManager.closeLatestByKind(identifier, reason);
  };

  const finalizeClose = (id: string): void => {
    if (!id) return;
    stackManager.finalizeClose(id);
  };

  const closeTop = (reason: ModalCloseReason = 'programmatic'): void => {
    stackManager.closeTop(reason);
  };

  const closeAll = (): void => {
    stackManager.clearAll({ immediate: true, reason: 'clear-all' });
  };

  const isOpen = (name: string): boolean => {
    void snapshot.value;
    return stackManager.hasKind(name);
  };

  const getEntryByUid = (
    modalUid: string
  ): ModalStackEntry<string, PokeVicioModalMeta> | undefined => {
    void snapshot.value;
    return stackManager.getByUid(modalUid);
  };

  const getLatestByKind = (
    kind: string
  ): ModalStackEntry<string, PokeVicioModalMeta> | undefined => {
    void snapshot.value;
    return stackManager.getLatestByKind(kind);
  };

  const waitForClose = (
    modalUid: string
  ): Promise<ModalCloseResult<string, PokeVicioModalMeta>> => {
    return stackManager.waitForClose(modalUid);
  };

  const mountDomController = (
    onUnhandledPopState: () => boolean | void
  ): ModalDomController<string, PokeVicioModalMeta> => {
    return createPokeVicioModalDomController(stackManager, onUnhandledPopState);
  };

  return {
    stack,
    snapshot,
    stackManager,
    animations,
    obscuresBackground,
    open,
    openStandalone,
    close,
    closeTop,
    closeAll,
    isOpen,
    finishOpening,
    finalizeClose,
    getEntryByUid,
    getLatestByKind,
    waitForClose,
    mountDomController
  };
});
