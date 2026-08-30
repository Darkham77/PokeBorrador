import { computed } from 'vue'
import { getFinalGroundRates, getSpeciesEntries } from '@/logic/encounters/encounters'
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { requirePokemonSpeciesId, isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { DAY_PHASES, getGMT3Date } from '@/logic/utils/timeUtils'
import { resolveWeeklyRotation, safeParse, type EventConfig } from '@/logic/events/eventEngine'
import {
  getSpawnStatus,
  getSharedShinyEventLines,
  getSpawnCommonTooltipLines,
  createPopulatedRouteSpawnItem,
  type RouteSpawnMappedItem
} from '@/logic/utils/routeSpawnHelpers'
import type { RouteSpawnsProps } from '@/composables/modals/useRouteSpawnsCalculation'

const DEFAULT_WILD_SPAWN_RATE_WEIGHT = 10;

export function useRouteSpawnsWild(props: RouteSpawnsProps) {
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  const uiStore = useUIStore()

  const wildSpawns = computed(() => {
    const activeEvents = eventStore.activeEvents || []
    const allMapSpawns: PokemonSpeciesId[] = []
    const addMapSpawn = (id: PokemonSpeciesId) => {
      if (!allMapSpawns.includes(id)) allMapSpawns.push(id)
    }
    DAY_PHASES.forEach(c => {
      const list = props.map.wild?.[c] || []
      list.forEach(addMapSpawn)
    })
    
    const weatherCfg = props.map.weather?.[props.weather]
    if (weatherCfg) {
      if (weatherCfg.visitors) {
        getSpeciesEntries(weatherCfg.visitors).forEach(({ id }) => addMapSpawn(id))
      }
      if (weatherCfg.exclusive) {
        getSpeciesEntries(weatherCfg.exclusive).forEach(({ id }) => addMapSpawn(id))
      }
    }
    activeEvents.forEach(ev => {
      const cfg = safeParse(ev.config) as EventConfig
      if (!ev.active || !cfg) return
      const rotation = cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations ? resolveWeeklyRotation(cfg, getGMT3Date()) : null
      const rawSpecies = rotation?.species ?? cfg.species
      if (rawSpecies && rawSpecies !== '*') {
        rawSpecies.split(',').forEach((s: string) => {
          const clean = s.trim().toLowerCase()
          if (clean && clean !== '*' && isPokemonSpeciesId(clean)) {
            addMapSpawn(clean)
          }
        })
      }
    })
    const fullPool = allMapSpawns

    const { pool: activePool, rates: activeRates } = getFinalGroundRates(props.map, props.cycle, props.weather, activeEvents)
    const totalRate = activeRates.reduce((sum, r) => sum + r, 0)
    
    const seenPokedex = gameStore.state.seenPokedex || []
    const caughtPokedex = gameStore.state.pokedex || []

    return fullPool.map((id) => {
      const activeIdx = activePool.indexOf(id)
      const rateVal = activeIdx !== -1 ? (activeRates[activeIdx] || 0) : 0
      const percentage = totalRate > 0 ? (rateVal / totalRate) * 100 : 0
      
      const wildList = props.map.wild?.[props.cycle] || []
      const originalIdx = wildList.indexOf(id)
      
      const baseRates = props.map.rates?.[props.cycle] || []
      const totalBaseRate = baseRates.reduce((sum, r) => sum + r, 0)

      let baseRate = 0
      let basePercentage = 0
      if (originalIdx !== -1) {
        baseRate = baseRates[originalIdx] !== undefined ? baseRates[originalIdx] : DEFAULT_WILD_SPAWN_RATE_WEIGHT
        basePercentage = totalBaseRate > 0 ? (baseRate / totalBaseRate) * 100 : 0
      }

      const diff = percentage - basePercentage

      const isVisitor = !!weatherCfg?.visitors && getSpeciesEntries(weatherCfg.visitors).some(entry => entry.id === id)
      const isExclusive = !!weatherCfg?.exclusive && getSpeciesEntries(weatherCfg.exclusive).some(entry => entry.id === id)
      
      const multiplier = getWeatherMultiplier(id, props.weather)
      const isBuffed = !isVisitor && !isExclusive && multiplier > 1.0
      const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0
      const isBlocked = multiplier === 0
      
      const isInCurrentCycle = wildList.includes(id)
      
      const { spawnType, statusClass } = getSpawnStatus(isVisitor, isExclusive, isBlocked, isInCurrentCycle, isBuffed, isDebuffed)

      const speciesBonuses = eventStore.getSpeciesBonuses(id)

      return createPopulatedRouteSpawnItem({
        id,
        percentage,
        baseRate,
        basePercentage,
        diff,
        spawnType,
        statusClass,
        multiplier,
        debugPokedexMode: uiStore.debugPokedexMode,
        seenPokedex,
        caughtPokedex,
        speciesBonuses
      })
    }).sort((a, b) => {
      if (a.percentage > 0 && b.percentage === 0) return -1
      if (a.percentage === 0 && b.percentage > 0) return 1
      if (a.percentage > 0 && b.percentage > 0) return b.percentage - a.percentage
      
      const getInactivePriority = (type: string) => {
        if (type === 'Bloqueado' || type === 'Fuera de hora') return 0
        return 1
      }
      const prioA = getInactivePriority(a.spawnType)
      const prioB = getInactivePriority(b.spawnType)
      if (prioA !== prioB) return prioB - prioA
      
      return b.totalStats - a.totalStats
    })
  })

  function getWildSpawnTooltip(poke: RouteSpawnMappedItem) {
    const pokeId = requirePokemonSpeciesId(poke.id)
    const lines: string[] = [] // no-domain
    lines.push(`Probabilidad Base: ${poke.basePercentage.toFixed(1)}%`)
    lines.push(...getSpawnCommonTooltipLines(poke, props.weather))
    const speciesEvent = eventStore.activeEvents.find(e => {
      const cfg = safeParse(e.config) as EventConfig
      const rotation = cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations ? resolveWeeklyRotation(cfg, getGMT3Date()) : null
      const rawSpecies = rotation?.species ?? cfg.species
      if (rawSpecies && rawSpecies !== '*') {
        const speciesList = rawSpecies.split(',').map((s: string) => s.trim().toLowerCase()).filter(isPokemonSpeciesId)
        return speciesList.includes(pokeId)
      }
      return false
    })
    if (speciesEvent) {
      const cfg = safeParse(speciesEvent.config) as EventConfig
      if (cfg?.speciesRateMult && cfg.speciesRateMult !== 1) {
        lines.push(`• Evento Activo (${speciesEvent.name}): Multiplicador x${cfg.speciesRateMult}`)
      }
    }

    lines.push(...getSharedShinyEventLines(poke.id, eventStore))

    return {
      title: `DETALLES DE PROBABILIDAD`,
      description: lines.join('\n')
    }
  }

  return {
    wildSpawns,
    getWildSpawnTooltip
  }
}
