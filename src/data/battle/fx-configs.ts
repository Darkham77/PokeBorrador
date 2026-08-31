/**
 * fx-configs.ts
 * Centraliza las reglas visuales para todos los efectos de partículas.
 * MIGRACIÓN 1:1 DESDE PVSPRITEFX.VUE
 */

export interface ParticleArea {
  x: [number, number]
  y?: [number, number]
}

export interface WobbleConfig {
  x: number
  rotation: number
  duration: number
  yoyo?: boolean
  ease?: string // domain-ok
}

export type ParticleShape = 'circle' | 'rect';

export interface EffectSettings {
  shape: ParticleShape
  area: ParticleArea
  offset: { x: number; y: number }
  activeRange: [number, number]
  mult: number
  useFade: boolean
  wobble: WobbleConfig | boolean
  stagger: number
  duration?: number
  targetOpacity?: number
  randomizeVars?: boolean | { min: number, max: number }
  growDuration?: number
  rotation?: number
}

type EffectConfigPreset = {
  mult: number
  activeRange: [number, number]
  useFade: boolean
  duration: number
  targetOpacity?: number
  stagger?: number
  randomizeVars?: boolean | { min: number, max: number }
  growDuration?: number
  wobble?: boolean
}

const FIELD_EFFECT_KEYS_SET: ReadonlySet<string> = new Set(['reflect', 'lightscreen', 'safeguard', 'mist', 'spikes']) // runtime-set
const FEET_EFFECTS_SET: ReadonlySet<string> = new Set(['seed', 'trapped', 'bound', 'ingrain', 'seeded', 'ingrained']) // runtime-set
const HEAD_EFFECTS_SET: ReadonlySet<string> = new Set(['sleep', 'confusion', 'attract', 'confused', 'slp', 'perishsong']) // runtime-set
const PRIMARY_STATUS_SET: ReadonlySet<string> = new Set(['brn', 'frz', 'slp', 'par', 'psn', 'tox']) // runtime-set
const TACTICAL_STATUS_SET: ReadonlySet<string> = new Set(['protected', 'enduring', 'focus', 'lockon']) // runtime-set

export const resolveEffectSettings = (typeKey: string, ar: number, options: { isField?: boolean, isSimplified?: boolean, isBattle?: boolean, spriteScale?: number, pokeScale?: number } = {}): EffectSettings => {
  const isField = options.isField || FIELD_EFFECT_KEYS_SET.has(typeKey)
  const isFeetEffect = FEET_EFFECTS_SET.has(typeKey)
  const isHeadEffect = HEAD_EFFECTS_SET.has(typeKey)

  // 1. Helper para rango dinámico basado en radio y tamaño del Pokémon
  const getDynamicRange = (base: [number, number]) => {
    let scaleFactor = options.pokeScale !== undefined 
      ? Math.min(1.0, Math.max(0.18, options.pokeScale))
      : Math.max(0.15, Math.min(2.5, Math.pow((options.isBattle ? ar / 1.25 : ar) / 40, 2)))

    // Reducción extra para miniaturas (fuera de batalla o modo simplificado)
    if (typeKey === 'shiny' && (options.isSimplified || !options.isBattle)) {
      scaleFactor *= 0.3
    }

    return [
      Math.max(1, Math.round(base[0] * scaleFactor)),
      Math.max(1, Math.round(base[1] * scaleFactor))
    ] as [number, number]
  }

  // 2. CONFIGURACIÓN CENTRALIZADA E INDEPENDIENTE
  const configs: Record<string, EffectConfigPreset> = { // open-record
    brn: { mult: 1.0, activeRange: getDynamicRange([12, 18]), useFade: false, duration: 1.2, randomizeVars: { min: 0.6, max: 2.0 } },
    frz: { mult: 0.4, activeRange: getDynamicRange([4, 6]), useFade: false, duration: 3.0 , randomizeVars: { min: 1.0, max: 2.0 } },
    slp: { mult: 1.0, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
    par: { mult: 1.0, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 0.3, randomizeVars: { min: 1.0, max: 2.0 } },
    psn: { mult: 0.8, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
    tox: { mult: 0.8, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 3.0 },
    confusion: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, wobble: true, duration: 6.0 },
    confused: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, wobble: true, duration: 6.0 },
    taunted: { mult: 1.0, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 1.5 },
    substitute: { mult: 1.2, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 2.0 },
    flinched: { mult: 1.0, activeRange: getDynamicRange([2, 3]), useFade: true, duration: 0.8 },
    disabled: { mult: 0.9, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 2.5 },
    encored: { mult: 0.9, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 2.0 },
    perishsong: { mult: 0.9, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 2.0 },
    attracted: { mult: 0.8, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 4.0, randomizeVars: { min: 1.0, max: 2.0 } },
    cursed: { mult: 0.8, activeRange: getDynamicRange([2, 3]), useFade: true, duration: 3.0 },
    seeded: { mult: 0.8, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 5.0, randomizeVars: true },
    seed: { mult: 0.8, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 5.0, randomizeVars: true },
    trapped: { mult: 1.4, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 5.0, growDuration: 0.5, randomizeVars: true },
    ingrained: { mult: 0.8, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 1.5, randomizeVars: true },
    
    // Tactical
    protected: { mult: 1.0, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 1.5 },
    enduring: { mult: 1.6, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 1.2, growDuration: 0.3 },
    focus: { mult: 1.0, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 0.8, growDuration: 0.2 },
    lockon: { mult: 1.0, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 1.0, growDuration: 0.25 },

    // Field
    reflect: { mult: 1.5, activeRange: getDynamicRange([1, 1]), useFade: true, duration: 4.0, targetOpacity: 1.0 },
    safeguard: { mult: 0.5, activeRange: getDynamicRange([1, 3]), useFade: true, duration: 3.0 , targetOpacity: 1.0 },
    lightscreen: { mult: 1.5, activeRange: getDynamicRange([1, 1]), useFade: true, duration: 3.0, targetOpacity: 1.0 },
    mist: { mult: 1.5, activeRange: getDynamicRange([14, 20]), useFade: true, duration: 5.0, randomizeVars: { min: 0.6, max: 2.5 }, targetOpacity: 0.9 },
    spikes: { mult: 0.5, activeRange: getDynamicRange([4, 8]), useFade: true, duration: 2.5 },

    // Shiny - chispas doradas en radio circular completo del pokemon
    shiny: { mult: 0.35, activeRange: getDynamicRange([8, 14]), useFade: true, duration: 1.2, randomizeVars: { min: 0.6, max: 1.4 }, targetOpacity: 1.0, wobble: false }
  }

  const fallbackConfig: EffectConfigPreset = { 
    mult: 0.5, 
    activeRange: getDynamicRange([2, 4]), 
    useFade: true, 
    duration: isField ? 3.0 : 1.5 
  }
  const base = configs[typeKey] ?? fallbackConfig
  
  // 3. Parámetros de Wobble exactos
  let wobbleConfig: WobbleConfig | boolean = false
  if (typeKey === 'confusion' || typeKey === 'confused') {
    wobbleConfig = { x: 30, rotation: 10, duration: 0.12 }
  } else if (typeKey === 'attract' || typeKey === 'attraction') {
    wobbleConfig = { x: 15, rotation: 5, duration: 0.4 }
  } else if (typeKey === 'trapped') {
    wobbleConfig = { x: 5, rotation: 0, duration: 0.2 }
  }
  
  // 4. Área de dispersión
  const factor = isHeadEffect ? 0.4 : 1.0
  const maxRadius = isField ? (typeKey === 'mist' ? 25 : 45) : ar * factor
  
  const area: ParticleArea = (isFeetEffect) 
    ? { x: [-40, 40], y: [0, 15] }
    : { x: [maxRadius * 0.2, maxRadius] }

  // 4. Offset dinámico exacto
  let offset: { x: number; y: number } = { x: 0, y: 0 }
  if (isHeadEffect) offset = { x: 0, y: -ar * 0.75 }
  else if (isFeetEffect) offset = { x: 0, y: ar * 0.35 }

  const isPrimary = PRIMARY_STATUS_SET.has(typeKey)
  const isTactical = TACTICAL_STATUS_SET.has(typeKey)
  
  const targetOpacity = base.targetOpacity ?? (isField ? 0.6 : (isTactical ? 1.0 : 1.0))
  const duration = base.duration || (isField ? 2.0 : (isTactical ? 1.2 : 0.8))

  const result: EffectSettings = {
    shape: isFeetEffect ? 'rect' : 'circle',
    area,
    offset,
    activeRange: base.activeRange || [2, 4],
    mult: base.mult || 0.5,
    useFade: base.useFade ?? true,
    wobble: wobbleConfig,
    stagger: base.stagger || 0,
    duration,
    targetOpacity,
    randomizeVars: base.randomizeVars ?? isPrimary,
    growDuration: base.growDuration
  }

  // Ajustes finales dinámicos para Shiny
  if (typeKey === 'shiny' && (options.isSimplified || !options.isBattle)) {
    result.mult = 0.35
  } else if (typeKey === 'shiny') {
    result.mult = 0.45
  }

  return result
}
