
/**
 * GLOBAL ERROR HANDLER BRIDGE
 * Captures unexpected failures and sends them to the Pinia error store.
 */
import { useErrorStore } from '@/stores/errorStore'
import { logger } from './logger.ts'

export function initGlobalErrorHandlers(): void {
  const errorStore = useErrorStore()

  let isUnloading = false
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      isUnloading = true
    })
  }

  // Intercept console.error globally to trigger error modals for all console-logged errors
  let isHandlingError = false
  const originalConsoleError = console.error
  // fallow-ignore-next-line complexity
  console.error = function(...args: unknown[]): void {
    originalConsoleError.apply(console, args)
    if (isUnloading || isHandlingError || Boolean(Reflect.get(console, '__BYPASS_INTERCEPTOR__'))) return
    isHandlingError = true
    try {
      const firstErr = args.find(arg => arg instanceof Error)
      if (firstErr) {
        errorStore.setError(firstErr, {
          type: 'Console Error',
          source: 'console.error'
        })
      } else {
        // Map all raw arguments to strings without discarding styling arguments or arrays
        let message = ''
        const first = args[0]
        if (typeof first === 'string' && first.includes('%c')) {
          // Keep the message raw, but remove styling tags %c while preserving all following arguments (e.g. metadata objects/arrays)
          const cleanFirst = first.replace(/%c/g, '')
          const styleCount = (first.match(/%c/g) || []).length
          const nonStyleArgs = args.slice(1 + styleCount)
          message = [cleanFirst, ...nonStyleArgs.map(arg => {
            if (arg instanceof Error) return arg.message + '\n' + arg.stack
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          })].join(' ')
        } else {
          message = args.map(arg => {
            if (arg instanceof Error) return arg.message + '\n' + arg.stack
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          }).join(' ')
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
    if (isUnloading) return false
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
    if (isUnloading) return
    errorStore.setError(event.reason, {
      type: 'Unhandled Promise Rejection'
    })
  };

  // Legacy bridge
  window.showGameError = (error: Error | string, context: Record<string, unknown> = {}) => {
    errorStore.setError(error, context)
  }

  logger.info('ERROR_HANDLER', 'Global listeners initialized (Vue Bridge active).')
}
