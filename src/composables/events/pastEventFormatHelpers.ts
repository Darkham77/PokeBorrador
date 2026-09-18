import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import { logger } from '@/logic/utils/logger'
import type { PastEventHistoryItem } from '@/types/system/stores'
import { getSubCompTitle, type Event as GameEvent, type SubCompetitionConfig } from '@/logic/events/eventEngine'

const DEFAULT_SCHEDULE_START_HOUR = 0
const DEFAULT_SCHEDULE_END_HOUR = 24
const ALL_DAY_END_HOUR_THRESHOLD = 23.9
const MINUTES_PER_HOUR = 60

export interface WeeklyScheduleData {
  type?: string // domain-ok: Open dynamic text or non-domain string payload
  days?: number[]
  startHour?: number
  endHour?: number
}

const CATEGORY_PREFIX_ICONS = [
  ['ivs', '🧬'],
  ['weight', '⚖️'],
  ['height', '📏'],
  ['level', '📈'],
  ['friendship', '💖'],
] as const

export function getCategoryIcon(catId: string): string {
  for (const [prefix, icon] of CATEGORY_PREFIX_ICONS) {
    if (catId.startsWith(prefix)) return icon
  }
  return '🏆'
}

export function formatDate(isoString?: string): string {
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

export function parseSchedule(raw?: string | object): WeeklyScheduleData | null {
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

function formatAbsoluteWindow(startAt: string, endAt: string): string | null {
  try {
    const sInstant = Temporal.Instant.from(startAt).toZonedDateTimeISO(GAME_TIMEZONE)
    const eInstant = Temporal.Instant.from(endAt).toZonedDateTimeISO(GAME_TIMEZONE)
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
  } catch (err) {
    logger.warn('[usePastEventAwards] Error parseando fechas:', err)
    return null
  }
}

function formatHourMinute(hr: number): string {
  const h = Math.floor(hr)
  const m = Math.round((hr % 1) * MINUTES_PER_HOUR)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatScheduleObjectWindow(sched: WeeklyScheduleData, endedAtSource?: string): string {
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

  const startH = typeof sched.startHour === 'number' ? sched.startHour : DEFAULT_SCHEDULE_START_HOUR
  const endH = typeof sched.endHour === 'number' ? sched.endHour : DEFAULT_SCHEDULE_END_HOUR
  const isAllDay = startH === DEFAULT_SCHEDULE_START_HOUR && (endH >= ALL_DAY_END_HOUR_THRESHOLD || endH === DEFAULT_SCHEDULE_END_HOUR)
  const timeRange = isAllDay ? 'De 00:00 a 23:59 hs' : `De ${formatHourMinute(startH)} a ${formatHourMinute(endH)} hs`
  return datePrefix ? `${datePrefix} · ${timeRange}` : timeRange
}

export function formatEventScheduleWindow(
  item: PastEventHistoryItem,
  matchingEvent?: GameEvent | null
): string {
  const scheduleSource = item.event_schedule || matchingEvent?.schedule
  const startAtSource = item.start_at || matchingEvent?.start_at
  const endAtSource = item.end_at || matchingEvent?.end_at
  const endedAtSource = item.ended_at || endAtSource

  if (startAtSource && endAtSource) {
    const formatted = formatAbsoluteWindow(startAtSource, endAtSource)
    if (formatted) return formatted
  }

  const sched = parseSchedule(scheduleSource)
  if (sched && (typeof sched.startHour === 'number' || typeof sched.endHour === 'number')) {
    return formatScheduleObjectWindow(sched, endedAtSource)
  }

  return formatDate(endedAtSource)
}

const CATEGORY_NAMES_DEFAULT: Record<string, string> = {
  level: 'Mayor Nivel',
  friendship: 'Mayor Amistad',
}

export function resolveCategoryDisplayName(
  eventId: string,
  catId: string,
  rawName: string | undefined,
  subComps: readonly SubCompetitionConfig[]
): string {
  if (rawName && !rawName.includes('/') && !rawName.includes('Genética') && !rawName.includes('Titán') && !rawName.includes('Miniatura') && !rawName.includes('Envergadura') && !rawName.includes('Gran Salto') && !rawName.includes('Masa')) {
    return rawName
  }

  const subComp = subComps.find(s => s.id === catId || catId.startsWith(s.id))
  if (subComp) {
    return getSubCompTitle(eventId, subComp)
  }
  if (catId.startsWith('weight')) {
    return getSubCompTitle(eventId, { id: catId, metric: 'weight', order: 'auto', name: 'Peso' })
  }
  if (catId.startsWith('height')) {
    return getSubCompTitle(eventId, { id: catId, metric: 'height', order: 'auto', name: 'Altura' })
  }
  if (CATEGORY_NAMES_DEFAULT[catId]) {
    return CATEGORY_NAMES_DEFAULT[catId]!
  }
  return 'Mayor IVs'
}
