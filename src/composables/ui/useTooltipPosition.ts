import { ref, type Ref } from 'vue'

const MIN_TOOLTIP_MAX_HEIGHT_PX = 120;

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
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let pos = position
    const gap = 12
    const padding = 15 // Safety margin from edges

    const triggerCenter = rect.left + rect.width / 2
    isRightSide.value = triggerCenter > viewportWidth / 2

    // --- 1. FLIPPING LOGIC (Vertical & Horizontal) ---
    if (pos === 'top' && rect.top - tipRect.height - gap < padding) {
      const spaceTop = rect.top - padding
      const spaceBottom = viewportHeight - rect.bottom - padding
      if (spaceBottom > spaceTop) {
        pos = 'bottom'
      }
    } else if (pos === 'bottom' && rect.bottom + tipRect.height + gap > viewportHeight - padding) {
      const spaceTop = rect.top - padding
      const spaceBottom = viewportHeight - rect.bottom - padding
      if (spaceTop > spaceBottom) {
        pos = 'top'
      }
    } else if (pos === 'left' && rect.left - tipRect.width - gap < padding) {
      const spaceLeft = rect.left - padding
      const spaceRight = viewportWidth - rect.right - padding
      if (spaceRight > spaceLeft) {
        pos = 'right'
      }
    } else if (pos === 'right' && rect.right + tipRect.width + gap > viewportWidth - padding) {
      const spaceLeft = rect.left - padding
      const spaceRight = viewportWidth - rect.right - padding
      if (spaceLeft > spaceRight) {
        pos = 'left'
      }
    }
    activePosition.value = pos

    // --- 2. BASE COORDINATES ---
    let top = 0
    let left = 0
    
    if (pos === 'top' || pos === 'bottom') {
      top = pos === 'top' ? rect.top + scrollY - gap : rect.bottom + scrollY + gap
      left = triggerCenter + scrollX
    } else if (pos === 'left') {
      top = rect.top + scrollY + rect.height / 2
      left = rect.left + scrollX - gap
    } else if (pos === 'right') {
      top = rect.top + scrollY + rect.height / 2
      left = rect.right + scrollX + gap
    }

    // --- 3. NUDGING & ARROW LOGIC ---
    const anchorX = triggerCenter + scrollX
    const anchorY = top
    
    if (pos === 'top' || pos === 'bottom') {
      const halfWidth = tipRect.width / 2
      
      // Horizontal Nudge
      if (left - halfWidth < padding + scrollX) {
        left = padding + scrollX + halfWidth
      } else if (left + halfWidth > viewportWidth + scrollX - padding) {
        left = viewportWidth + scrollX - padding - halfWidth
      }
      
      arrowOffset.value = { x: anchorX - left, y: 0 }
    } else {
      // Left/Right Vertical Nudge
      const halfHeight = tipRect.height / 2
      if (top - halfHeight < padding + scrollY) {
        top = padding + scrollY + halfHeight
      } else if (top + halfHeight > viewportHeight + scrollY - padding) {
        top = viewportHeight + scrollY - padding - halfHeight
      }
      arrowOffset.value = { x: 0, y: anchorY - top }
    }

    if (pos === 'top') {
      maxHeight.value = Math.max(MIN_TOOLTIP_MAX_HEIGHT_PX, Math.round(rect.top - padding - gap))
    } else if (pos === 'bottom') {
      maxHeight.value = Math.max(MIN_TOOLTIP_MAX_HEIGHT_PX, Math.round(viewportHeight - rect.bottom - padding - gap))
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
