import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/logic/utils/logger'
import { gameBus } from '@/logic/events/gameBus'

export const useErrorStore = defineStore('error', () => {
  interface ErrorData {
    message: string;
    stack: string;
    type: string;
    source: string;
    lineno: number;
    colno: number;
    userAction: string;
    isUpdateOrNetworkError: boolean;
  }

  const errors = ref<ErrorData[]>([])
  const activeError = computed(() => errors.value[0] || null)

  interface ErrorContext {
    type?: string;
    source?: string;
    lineno?: number;
    colno?: number;
  }

  function setError(error: unknown, context: ErrorContext = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    const isUpdateOrNetwork = 
      context.type !== 'Vue Render Error' && (
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Unable to preload CSS') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('chunk') ||
        errorMessage.includes('Load chunk') ||
        errorMessage.includes('error loading dynamically imported module')
      )

    if (isUpdateOrNetwork) {
      logger.warn('errorStore', 'Fallo de conexión o actualización detectado, activando pantalla de PWA/Relogin.', context)
      gameBus.emit('PWA_NEED_REFRESH')
      return
    }

    ;(console as unknown as { __BYPASS_INTERCEPTOR__?: boolean }).__BYPASS_INTERCEPTOR__ = true
    logger.error('CRITICAL', `Critical Game Error: ${errorMessage}`, context)
    ;(console as unknown as { __BYPASS_INTERCEPTOR__?: boolean }).__BYPASS_INTERCEPTOR__ = false

    const lastError = errors.value[errors.value.length - 1]
    if (lastError && lastError.message === errorMessage) {
      return
    }

    let errorStack = ''
    if (error instanceof Error && error.stack) {
      errorStack = error.stack
    } else {
      const tempError = new Error()
      if (Error.captureStackTrace) {
        Error.captureStackTrace(tempError, setError)
      }
      errorStack = tempError.stack || 'No stack trace available.'
    }

    errors.value.push({
      message: errorMessage,
      stack: errorStack,
      type: context.type || 'Uncaught Error',
      source: context.source || 'N/A',
      lineno: context.lineno || 0,
      colno: context.colno || 0,
      userAction: '',
      isUpdateOrNetworkError: false
    })
  }

  function clearError() {
    errors.value = []
  }

  return {
    errors,
    activeError,
    setError,
    clearError
  }
})
