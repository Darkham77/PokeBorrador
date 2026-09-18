// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  resolveForcedMoveIndex,
  CONTROLS_DISABLED_STATES,
  AUTO_BATTLE_SUBSTATES,
  FINISH_OVERLAY_SEARCH_SUBSTATES
} from '@/components/battle/battleArenaControlsHelper'
import type { Pokemon } from '@/types/pokemon/pokemon'
import {
  hasExceededTouchThreshold,
  resolveDropSlotIndex
} from '@/components/battle/battleMovesTouchHelper'
import {
  isRainWeather,
  isLightningWeather,
  isSnowWeather,
  isSandstormWeather,
  isCanvasWeather,
  resolveSnowLayerClass,
  calculateLeafCount,
  resolveWeatherOverlayStyles
} from '@/components/common/atmosphereParticleHelper'
import {
  computeSandstormKinematics,
  computeSandstormSpeed,
  DUST_LAYER_ONE_DRIFT_X_PX,
  DUST_LAYER_TWO_DRIFT_X_PX
} from '@/components/common/atmosphereSandstormHelper'
import {
  computeSnowLayer1Config,
  computeSnowLayer2Config,
  computeHailLayer1Config,
  computeHailLayer2Config,
  SNOW_L1_BLIZZARD_DRIFT_X,
  SNOW_L2_BLIZZARD_DRIFT_X,
  SNOW_L1_BLIZZARD_DUR_SEC,
  SNOW_L1_NORMAL_DUR_SEC,
  SNOW_L2_BLIZZARD_DUR_SEC,
  HAIL_L1_BASE_DUR_SEC,
} from '@/components/common/atmosphereSnowHelper'
import {
  computeActiveWeights,
  parseWeatherDescription,
  formatTerrainTags,
  calculateFishingWeight,
  calculateArchaeologyWeight,
  type ExtendedMapLocation,
  ARCHAEOLOGY_CAVE_BASE_WEIGHT,
  ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT,
  EQUIPPED_TOOL_WEIGHT_BONUS,
  BASE_GROUND_WEIGHT,
} from '@/composables/modals/routeSpawnsCalculationHelper'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import {
  resolveActivityTerrainFeature,
  resolveSpecialRouteBonus,
  resolveClassRouteAction
} from '@/components/modals/spawns/routeSpawnsTerrainHelper'

function createMockPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'mock-poke-1',
    id: 'magikarp',
    name: 'Magikarp',
    level: 5,
    hp: 1,
    maxHp: 20,
    status: null,
    moves: [{ id: 'splash', name: 'Splash', pp: 40, maxPP: 40, type: 'normal' }],
    types: ['water'],
    type: 'water',
    stats: { hp: 20, atk: 10, def: 15, spa: 10, spd: 15, spe: 20 },
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    volatileCounters: {},
    ...overrides
  } as unknown as Pokemon
}

const EXPECTED_STORM_COUNT = 15
const EXPECTED_WIND_COUNT = 8

describe('Battle & Map Helpers Domain Suite', () => {
  describe('battleArenaControlsHelper', () => {
    describe('resolveForcedMoveIndex', () => {
      it('returns null when pokemon naturally has only 1 move and no volatile lock', () => {
        const poke = createMockPokemon()
        const reqMoves = [{ id: 'splash' }]
        const result = resolveForcedMoveIndex('WAIT_INPUT', false, poke, reqMoves)
        expect(result).toBeNull()
      })

      it('returns 0 when recharge is required via volatile', () => {
        const poke = createMockPokemon({
          volatileCounters: { mustrecharge: 1 }
        })
        const reqMoves = [{ id: 'recharge', move: 'Recharge' }]
        const result = resolveForcedMoveIndex('WAIT_INPUT', false, poke, reqMoves)
        expect(result).toBe(0)
      })

      it('returns locked move index when lockedmove volatile is present', () => {
        const poke = createMockPokemon({
          moves: [
            { id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35, type: 'normal' },
            { id: 'outrage', name: 'Outrage', pp: 10, maxPP: 10, type: 'dragon' }
          ],
          volatileCounters: { lockedmove: 1 },
          lastMove: { id: 'outrage' } as never
        })
        const reqMoves = [{ id: 'outrage' }]
        const result = resolveForcedMoveIndex('WAIT_INPUT', false, poke, reqMoves)
        expect(result).toBe(1)
      })

      it('returns null when multiple non-disabled moves are available and clears stale lockedmove', () => {
        const poke = createMockPokemon({
          moves: [
            { id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35, type: 'normal' },
            { id: 'splash', name: 'Splash', pp: 40, maxPP: 40, type: 'normal' }
          ],
          volatileCounters: { lockedmove: 1 }
        })
        const reqMoves = [{ id: 'tackle' }, { id: 'splash' }]
        const result = resolveForcedMoveIndex('WAIT_INPUT', false, poke, reqMoves)
        expect(result).toBeNull()
        expect(poke.volatileCounters?.['lockedmove']).toBeUndefined()
      })

      it('returns null if not in WAIT_INPUT or if isProcessing is true', () => {
        const poke = createMockPokemon({
          volatileCounters: { mustrecharge: 1 }
        })
        expect(resolveForcedMoveIndex('ACTIVE_BATTLE', false, poke)).toBeNull()
        expect(resolveForcedMoveIndex('WAIT_INPUT', true, poke)).toBeNull()
        expect(resolveForcedMoveIndex('WAIT_INPUT', false, null)).toBeNull()
      })
    })

    describe('constants', () => {
      it('exports read-only state sets', () => {
        expect(CONTROLS_DISABLED_STATES.has('INITIALIZING')).toBe(true)
        expect(AUTO_BATTLE_SUBSTATES.has('COMBAT_OR_FLEE')).toBe(true)
        expect(FINISH_OVERLAY_SEARCH_SUBSTATES.has('BUSH_VISIBLE')).toBe(true)
      })
    })
  })

  describe('battleMovesTouchHelper', () => {
    describe('hasExceededTouchThreshold', () => {
      it('returns true if deltaX exceeds threshold', () => {
        expect(hasExceededTouchThreshold(15, 2, 10)).toBe(true)
        expect(hasExceededTouchThreshold(-15, 2, 10)).toBe(true)
      })

      it('returns true if deltaY exceeds threshold', () => {
        expect(hasExceededTouchThreshold(2, 15, 10)).toBe(true)
        expect(hasExceededTouchThreshold(2, -15, 10)).toBe(true)
      })

      it('returns false when both deltas are within threshold', () => {
        expect(hasExceededTouchThreshold(5, 5, 10)).toBe(false)
        expect(hasExceededTouchThreshold(-5, 5, 10)).toBe(false)
      })
    })

    describe('resolveDropSlotIndex', () => {
      it('returns null if elementFromPoint returns null', () => {
        const original = document.elementFromPoint
        document.elementFromPoint = () => null

        const idx = resolveDropSlotIndex(100, 100, [])
        expect(idx).toBeNull()

        document.elementFromPoint = original
      })

      it('returns index if element is within move-slot-wrapper in refs', () => {
        const slotEl = document.createElement('div')
        slotEl.className = 'move-slot-wrapper'
        const childEl = document.createElement('button')
        slotEl.appendChild(childEl)

        const original = document.elementFromPoint
        document.elementFromPoint = () => childEl

        const idx = resolveDropSlotIndex(50, 50, [document.createElement('div'), slotEl])
        expect(idx).toBe(1)

        document.elementFromPoint = original
      })
    })
  })

  describe('atmosphereParticleHelper', () => {
    describe('weather predicates', () => {
      it('identifies rain and storm weathers', () => {
        expect(isRainWeather('rain')).toBe(true)
        expect(isRainWeather('storm')).toBe(true)
        expect(isRainWeather('heavy_rain')).toBe(true)
        expect(isRainWeather('thunderstorm')).toBe(true)
        expect(isRainWeather('clear')).toBe(false)
        expect(isRainWeather(undefined)).toBe(false)
      })

      it('identifies lightning weathers', () => {
        expect(isLightningWeather('storm')).toBe(true)
        expect(isLightningWeather('thunderstorm')).toBe(true)
        expect(isLightningWeather('rain')).toBe(false)
        expect(isLightningWeather(undefined)).toBe(false)
      })

      it('identifies snow and blizzard weathers', () => {
        expect(isSnowWeather('snow')).toBe(true)
        expect(isSnowWeather('blizzard')).toBe(true)
        expect(isSnowWeather('hail')).toBe(true)
        expect(isSnowWeather('rain')).toBe(false)
      })

      it('identifies sandstorm and dust storm weathers', () => {
        expect(isSandstormWeather('sandstorm')).toBe(true)
        expect(isSandstormWeather('strong_winds')).toBe(true)
        expect(isSandstormWeather('dust_storm')).toBe(true)
        expect(isSandstormWeather('clear')).toBe(false)
      })

      it('identifies canvas weathers', () => {
        expect(isCanvasWeather('fog')).toBe(true)
        expect(isCanvasWeather('mist')).toBe(true)
        expect(isCanvasWeather('wind')).toBe(true)
        expect(isCanvasWeather('strong_winds')).toBe(true)
        expect(isCanvasWeather('dust_storm')).toBe(true)
        expect(isCanvasWeather('sandstorm')).toBe(true)
        expect(isCanvasWeather('rain')).toBe(false)
      })
    })

    describe('resolveSnowLayerClass', () => {
      it('returns hail-layer for hail and snow-layer for others', () => {
        expect(resolveSnowLayerClass('hail')).toBe('hail-layer')
        expect(resolveSnowLayerClass('snow')).toBe('snow-layer')
        expect(resolveSnowLayerClass('blizzard')).toBe('snow-layer')
      })
    })

    describe('calculateLeafCount', () => {
      it('calculates storm and strong winds count', () => {
        expect(calculateLeafCount('storm')).toBe(EXPECTED_STORM_COUNT)
        expect(calculateLeafCount('strong_winds')).toBe(EXPECTED_STORM_COUNT)
      })

      it('calculates wind count', () => {
        expect(calculateLeafCount('wind')).toBe(EXPECTED_WIND_COUNT)
      })

      it('halves count in low power mode', () => {
        expect(calculateLeafCount('storm', true)).toBe(Math.round(EXPECTED_STORM_COUNT / 2))
        expect(calculateLeafCount('wind', true)).toBe(Math.round(EXPECTED_WIND_COUNT / 2))
      })

      it('returns zero for unrelated weathers', () => {
        expect(calculateLeafCount('rain')).toBe(0)
        expect(calculateLeafCount('clear')).toBe(0)
      })
    })

    describe('resolveWeatherOverlayStyles', () => {
      it('computes overlay css variables with defaults', () => {
        const styles = resolveWeatherOverlayStyles({
          animSeed: 0.5,
          direction: 1
        })

        expect(styles['--atmo-z-final']).toBe('var(--z-map-weather, 8)')
        expect(styles['--card-seed']).toBe(0.5)
        expect(styles['--card-speed']).toBe(1.1)
        expect(styles['--atmo-dir']).toBe(1)
        expect(styles['--seed-x']).toBe(50)
        expect(styles['--seed-y']).toBe(50)
      })

      it('applies explicit numeric and string zIndex values', () => {
        const numStyles = resolveWeatherOverlayStyles({
          zIndex: 10,
          animSeed: 0,
          direction: 0
        })
        expect(numStyles['--atmo-z-final']).toBe('calc(10 + 1)')

        const strStyles = resolveWeatherOverlayStyles({
          zIndex: '15',
          animSeed: 0,
          direction: 0
        })
        expect(strStyles['--atmo-z-final']).toBe('15')
      })
    })
  })

  describe('atmosphereSandstormHelper', () => {
    describe('computeSandstormKinematics', () => {
      it('computes bounded seed offsets for layers 1 and 2', () => {
        const k = computeSandstormKinematics(0.5)
        expect(k.s1X).toBeGreaterThanOrEqual(0)
        expect(k.s1X).toBeLessThan(64)
        expect(k.s1Y).toBeGreaterThanOrEqual(0)
        expect(k.s1Y).toBeLessThan(64)
        expect(k.s2X).toBeGreaterThanOrEqual(0)
        expect(k.s2X).toBeLessThan(128)
        expect(k.s2Y).toBeGreaterThanOrEqual(0)
        expect(k.s2Y).toBeLessThan(128)
      })
    })

    describe('computeSandstormSpeed', () => {
      it('computes layer 1 speed adjusted by weather multiplier', () => {
        const speedWind = computeSandstormSpeed(0.5, 'strong_winds', 1.0, 1)
        const speedDust = computeSandstormSpeed(0.5, 'dust_storm', 1.0, 1)
        const speedSand = computeSandstormSpeed(0.5, 'sandstorm', 1.0, 1)

        expect(speedDust).toBeGreaterThan(speedWind)
        expect(speedWind).toBeGreaterThan(speedSand)
      })

      it('computes layer 2 speed adjusted by weather multiplier', () => {
        const speedWind = computeSandstormSpeed(0.5, 'strong_winds', 1.0, 2)
        const speedDust = computeSandstormSpeed(0.5, 'dust_storm', 1.0, 2)

        expect(speedDust).toBeGreaterThan(speedWind)
      })
    })

    describe('constants', () => {
      it('has expected negative drift values', () => {
        expect(DUST_LAYER_ONE_DRIFT_X_PX).toBe(-512)
        expect(DUST_LAYER_TWO_DRIFT_X_PX).toBe(-512)
      })
    })
  })

  describe('atmosphereSnowHelper', () => {
    describe('computeSnowLayer1Config', () => {
      it('computes blizzard parameters with negative x drift and fast duration', () => {
        const config = computeSnowLayer1Config(0.5, true, 1.0)
        expect(config.driftX).toBe(SNOW_L1_BLIZZARD_DRIFT_X)
        expect(config.duration).toBe(SNOW_L1_BLIZZARD_DUR_SEC)
        expect(config.boundary).toBe(256)
        expect(config.sX).toBeGreaterThanOrEqual(0)
      })

      it('computes normal snow parameters with zero x drift and gentle duration', () => {
        const config = computeSnowLayer1Config(0.5, false, 1.0)
        expect(config.driftX).toBe(0)
        expect(config.duration).toBe(SNOW_L1_NORMAL_DUR_SEC)
      })
    })

    describe('computeSnowLayer2Config', () => {
      it('computes layer 2 blizzard parameters with negative x drift and tile boundary', () => {
        const config = computeSnowLayer2Config(0.3, true, 1.5)
        expect(config.driftX).toBe(SNOW_L2_BLIZZARD_DRIFT_X)
        expect(config.duration).toBeCloseTo(SNOW_L2_BLIZZARD_DUR_SEC / 1.5)
        expect(config.boundary).toBe(128)
      })
    })

    describe('computeHailLayer1Config', () => {
      it('computes hail layer 1 kinematic seed and duration', () => {
        const config = computeHailLayer1Config(0.4, 2.0)
        expect(config.duration).toBeCloseTo(HAIL_L1_BASE_DUR_SEC / 2.0)
        expect(config.sX).toBeGreaterThanOrEqual(0)
        expect(config.sY).toBeGreaterThanOrEqual(0)
      })
    })

    describe('computeHailLayer2Config', () => {
      it('computes hail layer 2 kinematic seed and animSeed variation', () => {
        const config = computeHailLayer2Config(0.7, 0.5)
        expect(config.duration).toBeGreaterThan(0)
        expect(config.sX).toBeGreaterThanOrEqual(0)
        expect(config.sY).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('routeSpawnsCalculationHelper', () => {
    describe('calculateFishingWeight', () => {
      it('returns 0 when map has no fishing', () => {
        const res = calculateFishingWeight(false, 'clear', false)
        expect(res).toEqual({ active: 0, base: 0 })
      })

      it('calculates boosted weight on rainy weather and equipped rod', () => {
        const res = calculateFishingWeight(true, 'rain' as WeatherId, true, 1.5)
        expect(res.base).toBeGreaterThan(0)
        expect(res.active).toBeGreaterThan(res.base)
        expect(res.active).toBeGreaterThan(EQUIPPED_TOOL_WEIGHT_BONUS)
      })
    })

    describe('calculateArchaeologyWeight', () => {
      it('returns 0 when map has no archaeology', () => {
        const res = calculateArchaeologyWeight(false, true, false, false)
        expect(res).toEqual({ active: 0, base: 0 })
      })

      it('returns cave base weight and tool bonus when equipped', () => {
        const res = calculateArchaeologyWeight(true, true, false, true)
        expect(res.base).toBe(ARCHAEOLOGY_CAVE_BASE_WEIGHT)
        expect(res.active).toBe(ARCHAEOLOGY_CAVE_BASE_WEIGHT + EQUIPPED_TOOL_WEIGHT_BONUS)
      })

      it('returns mountain base weight when mountain', () => {
        const res = calculateArchaeologyWeight(true, false, true, false)
        expect(res.base).toBe(ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT)
        expect(res.active).toBe(ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT)
      })
    })

    const createMockLocation = (overrides: Partial<ExtendedMapLocation> = {}): ExtendedMapLocation => ({
      id: 'route1',
      name: 'Route 1',
      lv: [1, 5],
      ...overrides,
    } as unknown as ExtendedMapLocation)

    describe('computeActiveWeights', () => {
      it('computes ground weight only when no fishing or archaeology', () => {
        const map = createMockLocation()
        const res = computeActiveWeights(map, 'clear' as WeatherId, false, false)
        expect(res.ground).toBe(BASE_GROUND_WEIGHT)
        expect(res.fishing).toBe(0)
        expect(res.archaeology).toBe(0)
        expect(res.total).toBe(BASE_GROUND_WEIGHT)
      })
    })

    describe('parseWeatherDescription', () => {
      it('returns empty array when desc is empty', () => {
        expect(parseWeatherDescription('')).toEqual([])
      })

      it('parses boost prefix and identifies types', () => {
        const desc = 'POTENCIA: Movimientos de tipo Fuego.'
        const res = parseWeatherDescription(desc)
        expect(res.length).toBe(1)
        expect(res[0]?.typeClass).toBe('boost')
        expect(res[0]?.icon).toBe('▲ ')
        expect(res[0]?.label).toBe('POTENCIA:')
        const fuegoSegment = res[0]?.segments.find(s => s.type === 'fire')
        expect(fuegoSegment).toBeDefined()
        expect(fuegoSegment?.isType).toBe(true)
      })

      it('parses debuff prefix and identifies types', () => {
        const desc = 'DEBILITA: Ataques de tipo Agua.'
        const res = parseWeatherDescription(desc)
        expect(res.length).toBe(1)
        expect(res[0]?.typeClass).toBe('debuff')
        expect(res[0]?.icon).toBe('▼ ')
        const aguaSegment = res[0]?.segments.find(s => s.type === 'water')
        expect(aguaSegment).toBeDefined()
      })
    })

    describe('formatTerrainTags', () => {
      it('formats single and multiple terrain tags', () => {
        const map = createMockLocation({
          isCave: true,
          isMountain: true,
        })
        expect(formatTerrainTags(map)).toBe('🧗 Cueva, ⛰️ Montaña')
      })

      it('defaults to Exterior when no specific terrain flags are set', () => {
        const map = createMockLocation()
        expect(formatTerrainTags(map)).toBe('🌲 Exterior')
      })
    })
  })

  describe('routeSpawnsTerrainHelper', () => {
    describe('resolveActivityTerrainFeature', () => {
      it('returns available feature details when activity is defined', () => {
        const feat = resolveActivityTerrainFeature({ lv: [10, 20] }, 35, 30, '🎣')
        expect(feat.isAvailable).toBe(true)
        expect(feat.levelText).toBe('Nv. 10-20')
        expect(feat.emoji).toBe('🎣')
      })

      it('returns unavailable when activity is undefined', () => {
        const feat = resolveActivityTerrainFeature(undefined, 0, 0, '⛏️')
        expect(feat.isAvailable).toBe(false)
        expect(feat.fallbackText).toBe('No disponible')
      })
    })

    describe('resolveSpecialRouteBonus', () => {
      it('returns official route bonus', () => {
        const bonus = resolveSpecialRouteBonus(true, false, '10m')
        expect(bonus?.type).toBe('official')
        expect(bonus?.label).toContain('Ruta Oficial')
        expect(bonus?.description).toContain('+1 REP')
      })

      it('returns extorted route bonus', () => {
        const bonus = resolveSpecialRouteBonus(false, true, '5m')
        expect(bonus?.type).toBe('extorted')
        expect(bonus?.label).toContain('Extorsionada')
        expect(bonus?.description).toContain('x1.5 ₽')
      })

      it('returns null when no special route bonus is active', () => {
        expect(resolveSpecialRouteBonus(false, false, '')).toBeNull()
      })
    })

    describe('resolveClassRouteAction', () => {
      it('returns entrenador cooldown tag when on cooldown', () => {
        const action = resolveClassRouteAction({
          playerClass: 'entrenador',
          isOfficialActive: false,
          isOfficialCooldown: true,
          cooldownText: '12m',
          isExtortedActive: false,
          extortedOtherRoute: false
        })
        expect(action?.kind).toBe('cooldown')
        expect(action?.text).toContain('Cooldown Oficial: 12m')
      })

      it('returns entrenador button when available and not active', () => {
        const action = resolveClassRouteAction({
          playerClass: 'entrenador',
          isOfficialActive: false,
          isOfficialCooldown: false,
          cooldownText: '',
          isExtortedActive: false,
          extortedOtherRoute: false
        })
        expect(action?.kind).toBe('button-official')
        expect(action?.text).toContain('MARCAR RUTA OFICIAL')
      })

      it('returns rocket cooldown tag when other route is extorted today', () => {
        const action = resolveClassRouteAction({
          playerClass: 'rocket',
          isOfficialActive: false,
          isOfficialCooldown: false,
          cooldownText: '',
          isExtortedActive: false,
          extortedOtherRoute: true
        })
        expect(action?.kind).toBe('cooldown')
        expect(action?.text).toContain('Ya extorsionaste otra ruta hoy')
      })

      it('returns rocket button when can extort', () => {
        const action = resolveClassRouteAction({
          playerClass: 'rocket',
          isOfficialActive: false,
          isOfficialCooldown: false,
          cooldownText: '',
          isExtortedActive: false,
          extortedOtherRoute: false
        })
        expect(action?.kind).toBe('button-extort')
        expect(action?.text).toContain('EXTORSIONAR RUTA')
      })
    })
  })
})
