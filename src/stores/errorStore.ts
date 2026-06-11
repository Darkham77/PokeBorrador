import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import { gameBus } from '@/logic/gameBus'

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

  const activeError = ref<ErrorData | null>(null)

  interface ErrorContext {
    type?: string;
    source?: string;
    lineno?: number;
    colno?: number;
  }

  function setError(error: unknown, context: ErrorContext = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    const isUpdateOrNetwork = 
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Unable to preload CSS') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('chunk') ||
      errorMessage.includes('Load chunk') ||
      errorMessage.includes('error loading dynamically imported module')

    if (isUpdateOrNetwork) {
      logger.warn('errorStore', 'Fallo de conexión o actualización detectado, activando pantalla de PWA/Relogin.', context)
      gameBus.emit('PWA_NEED_REFRESH')
      return
    }

    logger.error('CRITICAL', `Critical Game Error: ${errorMessage}`, context)
    
    // Prevent duplicated overlays
    if (activeError.value) return

    const errorStack = error instanceof Error ? error.stack : 'No stack trace available.'

    activeError.value = {
      message: errorMessage,
      stack: errorStack || 'No stack trace available.',
      type: context.type || 'Uncaught Error',
      source: context.source || 'N/A',
      lineno: context.lineno || 0,
      colno: context.colno || 0,
      userAction: '',
      isUpdateOrNetworkError: false
    }
  }

  function clearError() {
    activeError.value = null
  }

  return {
    activeError,
    setError,
    clearError
  }
})
