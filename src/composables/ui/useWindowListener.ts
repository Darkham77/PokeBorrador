import { onMounted, onUnmounted } from 'vue'

/**
 * useWindowListener
 * Specialized composable to manage global listeners with strict lifecycle cleanup.
 * Prevents hybrid pattern leaks and centralizes window interactions.
 */
export function useWindowListener(
  event: string, 
  callback: EventListenerOrEventListenerObject, 
  options: boolean | AddEventListenerOptions = {}
) {
  onMounted(() => {
    window.addEventListener(event, callback, options)
  })

  onUnmounted(() => {
    window.removeEventListener(event, callback, options)
  })
}

/**
 * useDocumentListener
 * Same but for document.
 */
export function useDocumentListener(
  event: string, 
  callback: EventListenerOrEventListenerObject, 
  options: boolean | AddEventListenerOptions = {}
) {
  onMounted(() => {
    document.addEventListener(event, callback, options)
  })

  onUnmounted(() => {
    document.removeEventListener(event, callback, options)
  })
}
