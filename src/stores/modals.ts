import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'
import gsap from 'gsap'
import { logger } from '@/logic/utils/logger'

import { MODAL_REGISTRY } from '@/logic/modals/registry'

import type { Component } from 'vue'

export interface Modal {
  id: string;
  name: string;
  component: Component;
  props: Record<string, unknown>;
  opening: boolean;
  closing: boolean;
}

export const useModalStore = defineStore('modals', () => {
  const stack = ref<Modal[]>([])

  /**
   * Opens a modal by name from the registry.
   */
  const open = (name: string, props: Record<string, unknown> = {}) => {
    const component = (MODAL_REGISTRY as Record<string, Component>)[name]
    if (!component) {
      logger.error('ModalStore', `Modal "${name}" not found in registry`)
      return null
    }

    const id = Math.random().toString(36).substring(7)
    const modal: Modal = {
      id,
      name,
      component: markRaw(component),
      props,
      opening: true, // Initial state for animations
      closing: false
    }

    stack.value.push(modal)

    // GSAP fallback to ensure the "opening" state doesn't hang 
    // This also allows unit tests to pass by simulating visual completion
    gsap.delayedCall(0.45, () => finishOpening(id))

    return id
  }

  /**
   * Called by the component when the opening animation finishes.
   */
  const finishOpening = (id: string) => {
    const target = stack.value.find(m => m.id === id)
    if (target) {
      target.opening = false
    }
  }

  /**
   * Closes a specific modal by ID or Name.
   */
  const close = (identifier: string) => {
    const index = stack.value.findIndex(m => m.id === identifier || m.name === identifier)
    if (index !== -1) {
      const modal = stack.value[index]
      if (!modal || modal.closing) return 
      modal.closing = true

      // GSAP fallback to ensure the modal is eventually removed from the stack
      // even if the component fails to call finalizeClose
      gsap.delayedCall(0.5, () => finalizeClose(modal.id))
    }
  }

  /**
   * Called by the component when the closing animation finishes.
   */
  const finalizeClose = (id: string) => {
    const index = stack.value.findIndex(m => m.id === id)
    if (index !== -1) {
      stack.value.splice(index, 1)
    }
  }

  /**
   * Closes the top-most modal in the stack (LIFO).
   */
  const closeTop = () => {
    if (stack.value.length > 0) {
      const topModal = stack.value[stack.value.length - 1]
      if (topModal) close(topModal.id)
    }
  }

  const closeAll = () => {
    stack.value = []
  }

  const isOpen = (name: string) => {
    return stack.value.some(m => m.name === name && !m.closing)
  }

  return {
    stack,
    open,
    close,
    closeTop,
    closeAll,
    isOpen,
    finishOpening,
    finalizeClose
  }
})
