/**
 * src/logic/debug/rewardsDebugOccurrenceHelper.ts
 *
 * Helper for matching past event occurrences and picking simulated prizes.
 */

import { normalizeZonedDateTime } from '@/logic/utils/timeUtils'
import { safeParse, isLastSundayOfMonth, isSecondWeekendOfMonth, isLastWeekendOfMonth } from '@/logic/events/eventSchedules'
import { getEventConfiguredPrizes } from '@/logic/events/eventValidators'
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine'

export interface PastEventMatch {
  event: GameEvent
  endedAt: Temporal.Instant
}

/**
 * Finds the most recent past occurrence of an event ending before `nowZdt`
 * that has official prizes configured.
 */
export function findLatestPastEvent(
  events: GameEvent[],
  nowZdt: Temporal.ZonedDateTime = normalizeZonedDateTime()
): PastEventMatch | null {
  const nowInstant = nowZdt.toInstant()
  const matches: PastEventMatch[] = []

  for (const event of events) {
    const prizes = getEventConfiguredPrizes(event)
    if (prizes.length === 0) continue

    const cfg = (typeof event.config === 'string' ? safeParse(event.config) : event.config) as EventConfig | null
    const sched = (typeof event.schedule === 'string' ? safeParse(event.schedule) : event.schedule) as Record<string, unknown> | null // open-record: Generic key-value data dictionary container

    // Case 1: Static end_at date
    const staticEndStr = event.end_at || cfg?.catchEndDate
    if (staticEndStr) {
      try {
        const endInst = Temporal.Instant.from(staticEndStr)
        if (Temporal.Instant.compare(endInst, nowInstant) < 0) {
          matches.push({ event, endedAt: endInst })
          continue
        }
      } catch {
        // ignore parse error
      }
    }

    // Case 2: Recurring weekly schedule
    if (sched && (Array.isArray(sched.days) || typeof sched.dayOfWeek === 'number')) {
      const days = (Array.isArray(sched.days) ? sched.days : [sched.dayOfWeek]) as number[]
      const startHour = typeof sched.startHour === 'number' ? sched.startHour : 0
      const endHour = typeof sched.endHour === 'number' ? sched.endHour : 24

      // Inspect the past 14 days backwards
      for (let offset = 0; offset >= -14; offset--) {
        const targetDay = nowZdt.add({ days: offset })
        const jsDay = targetDay.dayOfWeek % 7

        if (days.includes(jsDay)) {
          const endZdt = startHour < endHour
            ? targetDay.with({ hour: Math.min(23, Math.floor(endHour)), minute: Math.round((endHour % 1) * 60), second: 0, millisecond: 0 })
            : targetDay.add({ days: 1 }).with({ hour: Math.min(23, Math.floor(endHour)), minute: Math.round((endHour % 1) * 60), second: 0, millisecond: 0 })

          const endInst = endZdt.toInstant()
          if (Temporal.Instant.compare(endInst, nowInstant) < 0) {
            matches.push({ event, endedAt: endInst })
            break // Pick the newest occurrence for this event
          }
        }
      }
      continue
    }

    // Case 3: Monthly trigger schedule (last_sunday, second_weekend, last_weekend)
    if (sched && typeof sched.trigger === 'string') {
      const trigger = sched.trigger
      const endHour = typeof sched.endHour === 'number' ? sched.endHour : 24

      for (let offset = 0; offset >= -45; offset--) {
        const targetDay = nowZdt.add({ days: offset })
        let isMatch = false
        if (trigger === 'last_sunday') isMatch = isLastSundayOfMonth(targetDay)
        else if (trigger === 'second_weekend') isMatch = isSecondWeekendOfMonth(targetDay)
        else if (trigger === 'last_weekend') isMatch = isLastWeekendOfMonth(targetDay)

        if (isMatch) {
          const endZdt = targetDay.with({ hour: Math.min(23, Math.floor(endHour)), minute: Math.round((endHour % 1) * 60), second: 0, millisecond: 0 })
          const endInst = endZdt.toInstant()
          if (Temporal.Instant.compare(endInst, nowInstant) < 0) {
            matches.push({ event, endedAt: endInst })
            break
          }
        }
      }
    }
  }

  if (matches.length === 0) return null

  // Sort descending: closest to now comes first
  matches.sort((a, b) => Temporal.Instant.compare(b.endedAt, a.endedAt))
  return matches[0] || null
}

/**
 * Extracts a random prize and rank from the event's configured rewards.
 */
export function pickRandomPrize(event: GameEvent): { prize: Record<string, unknown>; rankLabel: string; categoryName?: string; categoryId?: string } { // open-record: Generic key-value data dictionary container
  const cfg = (typeof event.config === 'string' ? safeParse(event.config) : event.config) as Record<string, unknown> | null // open-record: Generic key-value data dictionary container

  // 1. Check subCompetitions
  if (cfg && Array.isArray(cfg.subCompetitions) && cfg.subCompetitions.length > 0) {
    const subsWithPrizes = (cfg.subCompetitions as Array<{ id?: string; name?: string; prizes?: Record<string, unknown> }>) // open-record: Generic key-value data dictionary container
      .filter(s => s && s.prizes && Object.keys(s.prizes).length > 0)

    if (subsWithPrizes.length > 0) {
      const chosenSub = subsWithPrizes[Math.floor(Math.random() * subsWithPrizes.length)]!
      const prizeKeys = Object.keys(chosenSub.prizes || {})
      const chosenKey = prizeKeys[Math.floor(Math.random() * prizeKeys.length)] || 'first'
      const rawPrize = (chosenSub.prizes as Record<string, unknown>)[chosenKey] as Record<string, unknown> || {} // open-record: Generic key-value data dictionary container
      const rankLabels: Record<string, string> = {
        first: '1° Puesto 🥇',
        second: '2° Puesto 🥈',
        third: '3° Puesto 🥉'
      }
      return {
        prize: rawPrize,
        rankLabel: rankLabels[chosenKey] || `${chosenKey.toUpperCase()} 🏆`,
        categoryId: chosenSub.id,
        categoryName: chosenSub.name
      }
    }
  }

  // 2. Check event-level prizes
  if (cfg && cfg.prizes && typeof cfg.prizes === 'object') {
    const keys = Object.keys(cfg.prizes as Record<string, unknown>) // open-record: Generic key-value data dictionary container
    if (keys.length > 0) {
      const chosenKey = keys[Math.floor(Math.random() * keys.length)] || 'first'
      const rawPrize = (cfg.prizes as Record<string, unknown>)[chosenKey] as Record<string, unknown> || {} // open-record: Generic key-value data dictionary container
      const rankLabels: Record<string, string> = {
        first: '1° Puesto 🥇',
        second: '2° Puesto 🥈',
        third: '3° Puesto 🥉'
      }
      return {
        prize: rawPrize,
        rankLabel: rankLabels[chosenKey] || `${chosenKey.toUpperCase()} 🏆`
      }
    }
  }

  // 3. Fallback to all configured prizes
  const allPrizes = getEventConfiguredPrizes(event)
  if (allPrizes.length > 0) {
    const chosen = allPrizes[Math.floor(Math.random() * allPrizes.length)] as Record<string, unknown> // open-record: Generic key-value data dictionary container
    return {
      prize: chosen,
      rankLabel: 'Premio Ganador 🏆'
    }
  }

  return {
    prize: { money: 1000 },
    rankLabel: 'Premio Consuelo 🏅'
  }
}
