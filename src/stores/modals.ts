import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'

import { MODAL_REGISTRY } from '@/logic/modals/registry'

/**
 * Modal Store
 * Manages a dynamic stack of active modals (LIFO).
 */
export const useModalStore = defineStore('modals', () => {
  const stack = ref([])

  /**
   * Opens a new modal.
   * @param {string} name - Key in MODAL_REGISTRY
   * @param {Object} props - Props to pass to the component
   */
  const open = (name, props = {}) => {
    const component = MODAL_REGISTRY[name]
    if (!component) {
      console.warn(`[Modals] Modal "${name}" not found in registry.`)
      return null
    }

    const id = `${name}-${Date.now()}`
    
    const modal = {
      id,
      name,
      component: markRaw(component),
      props,
      opening: true, // Initial state for animations
      closing: false
    }

    stack.value.push(modal)

    // After the opening animation (400ms), we mark it as no longer opening
    // This allows the UI to delay "Performance Mode" until the modal is fully visible
    setTimeout(() => {
      const target = stack.value.find(m => m.id === id)
      if (target) {
        target.opening = false
      }
    }, 450)

    return id
  }

  /**
   * Closes a specific modal by ID or Name.
   * @param {string} identifier - The id or name of the modal to close.
   */
  const close = (identifier) => {
    const index = stack.value.findIndex(m => m.id === identifier || m.name === identifier)
    if (index !== -1) {
      const modal = stack.value[index]
      if (modal.closing) return // Already closing

      modal.closing = true
      
      // We wait for the animation to finish before removing from stack
      // 550ms ensures BaseModal.vue 500ms transitions finish first
      setTimeout(() => {
        const finalIndex = stack.value.findIndex(m => m.id === modal.id)
        if (finalIndex !== -1) {
          stack.value.splice(finalIndex, 1)
        }
      }, 550)
    }
  }

  /**
   * Closes the top-most modal in the stack (LIFO).
   */
  const closeTop = () => {
    if (stack.value.length > 0) {
      const topModal = stack.value[stack.value.length - 1]
      close(topModal.id)
    }
  }

  const closeAll = () => {
    stack.value = []
  }

  const isOpen = (name) => {
    return stack.value.some(m => m.name === name && !m.closing)
  }

  return {
    stack,
    open,
    close,
    closeTop,
    closeAll,
    isOpen
  }
})
