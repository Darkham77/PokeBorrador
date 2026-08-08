import { defineStore } from 'pinia'
import { reactive } from 'vue'

const DEFAULT_COMBAT_SHADOW_ENTITY_SIZE_PX = 300
const DEFAULT_COMBAT_SHADOW_WIDTH_PCT = '70%'
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
}

export const useCombatShadowStore = defineStore('combatShadows', () => {
  const activeShadows = reactive(new Map<string, CombatShadow>())

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
    
    // Bloqueo de propiedad: Si ya tiene una sombra activa para este sprite, no le damos otra (Evitar parpadeos)
    if (existing && options.spriteUrl === existing.spriteUrl && !options.force) {
      // Solo actualizamos visibilidad si cambió, sin disparar todo el proceso de re-creación
      if (options.visible !== undefined && existing.visible !== options.visible) {
        existing.visible = options.visible
      }
      return Promise.resolve(existing)
    }

    // Obtener valores de la base de datos estática para evitar el salto inicial (Sync)
    const dbKey = getCleanDatabaseKey(options.spriteUrl || '')
    const cachedPoints = options.spriteUrl ? requireFeetPoints(dbKey) : null
    
    let feetY = options.feetY || (cachedPoints?.feetY ?? (existing?.feetY ?? 0.9))
    // Si es volador, ignoramos el valor detectado y forzamos el suelo
    if (options.isFlying) feetY = 0.9
    
    const feetX = options.feetX || (cachedPoints?.feetX ?? (existing?.feetX ?? 0.5))
    const visible = options.visible !== undefined ? options.visible : true

    // Guardamos/actualizamos la sombra inmediatamente para que sea visible
    const newShadow: CombatShadow = {
      id,
      side: options.side || 'generic',
      entityX: options.entityX ?? (existing?.entityX ?? 0),
      entityY: options.entityY ?? (existing?.entityY ?? 0),
      entitySize: options.entitySize ?? (existing?.entitySize ?? DEFAULT_COMBAT_SHADOW_ENTITY_SIZE_PX),
      width: options.width || (existing?.width ?? DEFAULT_COMBAT_SHADOW_WIDTH_PCT),
      isFlying: options.isFlying || false,
      feetY,
      feetX,
      spriteUrl: options.spriteUrl || existing?.spriteUrl || '',
      visible
    }
    
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
    detectFeetPoints,
    requestShadow,
    hideShadow,
    clearAll
  }
})
