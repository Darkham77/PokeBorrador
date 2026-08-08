import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const WIDE_CARD_BREAKPOINT_PX = 350;

export function useMapCardObservers(
  cardRef: Ref<HTMLElement | null>,
  windowWidth: Ref<number>
) {
  const currentCols = ref(3)
  const isVisible = ref(false)

  let resizeObserver: ResizeObserver | null = null
  let intersectionObserver: IntersectionObserver | null = null

  onMounted(() => {
    if (cardRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const width = entry.contentRect.width
        if (width > WIDE_CARD_BREAKPOINT_PX) currentCols.value = 4
        else if (width > 200) currentCols.value = 3
        else currentCols.value = 2
      })
      resizeObserver.observe(cardRef.value)

      const isMobileDevice = windowWidth.value < 768
      const marginValue = isMobileDevice ? '180px' : '1200px'

      intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          isVisible.value = entry.isIntersecting
        }
      }, {
        rootMargin: marginValue,
        threshold: 0.01
      })
      intersectionObserver.observe(cardRef.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect()
    if (intersectionObserver) intersectionObserver.disconnect()
  })

  return {
    currentCols,
    isVisible
  }
}
