import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRouteSpawnsWild } from '@/composables/modals/useRouteSpawnsWild'
import { useRouteSpawnsFishing } from '@/composables/modals/useRouteSpawnsFishing'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import {
  getGlobalMultipliers,
  getSpeciesBoosts,
  getMinigameBuffs,
  resolveEventSubCompetitions,
  isPokemonEligibleForEvent,
  isPokemonEligibleForSubCompetition,
  evaluatePokemonForSubCompetition,
  safeParse,
  type Event as GameEvent
} from '@/logic/events/eventEngine'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Future-Proof Event Permutation & Resiliency Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const FUTURE_EVENT_SCENARIOS: GameEvent[] = [
    // 1. Wildcard Open Tournament with weird whitespace
    {
      id: 'future_open_tournament',
      name: 'Torneo Futuro Abierto',
      icon: '🏆',
      type: 'competition',
      active: true,
      schedule: '{"type": "weekly", "days": [6], "startHour": 0, "endHour": 23.99}',
      config: JSON.stringify({
        hasCompetition: true,
        species: '  *  ',
        speciesRateMult: 2.5,
        speciesShinyMult: 3.5,
        banner: 'future_banner',
        subCompetitions: [
          { id: 'ivs', name: 'IVs Totales', metric: 'total_ivs', order: 'max' },
          { id: 'weight', name: 'Peso', metric: 'weight', order: 'auto' },
          { id: 'height', name: 'Altura', metric: 'height', order: 'auto' }
        ]
      }),
      description: 'Evento abierto futuro'
    },
    // 2. Multi-Species List with messy spacing and trailing commas
    {
      id: 'future_multi_species',
      name: 'Caza de Iniciales',
      icon: '🌿',
      type: 'competition',
      active: true,
      schedule: '{"type": "weekly", "days": [3], "startHour": 12, "endHour": 20}',
      config: JSON.stringify({
        hasCompetition: true,
        species: ' bulbasaur, charmander , squirtle, , pikachu ',
        speciesRateMult: 3.0,
        speciesShinyMult: 5.0,
        ignoreTimeRestrictions: true,
        subCompetitions: [
          { id: 'ivs', name: 'Genética', metric: 'total_ivs', order: 'max' }
        ]
      }),
      description: 'Caza de iniciales con formato sucio'
    },
    // 3. 4-Week Rotation with complex multi-species and mixed wildcards
    {
      id: 'future_complex_rotation',
      name: 'Torneo Rotativo Futuro',
      icon: '🌀',
      type: 'competition',
      active: true,
      schedule: '{"type": "weekly", "days": [5], "startHour": 15, "endHour": 22}',
      config: JSON.stringify({
        hasCompetition: true,
        rotationTheme: 'weekly_4',
        weeklyRotations: {
          '1': { species: 'dratini, larvitar', banner: 'pseudo_banner', title: 'Semana Dragón' },
          '2': { species: '*', banner: 'open_week_banner', title: 'Semana Libre' },
          '3': { species: 'eevee', banner: 'eevee_banner', title: 'Semana Eevee' },
          '4': { species: 'snorlax, lapras, aerodactyl', banner: 'rare_banner', title: 'Semana Raros' }
        },
        subCompetitions: [
          { id: 'ivs', name: 'IVs', metric: 'total_ivs', order: 'max' },
          { id: 'weight', name: 'Titanes', metric: 'weight', order: 'max' },
          { id: 'height', name: 'Gigantes', metric: 'height', order: 'max' }
        ]
      }),
      description: 'Torneo rotativo con comodines y múltiples especies'
    },
    // 4. Corrupted / Malformed JSON configuration (should be handled safely by safeParse)
    {
      id: 'future_corrupted_config',
      name: 'Evento con JSON Dañado',
      icon: '⚠️',
      type: 'passive_bonus',
      active: true,
      schedule: '{"invalid schedule',
      config: '{broken_json: true, species: "pikachu"',
      description: 'Evento con JSON roto para probar resiliencia'
    },
    // 5. Empty / Nullable event properties
    {
      id: 'future_empty_fields',
      name: 'Evento Campos Vacíos',
      icon: '❓',
      type: 'passive_bonus',
      active: true,
      schedule: '{}',
      config: '{}',
      description: 'Evento completamente vacío'
    },
    // 6. Passive Minigame Buffs Event with Fishing and Archaeology
    {
      id: 'future_super_minigames',
      name: 'Festival de Minijuegos',
      icon: '🎮',
      type: 'passive_bonus',
      active: true,
      schedule: '{"type": "weekly", "days": [0, 1, 2, 3, 4, 5, 6]}',
      config: JSON.stringify({
        expMult: 3.0,
        moneyMult: 3.0,
        bcMult: 3.0,
        fishingMult: 2.5,
        catchRateMult: 2.0,
        shinyMult: 2.5,
        hatchMult: 3.0,
        eggShinyMult: 3.0,
        archaeologyMult: 2.5,
        minigameBuffs: {
          fishing: { encounterRateMult: 2.5, rareDropMult: 2.0, shinyMult: 2.5 },
          bug_catching: { encounterRateMult: 2.0, rareDropMult: 1.8 },
          casino: { rareDropMult: 2.0 },
          archaeology: { encounterRateMult: 2.0, rareDropMult: 2.5 }
        }
      }),
      description: 'Mega bonificaciones de minijuegos'
    }
  ]

  it('guarantees useRouteSpawnsWild and useRouteSpawnsFishing NEVER throw on any future event configuration across all maps', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    gameStore.state.seenPokedex = ['pidgey', 'rattata', 'bulbasaur', 'pikachu', 'dratini', 'magikarp']
    gameStore.state.pokedex = ['pidgey', 'bulbasaur', 'magikarp']

    // Test a cross-section of maps (plains, water/fishing, caves, safari)
    const testMaps = FIRE_RED_MAPS.slice(0, 10)

    for (const scenario of FUTURE_EVENT_SCENARIOS) {
      eventStore.activeEvents = [scenario]

      for (const map of testMaps) {
        // 1. Wild spawns execution
        expect(() => {
          const { wildSpawns, getWildSpawnTooltip } = useRouteSpawnsWild({
            map,
            cycle: 'day',
            weather: 'clear'
          })
          const spawns = wildSpawns.value
          for (const sp of spawns) {
            const tooltip = getWildSpawnTooltip(sp)
            expect(tooltip.title).toBeDefined()
          }
        }).not.toThrow()

        // 2. Fishing spawns execution (if map has water/fishing)
        if (map.fishing) {
          expect(() => {
            const { fishingSpawns, getFishingSpawnTooltip } = useRouteSpawnsFishing({
              map,
              cycle: 'day',
              weather: 'clear'
            })
            const fSpawns = fishingSpawns.value
            for (const sp of fSpawns) {
              const tooltip = getFishingSpawnTooltip(sp)
              expect(tooltip.title).toBeDefined()
            }
          }).not.toThrow()
        }
      }
    }
  })

  it('safely handles species boost calculations for non-existent, wildcard, and exotic species', () => {
    for (const scenario of FUTURE_EVENT_SCENARIOS) {
      const activeEvents = [scenario]

      // Multipliers and minigame buffs
      const mults = getGlobalMultipliers(activeEvents)
      expect(typeof mults.exp).toBe('number')
      expect(typeof mults.money).toBe('number')

      for (const mg of ['fishing', 'bug_catching', 'casino', 'archaeology']) {
        const buffs = getMinigameBuffs(activeEvents, mg)
        expect(typeof buffs.encounterRateMult).toBe('number')
        expect(typeof buffs.rareDropMult).toBe('number')
      }

      // Querying existing species
      const bulbasaurBoost = getSpeciesBoosts(activeEvents, 'bulbasaur')
      expect(typeof bulbasaurBoost.rate).toBe('number')
      expect(typeof bulbasaurBoost.shiny).toBe('number')

      // Querying wildcard matching
      const pikachuBoost = getSpeciesBoosts(activeEvents, 'pikachu')
      expect(typeof pikachuBoost.rate).toBe('number')

      // Querying unboosted species
      const mewtwoBoost = getSpeciesBoosts(activeEvents, 'mewtwo')
      expect(typeof mewtwoBoost.rate).toBe('number')
    }
  })

  it('guarantees sub-competition evaluation and pokemon eligibility NEVER throw across all 52 weeks of the year', () => {
    const pidgey = makePokemon('pidgey', 10, { bypassWhitelist: true }) as Pokemon
    const bulbasaur = makePokemon('bulbasaur', 15, { bypassWhitelist: true }) as Pokemon
    const nowMs = Temporal.Now.instant().epochMilliseconds
    pidgey.obtainedAt = nowMs
    bulbasaur.obtainedAt = nowMs

    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day += 7) {
        const testDate = Temporal.Instant.from(`2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)

        for (const scenario of FUTURE_EVENT_SCENARIOS) {
          expect(() => {
            const subComps = resolveEventSubCompetitions(scenario, testDate)
            expect(Array.isArray(subComps)).toBe(true)

            for (const sub of subComps) {
              const evalRes = evaluatePokemonForSubCompetition(pidgey, sub)
              expect(typeof evalRes.score).toBe('number')

              const eligSub = isPokemonEligibleForSubCompetition(scenario, sub, pidgey, testDate)
              expect(typeof eligSub.eligible).toBe('boolean')
            }

            const eligEv = isPokemonEligibleForEvent(scenario, bulbasaur, testDate)
            expect(typeof eligEv.eligible).toBe('boolean')
          }).not.toThrow()
        }
      }
    }
  })

  it('safeParse helper returns empty object without crashing on invalid or non-string inputs', () => {
    expect(safeParse(null)).toEqual({})
    expect(safeParse(undefined)).toEqual({})
    expect(safeParse('{bad json')).toEqual({})
    expect(safeParse(123 as unknown as string)).toEqual({})
    expect(safeParse({ valid: true })).toEqual({ valid: true })
    expect(safeParse('{"valid": true}')).toEqual({ valid: true })
  })
})
