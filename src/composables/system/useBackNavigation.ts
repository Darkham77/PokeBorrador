import { onMounted, onUnmounted, computed } from 'vue';

import { logger } from '@/logic/utils/logger';
import { useModalStore } from '@/stores/modals';
import { useUIStore } from '@/stores/ui';

const MOUSE_BUTTON_BACK = 3;
const MOUSE_BUTTON_FORWARD = 4;

/**
 * useBackNavigation
 * Disables all browser/hardware/gesture back and forward navigation attempts on PC and Mobile.
 * Establishes an immutable history guard trap and captures mouse/keyboard navigation events.
 */
export function useBackNavigation(): void {
  const uiStore = useUIStore();
  const modalStore = useModalStore();

  // Determine current active UI elements that can be dismissed via in-game back action
  const currentUIStackSize = computed(() => {
    let size = modalStore.stack.length;
    if (uiStore.isChatOpen) size++;
    if (uiStore.isHistoryOpen) size++;
    if (uiStore.openHudGroup !== null) size++;
    return size;
  });

  // Dismiss the top-most active UI element. Returns true if something was closed.
  const closeTopUI = (): boolean => {
    if (modalStore.stack.length > 0) {
      modalStore.closeTop();
      return true;
    }
    if (uiStore.isChatOpen) {
      uiStore.isChatOpen = false;
      return true;
    }
    if (uiStore.isHistoryOpen) {
      uiStore.isHistoryOpen = false;
      return true;
    }
    if (uiStore.openHudGroup !== null) {
      uiStore.openHudGroup = null;
      return true;
    }
    return false;
  };

  // Establishes a permanent state trap in browser history to prevent navigating away
  const ensureHistoryTrap = (): void => {
    try {
      const currentState = (globalThis.history.state as Record<string, unknown> | null) || {}; // open-record: Generic key-value data dictionary container
      globalThis.history.pushState(
        { ...currentState, pokevicioGuard: true },
        '',
        globalThis.location.href
      );
    } catch (err) {
      logger.debug('useBackNavigation', 'Historial restringido en este entorno:', err);
    }
  };

  // Intercept hardware mouse navigation buttons (Button 3 = Back, Button 4 = Forward)
  const handleMouseNavigationButtons = (e: MouseEvent | PointerEvent): void => {
    if (e.button === MOUSE_BUTTON_BACK || e.button === MOUSE_BUTTON_FORWARD) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  };

  // Intercept keyboard navigation shortcuts
  const handleKeyboardNavigation = (e: KeyboardEvent): void => {
    const isAltNavigation = e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');
    const isBrowserNavigation = e.key === 'BrowserBack' || e.key === 'BrowserForward';

    if (isAltNavigation || isBrowserNavigation) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === 'Backspace') {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInput) {
        e.preventDefault();
      }
    }
  };

  // Handle popstate event by re-pushing trap and closing UI if open
  const handlePopState = (): void => {
    ensureHistoryTrap();

    if (currentUIStackSize.value > 0) {
      try {
        closeTopUI();
      } catch (err) {
        logger.error('BackNavigation', 'Error closing UI on back gesture', err);
      }
    }
  };

  onMounted(() => {
    ensureHistoryTrap();

    globalThis.addEventListener('popstate', handlePopState);
    globalThis.addEventListener('mousedown', handleMouseNavigationButtons, { capture: true });
    globalThis.addEventListener('mouseup', handleMouseNavigationButtons, { capture: true });
    globalThis.addEventListener('auxclick', handleMouseNavigationButtons, { capture: true });
    globalThis.addEventListener('pointerdown', handleMouseNavigationButtons, { capture: true });
    globalThis.addEventListener('pointerup', handleMouseNavigationButtons, { capture: true });
    globalThis.addEventListener('keydown', handleKeyboardNavigation, { capture: true });
  });

  onUnmounted(() => {
    globalThis.removeEventListener('popstate', handlePopState);
    globalThis.removeEventListener('mousedown', handleMouseNavigationButtons, { capture: true });
    globalThis.removeEventListener('mouseup', handleMouseNavigationButtons, { capture: true });
    globalThis.removeEventListener('auxclick', handleMouseNavigationButtons, { capture: true });
    globalThis.removeEventListener('pointerdown', handleMouseNavigationButtons, { capture: true });
    globalThis.removeEventListener('pointerup', handleMouseNavigationButtons, { capture: true });
    globalThis.removeEventListener('keydown', handleKeyboardNavigation, { capture: true });
  });
}
