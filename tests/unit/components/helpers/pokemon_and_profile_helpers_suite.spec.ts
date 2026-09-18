import { describe, it, expect } from 'vitest'
import {
  resolveBoxCardClasses,
  resolveComputedTypePillSize,
  resolveCardAuraClass
} from '@/components/box/boxPokemonCardHelper'
import type { Pokemon } from '@/types/pokemon/pokemon'
import {
  getHpClass,
  calculateHpData,
  resolveCardStatusIndicators,
  resolveVisibleCardActions,
  resolvePokemonCardClasses
} from '@/components/pokemon/pokemonDisplayCardHelper'
import {
  getCategoryDescription,
  formatRange,
  resolveTrophyDisplayData,
  resolveDimensionTooltipTitle,
  resolveDimensionTooltipDesc,
  resolveDimensionDisplayValue,
  type PhysicalData
} from '@/components/pokemon-detail/pokemonSummaryHelper'
import {
  hexToRgb,
  resolveSpinConfig,
  resolveShadowConfig,
  DEFAULT_WHITE_RGB_STRING,
  REVERSE_ROTATION_DEG,
  SHADOW_CONFIGS,
} from '@/components/profile/trainerAvatarAnimHelper'
import { FULL_ROTATION_DEG } from '@/logic/constants/animations'

function createMockPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'mock-1',
    id: 'pikachu',
    name: 'Pikachu',
    level: 25,
    hp: 50,
    maxHp: 50,
    status: null,
    types: ['electric'],
    type: 'electric',
    stats: { hp: 50, atk: 40, def: 30, spa: 50, spd: 40, spe: 90 },
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: [],
    ...overrides
  } as unknown as Pokemon
}

describe('Pokemon & Profile Helpers Domain Suite', () => {
  describe('boxPokemonCardHelper', () => {
    describe('resolveBoxCardClasses', () => {
      it('returns base classes for default state', () => {
        const pokemon = createMockPokemon()
        const classes = resolveBoxCardClasses({
          isSelected: false,
          selectionType: null,
          numBadges: 0,
          isPerformanceActive: false,
          isPremium: false,
          pokemon
        })

        expect(classes.selected).toBe(false)
        expect(classes['with-badges']).toBe(false)
        expect(classes['many-badges']).toBe(false)
        expect(classes['performance-mode']).toBe(false)
        expect(classes['is-premium-tier']).toBe(false)
        expect(classes['is-busy']).toBe(false)
      })

      it('computes active flags and busy state', () => {
        const pokemon = createMockPokemon({ onMission: true })
        const classes = resolveBoxCardClasses({
          isSelected: true,
          selectionType: 'team',
          numBadges: 4,
          isPerformanceActive: true,
          isPremium: true,
          pokemon
        })

        expect(classes.selected).toBe(true)
        expect(classes['mode-team']).toBe(true)
        expect(classes['with-badges']).toBe(true)
        expect(classes['many-badges']).toBe(true)
        expect(classes['performance-mode']).toBe(true)
        expect(classes['is-premium-tier']).toBe(true)
        expect(classes['is-on-mission']).toBe(true)
        expect(classes['is-busy']).toBe(true)
      })
    })

    describe('resolveComputedTypePillSize', () => {
      it('returns ssm for dual-type pokemon', () => {
        const dual = createMockPokemon({ type: 'grass', type2: 'poison' })
        expect(resolveComputedTypePillSize(dual, 'sm')).toBe('ssm')
      })

      it('returns default size for single-type pokemon', () => {
        const single = createMockPokemon({ type: 'electric' })
        expect(resolveComputedTypePillSize(single, 'sm')).toBe('sm')
      })
    })

    describe('resolveCardAuraClass', () => {
      it('returns aura class when aura is present and performance mode is disabled', () => {
        expect(resolveCardAuraClass('flame', false)).toBe('aura-flame-mini')
      })

      it('returns empty string when performance mode is active or aura is missing', () => {
        expect(resolveCardAuraClass('flame', true)).toBe('')
        expect(resolveCardAuraClass(undefined, false)).toBe('')
      })
    })
  })

  describe('pokemonDisplayCardHelper', () => {
    describe('getHpClass', () => {
      it('returns hp-high when ratio is greater than 0.5', () => {
        expect(getHpClass(0.8)).toBe('hp-high')
        expect(getHpClass(0.51)).toBe('hp-high')
      })

      it('returns hp-mid when ratio is between 0.25 and 0.5 inclusive', () => {
        expect(getHpClass(0.5)).toBe('hp-mid')
        expect(getHpClass(0.3)).toBe('hp-mid')
        expect(getHpClass(0.26)).toBe('hp-mid')
      })

      it('returns hp-low when ratio is 0.25 or below', () => {
        expect(getHpClass(0.25)).toBe('hp-low')
        expect(getHpClass(0.1)).toBe('hp-low')
        expect(getHpClass(0)).toBe('hp-low')
      })
    })

    describe('calculateHpData', () => {
      it('calculates HP percentage, formatted width and label correctly', () => {
        const data = calculateHpData(80, 100)
        expect(data.pct).toBe(0.8)
        expect(data.pctWidth).toBe('80%')
        expect(data.hpClass).toBe('hp-high')
        expect(data.text).toBe('80 / 100 HP')
      })

      it('clamps safely on edge values and prevents division by zero', () => {
        const zeroMax = calculateHpData(10, 0)
        expect(zeroMax.pctWidth).toBe('100%')
        expect(zeroMax.text).toBe('10 / 0 HP')

        const overHp = calculateHpData(150, 100)
        expect(overHp.pct).toBe(1)
        expect(overHp.pctWidth).toBe('100%')
      })
    })

    describe('resolveCardStatusIndicators', () => {
      it('returns empty array when no flags or passive are present', () => {
        const indicators = resolveCardStatusIndicators({
          onMission: false,
          onEvent: false,
          inDaycare: false,
          onDefense: false
        })
        expect(indicators).toEqual([])
      })

      it('includes field passive and mission indicators when active', () => {
        const passive = {
          id: 'pickup' as const,
          label: 'Recogida',
          desc: 'Recoge objetos tras ganar combates',
          icon: '🎒'
        }
        const indicators = resolveCardStatusIndicators(
          {
            onMission: true,
            onEvent: false,
            inDaycare: false,
            onDefense: false
          },
          passive
        )
        expect(indicators).toHaveLength(2)
        expect(indicators[0]!.key).toBe('fieldPassive')
        expect(indicators[0]!.title).toBe('HABILIDAD: RECOGIDA')
        expect(indicators[1]!.key).toBe('mission')
        expect(indicators[1]!.cssClass).toBe('mission')
      })

      it('includes event, daycare, and defense flags', () => {
        const indicators = resolveCardStatusIndicators({
          onMission: false,
          onEvent: true,
          inDaycare: true,
          onDefense: true
        })
        expect(indicators.map(i => i.key)).toEqual(['event', 'daycare', 'defense'])
      })
    })

    describe('resolveVisibleCardActions', () => {
      it('resolves standard non-pvp action buttons', () => {
        const actions = resolveVisibleCardActions(['item', 'details', 'box'], false)
        expect(actions).toEqual({
          item: true,
          details: true,
          box: true,
          replace: false
        })
      })

      it('disables box and enables replace in PvP mode', () => {
        const actions = resolveVisibleCardActions(['item', 'details', 'box'], true)
        expect(actions.box).toBe(false)
        expect(actions.replace).toBe(true)
      })

      it('handles empty actions correctly', () => {
        const actions = resolveVisibleCardActions([], false)
        expect(actions).toEqual({
          item: false,
          details: false,
          box: false,
          replace: false
        })
      })
    })

    describe('resolvePokemonCardClasses', () => {
      const baseOptions = {
        hasBadges: false,
        hasManyBadges: false,
        isSimplifiedModals: false,
        isPerformanceActive: false,
        isPremiumTier: false,
        isRuleViolated: false
      }

      it('returns base classes for default state', () => {
        const classes = resolvePokemonCardClasses(
          {
            onMission: false,
            onEvent: false,
            aura: undefined,
            isShiny: false,
            isGuardian: false
          },
          baseOptions
        )
        expect(classes).toEqual(['pokemon-display-card'])
      })

      it('short-circuits when isSimplifiedModals is active', () => {
        const classes = resolvePokemonCardClasses(
          {
            onMission: true,
            onEvent: false,
            aura: 'fire',
            isShiny: true,
            isGuardian: false
          },
          { ...baseOptions, isSimplifiedModals: true }
        )
        expect(classes).toContain('on-mission')
        expect(classes).toContain('is-performance-mode')
        expect(classes).not.toContain('is-shiny')
        expect(classes).not.toContain('aura-fire-mini')
      })

      it('includes identity classes when isPerformanceActive is true without short-circuiting', () => {
        const classes = resolvePokemonCardClasses(
          {
            onMission: false,
            onEvent: false,
            aura: 'water',
            isShiny: true,
            isGuardian: true
          },
          {
            ...baseOptions,
            isPerformanceActive: true,
            hasBadges: true,
            hasManyBadges: true,
            isPremiumTier: true,
            isRuleViolated: true
          }
        )
        expect(classes).toContain('with-badges')
        expect(classes).toContain('many-badges')
        expect(classes).toContain('is-performance-mode')
        expect(classes).toContain('aura-water-mini')
        expect(classes).toContain('is-shiny')
        expect(classes).toContain('is-guardian')
        expect(classes).toContain('is-premium-tier')
        expect(classes).toContain('is-rule-violated')
      })
    })
  })

  describe('pokemonSummaryHelper', () => {
    describe('getCategoryDescription', () => {
      it('returns special descriptions for recognized categories', () => {
        expect(getCategoryDescription('Nueva Especie')).toContain('ADN de todos los demás Pokémon')
        expect(getCategoryDescription('Pokémon Genético')).toContain('manipulación avanzada de ADN')
        expect(getCategoryDescription('Legendario')).toContain('mitos y leyendas')
        expect(getCategoryDescription('Mítico')).toContain('su existencia es cuestionada')
        expect(getCategoryDescription('Pokémon Inicial')).toContain('comienzan su aventura regional')
        expect(getCategoryDescription('Fósil Antiguo')).toContain('resucitado a partir de material genético')
      })

      it('returns default classification description for unknown categories', () => {
        const desc = getCategoryDescription('Ratón')
        expect(desc).toContain('Clasificación: Ratón')
        expect(desc).toContain('Define los rasgos biológicos principales')
      })
    })

    describe('formatRange', () => {
      it('returns dash for undefined or 0 values', () => {
        expect(formatRange(undefined, 'm')).toBe('—')
        expect(formatRange(0, 'm')).toBe('—')
      })

      it('formats tuple arrays accurately', () => {
        expect(formatRange([1.2, 1.8], 'm')).toBe('1.2m - 1.8m')
      })

      it('formats single number with default range variation factor', () => {
        const formatted = formatRange(10, 'kg', 0.1)
        expect(formatted).toBe('9.0kg - 11.0kg')
      })
    })

    describe('resolveTrophyDisplayData', () => {
      it('maps first rank correctly', () => {
        const data = resolveTrophyDisplayData('first')
        expect(data.medal).toBe('🥇')
        expect(data.rankLabel).toBe('1º LUGAR')
        expect(data.rankClass).toBe('rank-gold')
      })

      it('maps second rank correctly', () => {
        const data = resolveTrophyDisplayData('second')
        expect(data.medal).toBe('🥈')
        expect(data.rankLabel).toBe('2º LUGAR')
        expect(data.rankClass).toBe('rank-silver')
      })

      it('maps third rank correctly', () => {
        const data = resolveTrophyDisplayData('third')
        expect(data.medal).toBe('🥉')
        expect(data.rankLabel).toBe('3º LUGAR')
        expect(data.rankClass).toBe('rank-bronze')
      })

      it('maps default or unknown ranks correctly', () => {
        const data = resolveTrophyDisplayData(undefined)
        expect(data.medal).toBe('🏆')
        expect(data.rankLabel).toBe('GANADOR')
        expect(data.rankClass).toBe('rank-default')
      })
    })

    describe('Physical dimension helpers', () => {
      const mockPhysicalData: PhysicalData = {
        height: '1.5',
        weight: '45.0',
        heightTooltip: 'Altura exacta',
        weightTooltip: 'Peso exacto',
        heightTier: { label: 'Mediano', cssClass: 'tier-mid' },
        weightTier: { label: 'Ligero', cssClass: 'tier-light' }
      }

      it('resolves tooltip title for instance and species', () => {
        expect(resolveDimensionTooltipTitle('ALTURA', true, mockPhysicalData, 'm')).toBe('ALTURA: 1.5m (Mediano)')
        expect(resolveDimensionTooltipTitle('PESO', true, mockPhysicalData, 'kg')).toBe('PESO: 45.0kg (Ligero)')
        expect(resolveDimensionTooltipTitle('ALTURA', false, null, 'm')).toBe('ALTURA (ESPECIE)')
      })

      it('resolves tooltip description for instance and species', () => {
        expect(resolveDimensionTooltipDesc('ALTURA', true, mockPhysicalData, 1.5, 'm')).toBe('Altura exacta')
        expect(resolveDimensionTooltipDesc('PESO', true, mockPhysicalData, 45, 'kg')).toBe('Peso exacto')
        const speciesDesc = resolveDimensionTooltipDesc('ALTURA', false, null, 1.5, 'm')
        expect(typeof speciesDesc).toBe('string')
      })

      it('resolves display value for instance and species', () => {
        expect(resolveDimensionDisplayValue('ALTURA', true, mockPhysicalData, 1.5, 'm')).toBe('1.5m')
        expect(resolveDimensionDisplayValue('PESO', true, mockPhysicalData, 45, 'kg')).toBe('45.0kg')
        expect(resolveDimensionDisplayValue('ALTURA', false, null, [1.0, 2.0], 'm')).toBe('1m - 2m')
      })
    })
  })

  describe('trainerAvatarAnimHelper', () => {
    describe('hexToRgb', () => {
      it('converts 6-digit hex string to rgb', () => {
        expect(hexToRgb('#ff0000')).toBe('255, 0, 0')
        expect(hexToRgb('00ff00')).toBe('0, 255, 0')
        expect(hexToRgb('#0000ff')).toBe('0, 0, 255')
      })

      it('converts 3-digit shorthand hex to rgb', () => {
        expect(hexToRgb('#f00')).toBe('255, 0, 0')
        expect(hexToRgb('#fff')).toBe('255, 255, 255')
      })

      it('returns default white rgb on invalid hex input', () => {
        expect(hexToRgb('invalid-hex')).toBe(DEFAULT_WHITE_RGB_STRING)
      })
    })

    describe('resolveSpinConfig', () => {
      it('resolves standard forward class spin config', () => {
        const res = resolveSpinConfig('fire')
        expect(res.duration).toBeGreaterThan(0)
        expect(res.rotationDir).toBe(FULL_ROTATION_DEG)
      })

      it('resolves reversed spin config for electric or legend', () => {
        const res = resolveSpinConfig('electric')
        expect(res.duration).toBeGreaterThan(0)
        expect(res.rotationDir).toBe(REVERSE_ROTATION_DEG)
      })

      it('resolves type- prefixed spin durations', () => {
        const res = resolveSpinConfig('type-water')
        expect(res.duration).toBeGreaterThan(0)
        expect(res.rotationDir).toBe(FULL_ROTATION_DEG)
      })
    })

    describe('resolveShadowConfig', () => {
      it('resolves direct named shadow configuration', () => {
        const res = resolveShadowConfig('fire', {})
        expect(res).toEqual(SHADOW_CONFIGS.fire)
      })

      it('resolves dynamic type- shadow configuration using elementColors', () => {
        const colors = {
          water: { base: '#0088ff', light: '#44eeff', frame: '#004488' }
        }
        const res = resolveShadowConfig('type-water', colors)
        expect(res).not.toBeNull()
        expect(res?.from).toContain('#0088ff')
        expect(res?.to).toContain('#44eeff')
        expect(res?.duration).toBeGreaterThan(0)
      })

      it('returns null when no shadow config exists', () => {
        expect(resolveShadowConfig('unknown_style', {})).toBeNull()
      })
    })
  })
})
