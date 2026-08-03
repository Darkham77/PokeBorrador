import { NATURE_DATA, NATURES } from '@/data/battle/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/weather/weatherRegistry'
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { Dex } from '@pkmn/sim'
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS, isEnabledPokemonId } from '@/data/system/constants'
import type { PokemonType } from '@/data/battle/types'
import type { ItemId } from '@/data/inventory/items'

const TRAVEL_INCENSE_ITEM_IDS = [
  'incensefire',
  'incensewater',
  'incensegrass',
  'incensenormal',
  'incenseghost',
  'incensepsychic',
] as const satisfies readonly ItemId[]

export type TravelIncenseItemId = (typeof TRAVEL_INCENSE_ITEM_IDS)[number]

const TRAVEL_BUFF_ITEM_IDS = [
  'repel',
  'superrepel',
  'maxrepel',
  'luckyegg',
  'amuletcoin',
  'ticketshiny',
  ...TRAVEL_INCENSE_ITEM_IDS,
] as const satisfies readonly ItemId[]

export type TravelBuffItemId = (typeof TRAVEL_BUFF_ITEM_IDS)[number]

export const TRAVEL_INCENSE_TYPES = {
  incensefire: 'fire',
  incensewater: 'water',
  incensegrass: 'grass',
  incensenormal: 'normal',
  incenseghost: 'ghost',
  incensepsychic: 'psychic',
} satisfies Record<TravelIncenseItemId, PokemonType>

export function isTravelBuffItemId(value: ItemId): value is TravelBuffItemId {
  return (TRAVEL_BUFF_ITEM_IDS as readonly ItemId[]).includes(value)
}

export function isTravelIncenseItemId(value: TravelBuffItemId): value is TravelIncenseItemId {
  return (TRAVEL_INCENSE_ITEM_IDS as readonly ItemId[]).includes(value) // domain-ok
}


export function getSelectableSpecies(bypassWhitelist = false) {
  const db = pokemonDataProvider.getPokemonDb()
  return Object.keys(db)
    .filter(id => bypassWhitelist || isEnabledPokemonId(id))
    .map(id => ({
      id,
      name: db[id]?.name || id,
      icon: pokemonDataProvider.getSpriteUrl(id)
    }))
}

export function getSelectableNatures() {
  return NATURES.map(n => ({ id: n, name: NATURE_DATA[n].name }))
}

export function getSelectableAbilities() {
  // Obtener todas las habilidades válidas de Gen 3
  return Dex.forGen(ACTIVE_GENERATION).abilities.all()
    .filter(a => a.exists)
    .map(a => ({ id: a.id, name: a.name }))
}

export interface VisibilityResult {
  isSeen: boolean
  isCaught: boolean
}


export function translateWeather(w: string): string {
  const visual = WEATHER_VISUAL_METADATA[w]
  if (visual) return visual.label
  const mech = getMechanicalWeather(w)
  return WEATHER_UI_METADATA[mech]?.label || w
}

export function calculateActiveTravelModifiers(items: ReadonlySet<TravelBuffItemId> | readonly TravelBuffItemId[]) {
  const itemSet = items instanceof Set ? items : new Set(items)
  let encounterRateMod = 0
  let expMultiplier = 1.0
  let moneyMultiplier = 1.0
  let shinyChanceMod = 1.0
  let typeFocus: PokemonType | null = null

  if (itemSet.has('repel')) encounterRateMod = -50
  else if (itemSet.has('superrepel')) encounterRateMod = -80
  else if (itemSet.has('maxrepel')) encounterRateMod = -100

  if (itemSet.has('luckyegg')) expMultiplier = 1.5
  if (itemSet.has('amuletcoin')) moneyMultiplier = 2.0
  if (itemSet.has('ticketshiny')) shinyChanceMod = 2.0

  for (const incenseItemId of TRAVEL_INCENSE_ITEM_IDS) {
    if (itemSet.has(incenseItemId)) {
      typeFocus = TRAVEL_INCENSE_TYPES[incenseItemId]
      break
    }
  }

  return {
    encounterRateMod,
    expMultiplier,
    moneyMultiplier,
    shinyChanceMod,
    typeFocus
  }
}


export function getPokedexVisibility(
  id: string,
  debugPokedexMode: 'none' | 'seen' | 'caught' | null,
  seenPokedex: string[],
  caughtPokedex: string[]
): VisibilityResult {
  let isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
  let isCaught = caughtPokedex.includes(id)

  if (debugPokedexMode === 'none') {
    isSeen = false
    isCaught = false
  } else if (debugPokedexMode === 'caught') {
    isSeen = true
    isCaught = true
  } else if (debugPokedexMode === 'seen') {
    isSeen = true
  }

  return { isSeen, isCaught }
}

export function getPokemonBasicData(id: string, isSeen: boolean) {
  const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
  const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido' // text-ok
  const types = data ? ([data.type, data.type2].filter((t): t is PokemonType => Boolean(t))) : []
  const hp = data?.hp || 0
  const atk = data?.atk || 0
  const def = data?.def || 0
  const spa = data?.spa || 0
  const spd = data?.spd || 0
  const spe = data?.spe || 0
  const totalStats = data ? (data.hp + data.atk + data.def + data.spa + data.spd + data.spe) : 0

  return { name, types, hp, atk, def, spa, spd, spe, totalStats }
}

export function getSpawnStatus(
  isVisitor: boolean,
  isExclusive: boolean,
  isBlocked: boolean,
  isInCurrentCycle: boolean,
  isBuffed: boolean,
  isDebuffed: boolean
) {
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
  return { spawnType, statusClass }
}

interface SimpleEventStore {
  globalMultipliers?: {
    shiny?: number
  }
  getSpeciesBonuses: (id: string) => { shiny?: number } | null | undefined
}

export function getSharedShinyEventLines(id: string, eventStore: SimpleEventStore): string[] {
  const lines: string[] = [] // no-domain
  const globalShiny = eventStore.globalMultipliers?.shiny || 1
  if (globalShiny !== 1) {
    lines.push(`• Evento Shiny Global: x${globalShiny.toFixed(1)} de probabilidad Shiny`)
  }
  const speciesBonuses = eventStore.getSpeciesBonuses(id)
  if (speciesBonuses && speciesBonuses.shiny && speciesBonuses.shiny !== 1) {
    lines.push(`• Evento Shiny Especie: x${speciesBonuses.shiny.toFixed(1)} de probabilidad Shiny`)
  }
  return lines
}

export interface SpawnTooltipData {
  percentage: number
  basePercentage: number
  multiplier: number
  spawnType: string
}

export function getSpawnCommonTooltipLines(poke: SpawnTooltipData, weather: string): string[] {
  const lines: string[] = [] // no-domain
  if (poke.multiplier !== 1) {
    const change = poke.multiplier > 1 ? 'Aumento por Clima' : 'Reducción por Clima'
    const label = translateWeather(weather)
    lines.push(`• ${change}: x${poke.multiplier} (${label})`)
  }
  if (poke.spawnType === 'Visitante') {
    const label = translateWeather(weather)
    const diffVal = poke.percentage - poke.basePercentage
    lines.push(`• Pokémon Visitante del clima (${label}): +${diffVal.toFixed(1)}% de probabilidad activa`)
  } else if (poke.spawnType === 'Exclusivo') {
    const label = translateWeather(weather)
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
  return lines
}

export function redistributeWeatherSpawns(
  rates: number[],
  pool: string[],
  weather: string,
  exclusives: string[]
): void {
  if (!weather || weather === 'clear') return

  const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1)
  const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1)

  nativeIndices.forEach(idx => {
    const spId = pool[idx]
    if (spId) {
      const isExclusive = exclusives.includes(spId)
      if (!isExclusive) {
        rates[idx] = (rates[idx] || 0) * getWeatherMultiplier(spId, weather)
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

export function applyFishingRodBudget(rates: number[], pool: string[], fishingRodType: string): void {
  if ((fishingRodType === 'good' || fishingRodType === 'super') && pool.length > 0) {
    let budget = fishingRodType === 'super' ? 1000 : 500
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
}

export interface RouteSpawnMappedItem {
  id: string
  name: string
  isSeen: boolean
  isCaught: boolean
  sprite: string
  percentage: number
  baseRate: number
  basePercentage: number
  diff: number
  spawnType: string
  statusClass: string
  multiplier: number
  types: string[]
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
  totalStats: number
}

export function buildRouteSpawnItem(
  id: string,
  pData: { name: string; types: string[]; hp: number; atk: number; def: number; spa: number; spd: number; spe: number; totalStats: number },
  isSeen: boolean,
  isCaught: boolean,
  sprite: string,
  percentage: number,
  baseRate: number,
  basePercentage: number,
  diff: number,
  spawnType: string,
  statusClass: string,
  multiplier: number
): RouteSpawnMappedItem {
  return {
    id,
    name: pData.name,
    isSeen,
    isCaught,
    sprite,
    percentage,
    baseRate,
    basePercentage,
    diff,
    spawnType,
    statusClass,
    multiplier,
    types: pData.types,
    hp: pData.hp,
    atk: pData.atk,
    def: pData.def,
    spa: pData.spa,
    spd: pData.spd,
    spe: pData.spe,
    totalStats: pData.totalStats
  }
}
