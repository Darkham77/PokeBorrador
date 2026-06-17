import { computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getEncounterPool } from '@/logic/encounters/encounters'
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/weather/weatherRegistry'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { EventConfig } from '@/logic/events/eventEngine'

interface WildSpawnData {
  id: string
  name: string
  basePercentage: number
  percentage: number
  multiplier: number
  spawnType: string
}

export function useRouteSpawnsWild(
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

  const wildSpawns = computed(() => {
    const activeEvents = eventStore.activeEvents || []
    const allMapSpawns = new Set<string>()
    const cycles = ['morning', 'day', 'dusk', 'night']
    cycles.forEach(c => {
      const list = props.map.wild?.[c] || []
      list.forEach(id => allMapSpawns.add(id))
    })
    
    const weatherCfg = props.map.weather?.[props.weather]
    if (weatherCfg) {
      if (weatherCfg.visitors) {
        const visitors = Array.isArray(weatherCfg.visitors) ? weatherCfg.visitors : Object.keys(weatherCfg.visitors)
        visitors.forEach(id => allMapSpawns.add(id))
      }
      if (weatherCfg.exclusive) {
        const exclusives = Array.isArray(weatherCfg.exclusive) ? weatherCfg.exclusive : Object.keys(weatherCfg.exclusive)
        exclusives.forEach(id => allMapSpawns.add(id))
      }
    }
    activeEvents.forEach(ev => {
      const cfg = (typeof ev.config === 'string' ? JSON.parse(ev.config) : ev.config) as EventConfig | undefined
      if (ev.active && cfg?.species) {
        cfg.species.split(',').forEach((s: string) => {
          const clean = s.trim().toLowerCase()
          if (clean) allMapSpawns.add(clean)
        })
      }
    })
    const fullPool = Array.from(allMapSpawns)

    const { pool: activePool, rates: rawRates } = getEncounterPool(props.map, props.cycle, props.weather, activeEvents)
    const activeRates = [...rawRates]
    
    const visitorIndices = activeRates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1)
    const nativeIndices = activeRates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1)

    const exclusives = weatherCfg?.exclusive ? (Array.isArray(weatherCfg.exclusive) ? weatherCfg.exclusive : Object.keys(weatherCfg.exclusive)) : []
    nativeIndices.forEach(idx => {
      const spId = activePool[idx]
      if (spId) {
        const isExclusive = exclusives.includes(spId)
        if (!isExclusive) {
          activeRates[idx] = (activeRates[idx] || 0) * getWeatherMultiplier(spId, props.weather)
        }
      }
    })

    if (visitorIndices.length > 0) {
      const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (activeRates[idx] || 0), 0)
      const visitorQuota = totalNativeWeight / 9
      const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(activeRates[idx] || 0), 0)
      
      visitorIndices.forEach(idx => {
        const relativeWeight = Math.abs(activeRates[idx] || 0) / (sumRelativeWeights || 1)
        activeRates[idx] = visitorQuota * relativeWeight
      })
    }

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
        baseRate = baseRates[originalIdx] !== undefined ? baseRates[originalIdx] : 10
        basePercentage = totalBaseRate > 0 ? (baseRate / totalBaseRate) * 100 : 0
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
      
      const isVisitor = !!(weatherCfg?.visitors && (
        (!Array.isArray(weatherCfg.visitors) && (weatherCfg.visitors as Record<string, number>)[id]) || 
        (Array.isArray(weatherCfg.visitors) && weatherCfg.visitors.includes(id))
      ))
      const isExclusive = !!(weatherCfg?.exclusive && (
        (!Array.isArray(weatherCfg.exclusive) && (weatherCfg.exclusive as Record<string, number>)[id]) || 
        (Array.isArray(weatherCfg.exclusive) && weatherCfg.exclusive.includes(id))
      ))
      
      const multiplier = getWeatherMultiplier(id, props.weather)
      const isBuffed = !isVisitor && !isExclusive && multiplier > 1.0
      const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0
      const isBlocked = multiplier === 0
      
      const isInCurrentCycle = wildList.includes(id)

      let spawnType = 'Común'
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
      } else if (!isInCurrentCycle) {
        spawnType = 'Fuera de hora'
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

  function getWildSpawnTooltip(poke: WildSpawnData) {
    const lines: string[] = []
    lines.push(`Probabilidad Base: ${poke.basePercentage.toFixed(1)}%`)
    if (poke.multiplier !== 1) {
      const change = poke.multiplier > 1 ? 'Aumento por Clima' : 'Reducción por Clima'
      const label = translateWeather(props.weather)
      lines.push(`• ${change}: x${poke.multiplier} (${label})`)
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
    const speciesEvent = eventStore.activeEvents.find(e => {
      const cfg = (typeof e.config === 'string' ? JSON.parse(e.config) : e.config) as EventConfig | undefined
      if (cfg?.species) {
        return cfg.species.split(',').map((s: string) => s.trim().toLowerCase()).includes(poke.id)
      }
      return false
    })
    if (speciesEvent) {
      const cfg = (typeof speciesEvent.config === 'string' ? JSON.parse(speciesEvent.config) : speciesEvent.config) as EventConfig | undefined
      if (cfg?.speciesRateMult && cfg.speciesRateMult !== 1) {
        lines.push(`• Evento Activo (${speciesEvent.name}): Multiplicador x${cfg.speciesRateMult}`)
      }
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
      title: `DETALLES DE PROBABILIDAD`,
      description: lines.join('\n')
    }
  }

  return {
    wildSpawns,
    getWildSpawnTooltip
  }
}
