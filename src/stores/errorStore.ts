import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logger } from '@/logic/utils/logger'

export const useErrorStore = defineStore('error', () => {
  interface ErrorData {
    message: string;
    stack: string;
    type: string;
    source: string;
    lineno: number;
    colno: number;
    userAction: string;
  }

  const activeError = ref<ErrorData | null>(null)

  interface ErrorContext {
    type?: string;
    source?: string;
    lineno?: number;
    colno?: number;
  }

  function setError(error: unknown, context: ErrorContext = {}) {
    logger.error('CRITICAL', `Critical Game Error: ${error instanceof Error ? error.message : String(error)}`, context)
    
    // Prevent duplicated overlays
    if (activeError.value) return

    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available.'
    
    activeError.value = {
      message: errorMessage,
      stack: errorStack || 'No stack trace available.',
      type: context.type || 'Uncaught Error',
      source: context.source || 'N/A',
      lineno: context.lineno || 0,
      colno: context.colno || 0,
      userAction: ''
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
