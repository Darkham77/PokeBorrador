import type { BattleContext } from '@/types/battle/battleContext'
import type { MapStore, EventStore, WarStore } from '@/types/system/stores'
import type { MapLocation } from '@/types/pokemon/encounters'
import { generateEncounter } from '@/logic/encounters/encounters'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'
import { useWarStore } from '@/stores/war'

export async function generateSearchLoopEncounter(ctx: BattleContext, locId: string) {
  const mapStore = useMapStore() as unknown as MapStore
  const eventStore = useEventStore() as unknown as EventStore
  const warStore = useWarStore() as unknown as WarStore
  const win = (typeof window !== 'undefined' ? window : null) as unknown as Record<string, unknown>
  const debug = win?.__VITE_DEBUG__ as Record<string, unknown> | undefined
  const debugMults = (debug?.multipliers as Record<string, number> | undefined) || {}

  const encounterOptions = {
    activeEvents: mapStore.activeEvents,
    dominanceData: warStore.mapDominance,
    shinyMultiplier: (eventStore.globalMultipliers?.shiny || 1) * (debugMults.shiny || 1),
    eventTrainerBonus: (eventStore.globalMultipliers?.trainer || 1) * (debugMults.trainer || 1),
    eventFishingBonus: (eventStore.globalMultipliers?.fishing || 1) * (debugMults.fishing || 1),
    eventRivalBonus: (eventStore.globalMultipliers?.rival || 1) * (debugMults.rival || 1),
    weather: mapStore.currentWeather,
    cycle: mapStore.currentCycle
  }

  let encounter = null

  if (ctx.gs.state.playerClass === 'cazabichos' && Math.random() < 0.005) {
    const { makePokemon } = await import('@/logic/pokemon/pokemonFactory')
    const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')
    const mapsList = pokemonDataProvider.getMaps() as unknown as MapLocation[]
    const currentMapData = mapsList.find(m => m.id === (locId || ''))
    const minLv = currentMapData?.lv?.[0] || 5
    const maxLv = currentMapData?.lv?.[1] || minLv
    const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
    const bugs = ['scyther', 'pinsir']
    const chosenBug = bugs[Math.floor(Math.random() * bugs.length)]
    const generatedBug = makePokemon(chosenBug || '', level)
    if (generatedBug) {
      encounter = { type: 'wild', pokemon: generatedBug }
      ctx.uiStore.notify(`¡Aroma Atractivo atrajo a un ${generatedBug.name} salvaje!`, '🐝')
    }
  }

  if (!encounter) {
    encounter = await generateEncounter(locId || '', ctx.gs.state, encounterOptions)
  }

  return encounter
}
