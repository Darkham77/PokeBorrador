import { computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/weather/weatherRegistry'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { EventConfig } from '@/logic/events/eventEngine'

interface FishingSpawnData {
  id: string
  name: string
  basePercentage: number
  percentage: number
  multiplier: number
  spawnType: string
}

export function useRouteSpawnsFishing(
  props: { map: MapLocation; weather: string; cycle: string }
) {
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  const uiStore = useUIStore()

  function translateWeather(w: string): string {
    const visual = WEATHER_VISUAL_METADATA[w]
    if (visual) return visual.label
    const mech = getMechanicalWeather(w)
    return WEATHER_UI_METADATA[mech]?.label || w
  }

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
      const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1)
      const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1)
      const exclusives = weatherCfg?.fishingExclusive ? (Array.isArray(weatherCfg.fishingExclusive) ? weatherCfg.fishingExclusive : Object.keys(weatherCfg.fishingExclusive)) : []

      nativeIndices.forEach(idx => {
        const spId = pool[idx]
        if (spId) {
          const isExclusive = exclusives.includes(spId)
          if (!isExclusive) {
            rates[idx] = (rates[idx] || 0) * getWeatherMultiplier(spId, props.weather)
          }
        }
      })

      if (visitorIndices.length > 0) {
        const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (rates[idx] || 0), 0)
        const visitorQuota = totalNativeWeight / 9
        const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx] || 0), 0)
        visitorIndices.forEach(idx => {
          const relativeWeight = Math.abs(rates[idx] || 0) / (sumRelativeWeights || 1)
          rates[idx] = visitorQuota * relativeWeight
        })
      }
    }

    const fishingType = (gameStore.state.fishingRodSecs || 0) > 0 ? (gameStore.state.fishingRodType || 'standard') : 'standard'
    if ((fishingType === 'good' || fishingType === 'super') && pool.length > 0) {
      let budget = fishingType === 'super' ? 1000 : 500
      const indexedPool = pool.map((id, index) => ({ id, index, rate: rates[index] || 10 }))
        .sort((a, b) => a.rate - b.rate)

      for (let i = 0; i < indexedPool.length; i++) {
        const item = indexedPool[i]!
        if (i === indexedPool.length - 1) {
          rates[item.index] = (rates[item.index] || 10) + budget
          budget = 0
        } else {
          const portion = Math.round(budget / 2)
          rates[item.index] = (rates[item.index] || 10) + portion
          budget -= portion
        }
      }
    }

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

      let isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
      let isCaught = caughtPokedex.includes(id)

      if (uiStore.debugPokedexMode === 'none') {
        isSeen = false
        isCaught = false
      } else if (uiStore.debugPokedexMode === 'caught') {
        isSeen = true
        isCaught = true
      } else if (uiStore.debugPokedexMode === 'seen') {
        isSeen = true
      }
      const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
      const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'

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

      let spawnType = 'Pesca'
      let statusClass = 'common'
      if (isVisitor) {
        spawnType = 'Visitante'
        statusClass = 'visitor'
      } else if (isExclusive) {
        spawnType = 'Exclusivo'
        statusClass = 'exclusive'
      } else if (isBlocked) {
        spawnType = 'Bloqueado'
        statusClass = 'blocked'
      } else if (isBuffed) {
        spawnType = 'Potenciado'
        statusClass = 'buffed'
      } else if (isDebuffed) {
        spawnType = 'Debilitado'
        statusClass = 'debuffed'
      }

      return {
        id,
        name,
        isSeen,
        isCaught,
        sprite: getAssetUrl(ASSET_TYPES.POKEMON, id),
        percentage,
        baseRate,
        basePercentage,
        diff,
        spawnType,
        statusClass,
        multiplier,
        types: data ? [data.type, data.type2].filter(Boolean) as string[] : [],
        hp: data?.hp || 0,
        atk: data?.atk || 0,
        def: data?.def || 0,
        spa: data?.spa || 0,
        spd: data?.spd || 0,
        spe: data?.spe || 0,
        totalStats: data ? (data.hp + data.atk + data.def + data.spa + data.spd + data.spe) : 0
      }
    }).sort((a, b) => {
      if (a.percentage > 0 && b.percentage === 0) return -1
      if (a.percentage === 0 && b.percentage > 0) return 1
      if (a.percentage > 0 && b.percentage > 0) return b.percentage - a.percentage
      return b.totalStats - a.totalStats
    })
  })

  function getFishingSpawnTooltip(poke: FishingSpawnData) {
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
    if (poke.multiplier !== 1) {
      const change = poke.multiplier > 1 ? 'Aumento por Clima' : 'Reducción por Clima'
      const label = translateWeather(props.weather)
      lines.push(`• ${change} en especie: x${poke.multiplier} (${label})`)
    }
    if (poke.spawnType === 'Visitante') {
      const label = translateWeather(props.weather)
      const diffVal = poke.percentage - poke.basePercentage
      lines.push(`• Pokémon Visitante del clima (${label}): +${diffVal.toFixed(1)}% de probabilidad activa`)
    } else if (poke.spawnType === 'Exclusivo') {
      const label = translateWeather(props.weather)
      const diffVal = poke.percentage - poke.basePercentage
      lines.push(`• Pokémon Exclusivo del clima (${label}): +${diffVal.toFixed(1)}% de probabilidad activa`)
    } else {
      const diffVal = poke.percentage - poke.basePercentage
      if (Math.abs(diffVal) > 0.05) {
        const direction = diffVal > 0 ? 'Aumento' : 'Reducción'
        const detail = diffVal > 0
          ? 'redistribución proporcional al bloquearse, penalizarse o cambiar de hora otros Pokémon'
          : 'redistribución proporcional al inyectarse nuevos Pokémon o potenciarse otros encuentros'
        lines.push(`• ${direction} neto: ${diffVal > 0 ? '+' : ''}${diffVal.toFixed(1)}% (${detail})`)
      }
    }
    const eventFishingBonus = eventStore.globalMultipliers?.fishing || 1
    if (eventFishingBonus !== 1) {
      const activeFishingEvents = eventStore.activeEvents.filter(e => {
        const cfg = (typeof e.config === 'string' ? JSON.parse(e.config) : e.config) as EventConfig | undefined
        return cfg && cfg.fishingMult
      })
      const eventNames = activeFishingEvents.map(e => e.name).join(', ')
      lines.push(`• Evento Semanal (${eventNames}): x${eventFishingBonus.toFixed(1)} de probabilidad general`)
    }

    const globalShiny = eventStore.globalMultipliers?.shiny || 1
    if (globalShiny !== 1) {
      lines.push(`• Evento Shiny Global: x${globalShiny.toFixed(1)} de probabilidad Shiny`)
    }
    const speciesBonuses = eventStore.getSpeciesBonuses(poke.id)
    if (speciesBonuses && speciesBonuses.shiny !== 1) {
      lines.push(`• Evento Shiny Especie: x${speciesBonuses.shiny.toFixed(1)} de probabilidad Shiny`)
    }

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
