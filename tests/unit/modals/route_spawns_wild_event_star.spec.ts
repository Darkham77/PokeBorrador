import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRouteSpawnsWild } from '@/composables/modals/useRouteSpawnsWild'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { getMapLocationById } from '@/data/world/maps'
import { getFinalGroundRates } from '@/logic/encounters/encounters'
import { getSpeciesBoosts } from '@/logic/events/eventEngine'
import type { RouteSpawnsProps } from '@/composables/modals/useRouteSpawnsCalculation'

describe('useRouteSpawnsWild - Open Competition Event with species "*"', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calculates wild spawns cleanly without throwing when an active event has species "*"', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    gameStore.state.seenPokedex = ['pidgey', 'rattata']
    gameStore.state.pokedex = ['pidgey']

    // Simulate Saturday Open Competition Event with species: '*'
    eventStore.activeEvents = [
      {
        id: 'gran_concurso_sabado',
        name: 'Gran Concurso del Sábado',
        description: '¡Concurso abierto a todas las especies!',
        active: true,
        config: JSON.stringify({
          hasCompetition: true,
          requireCaughtDuringEvent: true,
          species: '*',
          banner: 'gran_concurso_sabado_full'
        })
      }
    ]

    const route1Map = getMapLocationById('route1')
    expect(route1Map).toBeDefined()

    const props: RouteSpawnsProps = {
      map: route1Map!,
      cycle: 'day',
      weather: 'clear'
    }

    const { wildSpawns, getWildSpawnTooltip } = useRouteSpawnsWild(props)

    // Should not throw Error: Invalid Pokemon species id: *
    expect(() => {
      const spawns = wildSpawns.value
      expect(spawns.length).toBeGreaterThan(0)
      
      // Test tooltip resolution for each spawn
      for (const spawn of spawns) {
        const tooltip = getWildSpawnTooltip(spawn)
        expect(tooltip.title).toBeDefined()
      }
    }).not.toThrow()
  })

  it('handles weekly rotation events and boosts correctly without crashing on wildcard', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    gameStore.state.seenPokedex = ['scyther', 'pidgey']

    eventStore.activeEvents = [
      {
        id: 'concurso_caza_bichos',
        name: 'Concurso de Caza de Bichos',
        description: 'Torneo semanal rotativo',
        active: true,
        config: JSON.stringify({
          hasCompetition: true,
          rotationTheme: 'weekly_4',
          speciesRateMult: 2,
          speciesShinyMult: 3,
          weeklyRotations: {
            '1': { species: 'scyther,pinsir,heracross', banner: 'caza_bichos_full', title: 'Torneo Bichos' },
            '2': { species: 'tauros,kangaskhan', banner: 'safari_full', title: 'Torneo Safari' },
            '3': { species: 'kabuto,omanyte', banner: 'arqueologia_full', title: 'Torneo Fósil' },
            '4': { species: 'gastly,haunter', banner: 'nocturna_full', title: 'Torneo Fantasma' }
          }
        })
      }
    ]

    const route1Map = getMapLocationById('route1')
    const props: RouteSpawnsProps = {
      map: route1Map!,
      cycle: 'day',
      weather: 'clear'
    }

    const { wildSpawns } = useRouteSpawnsWild(props)
    expect(() => {
      const spawns = wildSpawns.value
      expect(spawns).toBeDefined()
    }).not.toThrow()

    // Test getSpeciesBoosts
    const boost = getSpeciesBoosts(eventStore.activeEvents, 'scyther')
    expect(boost).toBeDefined()
  })

  it('calculates getFinalGroundRates cleanly when ignoreTimeRestrictions is set with species "*"', () => {
    const route1Map = getMapLocationById('route1')
    expect(route1Map).toBeDefined()

    const activeEvents = [
      {
        id: 'gran_concurso_sabado',
        name: 'Gran Concurso del Sábado',
        description: '¡Concurso abierto!',
        active: true,
        config: JSON.stringify({
          species: '*',
          ignoreTimeRestrictions: true
        })
      }
    ]

    expect(() => {
      const result = getFinalGroundRates(route1Map!, 'day', 'clear', activeEvents)
      expect(result.pool.length).toBeGreaterThan(0)
    }).not.toThrow()
  })
})
