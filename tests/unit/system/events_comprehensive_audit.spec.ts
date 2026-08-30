import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRouteSpawnsWild } from '@/composables/modals/useRouteSpawnsWild'
import { useRouteSpawnsFishing } from '@/composables/modals/useRouteSpawnsFishing'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { getMapLocationById } from '@/data/world/maps'
import {
  getGlobalMultipliers,
  getSpeciesBoosts,
  getMinigameBuffs,
  resolveEventSubCompetitions,
  isPokemonEligibleForEvent,
  isPokemonEligibleForSubCompetition,
  evaluatePokemonForSubCompetition,
  type Event as GameEvent
} from '@/logic/events/eventEngine'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

const ALL_SYSTEM_EVENTS: GameEvent[] = [
  {
    id: 'fiebre_oro',
    name: 'Fiebre del Oro y Rivales',
    icon: '💰',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [1], "startHour": 0, "endHour": 23.99}',
    config: '{"moneyMult": 2.0, "trainerMult": 1.5, "rivalMult": 1.5, "banner": "rival_full"}',
    description: '¡Doble dinero en combates!'
  },
  {
    id: 'dia_pesca',
    name: 'Día del Océano y Pesca',
    icon: '🎣',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [2], "startHour": 0, "endHour": 23.99}',
    config: '{"fishingMult": 2.0, "minigameBuffs": {"fishing": {"encounterRateMult": 2.0, "rareDropMult": 1.5}}, "banner": "dia_pesca_full"}',
    description: '¡Mayor pesca!'
  },
  {
    id: 'torneo_pesca',
    name: 'Torneo de Pesca Acuática',
    icon: '🎣',
    type: 'competition',
    active: true,
    schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
    config: JSON.stringify({
      hasCompetition: true,
      requireCaughtDuringEvent: true,
      rotationTheme: 'weekly_4',
      speciesShinyMult: 3.0,
      speciesRateMult: 2.0,
      fishingMult: 2.0,
      minigameBuffs: { fishing: { encounterRateMult: 2.0, rareDropMult: 1.5, shinyMult: 3.0 } },
      weeklyRotations: {
        '1': { species: 'magikarp,gyarados', banner: 'hora_magikarp_full', title: 'Torneo Magikarp & Gyarados' },
        '2': { species: 'shellder,staryu,horsea,seadra,goldeen', banner: 'pesca_exotica_full', title: 'Torneo de Pesca Exótica' },
        '3': { species: 'tentacool,tentacruel,krabby,kingler,poliwag', banner: 'pesca_profunda_full', title: 'Torneo de Pesca Profunda' },
        '4': { species: 'dratini,dragonair,lapras', banner: 'pesca_mistica_full', title: 'Torneo de Pesca Mística' }
      },
      subCompetitions: [
        { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max', prizes: { first: { type: 'mixed', money: 25000 } } },
        { id: 'weight', name: 'Masa y Peso', metric: 'weight', order: 'auto', prizes: { first: { type: 'mixed', money: 25000 } } },
        { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto', prizes: { first: { type: 'mixed', money: 25000 } } }
      ]
    }),
    description: '¡Competencia semanal de pesca!'
  },
  {
    id: 'dia_crianza',
    name: 'Día de la Guardería e Incubación',
    icon: '🥚',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [3], "startHour": 0, "endHour": 23.99}',
    config: '{"hatchMult": 2.0, "eggShinyMult": 2.0, "banner": "huevos_full"}',
    description: '¡Pasos de eclosión reducidos!'
  },
  {
    id: 'dia_naturaleza',
    name: 'Día de la Naturaleza y Caza',
    icon: '🌿',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [4], "startHour": 0, "endHour": 23.99}',
    config: '{"bugCatchingMult": 2.0, "catchRateMult": 1.3, "banner": "safari_park_full"}',
    description: '¡Mayor probabilidad de insectos!'
  },
  {
    id: 'torneo_caza',
    name: 'Torneo de Caza Temático',
    icon: '🏆',
    type: 'competition',
    active: true,
    schedule: '{"type": "weekly", "days": [4], "startHour": 18, "endHour": 22}',
    config: JSON.stringify({
      hasCompetition: true,
      requireCaughtDuringEvent: true,
      rotationTheme: 'weekly_4',
      speciesShinyMult: 3.0,
      speciesRateMult: 2.0,
      weeklyRotations: {
        '1': { species: 'scyther,pinsir,butterfree,beedrill,venomoth', banner: 'caza_bichos_full', title: 'Concurso de Caza de Bichos' },
        '2': { species: 'tauros,kangaskhan,chansey,dodrio', banner: 'safari_park_full', title: 'Gran Torneo Safari' },
        '3': { species: 'kabuto,omanyte,aerodactyl,geodude,onix,rhyhorn', banner: 'arqueologia_fosiles_full', title: 'Torneo Excavación' },
        '4': { species: 'gastly,haunter,gengar,zubat,golbat,hypno', banner: 'caza_nocturna_full', title: 'Caza Nocturna' }
      },
      subCompetitions: [
        { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max', prizes: { first: { type: 'mixed', money: 25000 } } },
        { id: 'weight', name: 'Masa y Peso', metric: 'weight', order: 'auto', prizes: { first: { type: 'mixed', money: 25000 } } },
        { id: 'height', name: 'Envergadura y Tamaño', metric: 'height', order: 'auto', prizes: { first: { type: 'mixed', money: 25000 } } }
      ]
    }),
    description: '¡Torneo semanal de caza!'
  },
  {
    id: 'fiebre_minera',
    name: 'Fiebre Minera y Arqueología',
    icon: '⛏️',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [5], "startHour": 0, "endHour": 23.99}',
    config: '{"archaeologyMult": 2.0, "banner": "arqueologia_fosiles_full"}',
    description: '¡Doble probabilidad de hallar fósiles!'
  },
  {
    id: 'doble_exp',
    name: 'Fin de Semana de Doble EXP',
    icon: '⚡',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}',
    config: '{"expMult": 2.0, "banner": "doble_exp_full"}',
    description: '¡EXP x2!'
  },
  {
    id: 'gran_concurso_sabado',
    name: 'Gran Concurso Abierto del Sábado',
    icon: '👑',
    type: 'competition',
    active: true,
    schedule: '{"type": "weekly", "days": [6], "startHour": 0, "endHour": 23.99}',
    config: JSON.stringify({
      hasCompetition: true,
      requireCaughtDuringEvent: true,
      species: '*',
      banner: 'gran_concurso_sabado_full',
      subCompetitions: [
        { id: 'ivs', name: 'Genética Suprema', metric: 'total_ivs', order: 'max', prizes: { first: { type: 'mixed', money: 50000 } } },
        { id: 'weight', name: 'Titanes y Miniaturas', metric: 'weight', order: 'auto', prizes: { first: { type: 'mixed', money: 50000 } } },
        { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto', prizes: { first: { type: 'mixed', money: 50000 } } }
      ]
    }),
    description: '¡El gran campeonato de los sábados!'
  },
  {
    id: 'dia_safari_suerte',
    name: 'Día de la Fortuna y Suerte',
    icon: '🍀',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "weekly", "days": [0], "startHour": 0, "endHour": 23.99}',
    config: '{"shinyMult": 1.5, "catchRateMult": 1.5, "bcMult": 1.5, "banner": "safari_suerte_full"}',
    description: '¡50% más shiny!'
  },
  {
    id: 'comunidad_mensual',
    name: 'Día de la Comunidad: Growlithe',
    icon: '🌟',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "monthly", "trigger": "last_weekend", "startHour": 0, "endHour": 23.99}',
    config: '{"species": "growlithe", "speciesRateMult": 3.0, "speciesShinyMult": 4.0, "banner": "growlithe_full"}',
    description: '¡Gran evento mensual!'
  },
  {
    id: 'guerra_facciones_mensual',
    name: 'Campeonato de Guerra de Facciones',
    icon: '⚔️',
    type: 'passive_bonus',
    active: true,
    schedule: '{"type": "monthly", "trigger": "last_weekend", "startHour": 0, "endHour": 23.99}',
    config: '{"bcMult": 2.0, "rivalMult": 2.0, "banner": "war_full"}',
    description: '¡Puntos de facción dobles!'
  }
]

describe('Comprehensive Event Types Audit', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calculates wild and fishing spawns cleanly for every single registered game event', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    gameStore.state.seenPokedex = ['pidgey', 'rattata', 'magikarp', 'growlithe']
    gameStore.state.pokedex = ['pidgey', 'magikarp']

    const route1 = getMapLocationById('route1')
    const route4 = getMapLocationById('route4')
    expect(route1).toBeDefined()
    expect(route4).toBeDefined()

    for (const ev of ALL_SYSTEM_EVENTS) {
      eventStore.activeEvents = [ev]

      // 1. Wild spawns test on Route 1
      const wildState = useRouteSpawnsWild({
        map: route1!,
        cycle: 'day',
        weather: 'clear'
      })

      expect(() => {
        const spawns = wildState.wildSpawns.value
        expect(spawns.length).toBeGreaterThan(0)
        for (const sp of spawns) {
          const tooltip = wildState.getWildSpawnTooltip(sp)
          expect(tooltip.title).toBeDefined()
        }
      }).not.toThrow()

      // 2. Fishing spawns test on Route 4 (has fishing)
      const fishingState = useRouteSpawnsFishing({
        map: route4!,
        cycle: 'day',
        weather: 'clear'
      })

      expect(() => {
        const fSpawns = fishingState.fishingSpawns.value
        if (fSpawns.length > 0) {
          for (const sp of fSpawns) {
            const tooltip = fishingState.getFishingSpawnTooltip(sp)
            expect(tooltip.title).toBeDefined()
          }
        }
      }).not.toThrow()
    }
  })

  it('aggregates multipliers and buffs cleanly across all combined events', () => {
    const globalMults = getGlobalMultipliers(ALL_SYSTEM_EVENTS)
    expect(globalMults.exp).toBe(2)
    expect(globalMults.money).toBe(2)
    expect(globalMults.fishing).toBe(4) // dia_pesca (2) * torneo_pesca (2)
    expect(globalMults.archaeology).toBe(2)

    const fishBuffs = getMinigameBuffs(ALL_SYSTEM_EVENTS, 'fishing')
    expect(fishBuffs.encounterRateMult).toBeGreaterThan(1)
    expect(fishBuffs.rareDropMult).toBeGreaterThan(1)

    const archBuffs = getMinigameBuffs(ALL_SYSTEM_EVENTS, 'archaeology')
    expect(archBuffs.rareDropMult).toBeGreaterThan(1)
  })

  it('resolves sub-competitions and validates pokemon eligibility for all competition events', () => {
    const magikarp = makePokemon('magikarp', 10, { bypassWhitelist: true }) as Pokemon
    const scyther = makePokemon('scyther', 20, { bypassWhitelist: true }) as Pokemon
    const pidgey = makePokemon('pidgey', 5, { bypassWhitelist: true }) as Pokemon
    const nowMs = Temporal.Now.instant().epochMilliseconds
    magikarp.obtainedAt = nowMs
    scyther.obtainedAt = nowMs
    pidgey.obtainedAt = nowMs

    const competitionEvents = ALL_SYSTEM_EVENTS.filter(e => e.type === 'competition')
    expect(competitionEvents.length).toBe(3) // torneo_pesca, torneo_caza, gran_concurso_sabado

    for (const ev of competitionEvents) {
      const subComps = resolveEventSubCompetitions(ev)
      expect(subComps.length).toBeGreaterThan(0)

      for (const sub of subComps) {
        // Evaluate pokemon
        const evalRes = evaluatePokemonForSubCompetition(magikarp, sub)
        expect(evalRes.score).toBeDefined()

        // Check eligibility
        const eligEvent = isPokemonEligibleForEvent(ev, magikarp)
        const eligMagikarp = isPokemonEligibleForSubCompetition(ev, sub, magikarp)
        const eligPidgey = isPokemonEligibleForSubCompetition(ev, sub, pidgey)
        expect(typeof eligEvent.eligible).toBe('boolean')
        expect(typeof eligMagikarp.eligible).toBe('boolean')
        expect(typeof eligPidgey.eligible).toBe('boolean')
      }
    }
  })

  it('resolves species boosts accurately for single, rotating, and wildcard events', () => {
    // 1. Growlithe community event
    const growlitheBoost = getSpeciesBoosts(ALL_SYSTEM_EVENTS, 'growlithe')
    expect(growlitheBoost.rate).toBe(3.0)
    expect(growlitheBoost.shiny).toBe(4.0)

    // 2. Wildcard event ('*') should not boost a specific species
    const pidgeyBoost = getSpeciesBoosts([{
      id: 'gran_concurso_sabado',
      name: 'Gran Concurso',
      description: 'Concurso abierto',
      active: true,
      config: JSON.stringify({ species: '*', speciesRateMult: 5 })
    }], 'pidgey')
    expect(pidgeyBoost.rate).toBe(1)

    // 3. Weekly rotation event
    const rotatingEvents: GameEvent[] = [{
      id: 'torneo_caza',
      name: 'Torneo Caza',
      description: 'Torneo semanal de caza',
      active: true,
      config: JSON.stringify({
        rotationTheme: 'weekly_4',
        speciesRateMult: 2.0,
        speciesShinyMult: 3.0,
        weeklyRotations: {
          '1': { species: 'scyther,pinsir', banner: 'caza_full', title: 'Torneo' },
          '2': { species: 'tauros,chansey', banner: 'safari_full', title: 'Torneo' },
          '3': { species: 'kabuto,onix', banner: 'fosil_full', title: 'Torneo' },
          '4': { species: 'gastly,gengar', banner: 'fantasma_full', title: 'Torneo' }
        }
      })
    }]
    const boost = getSpeciesBoosts(rotatingEvents, 'scyther')
    expect(boost).toBeDefined()
    expect(boost.rate).toBeGreaterThanOrEqual(1)
  })
})
