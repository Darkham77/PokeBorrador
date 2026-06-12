
/**
 * GLOBAL ERROR HANDLER BRIDGE
 * Captures unexpected failures and sends them to the Pinia error store.
 */
import { useErrorStore } from '@/stores/errorStore'
import { logger } from './utils/logger.ts'

export function initGlobalErrorHandlers(): void {
  const errorStore = useErrorStore()

  // Intercept console.error globally to trigger error modals for all console-logged errors
  let isHandlingError = false
  const originalConsoleError = console.error
  console.error = function(...args: unknown[]): void {
    originalConsoleError.apply(console, args)
    if (isHandlingError) return
    isHandlingError = true
    try {
      const firstErr = args.find(arg => arg instanceof Error)
      if (firstErr) {
        errorStore.setError(firstErr, {
          type: 'Console Error',
          source: 'console.error'
        })
      } else {
        // Clean console formatting (%c and trailing styles) from logger messages
        let message = ''
        const first = args[0]
        if (typeof first === 'string' && first.includes('%c')) {
          const styleCount = (first.match(/%c/g) || []).length
          const cleanFirst = first.replace(/%c/g, '')
          const remainingArgs = args.slice(1 + styleCount)
          message = [cleanFirst, ...remainingArgs.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))].join(' ')
        } else {
          message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
        }
        errorStore.setError(message, {
          type: 'Console Error',
          source: 'console.error'
        })
      }
    } catch (e) {
      originalConsoleError.apply(console, ['Failed to log console error to errorStore:', e])
    } finally {
      isHandlingError = false
    }
  }

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
