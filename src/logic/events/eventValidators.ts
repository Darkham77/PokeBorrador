/**
 * src/logic/events/eventValidators.ts
 * 
 * Pure validator helpers for event awards and legacy detection.
 */

import type { PendingAward } from '@/types/system/stores'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import { safeParse } from './eventSchedules.ts'

export interface ParsedAwardPrize {
  type?: 'money' | 'bc' | 'item' | 'pokemon' | 'mixed'
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
  nature?: string
  ivs?: Record<string, number>
}

/**
 * Safely parses the prize payload from an award.
 */
// fallow-ignore-next-line unused-export
export function parseAwardPrize(rawPrize: unknown): ParsedAwardPrize | null {
  if (!rawPrize) return null
  if (typeof rawPrize === 'string') {
    try {
      return JSON.parse(rawPrize) as ParsedAwardPrize
    } catch {
      return null
    }
  }
  if (typeof rawPrize === 'object') {
    return rawPrize as ParsedAwardPrize
  }
  return null
}

/**
 * Extracts all configured prize payloads from an event configuration.
 */
// fallow-ignore-next-line unused-export
export function getEventConfiguredPrizes(event: GameEvent): ParsedAwardPrize[] {
  const cfg = (typeof event.config === 'string' ? safeParse(event.config) : event.config) as Record<string, unknown> | null // open-record
  if (!cfg || typeof cfg !== 'object') return []

  const list: ParsedAwardPrize[] = []

  // 1. Sub-competitions prizes
  if (Array.isArray(cfg.subCompetitions)) {
    for (const sub of cfg.subCompetitions as { prizes?: Record<string, unknown> }[]) {
      if (sub && sub.prizes && typeof sub.prizes === 'object') {
        for (const prizeObj of Object.values(sub.prizes)) {
          const parsed = parseAwardPrize(prizeObj)
          if (parsed) list.push(parsed)
        }
      }
    }
  }

  // 2. Event-level prizes (e.g. { first: {...}, second: {...}, third: {...} })
  if (cfg.prizes && typeof cfg.prizes === 'object') {
    for (const prizeObj of Object.values(cfg.prizes as Record<string, unknown>)) { // open-record
      const parsed = parseAwardPrize(prizeObj)
      if (parsed) list.push(parsed)
    }
  }

  // 3. Single prize (e.g. { prize: {...} })
  if (cfg.prize && typeof cfg.prize === 'object') {
    const parsed = parseAwardPrize(cfg.prize)
    if (parsed) list.push(parsed)
  }

  return list
}

/**
 * Checks if an award prize matches a configured prize definition.
 */
// fallow-ignore-next-line unused-export
export function doesPrizeMatchConfig(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  // 1. Check Money
  const confMoney = typeof configuredPrize.money === 'number' ? configuredPrize.money : (configuredPrize.type === 'money' ? configuredPrize.amount : undefined)
  const awardMoney = typeof awardPrize.money === 'number' ? awardPrize.money : (awardPrize.type === 'money' ? awardPrize.amount : undefined)
  if (confMoney !== undefined && awardMoney !== confMoney) {
    return false
  }

  // 2. Check Battle Coins
  const confBc = typeof configuredPrize.battleCoins === 'number' ? configuredPrize.battleCoins : (configuredPrize.type === 'bc' ? configuredPrize.amount : undefined)
  const awardBc = typeof awardPrize.battleCoins === 'number' ? awardPrize.battleCoins : (awardPrize.type === 'bc' ? awardPrize.amount : undefined)
  if (confBc !== undefined && awardBc !== confBc) {
    return false
  }

  // 3. Check Single Item
  if (configuredPrize.item) {
    if (awardPrize.item !== configuredPrize.item) return false
    const confQty = configuredPrize.qty || configuredPrize.amount || 1
    const awardQty = awardPrize.qty || awardPrize.amount || 1
    if (awardQty !== confQty) return false
  }

  // 4. Check Multiple Items map
  if (configuredPrize.items && typeof configuredPrize.items === 'object') {
    if (!awardPrize.items || typeof awardPrize.items !== 'object') return false
    const confEntries = Object.entries(configuredPrize.items)
    for (const [k, v] of confEntries) {
      if (awardPrize.items[k] !== v) return false
    }
  }

  // 5. Check Pokémon species
  if (configuredPrize.species) {
    if (awardPrize.species !== configuredPrize.species) return false
  }

  return true
}

/**
 * Evaluates whether an award is valid and claimable in the active game environment.
 * Returns false if:
 * - The event is legacy / not registered in allEvents (events_config).
 * - The prize payload is invalid, empty, or unparseable.
 * - The prize payload does not match any of the event's configured official prizes.
 */
export function isAwardClaimable(
  award: PendingAward | null | undefined,
  allEvents: GameEvent[]
): boolean {
  if (!award || !award.event_id) return false

  // 1. Validate that the event exists in configured events
  const matchingEvent = allEvents.find((e) => e.id === award.event_id)
  if (!matchingEvent || award.event_id.startsWith('custom_') || matchingEvent.name?.startsWith('custom_')) {
    return false
  }

  // 2. Validate prize structure
  const prize = parseAwardPrize(award.prize)
  if (!prize) return false

  // 3. Extract configured prizes for this event
  const configuredPrizes = getEventConfiguredPrizes(matchingEvent)
  if (configuredPrizes.length === 0) {
    return false
  }

  // 4. Award MUST match at least one official configured prize of this event
  return configuredPrizes.some((cfgPrize) => doesPrizeMatchConfig(prize, cfgPrize))
}
