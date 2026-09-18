import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

const DEFAULT_COMBAT_SHADOW_ENTITY_SIZE_PX = 300
const DEFAULT_COMBAT_SHADOW_WIDTH_PCT = '70%'
const DEFAULT_FEET_Y_FLOOR = 0.9 as const
const DEFAULT_FEET_X_CENTER = 0.5 as const
const DEFAULT_SHADOW_SCALE = 1.0 as const
import { requireFeetPoints, type FeetPoints } from '@/data/pokemon/pokemonFeetDatabase'

/**
 * Combat Shadow Store
 * Centralized management for shadows in the virtual battle arena.
 */
interface CombatShadow {
  id: string;
  side: string;
  entityX: number;
  entityY: number;
  entitySize: number;
  width: string;
  isFlying: boolean;
  feetY: number;
  feetX: number;
  spriteUrl: string;
  visible: boolean;
  force?: boolean;
  shadowScale?: number;
}

function tryReuseExistingShadow(
  existing: CombatShadow | undefined,
  options: Partial<CombatShadow>
): CombatShadow | null {
  if (!existing || options.spriteUrl !== existing.spriteUrl || options.force) {
    return null
  }
  if (options.visible !== undefined && existing.visible !== options.visible) {
    existing.visible = options.visible
  }
  return existing
}

function resolveShadowCoordinates(
  options: Partial<CombatShadow>,
  cachedPoints: FeetPoints | null,
  existing: CombatShadow | undefined
): { feetX: number; feetY: number } {
  let feetY = options.feetY !== undefined ? options.feetY : (cachedPoints?.feetY ?? (existing?.feetY ?? DEFAULT_FEET_Y_FLOOR))
  if (options.isFlying) feetY = DEFAULT_FEET_Y_FLOOR
  const feetX = options.feetX !== undefined ? options.feetX : (cachedPoints?.feetX ?? (existing?.feetX ?? DEFAULT_FEET_X_CENTER))
  return { feetX, feetY }
}

function createCombatShadow(
  id: string,
  options: Partial<CombatShadow>,
  existing: CombatShadow | undefined,
  cachedPoints: FeetPoints | null
): CombatShadow {
  const { feetX, feetY } = resolveShadowCoordinates(options, cachedPoints, existing)
  return {
    id,
    side: options.side || 'generic',
    entityX: options.entityX ?? (existing?.entityX ?? 0),
    entityY: options.entityY ?? (existing?.entityY ?? 0),
    entitySize: options.entitySize ?? (existing?.entitySize ?? DEFAULT_COMBAT_SHADOW_ENTITY_SIZE_PX),
    width: options.width || (existing?.width ?? DEFAULT_COMBAT_SHADOW_WIDTH_PCT),
    isFlying: options.isFlying || false,
    shadowScale: options.shadowScale ?? (existing?.shadowScale ?? cachedPoints?.shadowScale ?? DEFAULT_SHADOW_SCALE),
    feetY,
    feetX,
    spriteUrl: options.spriteUrl || existing?.spriteUrl || '',
    visible: options.visible !== undefined ? options.visible : true
  }
}

export const useCombatShadowStore = defineStore('combatShadows', () => {
  const activeShadows = reactive(new Map<string, CombatShadow>())
  const isSolidShadows = ref(false)

  function toggleSolidShadows() {
    isSolidShadows.value = !isSolidShadows.value
  }

  function getCleanDatabaseKey(url: string): string {
    if (!url) return ''
    let key = url
    const base = import.meta.env.BASE_URL || '/'
    if (base !== '/' && url.startsWith(base)) {
      key = url.slice(base.length - 1)
    }
    try {
      return decodeURIComponent(key)
    } catch (_e) {
      return key
    }
  }

  async function detectFeetPoints(url: string): Promise<FeetPoints> {
    if (!url) {
      throw new Error(`[PokemonFeetDatabase] Cannot detect feet points: url is empty or undefined.`);
    }
    const key = getCleanDatabaseKey(url)
    return requireFeetPoints(key)
  }

  async function requestShadow(id: string, options: Partial<CombatShadow> = {}) {
    const existing = activeShadows.get(id)
    const reused = tryReuseExistingShadow(existing, options)
    if (reused) {
      return Promise.resolve(reused)
    }

    const dbKey = getCleanDatabaseKey(options.spriteUrl || '')
    const cachedPoints = options.spriteUrl ? requireFeetPoints(dbKey) : null
    const newShadow = createCombatShadow(id, options, existing, cachedPoints)
    activeShadows.set(id, newShadow)
    return Promise.resolve(newShadow)
  }


  function hideShadow(id: string) {
    if (!id) return
    const shadow = activeShadows.get(id)
    if (shadow) {
      shadow.visible = false
    }
  }


  function clearAll() {
    activeShadows.clear()
  }

  return {
    activeShadows,
    isSolidShadows,
    toggleSolidShadows,
    detectFeetPoints,
    requestShadow,
    hideShadow,
    clearAll
  }
})
