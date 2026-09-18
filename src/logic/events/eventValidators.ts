/**
 * src/logic/events/eventValidators.ts
 * 
 * Pure validator helpers for event awards and legacy detection.
 */

import type { PendingAward, EventRewardType } from '@/types/system/stores'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import { safeParse } from './eventSchedules.ts'

export interface ParsedAwardPrize {
  type?: EventRewardType | 'ranked_medal' | string // domain-ok: Open dynamic text or non-domain string payload
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
  tier?: string
  season?: string
  tournamentName?: string
  rank?: number
  elo?: number
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

function extractSubCompetitionPrizes(subCompetitions: unknown): ParsedAwardPrize[] {
  if (!Array.isArray(subCompetitions)) return []
  const list: ParsedAwardPrize[] = []
  for (const sub of subCompetitions as { prizes?: Record<string, unknown> }[]) {
    if (sub?.prizes && typeof sub.prizes === 'object') {
      for (const prizeObj of Object.values(sub.prizes)) {
        const parsed = parseAwardPrize(prizeObj)
        if (parsed) list.push(parsed)
      }
    }
  }
  return list
}

function extractEventLevelPrizes(prizesObj: unknown): ParsedAwardPrize[] {
  if (!prizesObj || typeof prizesObj !== 'object') return []
  const list: ParsedAwardPrize[] = []
  for (const prizeObj of Object.values(prizesObj as Record<string, unknown>)) { // open-record: Generic key-value data dictionary container
    const parsed = parseAwardPrize(prizeObj)
    if (parsed) list.push(parsed)
  }
  return list
}

/**
 * Extracts all configured prize payloads from an event configuration.
 */
export function getEventConfiguredPrizes(event: GameEvent): ParsedAwardPrize[] {
  const cfg = (typeof event.config === 'string' ? safeParse(event.config) : event.config) as Record<string, unknown> | null // open-record: Generic key-value data dictionary container
  if (!cfg || typeof cfg !== 'object') return []

  const list: ParsedAwardPrize[] = [
    ...extractSubCompetitionPrizes(cfg.subCompetitions),
    ...extractEventLevelPrizes(cfg.prizes)
  ]

  if (cfg.prize && typeof cfg.prize === 'object') {
    const parsed = parseAwardPrize(cfg.prize)
    if (parsed) list.push(parsed)
  }

  return list
}

function checkMoneyMatch(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  const confMoney = typeof configuredPrize.money === 'number' ? configuredPrize.money : (configuredPrize.type === 'money' ? configuredPrize.amount : undefined)
  const awardMoney = typeof awardPrize.money === 'number' ? awardPrize.money : (awardPrize.type === 'money' ? awardPrize.amount : undefined)
  return confMoney === undefined || awardMoney === confMoney
}

function checkBattleCoinsMatch(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  const confBc = typeof configuredPrize.battleCoins === 'number' ? configuredPrize.battleCoins : (configuredPrize.type === 'bc' ? configuredPrize.amount : undefined)
  const awardBc = typeof awardPrize.battleCoins === 'number' ? awardPrize.battleCoins : (awardPrize.type === 'bc' ? awardPrize.amount : undefined)
  return confBc === undefined || awardBc === confBc
}

function checkItemMatch(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  if (!configuredPrize.item) return true
  if (awardPrize.item !== configuredPrize.item) return false
  const confQty = configuredPrize.qty || configuredPrize.amount || 1
  const awardQty = awardPrize.qty || awardPrize.amount || 1
  return awardQty === confQty
}

function checkMultipleItemsMatch(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  if (!configuredPrize.items || typeof configuredPrize.items !== 'object') return true
  if (!awardPrize.items || typeof awardPrize.items !== 'object') return false
  for (const [k, v] of Object.entries(configuredPrize.items)) {
    if (awardPrize.items[k] !== v) return false
  }
  return true
}

function checkSpeciesMatch(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  if (!configuredPrize.species) return true
  return awardPrize.species === configuredPrize.species
}

function isValidRankedSeasonPrize(award: PendingAward): boolean {
  const prize = parseAwardPrize(award.prize)
  if (!prize) return false
  return Boolean(
    prize.type === 'ranked_medal' ||
    prize.tier ||
    prize.money ||
    prize.battleCoins ||
    prize.item ||
    prize.items ||
    prize.species ||
    prize.type === 'pokemon' ||
    prize.type === 'bc' ||
    prize.type === 'item'
  )
}

/**
 * Checks if an award prize matches a configured prize definition.
 */
// fallow-ignore-next-line unused-export
export function doesPrizeMatchConfig(awardPrize: ParsedAwardPrize, configuredPrize: ParsedAwardPrize): boolean {
  return (
    checkMoneyMatch(awardPrize, configuredPrize) &&
    checkBattleCoinsMatch(awardPrize, configuredPrize) &&
    checkItemMatch(awardPrize, configuredPrize) &&
    checkMultipleItemsMatch(awardPrize, configuredPrize) &&
    checkSpeciesMatch(awardPrize, configuredPrize)
  )
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

  // 1. Ranked season awards are official periodic arena payout competitions
  if (award.event_id.startsWith('ranked_season_')) {
    return isValidRankedSeasonPrize(award)
  }

  // 2. Validate that the event exists in configured events
  const matchingEvent = allEvents.find((e) => e.id === award.event_id)
  if (!matchingEvent || award.event_id.startsWith('custom_') || matchingEvent.name?.startsWith('custom_')) {
    return false
  }

  // 3. Validate prize structure
  const prize = parseAwardPrize(award.prize)
  if (!prize) return false

  // 4. Extract configured prizes for this event
  const configuredPrizes = getEventConfiguredPrizes(matchingEvent)
  if (configuredPrizes.length === 0) {
    return false
  }

  // 5. Award MUST match at least one official configured prize of this event
  return configuredPrizes.some((cfgPrize) => doesPrizeMatchConfig(prize, cfgPrize))
}
