import { computed, type Ref } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/world/map-assets'
import { toPokemonType, translateType, type PokemonType } from '@/data/battle/types'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { getRouteWeather, getWeatherMultiplier, getWeatherModifiersDescription } from '@/logic/weather/weatherUtils'
import { getMechanicalWeather, requireWeatherId, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, type WeatherId } from '@/logic/weather/weatherRegistry'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import { DAY_PHASES, type DayPhase } from '@/types/system/time'
import { getSpeciesEntries } from '@/logic/encounters/encounters'
import { checkPlayerWinner, calculateSpawnGrid } from '@/logic/map/mapCardHelper'
import { getMapWeatherConfig } from '@/logic/encounters/routeWeatherDomainHelpers'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { DominanceInfo } from '@/types/system/stores'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

interface SpawnPool {
  generic: PokemonSpeciesId[]
  specific: PokemonSpeciesId[]
  rates: Partial<Record<PokemonSpeciesId, number>>
}

interface MapCardProps {
  map: MapLocation
  isLocked?: boolean
  isSafariLocked?: boolean
  cycle?: DayPhase
  weather?: WeatherId
  badgeCount?: number
  dominance?: DominanceInfo | null
  isRocketExtorted?: boolean
  spawnPool?: SpawnPool
  forcedWeather?: WeatherId | null
}

export function useMapCardState(props: MapCardProps, currentCols: Ref<number>, isVisible: Ref<boolean>) {
  const uiStore = useUIStore()
  const gameStore = useGameStore()
  const mapStore = useMapStore()

  const computedWeather = computed<WeatherId>(() => {
    return props.forcedWeather
      || (mapStore.globalWeather ? requireWeatherId(mapStore.globalWeather) : getRouteWeather(props.map.id, requireWeatherSeasonId(mapStore.currentSeason.id), mapStore.currentEpochHour, props.cycle || 'day'))
  })

  const imgPath = computed(() => {
    const fileName = MAP_ROUTE_MAPPING[props.map.id]
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
    const visual = WEATHER_VISUAL_METADATA[computedWeather.value]
    if (visual) return visual.icon
    const mech = getMechanicalWeather(computedWeather.value)
    return WEATHER_UI_METADATA[mech]?.icon || ''
  })

  const weatherName = computed(() => {
    const visual = WEATHER_VISUAL_METADATA[computedWeather.value]
    if (visual) return visual.label
    const mech = getMechanicalWeather(computedWeather.value)
    return WEATHER_UI_METADATA[mech]?.label || 'Normal'
  })

  const weatherModifiersDescription = computed(() => {
    const desc = getWeatherModifiersDescription(computedWeather.value)
    return desc ? `\n\n${desc}` : ''
  })

  const cardSeed = computed(() => {
    const sum = props.map.name.split('').reduce((acc, char, i) => {
      return acc + (char.charCodeAt(0) * (i + 1))
    }, 0)
    return (sum % 100) / 100
  })

  const getPokemonSprite = (id: string) => getAssetUrl(ASSET_TYPES.POKEMON, id)

  const getFormattedTypes = (data: { type: string | string[]; type2?: string }): string => {
    const types: PokemonType[] = []
    if (Array.isArray(data.type)) {
      types.push(...data.type.map(t => toPokemonType(t)))
    } else {
      if (data.type) types.push(toPokemonType(data.type))
      if (data.type2) types.push(toPokemonType(data.type2))
    }
    return types.map(type => translateType(type)).join('/').toUpperCase() // text-ok: UI text display localization string
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
    const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido' // text-ok: UI text display localization string
    const typeInfo = (isSeen && data) ? getFormattedTypes(data) : '???'
    const captured = props.dominance.guardian.captured || (gameStore.dailyGuardianCaptures || []).includes(props.map.id)

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

  const allSpawns = computed<PokemonSpeciesId[]>(() => {
    const pool = props.spawnPool || { generic: [], specific: [], rates: {} }
    return [...pool.generic, ...pool.specific]
  })

  const spawnGrid = computed<{ slots: Array<PokemonSpeciesId | null>; rows: number; cols: number; totalSlots: number }>(() => {
    const weather = computedWeather.value
    const cycle = props.cycle || 'day'
    const wildList = props.map.wild?.[cycle] || []

    const filteredSpawns = allSpawns.value.filter(id => {
      const weatherConfig = getMapWeatherConfig(props.map, weather)
      const isVisitor = !!weatherConfig?.visitors && getSpeciesEntries(weatherConfig.visitors).some(entry => entry.id === id)
      const isExclusive = !!weatherConfig?.exclusive && getSpeciesEntries(weatherConfig.exclusive).some(entry => entry.id === id)
      const isFishingActive = !!props.map.fishing?.pool?.includes(id)
      const hasWildRestrictions = !!props.map.wild
      const isWildActive = !hasWildRestrictions || wildList.includes(id) || isVisitor || isExclusive || isFishingActive

      return isWildActive && getWeatherMultiplier(id, weather) > 0
    })

    const { rows, cols, totalSlots } = calculateSpawnGrid(filteredSpawns.length, currentCols.value)
    const grid: Array<PokemonSpeciesId | null> = new Array<PokemonSpeciesId | null>(totalSlots).fill(null)
    filteredSpawns.forEach((id, index) => { grid[totalSlots - 1 - index] = id })
    return { slots: grid, rows, cols, totalSlots }
  })

const DAY_PHASE_EMOJIS: Record<DayPhase, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }

function resolvePokedexStatus(
  id: PokemonSpeciesId,
  seenPokedex: readonly PokemonSpeciesId[],
  caughtPokedex: readonly PokemonSpeciesId[],
  debugMode?: string | null
): { isSeen: boolean; isCaught: boolean } {
  if (debugMode === 'caught') return { isSeen: true, isCaught: true }
  if (debugMode === 'seen') return { isSeen: true, isCaught: false }
  const isCaught = caughtPokedex.includes(id)
  const isSeen = isCaught || seenPokedex.includes(id)
  return { isSeen, isCaught }
}

function resolveWeatherSpawnFlags(id: PokemonSpeciesId, map: MapLocation, weather: WeatherId) {
  const weatherConfig = getMapWeatherConfig(map, weather);
  const isVisitor = !!weatherConfig?.visitors && getSpeciesEntries(weatherConfig.visitors).some(entry => entry.id === id);
  const isExclusive = !!weatherConfig?.exclusive && getSpeciesEntries(weatherConfig.exclusive).some(entry => entry.id === id);
  const multiplier = getWeatherMultiplier(id, weather);
  const isBoosted = !isVisitor && !isExclusive && multiplier > 1.0;
  const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0;
  return {
    isVisitor,
    isExclusive,
    isSpecialWeatherSpawn: isVisitor || isExclusive,
    isBoosted,
    isDebuffed
  };
}

function resolveWeatherTag(flags: ReturnType<typeof resolveWeatherSpawnFlags>): string {
  if (flags.isVisitor) return 'Visitante';
  if (flags.isExclusive) return 'Exclusivo';
  if (flags.isBoosted) return 'Potenciado';
  return 'Debilitado';
}

function formatCycleText(appearingCycles: DayPhase[], isSeen: boolean): string {
  const isLimited = appearingCycles.length > 0 && appearingCycles.length < DAY_PHASES.length;
  if (!isLimited || !isSeen) return '';
  const emojis = appearingCycles.map(c => DAY_PHASE_EMOJIS[c] || c).join('');
  return `Aparición: ${emojis}`;
}

function formatWeatherNotice(
  flags: ReturnType<typeof resolveWeatherSpawnFlags>,
  isSeen: boolean,
  weatherEmoji: string
): string {
  const hasWeatherEffect = flags.isSpecialWeatherSpawn || flags.isBoosted || flags.isDebuffed;
  if (!hasWeatherEffect) return '';
  if (!isSeen) return `${weatherEmoji} Anomalía Atmosférica detectada.`;
  const tag = resolveWeatherTag(flags);
  return `${weatherEmoji} ${tag} por el clima.`;
}

function buildWeatherTimeText(
  id: PokemonSpeciesId,
  isSeen: boolean,
  appearingCycles: DayPhase[],
  map: MapLocation,
  weather: WeatherId,
  weatherEmoji: string
): { timeText: string; isSpecialWeatherSpawn: boolean; isExclusive: boolean } {
  const flags = resolveWeatherSpawnFlags(id, map, weather);
  const cycleText = formatCycleText(appearingCycles, isSeen);
  const weatherNotice = formatWeatherNotice(flags, isSeen, weatherEmoji);

  let timeText = cycleText;
  if (weatherNotice) {
    timeText = timeText ? `${timeText}\n${weatherNotice}` : weatherNotice;
  }
  if (!timeText) {
    timeText = 'Habitante común.';
  }

  return {
    timeText,
    isSpecialWeatherSpawn: flags.isSpecialWeatherSpawn,
    isExclusive: flags.isExclusive
  };
}

  const processedGrid = computed(() => {
    const gridData = spawnGrid.value
    const slots = gridData.slots || []
    const seenPokedex = gameStore.state.seenPokedex || []
    const caughtPokedex = gameStore.state.pokedex || []

    return slots.map((id, index) => {
      if (!id) return { id: null, key: `empty-${index}` }
      const { isSeen, isCaught } = resolvePokedexStatus(id, seenPokedex, caughtPokedex, uiStore.debugPokedexMode)
      const pool = props.spawnPool || { generic: [], specific: [], rates: {} }
      const rate = pool.rates?.[id] || 10
      const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
      const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido' // text-ok: UI text display localization string
      const typeInfo = (isSeen && data) ? `Tipo: ${getFormattedTypes(data)}` : ''

      const appearingCycles = DAY_PHASES.filter(c => (props.map.wild?.[c] || []).includes(id))
      const { timeText, isSpecialWeatherSpawn, isExclusive } = buildWeatherTimeText(
        id,
        isSeen,
        appearingCycles,
        props.map,
        computedWeather.value,
        weatherEmoji.value
      )

      return {
        id, 
        key: `${id}-${index}`, 
        name, 
        sprite: getAssetUrl(ASSET_TYPES.POKEMON, id), 
        isSeen, 
        isCaught, 
        isRare: (rate > 0 && rate <= 2) || isExclusive, 
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
