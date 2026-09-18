import { describe, it, expect } from 'vitest'
import {
  isStatusEffectActive,
  isSecondaryEffectActive,
  isFieldEffectActive,
  isWeatherEffectActive,
  isDebugEffectActive,
  type DebugEffectActiveContext,
} from '@/components/admin/debug/debugAudioAnimHelper'
import {
  generateDebugTeamPokemon,
  generateDebugTeamList,
  MIN_DEBUG_TEAM_SIZE,
  MAX_DEBUG_TEAM_SIZE,
} from '@/components/admin/debug/debugTrainerTeamHelper'
import {
  resolveActiveAuthForm,
  parseBanStatus,
  resolveStandardErrorMessage,
} from '@/views/auth/authFormHelper'
import {
  formatRatioPercent,
  calculatePaginationBounds,
  formatPaginationRange,
  isRebuildProgressActive,
  resolveSaveButtonState,
} from '@/views/dev/devShadowMathHelper'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { useDebugPokemonCreator } from '@/components/admin/debug/useDebugPokemonCreator'

describe('Admin & Dev Views Helpers Domain Suite', () => {
  describe('debugAudioAnimHelper', () => {
    const mockPoke = {
      status: 'brn',
      volatileCounters: { confusion: 2 },
      substitute: true,
    } as unknown as Pokemon

    describe('isStatusEffectActive', () => {
      it('returns true when pokemon status matches', () => {
        expect(isStatusEffectActive(mockPoke, 'brn')).toBe(true)
        expect(isStatusEffectActive(mockPoke, 'par')).toBe(false)
        expect(isStatusEffectActive(null, 'brn')).toBe(false)
      })
    })

    describe('isSecondaryEffectActive', () => {
      it('returns true when volatileCounters contains positive counter', () => {
        expect(isSecondaryEffectActive(mockPoke, 'confusion')).toBe(true)
        expect(isSecondaryEffectActive(mockPoke, 'taunt')).toBe(false)
      })

      it('returns true when direct property is truthy on pokemon', () => {
        expect(isSecondaryEffectActive(mockPoke, 'substitute')).toBe(true)
      })

      it('returns false for null pokemon', () => {
        expect(isSecondaryEffectActive(null, 'confusion')).toBe(false)
      })
    })

    describe('isFieldEffectActive', () => {
      it('detects global field conditions', () => {
        expect(isFieldEffectActive('trickroom', { trickroom: true }, null, null)).toBe(true)
        expect(isFieldEffectActive('trickroom', {}, null, null)).toBe(false)
      })

      it('detects side conditions', () => {
        expect(isFieldEffectActive('reflect', null, { reflect: true }, null)).toBe(true)
      })

      it('detects stage conditions with key mapping', () => {
        expect(isFieldEffectActive('lightscreen', null, null, { lightScreen: 1 })).toBe(true)
        expect(isFieldEffectActive('lightscreen', null, null, { lightScreen: 0 })).toBe(false)
      })
    })

    describe('isWeatherEffectActive', () => {
      it('matches current weather type', () => {
        expect(isWeatherEffectActive('rain', 'rain')).toBe(true)
        expect(isWeatherEffectActive('sun', 'rain')).toBe(false)
        expect(isWeatherEffectActive(null, 'rain')).toBe(false)
      })
    })

    describe('isDebugEffectActive', () => {
      it('dispatches to correct category evaluator', () => {
        const ctx: DebugEffectActiveContext = {
          poke: mockPoke,
          fieldConditions: { trickroom: true },
          sideConditions: {},
          stages: {},
          weatherType: 'sandstorm',
        }

        expect(isDebugEffectActive('status', 'brn', ctx)).toBe(true)
        expect(isDebugEffectActive('secondary', 'confusion', ctx)).toBe(true)
        expect(isDebugEffectActive('field', 'trickroom', ctx)).toBe(true)
        expect(isDebugEffectActive('weather', 'sandstorm', ctx)).toBe(true)
        expect(isDebugEffectActive('unknown-cat', 'foo', ctx)).toBe(false)
      })
    })
  })

  describe('debugTrainerTeamHelper', () => {
    describe('generateDebugTeamPokemon', () => {
      it('generates pokemon with clamped level between bounds', () => {
        const p = generateDebugTeamPokemon({
          speciesId: requirePokemonSpeciesId('pikachu'),
          minLevel: 10,
          maxLevel: 20,
          forceShiny: true,
          guardianProb: 0,
        })

        expect(p).not.toBeNull()
        if (p) {
          expect(p.level).toBeGreaterThanOrEqual(10)
          expect(p.level).toBeLessThanOrEqual(20)
          expect(p.isShiny).toBe(true)
          expect(p.isGuardian).toBe(false)
        }
      })

      it('marks as guardian when probability is 1', () => {
        const p = generateDebugTeamPokemon({
          speciesId: requirePokemonSpeciesId('bulbasaur'),
          minLevel: 5,
          maxLevel: 5,
          forceShiny: false,
          guardianProb: 1,
        })

        expect(p?.isGuardian).toBe(true)
      })
    })

    describe('generateDebugTeamList', () => {
      it('clamps team size between MIN and MAX', () => {
        const pool = [requirePokemonSpeciesId('charmander')]
        const emptyTeam = generateDebugTeamList({
          size: 0,
          speciesPool: pool,
          minLevel: 5,
          maxLevel: 10,
          forceShiny: false,
          guardianProb: 0,
        })
        expect(emptyTeam.length).toBe(MIN_DEBUG_TEAM_SIZE)

        const largeTeam = generateDebugTeamList({
          size: 100,
          speciesPool: pool,
          minLevel: 5,
          maxLevel: 10,
          forceShiny: false,
          guardianProb: 0,
        })
        expect(largeTeam.length).toBe(MAX_DEBUG_TEAM_SIZE)
      })

      it('handles empty pool safely', () => {
        const team = generateDebugTeamList({
          size: 3,
          speciesPool: [],
          minLevel: 5,
          maxLevel: 10,
          forceShiny: false,
          guardianProb: 0,
        })
        expect(team).toEqual([])
      })
    })
  })

  describe('authFormHelper', () => {
    describe('resolveActiveAuthForm', () => {
      it('returns correct form for local server mode', () => {
        expect(resolveActiveAuthForm('local', 'login')).toBe('local-login')
        expect(resolveActiveAuthForm('local', 'signup')).toBe('local-signup')
      })

      it('returns correct form for online server mode', () => {
        expect(resolveActiveAuthForm('online', 'login')).toBe('online-login')
        expect(resolveActiveAuthForm('online', 'signup')).toBe('online-signup')
      })
    })

    describe('parseBanStatus', () => {
      it('detects BAN prefix and extracts reason', () => {
        const result = parseBanStatus('BAN:Uso indebido de hacks')
        expect(result.isBanned).toBe(true)
        expect(result.reason).toBe('Uso indebido de hacks')
      })

      it('returns isBanned false for normal error or null', () => {
        expect(parseBanStatus('Credenciales inválidas').isBanned).toBe(false)
        expect(parseBanStatus(null).isBanned).toBe(false)
      })
    })

    describe('resolveStandardErrorMessage', () => {
      it('returns error message if not a ban', () => {
        expect(resolveStandardErrorMessage('Error de red')).toBe('Error de red')
      })

      it('returns null if error is ban or null', () => {
        expect(resolveStandardErrorMessage('BAN:Razón')).toBeNull()
        expect(resolveStandardErrorMessage(null)).toBeNull()
      })
    })
  })

  describe('devShadowMathHelper', () => {
    describe('formatRatioPercent', () => {
      it('formats ratios as rounded percentage strings', () => {
        expect(formatRatioPercent(1)).toBe('100%')
        expect(formatRatioPercent(0.28)).toBe('28%')
        expect(formatRatioPercent(0.3333)).toBe('33%')
        expect(formatRatioPercent(0)).toBe('0%')
      })
    })

    describe('calculatePaginationBounds', () => {
      it('calculates bounds for page 1 correctly', () => {
        const bounds = calculatePaginationBounds(1, 50, 120)
        expect(bounds).toEqual({ from: 1, to: 50 })
      })

      it('calculates bounds for last partial page correctly', () => {
        const bounds = calculatePaginationBounds(3, 50, 120)
        expect(bounds).toEqual({ from: 101, to: 120 })
      })

      it('handles empty total safely', () => {
        const bounds = calculatePaginationBounds(1, 50, 0)
        expect(bounds).toEqual({ from: 0, to: 0 })
      })
    })

    describe('formatPaginationRange', () => {
      it('formats display text for range', () => {
        const text = formatPaginationRange(1, 50, 150)
        expect(text).toBe('Mostrando 1 - 50 de 150 entidades')
      })

      it('handles partial last page', () => {
        const text = formatPaginationRange(2, 50, 85)
        expect(text).toBe('Mostrando 51 - 85 de 85 entidades')
      })
    })

    describe('isRebuildProgressActive', () => {
      it('returns true when rebuilding flag is true', () => {
        expect(isRebuildProgressActive(true, 0)).toBe(true)
        expect(isRebuildProgressActive(true, 100)).toBe(true)
      })

      it('returns true when progress is in-between 0 and 100', () => {
        expect(isRebuildProgressActive(false, 45)).toBe(true)
      })

      it('returns false when idle or completed', () => {
        expect(isRebuildProgressActive(false, 0)).toBe(false)
        expect(isRebuildProgressActive(false, 100)).toBe(false)
      })
    })

    describe('resolveSaveButtonState', () => {
      it('returns saving when isSaving is true', () => {
        expect(resolveSaveButtonState(true, true)).toBe('saving')
        expect(resolveSaveButtonState(true, false)).toBe('saving')
      })

      it('returns unsaved when changes exist and not saving', () => {
        expect(resolveSaveButtonState(false, true)).toBe('unsaved')
      })

      it('returns saved when no unsaved changes', () => {
        expect(resolveSaveButtonState(false, false)).toBe('saved')
      })
    })
  })

  describe('useDebugPokemonCreator', () => {
    it('selects species without throwing ReferenceError for requireAbilityId', () => {
      const creator = useDebugPokemonCreator()
      expect(() => {
        creator.selectSpecies({ id: 'charmander', name: 'Charmander' })
      }).not.toThrow()
      expect(creator.config.value.id).toBe('charmander')
      expect(creator.config.value.ability.length).toBeGreaterThan(0)
    })
  })
})

