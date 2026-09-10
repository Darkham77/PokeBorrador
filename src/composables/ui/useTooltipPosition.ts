import { ref, type Ref } from 'vue'

const MIN_TOOLTIP_MAX_HEIGHT_PX = 120
const GAP_PX = 12
const PADDING_PX = 15

export function useTooltipPosition(
  trigger: Ref<HTMLElement | null>,
  tooltip: Ref<HTMLElement | null>,
  position: string
) {
  const coords = ref({ top: 0, left: 0 as number | 'auto', right: 'auto' as number | 'auto' })
  const activePosition = ref(position)
  const arrowOffset = ref({ x: 0, y: 0 })
  const isRightSide = ref(false)
  const maxHeight = ref<number | null>(null)

  const updatePosition = () => {
    if (!trigger.value || !tooltip.value) return
    
    const rect = trigger.value.getBoundingClientRect()
    const tipRect = tooltip.value.getBoundingClientRect()
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    
    let pos = position

    const triggerCenter = rect.left + rect.width / 2
    isRightSide.value = triggerCenter > viewportWidth / 2

    // --- 1. FLIPPING LOGIC (Vertical & Horizontal) ---
    if (pos === 'top' && rect.top - tipRect.height - GAP_PX < PADDING_PX) {
      const spaceTop = rect.top - PADDING_PX
      const spaceBottom = viewportHeight - rect.bottom - PADDING_PX
      if (spaceBottom > spaceTop) {
        pos = 'bottom'
      }
    } else if (pos === 'bottom' && rect.bottom + tipRect.height + GAP_PX > viewportHeight - PADDING_PX) {
      const spaceTop = rect.top - PADDING_PX
      const spaceBottom = viewportHeight - rect.bottom - PADDING_PX
      if (spaceTop > spaceBottom) {
        pos = 'top'
      }
    } else if (pos === 'left' && rect.left - tipRect.width - GAP_PX < PADDING_PX) {
      const spaceLeft = rect.left - PADDING_PX
      const spaceRight = viewportWidth - rect.right - PADDING_PX
      if (spaceRight > spaceLeft) {
        pos = 'right'
      }
    } else if (pos === 'right' && rect.right + tipRect.width + GAP_PX > viewportWidth - PADDING_PX) {
      const spaceLeft = rect.left - PADDING_PX
      const spaceRight = viewportWidth - rect.right - PADDING_PX
      if (spaceLeft > spaceRight) {
        pos = 'left'
      }
    }
    activePosition.value = pos

    // --- 2. BASE COORDINATES ---
    let top = 0
    let left = 0
    
    if (pos === 'top' || pos === 'bottom') {
      top = pos === 'top' ? rect.top + scrollY - GAP_PX : rect.bottom + scrollY + GAP_PX
      left = triggerCenter + scrollX
    } else if (pos === 'left') {
      top = rect.top + scrollY + rect.height / 2
      left = rect.left + scrollX - GAP_PX
    } else if (pos === 'right') {
      top = rect.top + scrollY + rect.height / 2
      left = rect.right + scrollX + GAP_PX
    }

    // --- 3. NUDGING & ARROW LOGIC ---
    const anchorX = triggerCenter + scrollX
    const anchorY = top
    
    if (pos === 'top' || pos === 'bottom') {
      const halfWidth = tipRect.width / 2
      
      // Horizontal Nudge
      if (left - halfWidth < PADDING_PX + scrollX) {
        left = PADDING_PX + scrollX + halfWidth
      } else if (left + halfWidth > viewportWidth + scrollX - PADDING_PX) {
        left = viewportWidth + scrollX - PADDING_PX - halfWidth
      }
      
      arrowOffset.value = { x: anchorX - left, y: 0 }
    } else {
      // Left/Right Vertical Nudge
      const halfHeight = tipRect.height / 2
      if (top - halfHeight < PADDING_PX + scrollY) {
        top = PADDING_PX + scrollY + halfHeight
      } else if (top + halfHeight > viewportHeight + scrollY - PADDING_PX) {
        top = viewportHeight + scrollY - PADDING_PX - halfHeight
      }
      arrowOffset.value = { x: 0, y: anchorY - top }
    }

    if (pos === 'top') {
      maxHeight.value = Math.max(MIN_TOOLTIP_MAX_HEIGHT_PX, Math.round(rect.top - PADDING_PX - GAP_PX))
    } else if (pos === 'bottom') {
      maxHeight.value = Math.max(MIN_TOOLTIP_MAX_HEIGHT_PX, Math.round(viewportHeight - rect.bottom - PADDING_PX - GAP_PX))
    } else {
      maxHeight.value = null
    }
    
    coords.value = { 
      top: Math.round(top), 
      left: typeof left === 'number' ? Math.round(left) : left, 
      right: 'auto' 
    }
  }

  return {
    coords,
    activePosition,
    arrowOffset,
    isRightSide,
    maxHeight,
    updatePosition
  }
}
