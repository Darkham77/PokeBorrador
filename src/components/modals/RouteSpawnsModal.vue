// [PureVue-Ignore-Length]
<script setup lang="ts">
/**
 * src/components/modals/RouteSpawnsModal.vue
 * 
 * Player-facing modal displaying full probability details of wild spawns in the route.
 * Shows base rate vs active rate, types, stats, weather statuses, and capture states.
 */
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getEncounterPool } from '@/logic/encounters'
import { getWeatherMultiplier } from '@/logic/weatherUtils'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import type { MapLocation } from '@/types/encounters'
import type { EventConfig } from '@/logic/events/eventEngine'

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

interface Props {
  show?: boolean
  map: MapLocation
  weather: string
  cycle: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const eventStore = useEventStore()

const cycleLabels: Record<string, string> = {
  morning: '🌅 Amanecer',
  day: '☀️ Día',
  dusk: '🌇 Ocaso',
  night: '🌙 Noche'
}

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
  return WEATHER_REGISTRY[props.weather] || null
})

// Mapeo amigable en español de los tipos Pokémon que aparecen en las descripciones
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

  // Separar por puntos (ignorando el punto al final de cada frase si lo hubiera para evitar vacíos)
  const sentences = desc.split(/\.\s+/).map(s => s.trim()).filter(Boolean)
  const typeWords = Object.keys(SPANISH_TYPE_MAP)
  const regex = new RegExp(`\\b(${typeWords.join('|')})\\b`, 'gi')

  return sentences.map(sentence => {
    // Asegurar que termine en punto para mantener la ortografía correcta por frase
    const cleanSentence = sentence.endsWith('.') ? sentence : `${sentence}.`
    const lowerSentence = cleanSentence.toLowerCase()

    let typeClass = ''
    let icon = ''
    let label = ''
    let restOfSentence = cleanSentence

    // Extraer palabra clave de acción al principio de la frase (ignorar caso pero extraer en mayúsculas)
    if (lowerSentence.startsWith('potencia')) {
      typeClass = 'boost'
      icon = '▲ '
      label = 'POTENCIA:'
      restOfSentence = cleanSentence.substring(8).trim()
    } else if (lowerSentence.startsWith('debilita')) {
      typeClass = 'debuff'
      icon = '▼ '
      label = 'DEBILITA:'
      restOfSentence = cleanSentence.substring(8).trim()
    } else if (lowerSentence.startsWith('penaliza')) {
      typeClass = 'debuff'
      icon = '▼ '
      label = 'PENALIZA:'
      restOfSentence = cleanSentence.substring(8).trim()
    } else if (lowerSentence.startsWith('bloquea')) {
      typeClass = 'block'
      icon = 'block'
      label = 'BLOQUEA:'
      restOfSentence = cleanSentence.substring(7).trim()
    }

    const parts = restOfSentence.split(regex)
    const segments = parts.filter(Boolean).map(part => {
      const lower = part.toLowerCase()
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

const modalStore = useModalStore()

const openPokemonDetail = (speciesId: string, isSeen: boolean) => {
  if (!isSeen) return
  modalStore.open('PokemonDetail', { speciesId, context: 'pokedex' })
}

const wildSpawns = computed(() => {
  const activeEvents = eventStore.activeEvents || []
  
  // 1. Collect all unique wild/walking spawns
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

  // 2. Get base pool and rates for current active cycle
  const { pool: activePool, rates: rawRates } = getEncounterPool(props.map, props.cycle, props.weather, activeEvents)
  const activeRates = [...rawRates]
  
  const visitorIndices = activeRates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1)
  const nativeIndices = activeRates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1)

  // 3. Apply weather modifiers to active native spawns
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

  // 4. Normalize visitors (10% total weight)
  if (visitorIndices.length > 0) {
    const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (activeRates[idx] || 0), 0)
    const visitorQuota = totalNativeWeight / 9
    const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(activeRates[idx] || 0), 0)
    
    visitorIndices.forEach(idx => {
      const relativeWeight = Math.abs(activeRates[idx] || 0) / (sumRelativeWeights || 1)
      activeRates[idx] = visitorQuota * relativeWeight
    })
  }

  // 5. Calculate total active rates/weights
  const totalRate = activeRates.reduce((sum, r) => sum + r, 0)
  
  const seenPokedex = gameStore.state.seenPokedex || []
  const caughtPokedex = gameStore.state.pokedex || []

  // 6. Build final spawn metrics
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

    const isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
    const isCaught = caughtPokedex.includes(id)
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
    
    // Para 0%, priorizar comunes sobre bloqueadas/fuera de hora
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

const fishingSpawns = computed(() => {
  if (!props.map.fishing?.pool) return []

  let pool = [...props.map.fishing.pool]
  let rates = [...props.map.fishing.rates]
  while (rates.length < pool.length) rates.push(10)

  // Apply Weather injections (visitors & exclusives) to fishing pool
  const weatherCfg = props.map.weather?.[props.weather]
  if (props.weather && props.weather !== 'clear' && weatherCfg) {
    if (weatherCfg.exclusive) {
      const exclusives = Array.isArray(weatherCfg.exclusive) ? weatherCfg.exclusive : Object.keys(weatherCfg.exclusive)
      exclusives.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id)
          const weight = Array.isArray(weatherCfg.exclusive) ? 5 : ((weatherCfg.exclusive as Record<string, number>)[id] || 5)
          rates.push(weight)
        }
      })
    }
    if (weatherCfg.visitors) {
      const visitors = Array.isArray(weatherCfg.visitors) ? weatherCfg.visitors : Object.keys(weatherCfg.visitors)
      visitors.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id)
          const weight = Array.isArray(weatherCfg.visitors) ? -10 : -((weatherCfg.visitors as Record<string, number>)[id] || 10)
          rates.push(weight)
        }
      })
    }
  }

  // Apply Weather Multipliers & Normalization to fishing pool
  if (props.weather && props.weather !== 'clear') {
    const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1)
    const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1)
    const exclusives = weatherCfg?.exclusive ? (Array.isArray(weatherCfg.exclusive) ? weatherCfg.exclusive : Object.keys(weatherCfg.exclusive)) : []

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
      const visitorQuota = totalNativeWeight / 9 // 10% weight
      const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx] || 0), 0)
      visitorIndices.forEach(idx => {
        const relativeWeight = Math.abs(rates[idx] || 0) / (sumRelativeWeights || 1)
        rates[idx] = visitorQuota * relativeWeight
      })
    }
  }

  const totalRate = rates.reduce((sum, r) => sum + r, 0)
  const seenPokedex = gameStore.state.seenPokedex || []
  const caughtPokedex = gameStore.state.pokedex || []

  return pool.map((id, index) => {
    const rateVal = rates[index] || 0
    const percentage = totalRate > 0 ? (rateVal / totalRate) * 100 : 0

    // Calculate base percentage (without weather)
    const baseIndex = props.map.fishing!.pool.indexOf(id)
    let baseRate = 0
    let basePercentage = 0
    if (baseIndex !== -1) {
      baseRate = props.map.fishing!.rates[baseIndex] !== undefined ? props.map.fishing!.rates[baseIndex] : 10
      const totalBase = props.map.fishing!.rates.reduce((sum, r) => sum + r, 0)
      basePercentage = totalBase > 0 ? (baseRate / totalBase) * 100 : 0
    }

    const diff = percentage - basePercentage

    const isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
    const isCaught = caughtPokedex.includes(id)
    const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
    const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'

    // Status type mapping
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

const terrainTags = computed(() => {
  const m = props.map as ExtendedMapLocation
  const tags: string[] = []
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

const isRainyWeather = computed(() => {
  return ['rain', 'heavy_rain', 'storm', 'thunderstorm'].includes(props.weather.toLowerCase())
})
</script>

<template>
  <BaseModal
    :show="show"
    :title="`ZONA SALVAJE: ${map.name.toUpperCase()}`"
    max-width="850px"
    type="center"
    @close="emit('close')"
  >
    <div class="route-spawns-modal-container">
      <!-- Info Header -->
      <div class="route-info-bar">
        <div class="info-item">
          <span class="label">Ciclo Actual:</span>
          <span class="value">{{ cycleLabels[cycle] || cycle }}</span>
        </div>
        <div class="info-item">
          <span class="label">Clima Activo:</span>
          <span class="value">{{ weatherEmoji }} {{ weatherLabel }}</span>
        </div>
        <div class="info-item">
          <span class="label">Nivel de Zona:</span>
          <span class="value">Nv. {{ map.lv[0] }} - {{ map.lv[1] }}</span>
        </div>
      </div>

      <!-- Terrain / Map features and Weather Effects card -->
      <div class="weather-effects-card">
        <!-- Left panel: Weather description & Type modifiers -->
        <div class="weather-panel-details">
          <div class="weather-header-line">
            <span class="weather-title-badge">{{ weatherEmoji }} EFECTOS EN COMBATE</span>
            <div
              v-if="parsedDescriptionLines.length"
              class="weather-desc-lines"
            >
              <div
                v-for="(line, lineIdx) in parsedDescriptionLines"
                :key="lineIdx"
                :class="['weather-desc-line', line.typeClass]"
              >
                <!-- Si tiene label/acción, lo mostramos con estilo de pill/label pixelado -->
                <div
                  v-if="line.label"
                  class="desc-line-label"
                >
                  <span class="desc-line-icon">
                    <template v-if="line.icon === 'block'">🚫 </template>
                    <template v-else>{{ line.icon }}</template>
                  </span>
                  <span class="desc-line-text">{{ line.label }}</span>
                </div>

                <div :class="[line.label ? 'desc-line-value' : 'desc-line-full']">
                  <template
                    v-for="(segment, idx) in line.segments"
                    :key="idx"
                  >
                    <PokemonTypeTag
                      v-if="segment.isType"
                      :type="segment.type"
                      size="ssm"
                      class="inline-type-tag"
                    />
                    <span v-else-if="!line.label">{{ segment.text }}</span>
                  </template>
                </div>
              </div>
            </div>
            <span
              v-else
              class="weather-desc-line"
            >
              Sin efectos climáticos especiales en combate.
            </span>
          </div>

          <!-- Type modifiers tags lists (Map Spawns) -->
          <div
            v-if="weatherDetails?.modifiers"
            class="weather-modifiers-section"
          >
            <span class="weather-title-badge">⛅ APARICIÓN DE CLIMA</span>
            <div class="weather-type-modifiers">
              <div 
                v-if="weatherDetails.modifiers.boost?.length" 
                class="modifier-group boost"
              >
                <span class="group-label">▲ BONIFICACIÓN:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.boost"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>

              <div 
                v-if="weatherDetails.modifiers.debuff?.length" 
                class="modifier-group debuff"
              >
                <span class="group-label">▼ PENALIZACIÓN:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.debuff"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>

              <div 
                v-if="weatherDetails.modifiers.block?.length" 
                class="modifier-group block"
              >
                <span class="group-label">🚫 BLOQUEADO:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.block"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right panel: Terrain and features -->
        <div class="terrain-panel-details">
          <span class="terrain-title-badge">🗺️ CARACTERÍSTICAS</span>
          <div class="terrain-items">
            <div class="terrain-item">
              <span class="label">Entorno:</span>
              <span class="value">
                {{ terrainTags }}
              </span>
            </div>
            <div
              v-if="map.fishing"
              class="terrain-item"
            >
              <span class="label">Pesca:</span>
              <span class="value">
                🎣 Disponible (Nv. {{ map.fishing.lv[0] }}-{{ map.fishing.lv[1] }})
                <span
                  v-if="isRainyWeather"
                  class="buffed-text"
                  style="font-size: 9px; font-weight: bold; margin-left: 4px;"
                >
                  (+20% Clima)
                </span>
              </span>
            </div>
            <div
              v-else
              class="terrain-item"
            >
              <span class="label">Pesca:</span>
              <span class="value gray-text">❌ No disponible</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Terrestrial Spawns List -->
      <div class="spawns-section">
        <h3 class="section-title-pixel">
          🚶 ENCUENTROS TERRESTRES
        </h3>
        <div class="spawns-report-scroll">
          <div class="report-table-header">
            <div class="col-pokemon">
              Pokémon
            </div>
            <div class="col-types">
              Tipos
            </div>
            <div class="col-type">
              Estado
            </div>
            <div class="col-multiplier">
              Clima
            </div>
            <div class="col-prob">
              Prob. Real
            </div>
            <div class="col-stats">
              Stats
            </div>
          </div>

          <div class="report-rows">
            <div
              v-for="poke in wildSpawns"
              :key="poke.id"
              class="report-row"
              :class="[poke.statusClass, { 'is-unseen': !poke.isSeen }]"
              :style="{ cursor: poke.isSeen ? 'pointer' : 'default' }"
              @click="openPokemonDetail(poke.id, poke.isSeen)"
            >
              <!-- Pokémon Info (Icon, Name, Caught) -->
              <div class="col-pokemon row-cell flex-align">
                <div class="mini-sprite-wrapper">
                  <img
                    v-if="poke.isSeen"
                    :src="poke.sprite"
                    class="mini-sprite"
                    :class="{ 'spawn-silhouette': !poke.isCaught }"
                  >
                  <div
                    v-else
                    class="unknown-placeholder"
                  >
                    ?
                  </div>
                </div>
                <div class="poke-name-wrap">
                  <span class="poke-name">{{ poke.name }}</span>
                  <span
                    v-if="!poke.isSeen"
                    class="unseen-tag"
                  >? NO VISTO</span>
                </div>
              </div>

              <!-- Types -->
              <div class="col-types row-cell flex-align">
                <template v-if="poke.isSeen && poke.types.length">
                  <PokemonTypeTag
                    v-for="t in poke.types"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </template>
                <span
                  v-else
                  class="hidden-info-placeholder"
                >???</span>
              </div>

              <!-- Spawn Status Type -->
              <div class="col-type row-cell flex-align">
                <PVTooltip
                  :title="getStatusTooltip(poke.spawnType).title"
                  :description="getStatusTooltip(poke.spawnType).desc"
                >
                  <span :class="['status-tag', poke.statusClass]">
                    {{ poke.spawnType }}
                  </span>
                </PVTooltip>
              </div>

              <!-- Climate Multiplier -->
              <div class="col-multiplier row-cell flex-align text-center">
                <template v-if="poke.spawnType === 'Visitante' || poke.spawnType === 'Exclusivo'">
                  <span :class="['status-tag', poke.statusClass]">{{ weatherEmoji }} {{ weatherLabel }}</span>
                </template>
                <template v-else-if="poke.multiplier === 0">
                  <span class="status-tag blocked">Bloqueado</span>
                </template>
                <template v-else-if="poke.multiplier !== 1">
                  <span :class="['status-tag', poke.multiplier > 1 ? 'buffed' : 'debuffed']">
                    x{{ poke.multiplier }}
                  </span>
                </template>
                <template v-else>
                  <span class="mult-value neutral-text">-</span>
                </template>
              </div>

              <!-- Probability -->
              <div class="col-prob row-cell flex-align">
                <div class="prob-bar-wrapper">
                  <div class="prob-numerical">
                    <span class="active-prob">
                      {{ poke.percentage.toFixed(1) }}%
                      <span
                        v-if="poke.diff !== 0 && poke.spawnType !== 'Común'"
                        :class="['diff-text', poke.diff > 0 ? 'boosted' : 'debuffed']"
                      >
                        ({{ poke.diff > 0 ? '+' : '' }}{{ poke.diff.toFixed(1) }}%)
                      </span>
                    </span>
                  </div>
                  <div class="prob-visual-progress">
                    <template v-if="poke.spawnType === 'Común'">
                      <div
                        class="fill base-fill"
                        :style="{ width: `${poke.percentage * 2.5}%` }"
                      />
                    </template>
                    <template v-else>
                      <div
                        v-if="poke.diff >= 0"
                        class="fill base-fill"
                        :style="{ width: `${poke.basePercentage * 2.5}%` }"
                      />
                      <div
                        v-if="poke.diff > 0"
                        class="fill extra-fill"
                        :style="{ width: `${poke.diff * 2.5}%` }"
                      />
                      <div
                        v-if="poke.diff < 0"
                        class="fill base-fill-reduced"
                        :style="{ width: `${poke.percentage * 2.5}%` }"
                      />
                      <div
                        v-if="poke.diff < 0"
                        class="fill lost-fill"
                        :style="{ width: `${Math.abs(poke.diff) * 2.5}%` }"
                      />
                    </template>
                  </div>
                </div>
              </div>

              <!-- Base Stats -->
              <div class="col-stats row-cell flex-align text-center">
                <span
                  v-if="poke.isSeen"
                  class="stat-total-value"
                >
                  {{ poke.totalStats }}
                </span>
                <span
                  v-else
                  class="hidden-info-placeholder"
                >???</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fishing Spawns List -->
      <div
        v-if="fishingSpawns.length"
        class="spawns-section"
      >
        <h3 class="section-title-pixel">
          🎣 ENCUENTROS DE PESCA
          <span
            v-if="isRainyWeather"
            class="buffed-text"
            style="font-size: 9px; font-weight: bold; margin-left: 6px;"
          >
            (+20% Clima)
          </span>
        </h3>
        <div class="spawns-report-scroll">
          <div class="report-table-header">
            <div class="col-pokemon">
              Pokémon
            </div>
            <div class="col-types">
              Tipos
            </div>
            <div class="col-type">
              Estado
            </div>
            <div class="col-multiplier">
              Clima
            </div>
            <div class="col-prob">
              Prob. Real
            </div>
            <div class="col-stats">
              Stats
            </div>
          </div>

          <div class="report-rows">
            <div
              v-for="poke in fishingSpawns"
              :key="poke.id"
              class="report-row"
              :class="[poke.statusClass, { 'is-unseen': !poke.isSeen }]"
              :style="{ cursor: poke.isSeen ? 'pointer' : 'default' }"
              @click="openPokemonDetail(poke.id, poke.isSeen)"
            >
              <!-- Pokémon Info (Icon, Name, Caught) -->
              <div class="col-pokemon row-cell flex-align">
                <div class="mini-sprite-wrapper">
                  <img
                    v-if="poke.isSeen"
                    :src="poke.sprite"
                    class="mini-sprite"
                    :class="{ 'spawn-silhouette': !poke.isCaught }"
                  >
                  <div
                    v-else
                    class="unknown-placeholder"
                  >
                    ?
                  </div>
                </div>
                <div class="poke-name-wrap">
                  <span class="poke-name">{{ poke.name }}</span>
                  <span
                    v-if="!poke.isSeen"
                    class="unseen-tag"
                  >? NO VISTO</span>
                </div>
              </div>

              <!-- Types -->
              <div class="col-types row-cell flex-align">
                <template v-if="poke.isSeen && poke.types.length">
                  <PokemonTypeTag
                    v-for="t in poke.types"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </template>
                <span
                  v-else
                  class="hidden-info-placeholder"
                >???</span>
              </div>

              <!-- Spawn Status Type -->
              <div class="col-type row-cell flex-align">
                <PVTooltip
                  :title="getStatusTooltip(poke.spawnType).title"
                  :description="getStatusTooltip(poke.spawnType).desc"
                >
                  <span :class="['status-tag', poke.statusClass]">
                    {{ poke.spawnType }}
                  </span>
                </PVTooltip>
              </div>

              <!-- Climate Multiplier -->
              <div class="col-multiplier row-cell flex-align text-center">
                <template v-if="poke.spawnType === 'Visitante' || poke.spawnType === 'Exclusivo'">
                  <span :class="['status-tag', poke.statusClass]">{{ weatherEmoji }} {{ weatherLabel }}</span>
                </template>
                <template v-else-if="poke.multiplier === 0">
                  <span class="status-tag blocked">Bloqueado</span>
                </template>
                <template v-else-if="poke.multiplier !== 1">
                  <span :class="['status-tag', poke.multiplier > 1 ? 'buffed' : 'debuffed']">
                    x{{ poke.multiplier }}
                  </span>
                </template>
                <template v-else>
                  <span class="mult-value neutral-text">-</span>
                </template>
              </div>

              <!-- Probability -->
              <div class="col-prob row-cell flex-align">
                <div class="prob-bar-wrapper">
                  <div class="prob-numerical">
                    <span class="active-prob">
                      {{ poke.percentage.toFixed(1) }}%
                    </span>
                  </div>
                  <div class="prob-visual-progress">
                    <div
                      class="fill base-fill"
                      :style="{ width: `${poke.percentage * 2.5}%` }"
                    />
                  </div>
                </div>
              </div>

              <!-- Base Stats -->
              <div class="col-stats row-cell flex-align text-center">
                <span
                  v-if="poke.isSeen"
                  class="stat-total-value"
                >
                  {{ poke.totalStats }}
                </span>
                <span
                  v-else
                  class="hidden-info-placeholder"
                >???</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns.scss"></style>
