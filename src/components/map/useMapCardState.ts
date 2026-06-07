import { computed, type Ref } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'
import { translateType } from '@/data/types'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { getRouteWeather, getWeatherMultiplier } from '@/logic/weatherUtils'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import { checkPlayerWinner, calculateSpawnGrid } from '@/logic/map/mapCardHelper'
import type { MapLocation } from '@/types/encounters'
import type { DominanceInfo } from '@/types/stores'

interface SpawnPool {
  generic: string[]
  specific: string[]
  rates: Record<string, number>
}

interface MapCardProps {
  map: MapLocation
  isLocked?: boolean
  isSafariLocked?: boolean
  cycle?: 'morning' | 'day' | 'dusk' | 'night'
  weather?: string
  badgeCount?: number
  dominance?: DominanceInfo | null
  isRocketExtorted?: boolean
  spawnPool?: SpawnPool
  forcedWeather?: string | null
}

export function useMapCardState(props: MapCardProps, currentCols: Ref<number>, isVisible: Ref<boolean>) {
  const uiStore = useUIStore()
  const gameStore = useGameStore()
  const mapStore = useMapStore()

  const computedWeather = computed(() => {
    return props.forcedWeather || mapStore.globalWeather || getRouteWeather(props.map.id, mapStore.currentSeason.id, mapStore.currentEpochHour, props.cycle || 'day')
  })

  const imgPath = computed(() => {
    const fileName = (MAP_ROUTE_MAPPING as Record<string, string>)[props.map.id] || 'default'
    return getAssetUrl(ASSET_TYPES.MAP, fileName, { 
      cycle: props.cycle,
      isLowPower: uiStore.isLowPowerActive
    })
  })

  const cycleEmoji = computed(() => {
    const emojis: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
    return emojis[props.cycle as string] || '🌞'
  })

  const cycleName = computed(() => {
    const names: Record<string, string> = { morning: 'Mañana', day: 'Día', afternoon: 'Tarde', dusk: 'Atardecer', night: 'Noche' }
    return names[props.cycle as string] || 'Normal'
  })

  const seasonName = computed(() => mapStore.currentSeason.label)
  const seasonEmoji = computed(() => mapStore.currentSeason.icon)

  const weatherEmoji = computed(() => {
    const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
    if (visual) return visual.icon
    const mech = getMechanicalWeather(computedWeather.value as string)
    return WEATHER_UI_METADATA[mech]?.icon || ''
  })

  const weatherName = computed(() => {
    const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
    if (visual) return visual.label
    const mech = getMechanicalWeather(computedWeather.value as string)
    return WEATHER_UI_METADATA[mech]?.label || 'Normal'
  })

  const weatherModifiersDescription = computed(() => {
    const entry = WEATHER_REGISTRY[computedWeather.value as string]
    const mods = entry?.modifiers
    if (!mods) return ''

    const formatList = (list?: string[]) => (list || []).map(translateType).join(', ')
    
    const lines = []
    if (mods.boost?.length) lines.push(`▲ ${formatList(mods.boost)}`)
    if (mods.debuff?.length) lines.push(`▼ ${formatList(mods.debuff)}`)
    if (mods.block?.length) lines.push(`🚫 ${formatList(mods.block)}`)
    
    return lines.length ? `\n\n${lines.join('\n')}` : ''
  })

  const cardSeed = computed(() => {
    const sum = props.map.name.split('').reduce((acc, char, i) => {
      return acc + (char.charCodeAt(0) * (i + 1))
    }, 0)
    return (sum % 100) / 100
  })

  const getPokemonSprite = (id: string) => getAssetUrl(ASSET_TYPES.POKEMON, id)

  const getFormattedTypes = (data: { type: string | string[]; type2?: string }): string => {
    const types: string[] = []
    if (Array.isArray(data.type)) {
      types.push(...data.type)
    } else {
      if (data.type) types.push(data.type)
      if (data.type2) types.push(data.type2)
    }
    return types.map(translateType).join('/').toUpperCase()
  }

  const processedGuardian = computed(() => {
    if (!props.dominance?.guardian) return null
    const id = props.dominance.guardian.id
    let isSeen = (gameStore.state.seenPokedex || []).includes(id) || (gameStore.state.pokedex || []).includes(id)
    let isCaught = (gameStore.state.pokedex || []).includes(id)

    if (uiStore.debugPokedexMode === 'caught') {
      isSeen = true; isCaught = true
    } else if (uiStore.debugPokedexMode === 'seen') {
      isSeen = true
    } else if (uiStore.debugPokedexMode === 'none') {
      isSeen = false; isCaught = false
    }
    
    const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
    const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'
    const typeInfo = (isSeen && data) ? getFormattedTypes(data) : '???'
    const captured = props.dominance.guardian.captured || false

    return { 
      ...props.dominance.guardian, 
      isSeen, 
      isCaught, 
      name, 
      typeInfo, 
      captured,
      sprite: getPokemonSprite(id), 
      seed: id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) / 100
    }
  })

  const isPlayerWinner = computed(() => checkPlayerWinner(props.dominance?.winner || null, gameStore.state.faction))

  const allSpawns = computed(() => {
    const pool = props.spawnPool || { generic: [], specific: [], rates: {} }
    return [...pool.generic, ...pool.specific]
  })

  const spawnGrid = computed(() => {
    const weather = computedWeather.value
    const cycle = props.cycle || 'day'
    const wildList = props.map.wild?.[cycle] || []

    const filteredSpawns = allSpawns.value.filter(id => {
      const isVisitor = !!(props.map.weather?.[weather]?.visitors as Record<string, unknown>)?.[id]
      const isExclusive = !!(props.map.weather?.[weather]?.exclusive as Record<string, unknown>)?.[id]
      const isFishingActive = !!props.map.fishing?.pool?.includes(id)
      const hasWildRestrictions = !!props.map.wild
      const isWildActive = !hasWildRestrictions || wildList.includes(id) || isVisitor || isExclusive || isFishingActive

      return isWildActive && getWeatherMultiplier(id, weather) > 0
    })

    const { rows, cols, totalSlots } = calculateSpawnGrid(filteredSpawns.length, currentCols.value)
    const grid = new Array(totalSlots).fill(null)
    filteredSpawns.forEach((id, index) => { grid[totalSlots - 1 - index] = id })
    return { slots: grid, rows, cols }
  })

  const processedGrid = computed(() => {
    const gridData = spawnGrid.value
    const slots = gridData.slots || []
    const seenPokedex = gameStore.state.seenPokedex || []
    const caughtPokedex = gameStore.state.pokedex || []

    return slots.map((id: string | null, index: number) => {
      if (!id) return { id: null, key: `empty-${index}` }
      let isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
      let isCaught = caughtPokedex.includes(id)

      if (uiStore.debugPokedexMode === 'caught') {
        isSeen = true; isCaught = true
      } else if (uiStore.debugPokedexMode === 'seen') {
        isSeen = true
      }
      const pool = props.spawnPool || { generic: [], specific: [], rates: {} }
      const rate = pool.rates?.[id] || 10
      const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
      const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'
      const typeInfo = (isSeen && data) ? `Tipo: ${getFormattedTypes(data)}` : ''

      const cycles = ['morning', 'day', 'dusk', 'night']
      const appearingCycles = cycles.filter(c => (props.map.wild?.[c] || []).includes(id))
      const isLimited = appearingCycles.length > 0 && appearingCycles.length < cycles.length
      
      const emojiMap: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
      
      const weather = computedWeather.value
      const isVisitor = !!(props.map.weather?.[weather]?.visitors as Record<string, unknown>)?.[id]
      const isExclusive = !!(props.map.weather?.[weather]?.exclusive as Record<string, unknown>)?.[id]

      let timeText = ''
      
      if (isLimited && isSeen) {
        const emojis = appearingCycles.map(c => emojiMap[c] || c).join('')
        timeText = `Aparición: ${emojis}`
      }

      const multiplier = getWeatherMultiplier(id, weather)
      const isBoosted = !isVisitor && !isExclusive && multiplier > 1.0
      const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0
      const isSpecialWeatherSpawn = isVisitor || isExclusive

      if (isSpecialWeatherSpawn || isBoosted || isDebuffed) {
        if (isSeen) {
          const weatherTag = isVisitor ? 'Visitante' : (isExclusive ? 'Exclusivo' : (isBoosted ? 'Potenciado' : 'Debilitado'))
          const weatherLine = `${weatherEmoji.value} ${weatherTag} por el clima.`
          timeText = timeText ? `${timeText}\n${weatherLine}` : weatherLine
        } else {
          timeText = `${weatherEmoji.value} Anomalía Atmosférica detectada.`
        }
      }

      if (!timeText) {
        timeText = 'Habitante común.'
      }

      return {
        id, 
        key: `${id}-${index}`, 
        name, 
        sprite: getAssetUrl(ASSET_TYPES.POKEMON, id), 
        isSeen, 
        isCaught, 
        isRare: (rate <= 5) || isExclusive, 
        isAtmospheric: isSpecialWeatherSpawn, 
        tooltipTitle: name, 
        tooltipDesc: typeInfo ? `${typeInfo}\n${timeText}` : timeText, 
        seed: (id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + index) / 100
      }
    })
  })

  const keepWarm = computed(() => {
    const isMobileDevice = uiStore.windowWidth < 768
    return !isMobileDevice && !uiStore.isLowPowerActive
  })

  const showBg = computed(() => {
    return isVisible.value || keepWarm.value
  })

  const lockReason = computed(() => {
    if (props.isSafariLocked) return 'REQUIERE TICKET SAFARI'
    if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'SESIÓN BLOQUEADA'
    if (!props.isLocked) return ''
    const requiredBadges = props.map.badges || 0
    const badgeCount = props.badgeCount || 0
    if (badgeCount < requiredBadges) return `REQUIERE ${requiredBadges} MEDALLAS`
    return 'BLOQUEADO'
  })

  const isCardLocked = computed(() => {
    if (props.isLocked) return true
    if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return true
    return false
  })

  const lockDescription = computed(() => {
    if (props.isSafariLocked) return 'Necesitas un Ticket Safari para entrar a esta zona.'
    if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'Sesión activa en otra pestaña. Toma el control para habilitar el guardado.'
    if (!props.isLocked) return ''
    return `Consigue ${props.map.badges} medallas para acceder a esta zona.`
  })

  return {
    computedWeather,
    imgPath,
    cycleEmoji,
    cycleName,
    seasonName,
    seasonEmoji,
    weatherEmoji,
    weatherName,
    weatherModifiersDescription,
    cardSeed,
    processedGuardian,
    isPlayerWinner,
    allSpawns,
    spawnGrid,
    processedGrid,
    showBg,
    lockReason,
    isCardLocked,
    lockDescription
  }
}
