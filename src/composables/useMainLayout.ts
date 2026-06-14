import { ref, onMounted, onUnmounted, type Ref, type ComponentPublicInstance } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useWindowListener, useDocumentListener } from '@/composables/useWindowListener'

export function useMainLayout(
  hudRef: Ref<HTMLElement | null>, 
  hudBottomRef: Ref<HTMLElement | ComponentPublicInstance | null>, 
  innerHudRef: Ref<HTMLElement | null>
) {
  const uiStore = useUIStore()
  const gameStore = useGameStore()

  const hudHeight = ref(110)
  const hudBottomHeight = ref(gameStore.state.starterChosen ? 80 : 0)
  const isHudHidden = ref(false)

  // 1. Outside Click logic
  function handleOutsideClick(e: MouseEvent) {
    if (!uiStore.openHudGroup) return

    const isInsideTopHud = hudRef.value?.contains(e.target as Node)
    const bottomValue = hudBottomRef.value
    const bottomEl = (bottomValue && '$el' in bottomValue) ? (bottomValue.$el as HTMLElement) : (bottomValue as HTMLElement | null)
    const isInsideBottomHud = bottomEl ? bottomEl.contains(e.target as Node) : false
    
    if (!isInsideTopHud && !isInsideBottomHud) {
      uiStore.openHudGroup = null
    }
  }

  // 2. Height calculation logic
  let isUpdatingHeight = false
  function updateHudHeight() {
    if (isUpdatingHeight) return
    isUpdatingHeight = true
    
    requestAnimationFrame(() => {
      if (isHudHidden.value) {
        isUpdatingHeight = false
        return
      }

      let newHeight = 0
      if (innerHudRef.value) {
        newHeight = innerHudRef.value.offsetHeight
      } else if (hudRef.value) {
        newHeight = hudRef.value.offsetHeight
      }

      if (Math.abs(hudHeight.value - newHeight) > 2) {
        hudHeight.value = newHeight
      }
      
      const bottomValue = hudBottomRef.value
      const bottomEl = (bottomValue && '$el' in bottomValue) ? (bottomValue.$el as HTMLElement) : (bottomValue as HTMLElement | null)
      const newBottomHeight = bottomEl ? bottomEl.offsetHeight : 0
      if (Math.abs(hudBottomHeight.value - newBottomHeight) > 2) {
        hudBottomHeight.value = newBottomHeight
      }
      
      isUpdatingHeight = false
    })
  }

  // ResizeObserver to detect layout shifts and dynamically recalculate heights
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    updateHudHeight()
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateHudHeight()
      })
      if (innerHudRef.value) resizeObserver.observe(innerHudRef.value)
      if (hudRef.value) resizeObserver.observe(hudRef.value)
      
      const bottomValue = hudBottomRef.value
      const bottomEl = (bottomValue && '$el' in bottomValue) ? (bottomValue.$el as HTMLElement) : (bottomValue as HTMLElement | null)
      if (bottomEl) resizeObserver.observe(bottomEl)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })

  // Lifecycle listeners
  useWindowListener('resize', () => {
    updateHudHeight()
  }, { passive: true })

  useDocumentListener('click', handleOutsideClick as EventListener)

  return {
    hudHeight,
    hudBottomHeight,
    isHudHidden,
    updateHudHeight
  }
}
