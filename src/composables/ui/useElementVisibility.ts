import { ref, type Ref } from 'vue'
import { useIntersectionObserver, type MaybeElement, type UseIntersectionObserverOptions } from '@vueuse/core'
import { logger } from '@/logic/utils/logger'

/**
 * Composable to track element visibility using IntersectionObserver.
 * Powered by @vueuse/core useIntersectionObserver with reactive ref tracking.
 */
export function useElementVisibility(
  elementRef: Ref<MaybeElement> | { value: MaybeElement }, 
  options: UseIntersectionObserverOptions = { threshold: 0.01, rootMargin: '800px 0px 800px 0px' }
) {
  const isVisible = ref(true) // Assume visible initially to avoid flicker

  const { isSupported } = useIntersectionObserver(
    elementRef as Ref<MaybeElement>,
    (entries) => {
      const entry = entries[0]
      if (entry) {
        isVisible.value = entry.isIntersecting
      }
    },
    options
  )

  if (!isSupported.value && typeof window !== 'undefined') {
    logger.warn('UI', 'IntersectionObserver is not supported in this environment.')
  }

  return {
    isVisible
  }
}
