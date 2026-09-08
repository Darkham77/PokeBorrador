// src/composables/events/useEventDetailBonuses.ts
import { computed, type Ref, type ComputedRef } from 'vue'
import { normalizeZonedDateTime } from '@/logic/utils/timeUtils'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import {
  resolveEventSubCompetitions,
  type Event as GameEvent,
  type EventConfig,
  type ResolvedSubCompetition,
  type UpcomingEventOccurrence
} from '@/logic/events/eventEngine'
import type { EventRewardType } from '@/types/system/stores'

export interface Prize extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  type?: EventRewardType
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
}

export interface ExtendedEventConfig extends EventConfig {
  hasCompetition?: boolean
  prizes?: {
    first?: Prize
    second?: Prize
    third?: Prize
  }
  sortBy?: string
}

export interface BonusItem {
  label: string
  color: string
  value: string
}

export interface Schedule {
  type?: string
  days?: number[]
  startHour?: number
  endHour?: number
}

export function useEventDetailBonuses(
  event: GameEvent,
  cfg: Ref<ExtendedEventConfig>,
  targetZdt: ComputedRef<Temporal.ZonedDateTime>,
  effectiveSpeciesString: ComputedRef<string | null>,
  occurrence?: UpcomingEventOccurrence
) {
  const sched = computed<Schedule>(() => {
    if (typeof event.schedule === 'string') {
      try { return JSON.parse(event.schedule) as Schedule } catch (_e) { return {} }
    } else if (event.schedule && typeof event.schedule === 'object') {
      return event.schedule as Schedule
    }
    return {}
  })

  const prizes = computed<{ first?: Prize, second?: Prize, third?: Prize } | null>(() => {
    const c = cfg.value
    if (c.hasCompetition !== true || !c.prizes) return null
    return c.prizes
  })

  const subCompetitions = computed<ResolvedSubCompetition[]>(() => {
    if (cfg.value.hasCompetition !== true) return []
    return resolveEventSubCompetitions(event, targetZdt.value)
  })

  const getSubCompPrizes = (sub: ResolvedSubCompetition): { first?: Prize, second?: Prize, third?: Prize } | null => {
    if (sub.prizes && (sub.prizes.first || sub.prizes.second || sub.prizes.third)) {
      return sub.prizes as { first?: Prize, second?: Prize, third?: Prize }
    }
    return prizes.value
  }

  const involvedSpecies = computed<PokemonSpeciesId[]>(() => {
    const result: PokemonSpeciesId[] = []
    const seen = new Set<string>()

    const add = (raw: string | undefined | null) => {
      if (!raw) return
      const id = raw.trim().toLowerCase()
      if (isPokemonSpeciesId(id) && !seen.has(id)) {
        seen.add(id)
        result.push(id)
      }
    }

    if (effectiveSpeciesString.value) {
      const list = effectiveSpeciesString.value.split(',')
      list.forEach(add)
    }

    if (prizes.value) {
      if (prizes.value.first?.species) add(prizes.value.first.species)
      if (prizes.value.second?.species) add(prizes.value.second.species)
      if (prizes.value.third?.species) add(prizes.value.third.species)
    }

    if (subCompetitions.value.length > 0) {
      for (const sub of subCompetitions.value) {
        const p = getSubCompPrizes(sub)
        if (p?.first && typeof p.first === 'object' && 'species' in p.first && typeof p.first.species === 'string') {
          add(p.first.species)
        }
        if (p?.second && typeof p.second === 'object' && 'species' in p.second && typeof p.second.species === 'string') {
          add(p.second.species)
        }
        if (p?.third && typeof p.third === 'object' && 'species' in p.third && typeof p.third.species === 'string') {
          add(p.third.species)
        }
      }
    }

    return result
  })

  const activeBonuses = computed<BonusItem[]>(() => {
    const bonuses: BonusItem[] = []
    const c = cfg.value

    if (c.expMult && c.expMult > 1) {
      bonuses.push({ label: '⭐ EXP ganada en cada combate', color: 'rgba(74, 222, 128, 1)', value: `x${c.expMult}` })
    }
    if (c.moneyMult && c.moneyMult > 1) {
      bonuses.push({ label: '💰 Dinero ganado por victoria', color: 'rgba(250, 204, 21, 1)', value: `x${c.moneyMult}` })
    }
    if (c.bcMult && c.bcMult > 1) {
      bonuses.push({ label: '🪙 Battle Coins por victoria en combate', color: 'rgba(96, 165, 250, 1)', value: `x${c.bcMult}` })
    }
    if (c.catchRateMult && c.catchRateMult > 1) {
      bonuses.push({ label: '🔴 Mayor probabilidad de captura con cualquier Pokéball', color: 'rgba(244, 114, 182, 1)', value: `x${c.catchRateMult}` })
    }
    if (c.shinyMult && c.shinyMult > 1) {
      bonuses.push({ label: '✨ Más chances de encontrar Pokémon Variocolor (Shiny)', color: 'rgba(244, 114, 182, 1)', value: `x${c.shinyMult}` })
    }
    if (c.eggShinyMult && c.eggShinyMult > 1) {
      bonuses.push({ label: '🥚 Más chances de que los Huevos eclosionen en Shiny', color: 'rgba(244, 114, 182, 1)', value: `x${c.eggShinyMult}` })
    }
    if (c.hatchMult && c.hatchMult > 1) {
      bonuses.push({ label: '🏃 Los Huevos eclosionan más rápido (menos pasos)', color: 'rgba(56, 189, 248, 1)', value: `x${c.hatchMult}` })
    }

    const resolvedSpecies = involvedSpecies.value
    const spNames = resolvedSpecies.length > 0
      ? resolvedSpecies.map(s => s.toUpperCase()).join(', ') // domain-ok: UI uppercase formatted species list string
      : (effectiveSpeciesString.value && effectiveSpeciesString.value !== '*' ? effectiveSpeciesString.value.toUpperCase() : null) // domain-ok: Open dynamic text or non-domain string payload

    if (c.speciesShinyMult && c.speciesShinyMult > 1) {
      const label = spNames ? `✨ Más chances de encontrar ${spNames} Variocolor (Shiny)` : '✨ Más chances de encontrar Pokémon del Evento Variocolor (Shiny)'
      bonuses.push({ label, color: 'rgba(244, 114, 182, 1)', value: `x${c.speciesShinyMult}` })
    }
    if (c.speciesRateMult && c.speciesRateMult > 1) {
      const label = spNames ? `🎯 ${spNames} aparece con mayor frecuencia en el mundo` : '🎯 Pokémon del Evento aparecen con mayor frecuencia en el mundo'
      bonuses.push({ label, color: 'rgba(96, 165, 250, 1)', value: `x${c.speciesRateMult}` })
    }

    const mb = c.minigameBuffs || {}
    if (c.fishingMult && c.fishingMult > 1 && !mb.fishing) {
      bonuses.push({ label: '🎣 Pesca: Mayor frecuencia de encuentros y capturas', color: 'rgba(56, 189, 248, 1)', value: `x${c.fishingMult}` })
    }
    if (c.archaeologyMult && c.archaeologyMult > 1 && !mb.archaeology) {
      bonuses.push({ label: '⛏️ Arqueología: Mayor probabilidad de fósiles, gemas y tesoros', color: 'rgba(251, 146, 60, 1)', value: `x${c.archaeologyMult}` })
    }
    if (c.bugCatchingMult && c.bugCatchingMult > 1 && !mb.bug_catching) {
      bonuses.push({ label: '🦗 Caza de Bichos: Mayor aparición de Pokémon insecto', color: 'rgba(163, 230, 53, 1)', value: `x${c.bugCatchingMult}` })
    }

    if (c.minigameBuffs && typeof c.minigameBuffs === 'object') {
      const minigameNames: Record<string, string> = {
        fishing: '🎣 Pesca',
        archaeology: '⛏️ Arqueología',
        bug_catching: '🦗 Caza de Bichos',
        safari: '🧭 Zona Safari'
      }

      for (const [mId, buffs] of Object.entries(c.minigameBuffs)) {
        if (mId === 'casino') continue
        const mName = minigameNames[mId] || `🎮 ${mId.toUpperCase()}`
        if (buffs.encounterRateMult && buffs.encounterRateMult > 1) {
          bonuses.push({ label: `${mName}: Más Pokémon aparecen por sesión`, color: 'rgba(56, 189, 248, 1)', value: `x${buffs.encounterRateMult}` })
        }
        if (buffs.successRateMult && buffs.successRateMult > 1) {
          bonuses.push({ label: `${mName}: Mayor probabilidad de éxito por intento`, color: 'rgba(74, 222, 128, 1)', value: `x${buffs.successRateMult}` })
        }
        if (buffs.rareDropMult && buffs.rareDropMult > 1) {
          bonuses.push({ label: `${mName}: Más objetos raros, gemas y tesoros`, color: 'rgba(250, 204, 21, 1)', value: `x${buffs.rareDropMult}` })
        }
        if (buffs.shinyMult && buffs.shinyMult > 1) {
          bonuses.push({ label: `${mName}: Mayor probabilidad de hallar Pokémon Shiny`, color: 'rgba(244, 114, 182, 1)', value: `x${buffs.shinyMult}` })
        }
        if (buffs.expMult && buffs.expMult > 1) {
          bonuses.push({ label: `${mName}: Más EXP ganada por actividad`, color: 'rgba(168, 85, 247, 1)', value: `x${buffs.expMult}` })
        }
        if (buffs.scoreMult && buffs.scoreMult > 1) {
          bonuses.push({ label: `${mName}: Puntaje más alto en la clasificación`, color: 'rgba(234, 179, 8, 1)', value: `x${buffs.scoreMult}` })
        }
      }
    }

    if (c.requireCaughtDuringEvent) {
      bonuses.push({ label: '🕒 Solo se aceptan Pokémon capturados durante este evento', color: 'rgba(250, 204, 21, 1)', value: 'REGLA' })
    }

    return bonuses
  })

  const scheduleText = computed(() => {
    if (occurrence) {
      const occ = occurrence
      const dayPrefix = occ.dateLabel === 'Hoy' || occ.dateLabel === 'Mañana'
        ? `${occ.dateLabel} (${occ.dayName})`
        : `${occ.dateLabel} · ${occ.dayName}`
      return `${dayPrefix} · ${occ.timeLabel} (ARG)`
    }
    if (event.manual) return '🟢 Evento activo ahora mismo'
    if (sched.value.type === 'weekly' && sched.value.days) {
      const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'] as const
      const days = sched.value.days.length === 7 ? 'Todos los días' : sched.value.days.map((d: number) => dayNames[d]).join(', ')
      const formatH = (hr: number) => {
        const h = Math.floor(hr)
        const m = Math.round((hr % 1) * 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
      const isAllDay = sched.value.startHour === 0 && (sched.value.endHour === 24 || (sched.value.endHour !== undefined && sched.value.endHour >= 23.9))
      const hours = (sched.value.startHour !== undefined && sched.value.endHour !== undefined)
        ? (isAllDay ? ' · Todo el día (ARG)' : ` · ${formatH(sched.value.startHour)} – ${formatH(sched.value.endHour)} hs (ARG)`) : ''
      return `${days}${hours}`
    }
    if (event.start_at && event.end_at) {
      try {
        const startInst = Temporal.Instant.from(event.start_at)
        const endInst = Temporal.Instant.from(event.end_at)
        const startZdt = normalizeZonedDateTime(startInst)
        const endZdt = normalizeZonedDateTime(endInst)
        const isSameDay = startZdt.year === endZdt.year && startZdt.month === endZdt.month && startZdt.day === endZdt.day
        const isStartOfDay = startZdt.hour === 0 && startZdt.minute === 0
        const isEndOfDay = (endZdt.hour === 23 && endZdt.minute >= 59) || (endZdt.hour === 0 && endZdt.minute === 0)
        const isAllDay = isStartOfDay && isEndOfDay

        const formatTime = (zdt: Temporal.ZonedDateTime) =>
          `${String(zdt.hour).padStart(2, '0')}:${String(zdt.minute).padStart(2, '0')}`

        if (isSameDay) {
          const timePart = isAllDay ? ' · Todo el día (ARG)' : ` · ${formatTime(startZdt)} – ${formatTime(endZdt)} hs (ARG)`
          return `${startZdt.day}/${startZdt.month}/${startZdt.year}${timePart}`
        } else {
          const timePart = isAllDay ? ' · Todo el día (ARG)' : ` · ${formatTime(startZdt)} al ${formatTime(endZdt)} hs (ARG)`
          return `Del ${startZdt.day}/${startZdt.month} al ${endZdt.day}/${endZdt.month}/${endZdt.year}${timePart}`
        }
      } catch {
        return null
      }
    }
    const eventWithEndedAt = event as (GameEvent & { ended_at?: string })
    if (eventWithEndedAt.ended_at) {
      try {
        const instant = Temporal.Instant.from(eventWithEndedAt.ended_at)
        const zdt = normalizeZonedDateTime(instant)
        const day = String(zdt.day).padStart(2, '0')
        const month = String(zdt.month).padStart(2, '0')
        const year = String(zdt.year)
        const hour = String(zdt.hour).padStart(2, '0')
        const minute = String(zdt.minute).padStart(2, '0')
        return `🏁 Edición finalizada el ${day}/${month}/${year} a las ${hour}:${minute} hs (ARG)`
      } catch {
        return null
      }
    }
    return null
  })

  return {
    prizes,
    subCompetitions,
    involvedSpecies,
    activeBonuses,
    scheduleText
  }
}
