import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { PastEventHistoryItem, PastCompetitionWinner, PendingAward } from '@/types/system/stores'
import { getSubCompTitle, getDefaultSubCompetitions, type Event as GameEvent } from '@/logic/events/eventEngine'
import { resolveAwardCategory } from '@/logic/events/eventCompetitions'

export interface CategoryGroup {
  categoryId: string
  categoryName: string
  winners: PastCompetitionWinner[]
}

interface WeeklyScheduleData {
  type?: string // domain-ok: Open dynamic text or non-domain string payload
  days?: number[]
  startHour?: number
  endHour?: number
}

const formatDate = (isoString?: string): string => {
  if (!isoString) return ''
  try {
    const instant = Temporal.Instant.from(isoString)
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE)
    const day = String(zdt.day).padStart(2, '0')
    const month = String(zdt.month).padStart(2, '0')
    const year = String(zdt.year)
    const hour = String(zdt.hour).padStart(2, '0')
    const minute = String(zdt.minute).padStart(2, '0')
    return `${day}/${month}/${year} · ${hour}:${minute} hs`
  } catch {
    return isoString
  }
}

const parseSchedule = (raw?: string | object): WeeklyScheduleData | null => {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as WeeklyScheduleData
    } catch {
      return null
    }
  }
  return raw as WeeklyScheduleData
}

export const formatEventScheduleWindow = (
  item: PastEventHistoryItem,
  matchingEvent?: GameEvent | null
): string => {
  const scheduleSource = item.event_schedule || matchingEvent?.schedule
  const startAtSource = item.start_at || matchingEvent?.start_at
  const endAtSource = item.end_at || matchingEvent?.end_at
  const endedAtSource = item.ended_at || endAtSource

  // 1. Check absolute start_at & end_at
  if (startAtSource && endAtSource) {
    try {
      const sInstant = Temporal.Instant.from(startAtSource).toZonedDateTimeISO(GAME_TIMEZONE)
      const eInstant = Temporal.Instant.from(endAtSource).toZonedDateTimeISO(GAME_TIMEZONE)
      const sDay = String(sInstant.day).padStart(2, '0')
      const sMonth = String(sInstant.month).padStart(2, '0')
      const sYear = String(sInstant.year)
      const sH = `${String(sInstant.hour).padStart(2, '0')}:${String(sInstant.minute).padStart(2, '0')}`

      const eDay = String(eInstant.day).padStart(2, '0')
      const eMonth = String(eInstant.month).padStart(2, '0')
      const eYear = String(eInstant.year)
      const eH = `${String(eInstant.hour).padStart(2, '0')}:${String(eInstant.minute).padStart(2, '0')}`

      if (sDay === eDay && sMonth === eMonth && sYear === eYear) {
        return `${sDay}/${sMonth}/${sYear} · De ${sH} a ${eH} hs`
      }
      return `Del ${sDay}/${sMonth}/${sYear} ${sH} hs al ${eDay}/${eMonth}/${eYear} ${eH} hs`
    } catch {
      // ignore
    }
  }

  // 2. Check schedule object (e.g. startHour, endHour)
  const sched = parseSchedule(scheduleSource)
  if (sched && (typeof sched.startHour === 'number' || typeof sched.endHour === 'number')) {
    let datePrefix = ''
    if (endedAtSource) {
      try {
        const instant = Temporal.Instant.from(endedAtSource).toZonedDateTimeISO(GAME_TIMEZONE)
        const day = String(instant.day).padStart(2, '0')
        const month = String(instant.month).padStart(2, '0')
        const year = String(instant.year)
        datePrefix = `${day}/${month}/${year}`
      } catch {
        datePrefix = ''
      }
    }

    const startH = typeof sched.startHour === 'number' ? sched.startHour : 0
    const endH = typeof sched.endHour === 'number' ? sched.endHour : 24
    const formatH = (hr: number) => {
      const h = Math.floor(hr)
      const m = Math.round((hr % 1) * 60)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const isAllDay = startH === 0 && (endH >= 23.9 || endH === 24)
    const timeRange = isAllDay ? 'De 00:00 a 23:59 hs' : `De ${formatH(startH)} a ${formatH(endH)} hs`
    return datePrefix ? `${datePrefix} · ${timeRange}` : timeRange
  }

  // 3. Fallback to single timestamp
  return formatDate(endedAtSource)
}

export const getCategoryIcon = (catId: string): string => {
  if (catId.startsWith('ivs')) return '🧬'
  if (catId.startsWith('weight')) return '⚖️'
  if (catId.startsWith('height')) return '📏'
  if (catId.startsWith('level')) return '📈'
  if (catId.startsWith('friendship')) return '💖'
  return '🏆'
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
      let catName = w.category_name
      if (!catName || catName.includes('/') || catName.includes('Genética') || catName.includes('Titán') || catName.includes('Miniatura') || catName.includes('Envergadura') || catName.includes('Gran Salto') || catName.includes('Masa')) {
        const subComp = subComps.find(s => s.id === catId || catId.startsWith(s.id))
        if (subComp) {
          catName = getSubCompTitle(currentItem.event_id, subComp)
        } else if (catId.startsWith('weight')) {
          catName = getSubCompTitle(currentItem.event_id, { id: catId, metric: 'weight', order: 'auto', name: 'Peso' })
        } else if (catId.startsWith('height')) {
          catName = getSubCompTitle(currentItem.event_id, { id: catId, metric: 'height', order: 'auto', name: 'Altura' })
        } else if (catId.startsWith('level')) {
          catName = 'Mayor Nivel'
        } else if (catId.startsWith('friendship')) {
          catName = 'Mayor Amistad'
        } else {
          catName = 'Mayor IVs'
        }
      }
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
