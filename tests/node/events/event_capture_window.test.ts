import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import {
  getEventCurrentWindow,
  isPokemonEligibleForEvent,
  type Event as GameEvent
} from '@/logic/events/eventEngine.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex.ts'

describe('Global Event Capture Date Restrictions (eventEngine)', () => {
  const sampleMagikarp = (obtainedAt?: number): Pokemon => ({
    uid: 'karp-uid-1',
    id: requirePokemonSpeciesId('magikarp'),
    species: requirePokemonSpeciesId('magikarp'),
    name: 'Magikarp',
    level: 15,
    exp: 0,
    expNeeded: 100,
    hp: 30,
    maxHp: 30,
    atk: 10,
    def: 10,
    spa: 10,
    spd: 10,
    spe: 10,
    type: 'water',
    status: '',
    isShiny: false,
    ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
    nature: 'hardy',
    moves: [],
    obtainedAt
  })

  describe('getEventCurrentWindow', () => {
    it('returns exact start and end for absolute date events', () => {
      const event: GameEvent = {
        id: 'special_contest',
        name: 'Torneo Especial',
        description: 'Torneo de fin de semana',
        active: true,
        start_at: '2026-08-20T10:00:00Z',
        end_at: '2026-08-22T22:00:00Z',
        config: {
          hasCompetition: true,
          requireCaughtDuringEvent: true
        }
      }

      const refDate = Temporal.Instant.from('2026-08-21T12:00:00Z')
      const window = getEventCurrentWindow(event, refDate)
      assert.ok(window, 'Should return a window')
      assert.strictEqual(window.start.toString(), '2026-08-20T10:00:00Z')
      assert.strictEqual(window.end.toString(), '2026-08-22T22:00:00Z')
    })

    it('returns window for weekly scheduled events on Argentina time (UTC-3)', () => {
      const event: GameEvent = {
        id: 'hora_magikarp',
        name: 'Hora de Pesca del Magikarp',
        description: 'Martes y Jueves 18hs a 20hs',
        active: true,
        schedule: {
          type: 'weekly',
          days: [2, 4], // Tuesday, Thursday
          startHour: 18,
          endHour: 20
        },
        config: {
          species: 'magikarp',
          metric: 'total_ivs',
          hasCompetition: true,
          requireCaughtDuringEvent: true
        }
      }

      // 2026-08-25 is a Tuesday (day 2 in JS/Showdown, dayOfWeek 2 in ISO Temporal)
      // 18:30 in Argentina (UTC-3) is 21:30 UTC
      const activeRefDate = Temporal.Instant.from('2026-08-25T21:30:00Z')
      const window = getEventCurrentWindow(event, activeRefDate)
      assert.ok(window, 'Should return a valid window during active hours')

      // Window should start at 18:00 Art (21:00 UTC) and end at 20:00 Art (23:00 UTC)
      assert.strictEqual(window.start.toString(), '2026-08-25T21:00:00Z')
      assert.strictEqual(window.end.toString(), '2026-08-25T23:00:00Z')
    })

    it('returns null when weekly event is not currently within active hours', () => {
      const event: GameEvent = {
        id: 'hora_magikarp',
        name: 'Hora de Pesca del Magikarp',
        description: 'Martes y Jueves 18hs a 20hs',
        active: true,
        schedule: {
          type: 'weekly',
          days: [2, 4],
          startHour: 18,
          endHour: 20
        },
        config: {
          species: 'magikarp',
          hasCompetition: true,
          requireCaughtDuringEvent: true
        }
      }

      // Tuesday at 12:00 Art (15:00 UTC) - before 18:00
      const inactiveRefDate = Temporal.Instant.from('2026-08-25T15:00:00Z')
      const window = getEventCurrentWindow(event, inactiveRefDate)
      assert.strictEqual(window, null)
    })
  })

  describe('isPokemonEligibleForEvent', () => {
    const unconstrainedEvent: GameEvent = {
      id: 'open_contest',
      name: 'Torneo Abierto',
      description: 'Cualquier Magikarp es válido',
      active: true,
      config: {
        species: 'magikarp',
        metric: 'total_ivs',
        hasCompetition: true
        // requireCaughtDuringEvent is undefined / false
      }
    }

    const constrainedEvent: GameEvent = {
      id: 'hora_magikarp',
      name: 'Hora de Pesca del Magikarp',
      description: 'Solo Magikarps capturados durante el evento',
      active: true,
      start_at: '2026-08-25T18:00:00Z',
      end_at: '2026-08-25T20:00:00Z',
      config: {
        species: 'magikarp',
        metric: 'total_ivs',
        hasCompetition: true,
        requireCaughtDuringEvent: true
      }
    }

    it('accepts old Pokémon when requireCaughtDuringEvent is false or omitted', () => {
      const oldTimestamp = Temporal.Instant.from('2026-01-01T00:00:00Z').epochMilliseconds
      const oldKarp = sampleMagikarp(oldTimestamp)
      const res = isPokemonEligibleForEvent(unconstrainedEvent, oldKarp)
      assert.strictEqual(res.eligible, true)
    })

    it('rejects Pokémon of different species', () => {
      const pikachu: Pokemon = {
        ...sampleMagikarp(Temporal.Now.instant().epochMilliseconds),
        id: requirePokemonSpeciesId('pikachu'),
        species: requirePokemonSpeciesId('pikachu'),
        name: 'Pikachu'
      }
      const res = isPokemonEligibleForEvent(constrainedEvent, pikachu)
      assert.strictEqual(res.eligible, false)
      assert.ok(res.reason?.toLowerCase().includes('especie'))
    })

    it('accepts Pokémon captured within the event window when requireCaughtDuringEvent is true', () => {
      const insideTimestamp = Temporal.Instant.from('2026-08-25T19:00:00Z').epochMilliseconds
      const validKarp = sampleMagikarp(insideTimestamp)
      const res = isPokemonEligibleForEvent(
        constrainedEvent,
        validKarp,
        Temporal.Instant.from('2026-08-25T19:00:00Z')
      )
      assert.strictEqual(res.eligible, true)
    })

    it('rejects Pokémon captured before the event window start', () => {
      const beforeTimestamp = Temporal.Instant.from('2026-08-25T17:59:59Z').epochMilliseconds
      const earlyKarp = sampleMagikarp(beforeTimestamp)
      const res = isPokemonEligibleForEvent(
        constrainedEvent,
        earlyKarp,
        Temporal.Instant.from('2026-08-25T19:00:00Z')
      )
      assert.strictEqual(res.eligible, false)
      assert.ok(res.reason?.toLowerCase().includes('periodo') || res.reason?.toLowerCase().includes('rango') || res.reason?.toLowerCase().includes('captura'))
    })

    it('rejects Pokémon captured after the event window end', () => {
      const afterTimestamp = Temporal.Instant.from('2026-08-25T20:00:01Z').epochMilliseconds
      const lateKarp = sampleMagikarp(afterTimestamp)
      const res = isPokemonEligibleForEvent(
        constrainedEvent,
        lateKarp,
        Temporal.Instant.from('2026-08-25T19:00:00Z')
      )
      assert.strictEqual(res.eligible, false)
      assert.ok(res.reason?.toLowerCase().includes('periodo') || res.reason?.toLowerCase().includes('rango') || res.reason?.toLowerCase().includes('captura'))
    })

    it('rejects Pokémon without valid obtainedAt timestamp', () => {
      const noDateKarp = sampleMagikarp(undefined)
      const res = isPokemonEligibleForEvent(
        constrainedEvent,
        noDateKarp,
        Temporal.Instant.from('2026-08-25T19:00:00Z')
      )
      assert.strictEqual(res.eligible, false)
    })
  })
})
