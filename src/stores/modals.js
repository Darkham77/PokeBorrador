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
    
    stack.value.push({
      id,
      name,
      component: markRaw(component),
      props
    })

    return id
  }

  /**
   * Closes a specific modal by ID or Name.
   * @param {string} identifier - The id or name of the modal to close.
   */
  const close = (identifier) => {
    const index = stack.value.findIndex(m => m.id === identifier || m.name === identifier)
    if (index !== -1) {
      stack.value.splice(index, 1)
    }
  }

  /**
   * Closes the top-most modal in the stack (LIFO).
   */
  const closeTop = () => {
    if (stack.value.length > 0) {
      stack.value.pop()
    }
  }

  const closeAll = () => {
    stack.value = []
  }

  const isOpen = (name) => {
    return stack.value.some(m => m.name === name)
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
