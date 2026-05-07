import { computed, toValue } from 'vue'
import { toVirtualStyles } from '@/logic/combat/spatialCoordinator'

/**
 * useVirtualPosition
 * Converts virtual units (0-3000) into CSS styles for absolute positioning.
 * Accepts MaybeRefOrGetter for all parameters.
 * 
 * @param {number} x - Virtual X coordinate
 * @param {number} y - Virtual Y coordinate
 * @param {number} w - Optional virtual width (will be multiplied by OBJECT_SCALE)
 * @param {number} h - Optional virtual height (will be multiplied by OBJECT_SCALE)
 */
export function useVirtualPosition(x: any, y: any, w?: any, h?: any) {
  const styles = computed(() => {
    return toVirtualStyles(toValue(x), toValue(y), toValue(w), toValue(h))
  })

  return {
    styles
  }
}
