import { useEventListener, type GeneralEventListener } from '@vueuse/core';

/**
 * useWindowListener
 * Specialized composable to manage global listeners with strict lifecycle cleanup.
 * Powered by @vueuse/core useEventListener with automatic scope disposal.
 */
export function useWindowListener<E extends Event = Event>(
  event: string,
  callback: GeneralEventListener<E>,
  options: boolean | AddEventListenerOptions = {}
): () => void {
  return useEventListener(
    typeof globalThis.window !== 'undefined' ? globalThis : null,
    event,
    callback as GeneralEventListener,
    options
  );
}

/**
 * useDocumentListener
 * Same but for document.
 */
export function useDocumentListener<E extends Event = Event>(
  event: string,
  callback: GeneralEventListener<E>,
  options: boolean | AddEventListenerOptions = {}
): () => void {
  return useEventListener(
    typeof document !== 'undefined' ? document : null,
    event,
    callback as GeneralEventListener,
    options
  );
}
