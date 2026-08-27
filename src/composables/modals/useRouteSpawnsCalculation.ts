// fallow-ignore-file security-sink
import { computed } from 'vue'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { getWeatherCombatDescription } from '@/logic/weather/weatherGenerationProvider'
import type { MapLocation } from '@/types/pokemon/encounters'
import { GAME_RATIOS } from '@/data/system/constants'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { getNpcEncounterChances } from '@/logic/weather/weatherUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { type WeatherId } from '@/logic/weather/weatherRegistry'
import { type DayPhase } from '@/logic/utils/timeUtils'

import { useRouteSpawnsWild } from './useRouteSpawnsWild.ts'
import { useRouteSpawnsFishing } from './useRouteSpawnsFishing.ts'
import { useRouteSpawnsArchaeology } from './useRouteSpawnsArchaeology.ts'

const ARCHAEOLOGY_CAVE_BASE_WEIGHT = 10;
const ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT = 5;
const RAINY_FISHING_CLIMATE_MULTIPLIER = 1.20;
const EQUIPPED_TOOL_WEIGHT_BONUS = 600;

interface ExtendedMapLocation extends MapLocation {
  isVolcanic?: boolean
  isSwamp?: boolean
  isArctic?: boolean
  isForest?: boolean
  isCoastal?: boolean
  isMountain?: boolean
  isPlains?: boolean
  isUrban?: boolean
}

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

  const SPANISH_TYPE_MAP: Record<string, string> = {
    'fuego': 'fire',
    'agua': 'water',
    'planta': 'grass',
    'eléctrico': 'electric',
    'hielo': 'ice',
    'tierra': 'ground',
    'roca': 'rock',
    'volador': 'flying',
    'bicho': 'bug',
    'fantasma': 'ghost',
    'siniestro': 'dark',
    'dragón': 'dragon',
    'acero': 'steel',
    'hada': 'fairy',
    'psíquico': 'psychic',
    'veneno': 'poison',
    'normal': 'normal',
    'lucha': 'fighting'
  }

  const parsedDescriptionLines = computed(() => {
    const desc = weatherDetails.value?.description || ''
    if (!desc) return []

    const sentences = desc.split(/\n|\.\s+/).map(s => s.trim()).filter(Boolean)
    const typeWords = Object.keys(SPANISH_TYPE_MAP)
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`\\b(${typeWords.join('|')})\\b`, 'gi')
    return sentences.map(sentence => {
      // Sanitizar indicadores de viñeta manual si existen (por ej. ▲, ▼, •)
      const cleanSentence = sentence.endsWith('.') ? sentence : sentence
      const currentSentence = cleanSentence.replace(/^[▲▼•]\s*/u, '').trim()
      const lowerSentence = currentSentence.toLowerCase() // text-ok

      let typeClass = ''
      let icon = ''
      let label = ''
      let restOfSentence = currentSentence

      if (lowerSentence.startsWith('potencia')) {
        typeClass = 'boost'
        icon = '▲ '
        label = 'POTENCIA:'
        restOfSentence = currentSentence.substring(8).trim()
      } else if (lowerSentence.startsWith('debilita')) {
        typeClass = 'debuff'
        icon = '▼ '
        label = 'DEBILITA:'
        restOfSentence = currentSentence.substring(8).trim()
      } else if (lowerSentence.startsWith('penaliza')) {
        typeClass = 'debuff'
        icon = '▼ '
        label = 'PENALIZA:'
        restOfSentence = currentSentence.substring(8).trim()
      } else if (lowerSentence.startsWith('bloquea')) {
        typeClass = 'block'
        icon = 'block'
        label = 'BLOQUEA:'
        restOfSentence = currentSentence.substring(7).trim()
      } else if (lowerSentence.startsWith('efecto:')) {
        typeClass = 'effect'
        icon = '⚡ '
        label = 'EFECTO:'
        restOfSentence = currentSentence.substring(7).trim()
      }

      const parts = restOfSentence.split(regex)
      const segments = parts.filter(Boolean).map(part => {
        const lower = part.toLowerCase() // text-ok
        const typeKey = SPANISH_TYPE_MAP[lower]
        return {
          text: part,
          isType: !!typeKey,
          type: typeKey || ''
        }
      })

      return {
        segments,
        typeClass,
        icon,
        label
      }
    })
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
    const m = props.map as ExtendedMapLocation
    const tags: string[] = [] // no-domain
    if (m.isCrystalCave) tags.push('💎 Cueva de Cristal')
    if (m.isCave) tags.push('🧗 Cueva')
    if (m.isVolcanic) tags.push('🌋 Volcánico')
    if (m.isSwamp) tags.push('🐊 Pantano')
    if (m.isArctic) tags.push('❄️ Ártico')
    if (m.isForest) tags.push('🌲 Bosque')
    if (m.isCoastal) tags.push('🏖️ Costa')
    if (m.isMountain) tags.push('⛰️ Montaña')
    if (m.isPlains) tags.push('🌾 Llanura')
    if (m.isUrban) tags.push('🏙️ Urbano')
    if (m.isIndoors) tags.push('🏠 Interior')
    
    if (tags.length === 0) tags.push('🌲 Exterior')
    return tags.join(', ')
  })

  const activeWeights = computed(() => {
    const weather = props.weather || 'clear'
    const isRainy = (['rain', 'heavy_rain', 'storm', 'thunderstorm'] as const).includes((weather as string).toLowerCase() as never) // text-ok
    const climateFishingMultiplier = isRainy ? RAINY_FISHING_CLIMATE_MULTIPLIER : 1.0
    const eventFishingBonus = eventStore.globalMultipliers?.fishing || 1
    const fishingBonus = eventFishingBonus * climateFishingMultiplier

    const groundWeight = 100
    
    let fishingWeight = 0
    if (props.map.fishing) {
      fishingWeight = GAME_RATIOS.encounters.fishing * 100 * fishingBonus
      if ((gameStore.state.fishingRodSecs || 0) > 0) {
        fishingWeight += EQUIPPED_TOOL_WEIGHT_BONUS
      }
    }

    let archWeight = 0
    if (props.map.archaeology) {
      const isCave = !!props.map.isCave
      const isMountain = !!props.map.isMountain
      archWeight = isCave ? ARCHAEOLOGY_CAVE_BASE_WEIGHT : (isMountain ? ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT : 0)
      if ((gameStore.state.pickaxeSecs || 0) > 0 || (gameStore.state.brushSecs || 0) > 0) {
        archWeight += EQUIPPED_TOOL_WEIGHT_BONUS
      }
    }

    const totalWeight = groundWeight + fishingWeight + archWeight

    let baseFishingWeight = 0
    if (props.map.fishing) {
      baseFishingWeight = GAME_RATIOS.encounters.fishing * 100
    }
    let baseArchWeight = 0
    if (props.map.archaeology) {
      const isCave = !!props.map.isCave
      const isMountain = !!props.map.isMountain
      baseArchWeight = isCave ? ARCHAEOLOGY_CAVE_BASE_WEIGHT : (isMountain ? ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT : 0)
    }
    const baseTotalWeight = groundWeight + baseFishingWeight + baseArchWeight

    return {
      ground: groundWeight,
      fishing: fishingWeight,
      archaeology: archWeight,
      total: totalWeight,
      baseGround: groundWeight,
      baseFishing: baseFishingWeight,
      baseArchaeology: baseArchWeight,
      baseTotal: baseTotalWeight
    }
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
    const maps = pokemonDataProvider.getMaps() as MapLocation[] // domain-ok
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
