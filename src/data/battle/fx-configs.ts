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
  ease?: string
}

export interface EffectSettings {
  shape: 'circle' | 'rect'
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

export const resolveEffectSettings = (typeKey: string, ar: number, options: { isField?: boolean, isSimplified?: boolean, isBattle?: boolean, spriteScale?: number } = {}): EffectSettings => {
  const isField = options.isField || ['reflect', 'lightscreen', 'safeguard', 'mist', 'spikes'].includes(typeKey)
  const isFeetEffect = ['seed', 'trapped', 'bound', 'ingrain', 'seeded'].includes(typeKey)
  const isHeadEffect = ['sleep', 'confusion', 'attract', 'confused'].includes(typeKey)

  // 1. Helper para rango dinámico basado en radio
  const getDynamicRange = (base: [number, number]) => {
    const baseRadius = options.isBattle ? ar / 1.5 : ar
    const ratio = baseRadius / 40
    let scaleFactor = Math.max(0.15, Math.min(2.5, Math.pow(ratio, 2)))

    if (options.spriteScale !== undefined) {
      scaleFactor *= options.spriteScale
    }
    
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
  const configs: Record<string, Partial<EffectSettings>> = {
    burn: { mult: 1.0, activeRange: getDynamicRange([12, 18]), useFade: false, duration: 1.2, randomizeVars: { min: 0.6, max: 2.0 } },
    freeze: { mult: 0.4, activeRange: getDynamicRange([1, 2]), useFade: false, duration: 3.0 , randomizeVars: { min: 1.0, max: 2.0 } },
    sleep: { mult: 1.0, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
    paralysis: { mult: 1.0, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 0.3, randomizeVars: { min: 1.0, max: 2.0 } },
    poison: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
    toxic: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 3.0 },
    confusion: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, wobble: true, duration: 6.0 },
    confused: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, wobble: true, duration: 6.0 },
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

    // Shiny - chispas doradas orbitales (técnica wobble)
    shiny: { mult: 0.2, activeRange: getDynamicRange([10, 16]), useFade: false, duration: 1.4, randomizeVars: { min: 0.6, max: 1.5 }, targetOpacity: 1.0, wobble: true }
  }

  const base = configs[typeKey] || { 
    mult: 0.5, 
    activeRange: getDynamicRange([2, 4]), 
    useFade: true, 
    duration: isField ? 3.0 : 1.5 
  }
  
  // 3. Parámetros de Wobble exactos
  let wobbleConfig: WobbleConfig | boolean = false
  if (typeKey === 'confusion' || typeKey === 'confused') {
    wobbleConfig = { x: 30, rotation: 10, duration: 0.12 }
  } else if (typeKey === 'attract' || typeKey === 'attraction') {
    wobbleConfig = { x: 15, rotation: 5, duration: 0.4 }
  } else if (typeKey === 'trapped') {
    wobbleConfig = { x: 5, rotation: 0, duration: 0.2 }
  } else if (typeKey === 'shiny') {
    wobbleConfig = { x: 0, rotation: 360, duration: 1.5, yoyo: false, ease: 'none' }
  }
  
  // 4. Área de dispersión
  const factor = (typeKey === 'paralysis') ? 1.3 : (isHeadEffect ? 0.4 : 1.0)
  const maxRadius = isField ? (typeKey === 'mist' ? 25 : 45) : ar * factor
  
  const area: ParticleArea = (isFeetEffect) 
    ? { x: [-40, 40], y: [0, 15] }
    : { x: [maxRadius * 0.2, maxRadius] }

  // 4. Offset dinámico exacto
  let offset: { x: number; y: number } = { x: 0, y: 0 }
  if (isHeadEffect) offset = { x: 0, y: -ar * 0.75 }
  else if (isFeetEffect) offset = { x: 0, y: ar * 0.35 }

  const isPrimary = ['burn', 'freeze', 'sleep', 'paralysis', 'poison', 'toxic'].includes(typeKey)
  const isTactical = ['protected', 'enduring', 'focus', 'lockon'].includes(typeKey)
  
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
