import { computed } from 'vue'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { getWeatherCombatDescription } from '@/logic/weather/weatherGenerationProvider'
import type { MapLocation } from '@/types/pokemon/encounters'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { getNpcEncounterChances } from '@/logic/weather/weatherUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { type WeatherId } from '@/logic/weather/weatherRegistry'
import { type DayPhase } from '@/logic/utils/timeUtils'

import { useRouteSpawnsWild } from './useRouteSpawnsWild.ts'
import { useRouteSpawnsFishing } from './useRouteSpawnsFishing.ts'
import { useRouteSpawnsArchaeology } from './useRouteSpawnsArchaeology.ts'

import {
  computeActiveWeights,
  parseWeatherDescription,
  formatTerrainTags,
  type ExtendedMapLocation,
} from './routeSpawnsCalculationHelper.ts'

export interface RouteSpawnsProps {
  map: MapLocation;
  weather: WeatherId;
  cycle: DayPhase;
}

export function useRouteSpawnsCalculation(props: RouteSpawnsProps) {
  const gameStore = useGameStore()
  const eventStore = useEventStore()

  const { wildSpawns, getWildSpawnTooltip } = useRouteSpawnsWild(props)
  const { fishingSpawns, getFishingSpawnTooltip } = useRouteSpawnsFishing(props)
  const { archaeologyRewards, getArchaeologySpawnTooltip } = useRouteSpawnsArchaeology(props)

  const weatherEmoji = computed(() => {
    const visual = WEATHER_VISUAL_METADATA[props.weather]
    if (visual) return visual.icon
    const mech = getMechanicalWeather(props.weather)
    return WEATHER_UI_METADATA[mech]?.icon || ''
  })

  const weatherLabel = computed(() => {
    const visual = WEATHER_VISUAL_METADATA[props.weather]
    if (visual) return visual.label
    const mech = getMechanicalWeather(props.weather)
    return WEATHER_UI_METADATA[mech]?.label || 'Normal'
  })

  const weatherDetails = computed(() => {
    const raw = WEATHER_REGISTRY[props.weather] || null
    if (!raw) return null
    return {
      ...raw,
      description: getWeatherCombatDescription(props.weather, ACTIVE_GENERATION)
    }
  })

  const parsedDescriptionLines = computed(() => {
    const desc = weatherDetails.value?.description || ''
    return parseWeatherDescription(desc)
  })

  const getStatusTooltip = (type: string) => {
    const weatherName = weatherLabel.value || 'el clima actual'
    const tooltips: Record<string, { title: string, desc: string }> = {
      'Común': {
        title: 'Común',
        desc: 'Aparición habitual en esta zona durante este ciclo de tiempo.'
      },
      'Visitante': {
        title: 'Visitante Climático',
        desc: `Pokémon que no habita esta zona normalmente, pero es atraído por el clima actual (${weatherName}).`
      },
      'Exclusivo': {
        title: 'Exclusivo Climático',
        desc: `Pokémon que solo puede aparecer en esta zona bajo las condiciones del clima actual (${weatherName}).`
      },
      'Bloqueado': {
        title: 'Bloqueado por Clima',
        desc: `El clima actual (${weatherName}) impide que este Pokémon aparezca en la zona.`
      },
      'Fuera de hora': {
        title: 'Fuera de Hora',
        desc: 'Este Pokémon no está activo en esta ruta durante este ciclo horario.'
      },
      'Potenciado': {
        title: `Potenciado por clima (${weatherName})`,
        desc: `La probabilidad de aparición de este Pokémon ha sido aumentada por el clima actual: ${weatherName}.`
      },
      'Debilitado': {
        title: `Debilitado por clima (${weatherName})`,
        desc: `La probabilidad de aparición de este Pokémon ha sido reducida por el clima actual: ${weatherName}.`
      },
      'Pesca': {
        title: 'Encuentro de Pesca',
        desc: 'Pokémon que solo puede encontrarse pescando en el agua.'
      }
    }
    return tooltips[type] || { title: type, desc: '' }
  }

  const terrainTags = computed(() => {
    return formatTerrainTags(props.map as ExtendedMapLocation)
  })

  const activeWeights = computed(() => {
    const hasFishingRod = (gameStore.state.fishingRodSecs ?? 0) > 0
    const hasPickaxeOrBrush = (gameStore.state.pickaxeSecs ?? 0) > 0 || (gameStore.state.brushSecs ?? 0) > 0
    const eventFishingBonus = eventStore.globalMultipliers?.fishing ?? 1

    return computeActiveWeights(
      props.map as ExtendedMapLocation,
      props.weather,
      hasFishingRod,
      hasPickaxeOrBrush,
      eventFishingBonus
    )
  })

  const activeFishingChance = computed(() => {
    const w = activeWeights.value
    if (w.total === 0 || !props.map.fishing) return 0
    return Math.round((w.fishing / w.total) * 100)
  })

  const baseFishingChance = computed(() => {
    const w = activeWeights.value
    if (w.baseTotal === 0 || !props.map.fishing) return 0
    return Math.round((w.baseFishing / w.baseTotal) * 100)
  })

  const activeArchaeologyChance = computed(() => {
    const w = activeWeights.value
    if (w.total === 0 || !props.map.archaeology) return 0
    return Math.round((w.archaeology / w.total) * 100)
  })

  const baseArchaeologyChance = computed(() => {
    const w = activeWeights.value
    if (w.baseTotal === 0 || !props.map.archaeology) return 0
    return Math.round((w.baseArchaeology / w.baseTotal) * 100)
  })

  const activeTerrestrialChance = computed(() => {
    const w = activeWeights.value
    if (w.total === 0) return 0
    return Math.round((w.ground / w.total) * 100)
  })

  const baseTerrestrialChance = computed(() => {
    const w = activeWeights.value
    if (w.baseTotal === 0) return 0
    return Math.round((w.baseGround / w.baseTotal) * 100)
  })

  const getProbClass = (active: number, base: number) => {
    if (active > base) return 'bonus-text'
    if (active < base) return 'penalty-text'
    return ''
  }

  const getCategoryTooltip = (type: string) => {
    switch (type) {
      case 'Fósil':
        return { title: 'Fósil Ancestral', desc: 'Fósil desenterrable que puede ser clonado en el Daycare para obtener Pokémon ancestrales.' }
      case 'Evolución':
        return { title: 'Piedra de Evolución', desc: 'Piedras especiales utilizadas para evolucionar ciertas especies de Pokémon.' }
      case 'Mineral':
        return { title: 'Mineral Común', desc: 'Material básico útil para vender en la tienda o refinar.' }
      case 'Valioso':
        return { title: 'Gemas y Metales Raros', desc: 'Objetos y gemas de alta rareza de gran valor comercial.' }
      default:
        return { title: 'Objeto de Arqueología', desc: 'Recompensa obtenible mediante la excavación en zonas de arqueología.' }
    }
  }

  const npcSpawns = computed(() => {
    const maps = pokemonDataProvider.getMaps() as MapLocation[] // domain-ok: Open dynamic text or non-domain string payload
    const mapIds = maps.map(m => m.id)
    return getNpcEncounterChances(props.map.id, gameStore.state, {}, mapIds)
  })

  const eventFishingMultiplier = computed(() => {
    return eventStore.globalMultipliers?.fishing || 1
  })

  const eventArchaeologyMultiplier = computed(() => {
    return eventStore.globalMultipliers?.archaeology || 1
  })

  return {
    weatherEmoji,
    weatherLabel,
    weatherDetails,
    parsedDescriptionLines,
    getStatusTooltip,
    wildSpawns,
    fishingSpawns,
    terrainTags,
    activeWeights,
    activeFishingChance,
    baseFishingChance,
    activeArchaeologyChance,
    baseArchaeologyChance,
    activeTerrestrialChance,
    baseTerrestrialChance,
    eventFishingMultiplier,
    eventArchaeologyMultiplier,
    getProbClass,
    getCategoryTooltip,
    archaeologyRewards,
    getWildSpawnTooltip,
    getFishingSpawnTooltip,
    getArchaeologySpawnTooltip,
    npcSpawns
  }
}
