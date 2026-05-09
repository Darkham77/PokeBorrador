import { Temporal } from '@js-temporal/polyfill'

import { describe, it, expect } from 'vitest'
import { isEventActiveNow, getGlobalMultipliers, getSpeciesBoosts } from '@/logic/events/eventEngine'

describe('Event Engine Logic', () => {
  it('correctly identifies manual events as active', () => {
    const event = { active: true, manual: true }
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0])).toBe(true)
  })

  it('identifies inactive events as false', () => {
    const event = { active: false, manual: true }
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0])).toBe(false)
  })

  it('filters by absolute date range', () => {
    const event = { 
      active: true, 
      start_at: '2026-04-10T00:00:00Z', 
      ends_at: '2026-04-20T00:00:00Z' 
    }
    const internalDate = Temporal.Instant.from('2026-04-15T12:00:00Z')
    const outsideDate = Temporal.Instant.from('2026-04-25T12:00:00Z')

    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0], internalDate)).toBe(true)
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0], outsideDate)).toBe(false)
  })

  it('aggregates multipliers correctly', () => {
    const activeEvents = [
      { config: { expMult: 2, moneyMult: 1.5 } },
      { config: { expMult: 1.5, shinyMult: 2 } }
    ]
    const mults = getGlobalMultipliers(activeEvents as unknown as Parameters<typeof getGlobalMultipliers>[0])
    
    expect(mults.exp).toBe(3) // 2 * 1.5
    expect(mults.money).toBe(1.5)
    expect(mults.shiny).toBe(2)
    expect(mults.bc).toBe(1) // Default
  })

  it('calculates species specific boosts', () => {
    const activeEvents = [
      { config: { species: 'pikachu, raichu', speciesRateMult: 5, speciesShinyMult: 2 } },
      { config: { species: 'bulbasaur', speciesRateMult: 10 } }
    ]

    const pikaBoost = getSpeciesBoosts(activeEvents as unknown as Parameters<typeof getSpeciesBoosts>[0], 'pikachu')
    const bulbBoost = getSpeciesBoosts(activeEvents as unknown as Parameters<typeof getSpeciesBoosts>[0], 'bulbasaur')
    const charmBoost = getSpeciesBoosts(activeEvents as unknown as Parameters<typeof getSpeciesBoosts>[0], 'charmander')

    expect(pikaBoost.rate).toBe(5)
    expect(pikaBoost.shiny).toBe(2)
    expect(bulbBoost.rate).toBe(10)
    expect(charmBoost.rate).toBe(1)
  })

  it('handles robust parsing of stringified JSON config/schedule', () => {
    const event = {
      active: true,
      schedule: JSON.stringify({ type: 'weekly', days: [1, 2, 3, 4, 5], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ expMult: 5 })
    }
    
    // Check multiplier parsing
    const mults = getGlobalMultipliers([event] as unknown as Parameters<typeof getGlobalMultipliers>[0])
    expect(mults.exp).toBe(5)

    // Check schedule parsing (using a Monday as test date)
    const monday = Temporal.Instant.from('2026-04-20T12:00:00Z') // Monday
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0], monday)).toBe(true)
  })

  it('correctly handles weekly schedules crossover (midnight)', () => {
    const event = {
      active: true,
      schedule: {
        type: 'weekly',
        days: [1], // Monday
        startHour: 22,
        endHour: 2 // Ends at 02:00 next day (Tuesday)
      }
    }

    // Monday 23:00 ARG = Tuesday 02:00 UTC (Should be active)
    const mondayNight = Temporal.Instant.from('2026-04-21T01:00:00Z')
    // Tuesday 01:00 ARG = Tuesday 04:00 UTC (Should be active)
    const tuesdayMorning = Temporal.Instant.from('2026-04-21T04:00:00Z')
    // Monday 21:00 ARG = Tuesday 00:00 UTC (Should be inactive)
    const mondayEvening = Temporal.Instant.from('2026-04-21T00:00:00Z')

    // Note: isEventActiveNow uses Argentina Time. 
    // For unit tests, we mock the time or ensure the test date is interpreted correctly.
    // The current implementation uses .toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
    
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0], mondayNight)).toBe(true)
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0], tuesdayMorning)).toBe(true)
    expect(isEventActiveNow(event as unknown as Parameters<typeof isEventActiveNow>[0], mondayEvening)).toBe(false)
  })
})

