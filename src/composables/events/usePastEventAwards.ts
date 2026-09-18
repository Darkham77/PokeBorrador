import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { PastEventHistoryItem, PastCompetitionWinner, PendingAward } from '@/types/system/stores'
import { getDefaultSubCompetitions, type Event as GameEvent } from '@/logic/events/eventEngine'
import { resolveAwardCategory } from '@/logic/events/eventCompetitions'
import {
  formatEventScheduleWindow,
  getCategoryIcon,
  resolveCategoryDisplayName,
} from './pastEventFormatHelpers.ts'

export interface CategoryGroup {
  categoryId: string
  categoryName: string
  winners: PastCompetitionWinner[]
}

const prizeStringCache = new Map<string, Record<string, unknown>>()
const prizeObjectCache = new WeakMap<object, Record<string, unknown>>()

export const parsePrize = (rawPrize: unknown): Record<string, unknown> => {
  if (!rawPrize) return {}
  if (typeof rawPrize === 'string') {
    const cached = prizeStringCache.get(rawPrize)
    if (cached) return cached
    try {
      const parsed = JSON.parse(rawPrize) as Record<string, unknown> // open-record: Generic key-value data dictionary container
      prizeStringCache.set(rawPrize, parsed)
      return parsed
    } catch {
      return {}
    }
  }
  if (typeof rawPrize === 'object') {
    const cached = prizeObjectCache.get(rawPrize)
    if (cached) return cached
    const obj = rawPrize as Record<string, unknown> // open-record: Generic key-value data dictionary container
    prizeObjectCache.set(rawPrize, obj)
    return obj
  }
  return {}
}

export function usePastEventAwards(
  itemInput: MaybeRefOrGetter<PastEventHistoryItem>,
  matchingEventInput: MaybeRefOrGetter<GameEvent | null>
) {
  const item = computed(() => toValue(itemInput))
  const matchingEvent = computed(() => toValue(matchingEventInput))

  const formattedSchedule = computed(() => {
    return formatEventScheduleWindow(item.value, matchingEvent.value)
  })

  const groupedWinners = computed<CategoryGroup[]>(() => {
    const groups: Record<string, CategoryGroup> = {}
    const currentItem = item.value
    const targetEvent = matchingEvent.value || currentItem.raw_event
    const subComps = targetEvent ? getDefaultSubCompetitions(targetEvent) : []

    for (const w of currentItem.winners) {
      const catId = w.category_id || 'ivs'
      const catName = resolveCategoryDisplayName(currentItem.event_id, catId, w.category_name, subComps)
      if (!groups[catId]) {
        groups[catId] = {
          categoryId: catId,
          categoryName: catName,
          winners: []
        }
      }
      groups[catId]!.winners.push(w)
    }
    return Object.values(groups)
  })

  const allMyAwards = computed<PendingAward[]>(() => {
    const currentItem = item.value
    if (currentItem.myAwards && currentItem.myAwards.length > 0) {
      return currentItem.myAwards
    }
    return currentItem.myAward ? [currentItem.myAward] : []
  })

  const pendingMyAwards = computed<PendingAward[]>(() => {
    return allMyAwards.value.filter(a => a.received_at === null)
  })

  const getAwardForCategory = (categoryId: string): PendingAward | undefined => {
    const currentItem = item.value
    const direct = allMyAwards.value.find(a => a.category_id === categoryId)
    if (direct) return direct

    const targetEvent = matchingEvent.value || currentItem.raw_event
    const matched = allMyAwards.value.find(a => {
      if (a.category_id && (categoryId.startsWith(a.category_id) || a.category_id.startsWith(categoryId))) {
        return true
      }
      const resolved = resolveAwardCategory(a, targetEvent || undefined, currentItem.winners)
      return resolved?.categoryId === categoryId
    })
    if (matched) return matched

    if (groupedWinners.value.length === 1 && allMyAwards.value.length === 1) {
      return allMyAwards.value[0]
    }

    return undefined
  }

  const unmatchedAwards = computed<PendingAward[]>(() => {
    const matchedAwardIds = new Set<string>()
    for (const group of groupedWinners.value) {
      const award = getAwardForCategory(group.categoryId)
      if (award) {
        matchedAwardIds.add(award.id)
      }
    }
    return allMyAwards.value.filter(a => !matchedAwardIds.has(a.id))
  })

  return {
    formattedSchedule,
    groupedWinners,
    getCategoryIcon,
    allMyAwards,
    pendingMyAwards,
    parsePrize,
    getAwardForCategory,
    unmatchedAwards
  }
}
