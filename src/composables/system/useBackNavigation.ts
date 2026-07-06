import { watch, onMounted, onUnmounted, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { logger } from '@/logic/utils/logger'

/**
 * useBackNavigation
 * Intercepts the browser/mobile back gesture to close open modals, chat, history, or HUD groups
 * instead of navigating away or logging out the user.
 */
export function useBackNavigation() {
  const uiStore = useUIStore()
  const modalStore = useModalStore()

  // Track the number of popstate events to ignore when programmatically going back
  let ignoreNextPopStateCount = 0
  // Flag to check if we are currently handling a back action from popstate
  let isProcessingPopState = false

  // Determine current active UI elements that can be dismissed via back button
  const currentUIStackSize = computed(() => {
    let size = modalStore.stack.length
    if (uiStore.isChatOpen) size++
    if (uiStore.isHistoryOpen) size++
    if (uiStore.openHudGroup !== null) size++
    return size
  })

  // Dismiss the top-most active UI element. Returns true if something was closed.
  const closeTopUI = (): boolean => {
    if (modalStore.stack.length > 0) {
      modalStore.closeTop()
      return true
    }
    if (uiStore.isChatOpen) {
      uiStore.isChatOpen = false
      return true
    }
    if (uiStore.isHistoryOpen) {
      uiStore.isHistoryOpen = false
      return true
    }
    if (uiStore.openHudGroup !== null) {
      uiStore.openHudGroup = null
      return true
    }
    return false
  }

  const handlePopState = () => {
    if (ignoreNextPopStateCount > 0) {
      ignoreNextPopStateCount--
      return
    }

    // If there is any active UI element, intercept the back gesture and close it
    if (currentUIStackSize.value > 0) {
      isProcessingPopState = true
      try {
        closeTopUI()
      } catch (err) {
        logger.error('BackNavigation', 'Error closing UI on back gesture', err)
      } finally {
        isProcessingPopState = false
      }
    }
  }

  onMounted(() => {
    window.addEventListener('popstate', handlePopState)

    // Watch the active UI stack size to push/pop history states accordingly
    watch(
      currentUIStackSize,
      (newSize, oldSize = 0) => {
        const delta = newSize - oldSize
        if (delta > 0) {
          // UI opened: Push states to history
          for (let i = 0; i < delta; i++) {
            const currentState = (window.history.state as Record<string, unknown> | null) || {}
            window.history.pushState({ ...currentState, pokevicioUI: true }, '')
          }
        } else if (delta < 0) {
          // UI closed programmatically (not via popstate): Pop states from history
          if (!isProcessingPopState) {
            const popCount = Math.abs(delta)
            ignoreNextPopStateCount += popCount
            for (let i = 0; i < popCount; i++) {
              window.history.back()
            }
          }
        }
      },
      { immediate: false }
    )
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopState)
  })
}
