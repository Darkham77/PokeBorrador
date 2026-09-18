import { requireFeetPoints } from '@/data/pokemon/pokemonFeetDatabase'
import { logger } from '@/logic/utils/logger'

export interface ResolvedFeetPoints {
  feetX: number
  feetY: number
  isFlying?: boolean
  shadowScale: number
}

const DEFAULT_FEET_X_RATIO = 0.5
const DEFAULT_FEET_Y_RATIO = 0.9

export function resolveCombatantFeetPoints(
  imageUrl: string,
  isAnimated: boolean,
  animatedMeta?: { feetX?: number; feetY?: number; isFlying?: boolean; shadowScale?: number } | null
): ResolvedFeetPoints {
  if (imageUrl) {
    let key = imageUrl
    const base = import.meta.env.BASE_URL || '/'
    if (base !== '/' && imageUrl.startsWith(base)) {
      key = imageUrl.slice(base.length - 1)
    }
    try {
      key = decodeURIComponent(key)
    } catch (e) {
      throw new Error(`[resolveCombatantFeetPoints] Error decoding sprite URL '${key}': ${String(e)}`, { cause: e })
    }

    try {
      const dbPoints = requireFeetPoints(key)
      return {
        feetX: dbPoints.feetX,
        feetY: dbPoints.feetY,
        isFlying: dbPoints.isFlying,
        shadowScale: dbPoints.shadowScale ?? 1.0
      }
    } catch (err) {
      logger.warn('CombatantState', `requireFeetPoints not found for '${key}', falling back:`, (err as Error).message)
    }
  }

  if (isAnimated && animatedMeta) {
    return {
      feetX: animatedMeta.feetX ?? DEFAULT_FEET_X_RATIO,
      feetY: animatedMeta.feetY ?? DEFAULT_FEET_Y_RATIO,
      isFlying: undefined,
      shadowScale: 1.0
    }
  }

  return {
    feetX: DEFAULT_FEET_X_RATIO,
    feetY: DEFAULT_FEET_Y_RATIO,
    isFlying: undefined,
    shadowScale: 1.0
  }
}
