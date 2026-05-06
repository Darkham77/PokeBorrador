import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useErrorStore = defineStore('error', () => {
  const activeError = ref(null)

  function setError(error, context = {}) {
    console.error('Critical Game Error:', error, context)
    
    // Prevent duplicated overlays
    if (activeError.value) return

    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available.'
    
    activeError.value = {
      message: errorMessage,
      stack: errorStack,
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
