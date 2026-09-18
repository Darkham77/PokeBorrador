import type { Ref } from 'vue'
import type { PendingAward, PastEventHistoryItem } from '@/types/system/stores'
import type { PokemonCompetitionTrophy, PokemonCompetitionRank } from '@/types/pokemon/pokemon'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { GameStatKey } from '@/types/system/game'

export function parseAwardPrizePayload(rawPrize: unknown): Record<string, unknown> | null { // open-record: Generic key-value data dictionary container
  if (!rawPrize) return null
  if (typeof rawPrize === 'string') {
    try {
      return JSON.parse(rawPrize) as Record<string, unknown> // open-record: Generic key-value data dictionary container
    } catch {
      return null
    }
  }
  if (typeof rawPrize === 'object') {
    return rawPrize as Record<string, unknown> // open-record: Generic key-value data dictionary container
  }
  return null
}

const MEDAL_STAT_KEYS: Record<PokemonCompetitionRank, GameStatKey> = {
  first: 'eventMedalsFirst',
  second: 'eventMedalsSecond',
  third: 'eventMedalsThird'
}

export function updateTrophyStats(stats: Partial<Record<GameStatKey, number>>, rank: PokemonCompetitionRank): void {
  const medalKey = MEDAL_STAT_KEYS[rank]
  if (medalKey) {
    stats[medalKey] = (Number(stats[medalKey]) || 0) + 1
  }
  stats.eventMedalsTotal = (Number(stats.eventMedalsTotal) || 0) + 1
}

export function insertOrUpdatePokemonTrophy(
  trophies: PokemonCompetitionTrophy[],
  trophy: PokemonCompetitionTrophy
): boolean {
  const existingIndex = trophies.findIndex(
    t => t.eventId === trophy.eventId && t.categoryId === trophy.categoryId && t.awardedAt === trophy.awardedAt
  )
  if (existingIndex >= 0) {
    trophies[existingIndex] = trophy
    return false
  }
  trophies.push(trophy)
  return true
}

export function resolvePastEventVisuals(
  eventCfg: GameEvent | undefined,
  isCustomOrUnknown: boolean
): { icon: string; description: string } {
  if (isCustomOrUnknown || !eventCfg) {
    return { icon: '🏆', description: '' }
  }
  return {
    icon: eventCfg.icon || '🏆',
    description: eventCfg.description || ''
  }
}

export function findTargetAward( // result-ok: Operation result wrapper payload
  awardId: string,
  pendingAwards: PendingAward[],
  pastEvents: PastEventHistoryItem[]
): PendingAward | undefined { // result-ok: Operation result wrapper payload
  const inPending = pendingAwards.find(a => a.id === awardId)
  if (inPending) return inPending

  for (const pe of pastEvents) {
    if (pe.myAwards) {
      const match = pe.myAwards.find(a => a.id === awardId)
      if (match) return match
    }
    if (pe.myAward?.id === awardId) {
      return pe.myAward
    }
  }
  return undefined
}

function pastEventContainsAward(pe: PastEventHistoryItem, awardId: string): boolean {
  if (pe.myAward?.id === awardId) return true
  return Boolean(pe.myAwards?.some(a => a.id === awardId))
}

function calculateUpdatedPastEventItem(
  pe: PastEventHistoryItem,
  transformAwards: (awards: PendingAward[]) => PendingAward[]
): PastEventHistoryItem {
  const currentAwards = pe.myAwards ?? (pe.myAward ? [pe.myAward] : [])
  const updatedAwards = transformAwards(currentAwards)
  const nextUnclaimed = updatedAwards.find(a => a.received_at === null) ?? null
  const hasUnclaimedAward = Boolean(nextUnclaimed)
  const isClaimed = updatedAwards.length > 0 && !hasUnclaimedAward

  return {
    ...pe,
    myAward: nextUnclaimed ?? updatedAwards[0] ?? null,
    myAwards: updatedAwards,
    hasUnclaimedAward,
    isClaimed
  }
}

export function mutatePastEventsAwards(
  pastEvents: Ref<PastEventHistoryItem[]>,
  awardId: string,
  transformAwards: (awards: PendingAward[]) => PendingAward[]
): void {
  pastEvents.value = pastEvents.value.map(pe => {
    if (!pastEventContainsAward(pe, awardId)) return pe
    return calculateUpdatedPastEventItem(pe, transformAwards)
  })
}
