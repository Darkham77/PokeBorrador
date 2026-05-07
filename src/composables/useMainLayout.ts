import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useWindowListener, useDocumentListener } from '@/composables/useWindowListener'

export function useMainLayout(hudRef: any, hudBottomRef: any, innerHudRef: any) {
  const uiStore = useUIStore()
  const gameStore = useGameStore()

  const hudHeight = ref(110)
  const hudBottomHeight = ref(gameStore.state.starterChosen ? 80 : 0)
  const isHudHidden = ref(false)

  const activeTab = computed(() => uiStore.activeTab)
  watch(activeTab, () => {
    isHudHidden.value = false
  })

  // 1. Outside Click logic
  function handleOutsideClick(e: any) {
    if (!uiStore.openHudGroup) return

    const isInsideTopHud = hudRef.value?.contains(e.target)
    const bottomEl = hudBottomRef.value?.$el || hudBottomRef.value
    const isInsideBottomHud = bottomEl ? bottomEl.contains(e.target) : false
    
    if (!isInsideTopHud && !isInsideBottomHud) {
      uiStore.openHudGroup = null
    }
  }

  // 2. Scroll logic
  let lastScrollY = 0
  let scrollTicking = false
  function handleScroll(e: any) {
    if (scrollTicking) return
    scrollTicking = true
    
    requestAnimationFrame(() => {
      let target = e.target
      if (target === document || target === window) target = document.documentElement
      
      if (target.tagName !== 'HTML' && (!target.classList || !target.classList.contains('tab-content'))) {
        scrollTicking = false
        return
      }

      const currentScrollY = target.scrollTop
      
      if (currentScrollY <= 50) {
        if (isHudHidden.value) isHudHidden.value = false
        lastScrollY = currentScrollY
        scrollTicking = false
        return
      }

      const diff = currentScrollY - lastScrollY
      const threshold = 60
      
      if (Math.abs(diff) > threshold) {
        const nextHidden = diff > 0
        if (isHudHidden.value !== nextHidden) {
          isHudHidden.value = nextHidden
        }
        lastScrollY = currentScrollY
      }
      
      scrollTicking = false
    })
  }

  // 3. Height calculation logic
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
      
      const bottomEl = hudBottomRef.value?.$el || hudBottomRef.value
      const newBottomHeight = bottomEl ? bottomEl.offsetHeight : 0
      if (Math.abs(hudBottomHeight.value - newBottomHeight) > 2) {
        hudBottomHeight.value = newBottomHeight
      }
      
      isUpdatingHeight = false
    })
  }

  // Lifecycle listeners
  useWindowListener('resize', () => {
    updateHudHeight()
  }, { passive: true })

  useWindowListener('scroll', handleScroll, { passive: true, capture: true })
  useDocumentListener('click', handleOutsideClick)

  return {
    hudHeight,
    hudBottomHeight,
    isHudHidden,
    updateHudHeight
  }
}
