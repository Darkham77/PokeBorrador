import { ref, onMounted, onUnmounted } from 'vue'
import { logger } from '@/logic/utils/logger'

/**
 * Composable to track element visibility using IntersectionObserver.
 * Useful for pausing animations or logic when elements are off-screen.
 */
export function useElementVisibility(elementRef: { value: Element | null }, options: IntersectionObserverInit = { threshold: 0.01, rootMargin: '800px 0px 800px 0px' }) {
  const isVisible = ref(true) // Assume visible initially to avoid flicker
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!elementRef.value) return

    if (typeof IntersectionObserver === 'undefined') {
      logger.warn('UI', 'IntersectionObserver is not supported in this environment.');
      return;
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible.value = entry.isIntersecting
      })
    }, options)

    observer.observe(elementRef.value)
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    isVisible
  }
}
