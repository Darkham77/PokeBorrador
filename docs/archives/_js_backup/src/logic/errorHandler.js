/**
 * GLOBAL ERROR HANDLER BRIDGE
 * Captures unexpected failures and sends them to the Pinia error store.
 */
import { useErrorStore } from '@/stores/errorStore'

export function initGlobalErrorHandlers() {
  const errorStore = useErrorStore()

  // Capture synchronous errors
  window.onerror = function(message, source, lineno, colno, error) {
    errorStore.setError(error || message, {
      source,
      lineno,
      colno,
      type: 'Uncaught Error'
    })
    return false // Keep propagating to console
  }

  // Capture unhandled promise rejections
  window.onunhandledrejection = function(event) {
    errorStore.setError(event.reason, {
      type: 'Unhandled Promise Rejection'
    })
  }

  // Legacy bridge
  window.showGameError = (error, context = {}) => {
    errorStore.setError(error, context)
  }

  console.log('[ERROR_HANDLER] Global listeners initialized (Vue Bridge active).')
}
