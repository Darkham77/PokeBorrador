import { describe, it, expect } from 'vitest'
import { isEventActiveNow, getGlobalMultipliers, getSpeciesBoosts } from '@/logic/events/eventEngine'

describe('Event Engine Logic', () => {
  it('correctly identifies manual events as active', () => {
    const event = { active: true, manual: true }
    expect(isEventActiveNow(event)).toBe(true)
  })

  it('identifies inactive events as false', () => {
    const event = { active: false, manual: true }
    expect(isEventActiveNow(event)).toBe(false)
  })

  it('filters by absolute date range', () => {
    const event = { 
      active: true, 
      start_at: '2026-04-10T00:00:00Z', 
      end_at: '2026-04-20T00:00:00Z' 
    }
    const internalDate = new Date('2026-04-15T12:00:00Z')
    const outsideDate = new Date('2026-04-25T12:00:00Z')

    expect(isEventActiveNow(event, internalDate)).toBe(true)
    expect(isEventActiveNow(event, outsideDate)).toBe(false)
  })

  it('aggregates multipliers correctly', () => {
    const activeEvents = [
      { config: { expMult: 2, moneyMult: 1.5 } },
      { config: { expMult: 1.5, shinyMult: 2 } }
    ]
    const mults = getGlobalMultipliers(activeEvents)
    
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

    const pikaBoost = getSpeciesBoosts(activeEvents, 'pikachu')
    const bulbBoost = getSpeciesBoosts(activeEvents, 'bulbasaur')
    const charmBoost = getSpeciesBoosts(activeEvents, 'charmander')

    expect(pikaBoost.rate).toBe(5)
    expect(pikaBoost.shiny).toBe(2)
    expect(bulbBoost.rate).toBe(10)
    expect(charmBoost.rate).toBe(1)
  })
})
