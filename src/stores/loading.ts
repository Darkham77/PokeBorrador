
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/logic/utils/logger'

export interface LoadingItem {
  id: string;
  message: string;
  subMessage: string;
  isGlobal: boolean;
  timestamp: number;
}

export const useLoadingStore = defineStore('loading', () => {

  // A stack of loading states to support nested/parallel operations without overwriting each other
  const stack = ref<LoadingItem[]>([])
  const isAppMounted = ref(false)

  /**
   * Starts a loading operation and adds it to the stack.
   * @param {string} id - Unique identifier for the operation
   * @param {string} message - Primary message to display
   * @param {string} subMessage - Secondary/hint text
   * @param {boolean} isGlobal - If true, it uses the dark global overlay (higher priority)
   */
  function start(id: string, message = 'Procesando...', subMessage = 'Por favor, no cierres la ventana', isGlobal = true) {
    // If ID already exists, update it instead of pushing
    const index = stack.value.findIndex(item => item.id === id)
    const payload: LoadingItem = { id, message, subMessage, isGlobal, timestamp: Temporal.Now.instant().epochMilliseconds }
    
    if (index !== -1) {
      stack.value[index] = payload
    } else {
      stack.value.push(payload)
    }
    
    logger.debug('LoadingStore', `Started: ${id} ("${message}")`)
  }

  /**
   * Removes a loading operation from the stack by its ID.
   * @param {string} id - The identifier used in start()
   */
  function finish(id: string) {
    const originalLen = stack.value.length
    stack.value = stack.value.filter(item => item.id !== id)
    
    if (stack.value.length !== originalLen) {
      logger.debug('LoadingStore', `Finished: ${id}`)
    }
  }

  /**
   * Clears the entire loading stack.
   */
  function clearAll() {
    stack.value = []
  }

  // Returns the current active loading state (the one at the top of the stack)
  const current = computed(() => {
    if (stack.value.length === 0) return null
    
    // Prioritize global overlays if any
    const globalItems = stack.value.filter(i => i.isGlobal)
    if (globalItems.length > 0) {
      return globalItems[globalItems.length - 1]
    }
    
    // Otherwise return the most recent one
    return stack.value[stack.value.length - 1]
  })

  const isActive = computed(() => stack.value.length > 0)

  /**
   * Updates the message or subMessage of an active loading state.
   * @param {string} id - The identifier used in start()
   * @param {string} message - New primary message (optional)
   * @param {string} subMessage - New secondary message (optional)
   */
  function setProgress(id: string, message: string | null = null, subMessage: string | null = null) {
    const item = stack.value.find(i => i.id === id)
    if (item) {
      if (message !== null) item.message = message
      if (subMessage !== null) item.subMessage = subMessage
    }
  }

  function markAppMounted() {
    isAppMounted.value = true
    logger.success('LoadingStore', 'App View Mounted')
  }

  const isGateOpen = computed(() => {
    // The gate opens ONLY when the app is mounted AND there are no active loading tasks
    return isAppMounted.value && stack.value.length === 0
  })

  return {
    stack,
    current,
    isActive,
    isAppMounted,
    isGateOpen,
    start,
    finish,
    setProgress,
    clearAll,
    markAppMounted
  }
})
