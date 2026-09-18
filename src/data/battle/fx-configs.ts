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
  ease?: string // domain-ok: Open dynamic text or non-domain string payload
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

export interface ResolveEffectOptions {
  isField?: boolean
  isSimplified?: boolean
  isBattle?: boolean
  spriteScale?: number
  pokeScale?: number
}

const SHINY_THUMBNAIL_SCALE_FACTOR = 0.3 as const
const HEAD_EFFECT_RADIUS_FACTOR = 0.4 as const
const HEAD_EFFECT_Y_OFFSET_FACTOR = -0.75 as const
const FEET_EFFECT_Y_OFFSET_FACTOR = 0.35 as const
const FIELD_MIST_MAX_RADIUS = 25 as const
const FIELD_DEFAULT_MAX_RADIUS = 45 as const
const SHINY_MINI_MULT = 0.35 as const
const SHINY_BATTLE_MULT = 0.45 as const
const BATTLE_AR_DIVISOR = 1.25 as const
const BASE_AR_SCALE_NORM = 40 as const

const FIELD_EFFECT_KEYS_SET: ReadonlySet<string> = new Set(['reflect', 'lightscreen', 'safeguard', 'mist', 'spikes', 'stealthrock', 'toxicspikes']) // runtime-set: Fast O(1) membership lookup set
const FEET_EFFECTS_SET: ReadonlySet<string> = new Set(['seed', 'trapped', 'bound', 'ingrain', 'seeded', 'ingrained']) // runtime-set: Fast O(1) membership lookup set
const HEAD_EFFECTS_SET: ReadonlySet<string> = new Set(['sleep', 'confusion', 'attract', 'confused', 'slp', 'perishsong']) // runtime-set: Fast O(1) membership lookup set
const PRIMARY_STATUS_SET: ReadonlySet<string> = new Set(['brn', 'frz', 'slp', 'par', 'psn', 'tox']) // runtime-set: Fast O(1) membership lookup set
const TACTICAL_STATUS_SET: ReadonlySet<string> = new Set(['protected', 'enduring', 'focus', 'lockon']) // runtime-set: Fast O(1) membership lookup set

interface StaticEffectConfig {
  mult: number
  baseRange: readonly [number, number]
  useFade: boolean
  duration: number
  randomizeVars?: boolean | { min: number; max: number }
  growDuration?: number
  wobble?: boolean
  targetOpacity?: number
}

const STATIC_EFFECT_CONFIGS: Record<string, StaticEffectConfig> = { // open-record: Generic key-value data dictionary container
  brn: { mult: 1.0, baseRange: [12, 18], useFade: false, duration: 1.2, randomizeVars: { min: 0.6, max: 2.0 } },
  frz: { mult: 0.4, baseRange: [4, 6], useFade: false, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
  slp: { mult: 1.0, baseRange: [1, 2], useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
  par: { mult: 1.0, baseRange: [6, 10], useFade: true, duration: 0.3, randomizeVars: { min: 1.0, max: 2.0 } },
  psn: { mult: 0.8, baseRange: [4, 6], useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
  tox: { mult: 0.8, baseRange: [4, 6], useFade: true, duration: 3.0 },
  confusion: { mult: 0.8, baseRange: [1, 2], useFade: true, wobble: true, duration: 6.0 },
  confused: { mult: 0.8, baseRange: [1, 2], useFade: true, wobble: true, duration: 6.0 },
  taunted: { mult: 1.0, baseRange: [1, 2], useFade: true, duration: 1.5 },
  substitute: { mult: 1.2, baseRange: [1, 1], useFade: false, duration: 2.0 },
  flinched: { mult: 1.0, baseRange: [2, 3], useFade: true, duration: 0.8 },
  disabled: { mult: 0.9, baseRange: [1, 2], useFade: true, duration: 2.5 },
  encored: { mult: 0.9, baseRange: [1, 2], useFade: true, duration: 2.0 },
  perishsong: { mult: 0.9, baseRange: [1, 2], useFade: true, duration: 2.0 },
  attracted: { mult: 0.8, baseRange: [4, 6], useFade: true, duration: 4.0, randomizeVars: { min: 1.0, max: 2.0 } },
  cursed: { mult: 0.8, baseRange: [2, 3], useFade: true, duration: 3.0 },
  seeded: { mult: 0.8, baseRange: [6, 10], useFade: true, duration: 5.0, randomizeVars: true },
  seed: { mult: 0.8, baseRange: [6, 10], useFade: true, duration: 5.0, randomizeVars: true },
  trapped: { mult: 1.4, baseRange: [6, 10], useFade: true, duration: 5.0, growDuration: 0.5, randomizeVars: true },
  ingrained: { mult: 0.8, baseRange: [6, 10], useFade: true, duration: 1.5, randomizeVars: true },
  protected: { mult: 1.0, baseRange: [4, 6], useFade: true, duration: 1.5 },
  enduring: { mult: 1.6, baseRange: [1, 1], useFade: false, duration: 1.2, growDuration: 0.3 },
  focus: { mult: 1.0, baseRange: [1, 1], useFade: false, duration: 0.8, growDuration: 0.2 },
  lockon: { mult: 1.0, baseRange: [1, 1], useFade: false, duration: 1.0, growDuration: 0.25 },
  reflect: { mult: 1.5, baseRange: [1, 1], useFade: true, duration: 4.0, targetOpacity: 1.0 },
  safeguard: { mult: 0.5, baseRange: [1, 3], useFade: true, duration: 3.0, targetOpacity: 1.0 },
  lightscreen: { mult: 1.5, baseRange: [1, 1], useFade: true, duration: 3.0, targetOpacity: 1.0 },
  mist: { mult: 1.5, baseRange: [14, 20], useFade: true, duration: 5.0, randomizeVars: { min: 0.6, max: 2.5 }, targetOpacity: 0.9 },
  spikes: { mult: 0.5, baseRange: [4, 8], useFade: true, duration: 2.5 },
  stealthrock: { mult: 0.6, baseRange: [3, 5], useFade: true, duration: 3.0, targetOpacity: 0.9 },
  toxicspikes: { mult: 0.5, baseRange: [4, 8], useFade: true, duration: 2.5, targetOpacity: 0.9 },
  shiny: { mult: 0.35, baseRange: [8, 14], useFade: true, duration: 1.2, randomizeVars: { min: 0.6, max: 1.4 }, targetOpacity: 1.0, wobble: false }
}

const FALLBACK_EFFECT_CONFIG: StaticEffectConfig = {
  mult: 0.5,
  baseRange: [2, 4],
  useFade: true,
  duration: 1.5
}

function resolveScaleFactor(typeKey: string, ar: number, options: ResolveEffectOptions): number {
  let scaleFactor = options.pokeScale !== undefined 
    ? Math.min(1.0, Math.max(0.18, options.pokeScale))
    : Math.max(0.15, Math.min(2.5, Math.pow((options.isBattle ? ar / BATTLE_AR_DIVISOR : ar) / BASE_AR_SCALE_NORM, 2)))

  if (typeKey === 'shiny' && (options.isSimplified || !options.isBattle)) {
    scaleFactor *= SHINY_THUMBNAIL_SCALE_FACTOR
  }

  return scaleFactor
}

function computeDynamicRange(baseRange: readonly [number, number], scaleFactor: number): [number, number] {
  return [
    Math.max(1, Math.round(baseRange[0] * scaleFactor)),
    Math.max(1, Math.round(baseRange[1] * scaleFactor))
  ]
}

function resolveWobbleConfig(typeKey: string): WobbleConfig | boolean {
  if (typeKey === 'confusion' || typeKey === 'confused') {
    return { x: 30, rotation: 10, duration: 0.12 }
  }
  if (typeKey === 'attract' || typeKey === 'attraction') {
    return { x: 15, rotation: 5, duration: 0.4 }
  }
  if (typeKey === 'trapped') {
    return { x: 5, rotation: 0, duration: 0.2 }
  }
  return false
}

function resolveEffectAreaAndOffset(
  typeKey: string, // domain-ok: Open dynamic text or non-domain string payload
  ar: number,
  isField: boolean,
  isFeetEffect: boolean,
  isHeadEffect: boolean,
): { area: ParticleArea; offset: { x: number; y: number } } {
  const factor = isHeadEffect ? HEAD_EFFECT_RADIUS_FACTOR : 1.0
  const maxRadius = isField ? (typeKey === 'mist' ? FIELD_MIST_MAX_RADIUS : FIELD_DEFAULT_MAX_RADIUS) : ar * factor

  const area: ParticleArea = isFeetEffect
    ? { x: [-40, 40], y: [0, 15] }
    : { x: [maxRadius * 0.2, maxRadius] }

  let offset: { x: number; y: number } = { x: 0, y: 0 }
  if (isHeadEffect) {
    offset = { x: 0, y: ar * HEAD_EFFECT_Y_OFFSET_FACTOR }
  } else if (isFeetEffect) {
    offset = { x: 0, y: ar * FEET_EFFECT_Y_OFFSET_FACTOR }
  }

  return { area, offset }
}

export const resolveEffectSettings = (
  typeKey: string, // domain-ok: Open dynamic text or non-domain string payload
  ar: number,
  options: ResolveEffectOptions = {},
): EffectSettings => {
  const isField = Boolean(options.isField || FIELD_EFFECT_KEYS_SET.has(typeKey))
  const isFeetEffect = FEET_EFFECTS_SET.has(typeKey)
  const isHeadEffect = HEAD_EFFECTS_SET.has(typeKey)

  const scaleFactor = resolveScaleFactor(typeKey, ar, options)
  const staticConfig = STATIC_EFFECT_CONFIGS[typeKey] ?? {
    ...FALLBACK_EFFECT_CONFIG,
    duration: isField ? 3.0 : 1.5
  }

  const activeRange = computeDynamicRange(staticConfig.baseRange, scaleFactor)
  const wobbleConfig = resolveWobbleConfig(typeKey)
  const { area, offset } = resolveEffectAreaAndOffset(typeKey, ar, isField, isFeetEffect, isHeadEffect)

  const isPrimary = PRIMARY_STATUS_SET.has(typeKey)
  const isTactical = TACTICAL_STATUS_SET.has(typeKey)

  const targetOpacity = staticConfig.targetOpacity ?? (isField ? 0.6 : 1.0)
  const duration = staticConfig.duration || (isField ? 2.0 : (isTactical ? 1.2 : 0.8))

  let mult = staticConfig.mult || 0.5
  if (typeKey === 'shiny' && (options.isSimplified || !options.isBattle)) {
    mult = SHINY_MINI_MULT
  } else if (typeKey === 'shiny') {
    mult = SHINY_BATTLE_MULT
  }

  return {
    shape: isFeetEffect ? 'rect' : 'circle',
    area,
    offset,
    activeRange,
    mult,
    useFade: staticConfig.useFade ?? true,
    wobble: wobbleConfig,
    stagger: 0,
    duration,
    targetOpacity,
    randomizeVars: staticConfig.randomizeVars ?? isPrimary,
    growDuration: staticConfig.growDuration
  }
}
