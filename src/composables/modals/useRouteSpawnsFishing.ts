import { computed } from 'vue'
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { EventConfig } from '@/logic/events/eventEngine'
import {
  getPokedexVisibility,
  getPokemonBasicData,
  getSpawnStatus,
  getSharedShinyEventLines,
  getSpawnCommonTooltipLines,
  redistributeWeatherSpawns,
  applyFishingRodBudget,
  buildRouteSpawnItem,
  type RouteSpawnMappedItem
} from '@/logic/utils/routeSpawnHelpers'

export function useRouteSpawnsFishing(
  props: { map: MapLocation; weather: string; cycle: string }
) {
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  const uiStore = useUIStore()

  const fishingSpawns = computed(() => {
    if (!props.map.fishing?.pool) return []

    const pool = [...props.map.fishing.pool]
    const rates = [...props.map.fishing.rates]
    while (rates.length < pool.length) rates.push(10)

    const weatherCfg = props.map.weather?.[props.weather]
    if (props.weather && props.weather !== 'clear' && weatherCfg) {
      if (weatherCfg.fishingExclusive) {
        const exclusives = Array.isArray(weatherCfg.fishingExclusive) ? weatherCfg.fishingExclusive : Object.keys(weatherCfg.fishingExclusive)
        exclusives.forEach(id => {
          if (!pool.includes(id)) {
            pool.push(id)
            const weight = Array.isArray(weatherCfg.fishingExclusive) ? 5 : ((weatherCfg.fishingExclusive as Record<string, number>)[id] || 5)
            rates.push(weight)
          }
        })
      }
      if (weatherCfg.fishingVisitors) {
        const visitors = Array.isArray(weatherCfg.fishingVisitors) ? weatherCfg.fishingVisitors : Object.keys(weatherCfg.fishingVisitors)
        visitors.forEach(id => {
          if (!pool.includes(id)) {
            pool.push(id)
            const weight = Array.isArray(weatherCfg.fishingVisitors) ? -10 : -((weatherCfg.fishingVisitors as Record<string, number>)[id] || 10)
            rates.push(weight)
          }
        })
      }
    }

    if (props.weather && props.weather !== 'clear') {
      const exclusives = weatherCfg?.fishingExclusive ? (Array.isArray(weatherCfg.fishingExclusive) ? weatherCfg.fishingExclusive : Object.keys(weatherCfg.fishingExclusive)) : []
      redistributeWeatherSpawns(rates, pool, props.weather, exclusives)
    }

    const fishingType = (gameStore.state.fishingRodSecs || 0) > 0 ? (gameStore.state.fishingRodType || 'standard') : 'standard'
    applyFishingRodBudget(rates, pool, fishingType)

    const totalRate = rates.reduce((sum, r) => sum + r, 0)
    const seenPokedex = gameStore.state.seenPokedex || []
    const caughtPokedex = gameStore.state.pokedex || []

    return pool.map((id, index) => {
      const rateVal = rates[index] || 0
      const percentage = totalRate > 0 ? (rateVal / totalRate) * 100 : 0

      const baseIndex = props.map.fishing!.pool.indexOf(id)
      let baseRate = 0
      let basePercentage = 0
      if (baseIndex !== -1) {
        baseRate = props.map.fishing!.rates[baseIndex] !== undefined ? props.map.fishing!.rates[baseIndex] : 10
        const totalBase = props.map.fishing!.rates.reduce((sum, r) => sum + r, 0)
        basePercentage = totalBase > 0 ? (baseRate / totalBase) * 100 : 0
      }

      const diff = percentage - basePercentage

      const { isSeen, isCaught } = getPokedexVisibility(id, uiStore.debugPokedexMode, seenPokedex, caughtPokedex)
      const pData = getPokemonBasicData(id, isSeen)

      const isVisitor = !!(weatherCfg?.fishingVisitors && (
        (!Array.isArray(weatherCfg.fishingVisitors) && (weatherCfg.fishingVisitors as Record<string, number>)[id]) || 
        (Array.isArray(weatherCfg.fishingVisitors) && weatherCfg.fishingVisitors.includes(id))
      ))
      const isExclusive = !!(weatherCfg?.fishingExclusive && (
        (!Array.isArray(weatherCfg.fishingExclusive) && (weatherCfg.fishingExclusive as Record<string, number>)[id]) || 
        (Array.isArray(weatherCfg.fishingExclusive) && weatherCfg.fishingExclusive.includes(id))
      ))

      const multiplier = getWeatherMultiplier(id, props.weather)
      const isBuffed = !isVisitor && !isExclusive && multiplier > 1.0
      const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0
      const isBlocked = multiplier === 0

      const { spawnType: initialSpawnType, statusClass } = getSpawnStatus(isVisitor, isExclusive, isBlocked, true, isBuffed, isDebuffed)
      const spawnType = initialSpawnType === 'Común' ? 'Pesca' : initialSpawnType

      return buildRouteSpawnItem(
        id,
        pData,
        isSeen,
        isCaught,
        getAssetUrl(ASSET_TYPES.POKEMON, id),
        percentage,
        baseRate,
        basePercentage,
        diff,
        spawnType,
        statusClass,
        multiplier
      )
    }).sort((a, b) => {
      if (a.percentage > 0 && b.percentage === 0) return -1
      if (a.percentage === 0 && b.percentage > 0) return 1
      if (a.percentage > 0 && b.percentage > 0) return b.percentage - a.percentage
      return b.totalStats - a.totalStats
    })
  })

  function getFishingSpawnTooltip(poke: RouteSpawnMappedItem) {
    const lines: string[] = []
    lines.push(`Probabilidad Base: ${poke.basePercentage.toFixed(1)}%`)
    const rodType = gameStore.state.fishingRodType
    const rodSecs = gameStore.state.fishingRodSecs || 0
    if (rodType && rodSecs > 0) {
      const names: Record<string, string> = { standard: 'Caña de pescar', good: 'Caña Buena', super: 'Supercaña' }
      const rodName = names[rodType] || 'Caña de pescar'
      if (rodType === 'good') {
        lines.push(`• ${rodName} activa: +500 pts distribuidos (más peso a comunes/raros)`)
      } else if (rodType === 'super') {
        lines.push(`• ${rodName} activa: +1000 pts distribuidos (más peso a comunes/raros) y aumenta la chance de Shiny x1.5`)
      } else {
        lines.push(`• ${rodName} activa.`)
      }
    }
    const weather = props.weather || 'clear'
    const isRainy = ['rain', 'heavy_rain', 'storm', 'thunderstorm'].includes(weather.toLowerCase())
    if (isRainy) {
      lines.push(`• Clima (Lluvia): x1.20 a la tasa de pesca general`)
    }
    lines.push(...getSpawnCommonTooltipLines(poke, props.weather))
    const eventFishingBonus = eventStore.globalMultipliers?.fishing || 1
    if (eventFishingBonus !== 1) {
      const activeFishingEvents = eventStore.activeEvents.filter(e => {
        const cfg = (typeof e.config === 'string' ? JSON.parse(e.config) : e.config) as EventConfig | undefined
        return cfg && cfg.fishingMult
      })
      const eventNames = activeFishingEvents.map(e => e.name).join(', ')
      lines.push(`• Evento Semanal (${eventNames}): x${eventFishingBonus.toFixed(1)} de probabilidad general`)
    }

    lines.push(...getSharedShinyEventLines(poke.id, eventStore))

    return {
      title: `DETALLES DE PESCA`,
      description: lines.join('\n')
    }
  }

  return {
    fishingSpawns,
    getFishingSpawnTooltip
  }
}
