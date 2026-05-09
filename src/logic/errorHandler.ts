
/**
 * GLOBAL ERROR HANDLER BRIDGE
 * Captures unexpected failures and sends them to the Pinia error store.
 */
import { useErrorStore } from '@/stores/errorStore'
import { logger } from './utils/logger.ts'

export function initGlobalErrorHandlers(): void {
  const errorStore = useErrorStore()

  // Capture synchronous errors
  window.onerror = function(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    errorStore.setError(error || (message as string), {
      source,
      lineno,
      colno,
      type: 'Uncaught Error'
    })
    return false // Keep propagating to console
  }

  // Capture unhandled promise rejections
  window.onunhandledrejection = function(event: PromiseRejectionEvent): void {
    errorStore.setError(event.reason, {
      type: 'Unhandled Promise Rejection'
    })
  };

  // Legacy bridge
  (window as unknown as { showGameError: (error: Error | string, context?: Record<string, unknown>) => void }).showGameError = (error: Error | string, context: Record<string, unknown> = {}) => {
    errorStore.setError(error, context)
  }

  logger.info('ERROR_HANDLER', 'Global listeners initialized (Vue Bridge active).')
}
