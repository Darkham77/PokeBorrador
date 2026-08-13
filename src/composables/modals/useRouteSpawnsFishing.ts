import { computed } from 'vue'
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getSpeciesEntries } from '@/logic/encounters/encounters'
import { type PokemonSpeciesId } from '@/data/pokemon/pokedex'
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

import { DEFAULT_EXCLUSIVE_SPAWN_WEIGHT } from '@/logic/constants/encounters'
import type { RouteSpawnsProps } from '@/composables/modals/useRouteSpawnsCalculation'

const DEFAULT_FISHING_RATE_WEIGHT = 10;
const ROD_GOOD_BONUS_POINTS = 500;
const ROD_SUPER_BONUS_POINTS = 1000;

export function useRouteSpawnsFishing(props: RouteSpawnsProps) {
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  const uiStore = useUIStore()

  const fishingSpawns = computed(() => {
    if (!props.map.fishing?.pool) return []

    const pool: PokemonSpeciesId[] = [...props.map.fishing.pool]
    const rates = [...props.map.fishing.rates]
    while (rates.length < pool.length) rates.push(DEFAULT_FISHING_RATE_WEIGHT)

    const weatherCfg = props.map.weather?.[props.weather]
    if (props.weather && props.weather !== 'clear' && weatherCfg) {
      if (weatherCfg.fishingExclusive) {
        const exclusives = getSpeciesEntries(weatherCfg.fishingExclusive)
        exclusives.forEach(({ id, weight }) => {
          if (!pool.includes(id)) {
            pool.push(id)
            rates.push(weight ?? DEFAULT_EXCLUSIVE_SPAWN_WEIGHT)
          }
        })
      }
      if (weatherCfg.fishingVisitors) {
        const visitors = getSpeciesEntries(weatherCfg.fishingVisitors)
        visitors.forEach(({ id, weight }) => {
          if (!pool.includes(id)) {
            pool.push(id)
            rates.push(weight !== undefined ? -weight : -DEFAULT_FISHING_RATE_WEIGHT)
          }
        })
      }
    }

    if (props.weather && props.weather !== 'clear') {
      const exclusives = weatherCfg?.fishingExclusive ? getSpeciesEntries(weatherCfg.fishingExclusive).map(entry => entry.id) : []
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
        baseRate = props.map.fishing!.rates[baseIndex] !== undefined ? props.map.fishing!.rates[baseIndex] : DEFAULT_FISHING_RATE_WEIGHT
        const totalBase = props.map.fishing!.rates.reduce((sum, r) => sum + r, 0)
        basePercentage = totalBase > 0 ? (baseRate / totalBase) * 100 : 0
      }

      const diff = percentage - basePercentage

      const { isSeen, isCaught } = getPokedexVisibility(id, uiStore.debugPokedexMode, seenPokedex, caughtPokedex)
      const pData = getPokemonBasicData(id, isSeen)

      const isVisitor = !!weatherCfg?.fishingVisitors && getSpeciesEntries(weatherCfg.fishingVisitors).some(entry => entry.id === id)
      const isExclusive = !!weatherCfg?.fishingExclusive && getSpeciesEntries(weatherCfg.fishingExclusive).some(entry => entry.id === id)

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
    const lines: string[] = [] // no-domain
    lines.push(`Probabilidad Base: ${poke.basePercentage.toFixed(1)}%`)
    const rodType = gameStore.state.fishingRodType
    const rodSecs = gameStore.state.fishingRodSecs || 0
    if (rodType && rodSecs > 0) {
      const names: Record<string, string> = { standard: 'Caña de pescar', good: 'Caña Buena', super: 'Supercaña' }
      const rodName = names[rodType] || 'Caña de pescar'
      if (rodType === 'good') {
        lines.push(`• ${rodName} activa: +${ROD_GOOD_BONUS_POINTS} pts distribuidos (más peso a comunes/raros)`)
      } else if (rodType === 'super') {
        lines.push(`• ${rodName} activa: +${ROD_SUPER_BONUS_POINTS} pts distribuidos (más peso a comunes/raros) y aumenta la chance de Shiny x1.5`)
      } else {
        lines.push(`• ${rodName} activa.`)
      }
    }
    const weather = props.weather || 'clear'
    const isRainy = (['rain', 'heavy_rain', 'storm', 'thunderstorm'] as const).includes((weather as string).toLowerCase() as never) // text-ok
    if (isRainy) {
      lines.push(`• Clima (Lluvia): x1.20 a la tasa de pesca general`) // no-magic
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
