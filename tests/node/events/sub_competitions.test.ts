import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import {
  getDefaultSubCompetitions,
  resolveSubCompetitionDirection,
  evaluatePokemonForSubCompetition,
  isPokemonEligibleForSubCompetition,
  getEligiblePokemonForSubCompetition,
  isNewEntryBetter,
  type Event as GameEvent,
  type SubCompetitionConfig
} from '@/logic/events/eventEngine.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex.ts'
import { validateAndSanitize } from '@/logic/auth/saveSanitizer.ts'
import { serializeState } from '@/logic/auth/saveSerializer.ts'
import { INITIAL_STATE } from '@/stores/gameInitialState.ts'

describe('Multi-Category Sub-Competitions Engine', () => {
  const createMockPokemon = (overrides: Partial<Pokemon> = {}): Pokemon => ({
    uid: 'mock-poke-1',
    id: requirePokemonSpeciesId('magikarp'),
    species: requirePokemonSpeciesId('magikarp'),
    name: 'Magikarp',
    level: 20,
    exp: 0,
    expNeeded: 100,
    hp: 45,
    maxHp: 45,
    atk: 10,
    def: 55,
    spa: 15,
    spd: 20,
    spe: 80,
    type: 'water',
    status: '',
    isShiny: false,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, // total = 186
    nature: 'adamant',
    ability: 'swiftswim',
    gender: 'm',
    moves: [],
    obtainedAt: 1724000000000,
    weight: 15.5,
    height: 1.2,
    ...overrides
  })

  describe('getDefaultSubCompetitions', () => {
    it('returns default 3 sub-competitions when not configured', () => {
      const event: GameEvent = {
        id: 'generic_comp',
        name: 'Torneo Genérico',
        description: 'Competición abierta',
        active: true,
        config: { hasCompetition: true }
      }

      const subs = getDefaultSubCompetitions(event)
      assert.strictEqual(subs.length, 3)
      assert.strictEqual(subs[0]?.id, 'ivs')
      assert.strictEqual(subs[0]?.metric, 'total_ivs')
      assert.strictEqual(subs[1]?.id, 'weight')
      assert.strictEqual(subs[1]?.metric, 'weight')
      assert.strictEqual(subs[2]?.id, 'height')
      assert.strictEqual(subs[2]?.metric, 'height')
    })

    it('returns configured sub-competitions if present', () => {
      const customSub: SubCompetitionConfig = {
        id: 'speed_iv',
        name: 'Velocidad Máxima',
        metric: 'stat_iv',
        targetStat: 'spe',
        order: 'max'
      }

      const event: GameEvent = {
        id: 'custom_comp',
        name: 'Torneo Custom',
        description: '',
        active: true,
        config: {
          hasCompetition: true,
          subCompetitions: [customSub]
        }
      }

      const subs = getDefaultSubCompetitions(event)
      assert.strictEqual(subs.length, 1)
      assert.strictEqual(subs[0]?.id, 'speed_iv')
      assert.strictEqual(subs[0]?.targetStat, 'spe')
    })
  })

  describe('resolveSubCompetitionDirection', () => {
    it('always resolves ivs category to max', () => {
      assert.strictEqual(resolveSubCompetitionDirection('hora_magikarp', 'ivs', 'auto', 100), 'max')
      assert.strictEqual(resolveSubCompetitionDirection('hora_magikarp', 'ivs', undefined, 200), 'max')
    })

    it('resolves explicit min and max order', () => {
      assert.strictEqual(resolveSubCompetitionDirection('hora_magikarp', 'weight', 'min', 1), 'min')
      assert.strictEqual(resolveSubCompetitionDirection('hora_magikarp', 'weight', 'max', 1), 'max')
    })

    it('resolves deterministic auto direction with Mulberry32 PRNG', () => {
      const dir1 = resolveSubCompetitionDirection('hora_magikarp', 'weight', 'auto', 12345)
      const dir2 = resolveSubCompetitionDirection('hora_magikarp', 'weight', 'auto', 12345)
      assert.strictEqual(dir1, dir2, 'Same seed must produce same direction')
      assert.ok(dir1 === 'max' || dir1 === 'min')
    })
  })

  describe('evaluatePokemonForSubCompetition', () => {
    it('evaluates total_ivs metric correctly', () => {
      const pokemon = createMockPokemon({
        ivs: { hp: 30, atk: 25, def: 20, spa: 15, spd: 10, spe: 5 }
      })
      const subComp: SubCompetitionConfig = {
        id: 'ivs',
        name: 'Genética Superior',
        metric: 'total_ivs',
        order: 'max'
      }

      const res = evaluatePokemonForSubCompetition(pokemon, subComp)
      assert.strictEqual(res.score, 105)
      assert.strictEqual(res.displayValue, '105 / 186 (C)')
      assert.strictEqual(res.tierLabel, 'C')
    })

    it('evaluates weight metric correctly', () => {
      const pokemon = createMockPokemon({ weight: 14.2 })
      const subComp: SubCompetitionConfig = {
        id: 'weight',
        name: 'Masa y Peso',
        metric: 'weight',
        order: 'max'
      }

      const res = evaluatePokemonForSubCompetition(pokemon, subComp)
      assert.strictEqual(res.score, 14.2)
      assert.ok(res.displayValue.includes('14.2 kg'))
    })

    it('evaluates height metric correctly', () => {
      const pokemon = createMockPokemon({ height: 1.8 })
      const subComp: SubCompetitionConfig = {
        id: 'height',
        name: 'Envergadura y Altura',
        metric: 'height',
        order: 'max'
      }

      const res = evaluatePokemonForSubCompetition(pokemon, subComp)
      assert.strictEqual(res.score, 1.8)
      assert.ok(res.displayValue.includes('1.8 m'))
    })

    it('evaluates stat_iv metric correctly', () => {
      const pokemon = createMockPokemon({
        ivs: { hp: 31, atk: 28, def: 10, spa: 5, spd: 12, spe: 29 }
      })
      const subComp: SubCompetitionConfig = {
        id: 'spe_iv',
        name: 'Velocidad Pura',
        metric: 'stat_iv',
        targetStat: 'spe',
        order: 'max'
      }

      const res = evaluatePokemonForSubCompetition(pokemon, subComp)
      assert.strictEqual(res.score, 29)
      assert.strictEqual(res.displayValue, '29 / 31')
    })
  })

  describe('isPokemonEligibleForSubCompetition & Default "any" Filters', () => {
    const baseEvent: GameEvent = {
      id: 'hora_magikarp',
      name: 'Torneo de Pesca',
      description: '',
      active: true,
      config: {
        species: 'magikarp',
        hasCompetition: true
      }
    }

    it('accepts any nature, ability, gender, and level when subComp filters are open', () => {
      const subComp: SubCompetitionConfig = {
        id: 'ivs',
        name: 'Genética Superior',
        metric: 'total_ivs'
      }

      const pk1 = createMockPokemon({ nature: 'modest', ability: 'rattled', gender: 'f', level: 80 })
      const res = isPokemonEligibleForSubCompetition(baseEvent, subComp, pk1)
      assert.strictEqual(res.eligible, true)
    })

    it('restricts by nature if specified', () => {
      const subComp: SubCompetitionConfig = {
        id: 'adamant_only',
        name: 'Bravura',
        metric: 'total_ivs',
        filters: { natures: ['adamant', 'jolly'] }
      }

      const pkAdamant = createMockPokemon({ nature: 'adamant' })
      const pkModest = createMockPokemon({ nature: 'modest' })

      assert.strictEqual(isPokemonEligibleForSubCompetition(baseEvent, subComp, pkAdamant).eligible, true)
      assert.strictEqual(isPokemonEligibleForSubCompetition(baseEvent, subComp, pkModest).eligible, false)
    })

    it('restricts by level boundaries if specified', () => {
      const subComp: SubCompetitionConfig = {
        id: 'little_cup',
        name: 'Copa Pequeña',
        metric: 'total_ivs',
        filters: { minLevel: 5, maxLevel: 25 }
      }

      const pkLv10 = createMockPokemon({ level: 10 })
      const pkLv50 = createMockPokemon({ level: 50 })

      assert.strictEqual(isPokemonEligibleForSubCompetition(baseEvent, subComp, pkLv10).eligible, true)
      assert.strictEqual(isPokemonEligibleForSubCompetition(baseEvent, subComp, pkLv50).eligible, false)
    })

    it('pre-filters candidates correctly with getEligiblePokemonForSubCompetition', () => {
      const subComp: SubCompetitionConfig = {
        id: 'shiny_only',
        name: 'Belleza Radiante',
        metric: 'total_ivs',
        filters: { isShinyOnly: true }
      }

      const p1 = createMockPokemon({ uid: 'p-1', isShiny: false })
      const p2 = createMockPokemon({ uid: 'p-2', isShiny: true })

      const candidates = getEligiblePokemonForSubCompetition(baseEvent, subComp, [p1, p2, null])
      assert.strictEqual(candidates.length, 1)
      assert.strictEqual(candidates[0]?.uid, 'p-2')
    })
  })

  describe('isNewEntryBetter', () => {
    it('compares scores according to order max and min', () => {
      const entryLow = { data: { score: 10, is_shiny: false, obtained_at: 1000 } }
      const entryHigh = { data: { score: 50, is_shiny: false, obtained_at: 1000 } }

      assert.strictEqual(isNewEntryBetter(entryLow, entryHigh, 'data.score', 'max'), true)
      assert.strictEqual(isNewEntryBetter(entryHigh, entryLow, 'data.score', 'max'), false)

      assert.strictEqual(isNewEntryBetter(entryHigh, entryLow, 'data.score', 'min'), true)
      assert.strictEqual(isNewEntryBetter(entryLow, entryHigh, 'data.score', 'min'), false)
    })

    it('applies shiny advantage tiebreaker on equal scores', () => {
      const normalEntry = { data: { score: 100, is_shiny: false, obtained_at: 1000 } }
      const shinyEntry = { data: { score: 100, is_shiny: true, obtained_at: 1000 } }

      assert.strictEqual(isNewEntryBetter(normalEntry, shinyEntry, 'data.score', 'max'), true)
      assert.strictEqual(isNewEntryBetter(shinyEntry, normalEntry, 'data.score', 'max'), false)
    })

    it('applies capture date tiebreaker on equal scores and shiny status', () => {
      const olderCapture = { data: { score: 100, is_shiny: false, obtained_at: 1000 } }
      const newerCapture = { data: { score: 100, is_shiny: false, obtained_at: 2000 } }

      assert.strictEqual(isNewEntryBetter(newerCapture, olderCapture, 'data.score', 'max'), true)
      assert.strictEqual(isNewEntryBetter(olderCapture, newerCapture, 'data.score', 'max'), false)
    })
  })

  describe('Pokemon Trophies History and Save Validation', () => {
    it('persists trophies in SaveDataDto and passes Valibot saveDataSchema validation', () => {
      const pkWithTrophy = createMockPokemon({
        trophies: [
          {
            eventId: 'hora_magikarp',
            eventName: 'Torneo de Pesca de Magikarp',
            categoryId: 'weight',
            categoryName: 'Masa y Peso (Titán)',
            rank: 'first',
            score: 15.5,
            awardedAt: 1724740000000
          }
        ]
      })

      const gameState = {
        ...INITIAL_STATE,
        starterChosen: true,
        team: [pkWithTrophy],
        box: []
      }

      const serialized = serializeState(gameState)
      const validation = validateAndSanitize(serialized)

      assert.strictEqual(validation.valid, true, `Validation failed: ${validation.error}`)
      assert.strictEqual(validation.data.team[0]?.trophies?.length, 1)
      assert.strictEqual(validation.data.team[0]?.trophies?.[0]?.rank, 'first')
      assert.strictEqual(validation.data.team[0]?.trophies?.[0]?.categoryName, 'Masa y Peso (Titán)')
    })
  })
})
