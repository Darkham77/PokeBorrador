import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, type WeatherMechanical } from '@/logic/weather/weatherRegistry'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
import { VOLATILE_STATUS_LIST } from '@/data/battle/volatileStatusMap'
import { toID } from '@/logic/utils/strings.ts'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { getWeatherCombatDescription } from '@/logic/weather/weatherGenerationProvider'
import { getItemName, isItemId } from '@/data/inventory/items'
import { logger } from '@/logic/utils/logger'

export interface VolatileStatusItem {
  icon: string
  text?: string
  count?: number
  isBoosted?: boolean
  isAdminOnly?: boolean
}

const SUN_AFFECTED_MOVE_NAMES = [
  'synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar'
] as const
const SUN_AFFECTED_MOVE_NAMES_SET: ReadonlySet<string> = new Set(SUN_AFFECTED_MOVE_NAMES)

const RAIN_AFFECTED_MOVE_NAMES = [
  'thunder', 'trueno', 'hurricane', 'vendaval', 'weather ball'
] as const
const RAIN_AFFECTED_MOVE_NAMES_SET: ReadonlySet<string> = new Set(RAIN_AFFECTED_MOVE_NAMES)

const SNOW_AFFECTED_MOVE_NAMES = [
  'blizzard', 'ventisca', 'aurora veil', 'velo aurora', 'cold-snap'
] as const
const SNOW_AFFECTED_MOVE_NAMES_SET: ReadonlySet<string> = new Set(SNOW_AFFECTED_MOVE_NAMES)

const WEATHER_AFFLICTIONS = ['sandstorm', 'hail', 'fog'] as const
const WEATHER_AFFLICTIONS_SET: ReadonlySet<string> = new Set(WEATHER_AFFLICTIONS)

const VISUAL_WEATHER_AFFLICTIONS = ['blizzard', 'coldwave', 'fog'] as const
const VISUAL_WEATHER_AFFLICTIONS_SET: ReadonlySet<string> = new Set(VISUAL_WEATHER_AFFLICTIONS)

function isSunAffectedMoveName(value: string): boolean {
  return SUN_AFFECTED_MOVE_NAMES_SET.has(value)
}

function isRainAffectedMoveName(value: string): boolean {
  return RAIN_AFFECTED_MOVE_NAMES_SET.has(value)
}

function isSnowAffectedMoveName(value: string): boolean {
  return SNOW_AFFECTED_MOVE_NAMES_SET.has(value)
}

const BOOST_REGEXES: readonly RegExp[] = [
  /aumenta la velocidad/i,
  /aumenta el ataque/i,
  /aumenta la defensa/i,
  /aumenta la precisión/i,
  /potencia el/i,
  /sube el/i,
  /potencia los/i,
  /aumenta.*un\s*\d+%/i
]

const DEBUFF_REGEXES: readonly RegExp[] = [
  /reduce/i,
  /baja/i,
  /debilita/i,
  /pierde hp/i
]

const BLOCK_REGEXES: readonly RegExp[] = [
  /evita/i,
  /inmunidad/i,
  /impide/i,
  /protege/i
]

function classifyAbilitySentence(trimmed: string): string {
  if (BLOCK_REGEXES.some(rx => rx.test(trimmed))) return `🚫 ${trimmed}`
  if (BOOST_REGEXES.some(rx => rx.test(trimmed))) return `▲ ${trimmed}`
  if (DEBUFF_REGEXES.some(rx => rx.test(trimmed))) return `▼ ${trimmed}`
  return `• ${trimmed}`
}

function formatAbilityDescription(desc: string): string {
  if (/[▲▼⚡🚫•]/u.test(desc)) {
    return desc
  }

  const sentences = desc.split(/(?<=[.!?])\s+/)
  const lines: string[] = [] // no-domain: Non-domain utility collection or data structure
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (trimmed) {
      lines.push(classifyAbilitySentence(trimmed))
    }
  }

  return lines.join('\n')
}

const WEATHER_ABILITY_BOOST_MAP: Readonly<Record<string, { weathers: ReadonlySet<string>; status: string }>> = {
  chlorophyll: { weathers: new Set([WEATHER_MECHANICAL.SUN]), status: ' (Activa por Sol)' },
  swiftswim: { weathers: new Set([WEATHER_MECHANICAL.RAIN]), status: ' (Activa por Lluvia)' },
  sandrush: { weathers: new Set([WEATHER_MECHANICAL.SANDSTORM]), status: ' (Activa por Arena)' },
  slushrush: { weathers: new Set([WEATHER_MECHANICAL.SNOW, WEATHER_MECHANICAL.HAIL]), status: ' (Activa por Nieve)' },
}

export function buildAbilityVolatileItem(
  target: Pokemon,
  isPlayerVal: boolean,
  isIvScannerActive: boolean,
  isAdmin: boolean,
  weatherType?: string
): VolatileStatusItem | null {
  if (!target.ability) return null
  const showAbility = isPlayerVal || isIvScannerActive || isAdmin
  if (!showAbility) return null

  const ab = target.ability
  const abId = toID(ab)
  const mechWeather = getMechanicalWeather(weatherType)

  let isAbBoosted = false
  let abEntry = null
  try {
    abEntry = pokemonDataProvider.getAbilityData(ab)
  } catch (err) {
    logger.debug('useCombatantStatus', `Ability not found in provider: ${ab}`, err)
  }
  const abDescription = abEntry?.desc || 'Sin descripción disponible.'

  let statusMsg = ''
  const boostConfig = WEATHER_ABILITY_BOOST_MAP[abId]
  if (boostConfig && mechWeather && boostConfig.weathers.has(mechWeather)) {
    isAbBoosted = true
    statusMsg = boostConfig.status
  }

  let formattedDesc = formatAbilityDescription(abDescription)
  if (statusMsg) formattedDesc += `\n${statusMsg}`

  const abText = `HABILIDAD - ${String(abEntry?.name || ab).toUpperCase()}:\n${formattedDesc}`
  return {
    icon: '🧠',
    text: abText,
    isBoosted: isAbBoosted,
    isAdminOnly: !isPlayerVal && !isIvScannerActive && isAdmin,
  }
}

export function buildEnemyInventoryVolatileItem(
  target: Pokemon,
  isPlayerVal: boolean,
  isAdmin: boolean,
  enemyInv?: Record<string, number>,
  enemyMoney = 0,
  enemyMaxLevel?: number,
  enemyTeam: Pokemon[] = []
): VolatileStatusItem | null {
  if (isPlayerVal || !isAdmin || !enemyInv) return null

  const itemKeys = Object.keys(enemyInv).filter(isItemId).filter(k => (enemyInv[k] ?? 0) > 0)
  const itemsListText = itemKeys.length === 0
    ? 'Mochila Vacía'
    : itemKeys.map(k => `• ${getItemName(k)} x${enemyInv[k]!}`).join('\n')

  const level = enemyMaxLevel ?? target.level
  const heldItemsText = enemyTeam
    .filter(p => !!p.heldItem)
    .map(p => `• ${p.name}: ${getItemName(p.heldItem!)}`)
    .join('\n')

  const heldSection = heldItemsText ? `\n\nObjetos Equipados (Equipados en combate):\n${heldItemsText}` : ''
  const invText = `INVENTARIO DEL NPC (Lv. ${level}):\nPresupuesto restante: ₽${enemyMoney}\n\nObjetos consumibles:\n${itemsListText}${heldSection}`

  return {
    icon: '🎒',
    text: invText,
    isAdminOnly: true,
  }
}

export function buildPokemonVolatiles(target: Pokemon): VolatileStatusItem[] {
  const list: VolatileStatusItem[] = []
  for (const def of VOLATILE_STATUS_LIST) {
    const val = target[def.prop as keyof Pokemon]
    if (!val) continue

    if (def.isCounter) {
      const num = Number(val)
      if (num > 0) {
        let customText = `${def.text} (${num}t).`
        if (def.prop === 'substitute') customText = `SUSTITUTO: Un señuelo de ${num} HP recibe el daño.`
        else if (def.prop === 'perishSongCount') customText = `CANTO MORTAL: El Pokémon caerá en ${num} turnos.`
        list.push({ icon: def.icon, text: customText, count: num })
      }
    } else {
      list.push({ icon: def.icon, text: def.text })
    }
  }
  return list
}

export function buildSideFieldVolatiles(stages?: Record<string, number | undefined>): VolatileStatusItem[] {
  const list: VolatileStatusItem[] = []
  if (!stages) return list
  if ((stages.reflect ?? 0) > 0) list.push({ icon: '🪞', text: `REFLEJO: Reduce el daño físico (${stages.reflect}t).`, count: stages.reflect })
  if ((stages.lightScreen ?? 0) > 0) list.push({ icon: '💡', text: `PANTALLA LUZ: Reduce el daño especial (${stages.lightScreen}t).`, count: stages.lightScreen })
  if ((stages.safeguard ?? 0) > 0) list.push({ icon: '🛡️', text: `VELO SAGRADO: Protege contra estados (${stages.safeguard}t).`, count: stages.safeguard })
  if ((stages.mist ?? 0) > 0) list.push({ icon: '🌫️', text: `NEBLINA: Protege contra reducción de stats (${stages.mist}t).`, count: stages.mist })
  if ((stages.spikes ?? 0) > 0) list.push({ icon: '📍', text: `PÚAS: Daña a los Pokémon que entran al campo (${stages.spikes} capas).`, count: stages.spikes })
  if ((stages.stealthrock ?? 0) > 0) list.push({ icon: '🪨', text: `TRAMPA ROCAS: Daña a los Pokémon según su debilidad a Roca al entrar.`, count: stages.stealthrock })
  if ((stages.toxicspikes ?? 0) > 0) list.push({ icon: '☠️', text: `PÚAS TÓXICAS: Envenena a los Pokémon que entran al campo (${stages.toxicspikes} capas).`, count: stages.toxicspikes })
  return list
}

function checkTypeWeatherAffiliation(
  mechWeather: string | undefined,
  visualWeather: string,
  types: PokemonType[],
  isFloating: boolean | undefined
): boolean {
  if (mechWeather === 'sun' && (types.includes('fire') || types.includes('water') || types.includes('grass'))) return true
  if (mechWeather === 'rain' && (types.includes('fire') || types.includes('water') || types.includes('electric'))) return true
  if (mechWeather === 'snow' && types.includes('ice')) return true
  if ((mechWeather === 'wind' || visualWeather === 'strong_winds') && (types.includes('flying') || isFloating)) return true
  return false
}

function checkMoveWeatherAffiliation(mechWeather: string | undefined, moveNames: string[]): boolean {
  if (mechWeather === 'sun' && moveNames.some(isSunAffectedMoveName)) return true
  if (mechWeather === 'rain' && moveNames.some(isRainAffectedMoveName)) return true
  if (mechWeather === 'snow' && moveNames.some(isSnowAffectedMoveName)) return true
  return false
}

function doesWeatherAffectPokemon(target: Pokemon, mechWeather: string | undefined, visualWeather: string): boolean {
  if (WEATHER_AFFLICTIONS_SET.has(mechWeather || '') || VISUAL_WEATHER_AFFLICTIONS_SET.has(visualWeather)) {
    return true
  }
  const types: PokemonType[] = []
  if (target.type) types.push(target.type as PokemonType)
  if (target.type2) types.push(target.type2 as PokemonType)

  if (checkTypeWeatherAffiliation(mechWeather, visualWeather, types, target.isFloating)) {
    return true
  }

  const moveNames = (target.moves || []).map(m => (m?.name || '').toLowerCase())
  return checkMoveWeatherAffiliation(mechWeather, moveNames)
}

export function buildWeatherVolatileItem(
  target: Pokemon,
  weather?: { type?: string; visual?: string },
  isGym?: boolean
): VolatileStatusItem | null {
  if (isGym || !weather || weather.type === 'clear' || weather.type === 'none') return null

  const mechWeather = getMechanicalWeather(weather.type)
  const visualWeather = weather.visual || weather.type || ''

  if (!doesWeatherAffectPokemon(target, mechWeather, visualWeather)) {
    return null
  }

  const desc = getWeatherCombatDescription(weather.type, ACTIVE_GENERATION)
  if (!desc || desc === 'Sin efectos en combate.') {
    return null
  }

  const visualType = weather.visual || weather.type || 'clear'
  const config = WEATHER_VISUAL_METADATA[visualType] || WEATHER_UI_METADATA[mechWeather as WeatherMechanical]
  if (config) {
    return { icon: config.icon, text: `${config.label}: ${desc}` }
  }
  return null
}
