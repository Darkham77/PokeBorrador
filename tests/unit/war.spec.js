import { describe, it, expect } from 'vitest'
import { getWeekId, isDisputePhase, getPointReward } from '@/logic/war/warEngine'

describe('War Engine Logic', () => {
  it('calculates week ID correctly for Monday', () => {
    // 2026-04-13 is Monday
    const date = new Date('2026-04-13T12:00:00')
    expect(getWeekId(date)).toBe('2026-W15')
  })

  it('calculates same week ID for Tuesday as previous Monday', () => {
    const monday = new Date('2026-04-13T12:00:00')
    const tuesday = new Date('2026-04-14T12:00:00')
    expect(getWeekId(tuesday)).toBe(getWeekId(monday))
  })

  it('calculates same week ID for Sunday as previous Monday', () => {
    const monday = new Date('2026-04-13T12:00:00')
    const sunday = new Date('2026-04-19T12:00:00')
    expect(getWeekId(sunday)).toBe(getWeekId(monday))
  })

  it('identifies dispute phase (Mon-Fri) correctly', () => {
    const monday = new Date('2026-04-13T12:00:00')
    const friday = new Date('2026-04-17T12:00:00')
    const saturday = new Date('2026-04-18T12:00:00')
    const sunday = new Date('2026-04-19T12:00:00')

    expect(isDisputePhase(monday)).toBe(true)
    expect(isDisputePhase(friday)).toBe(true)
    expect(isDisputePhase(saturday)).toBe(false)
    expect(isDisputePhase(sunday)).toBe(false)
  })

  it('provides correct point rewards from table', () => {
    expect(getPointReward('CAPTURE', true)).toBe(5)
    expect(getPointReward('WILD_WIN', true)).toBe(1)
    expect(getPointReward('WILD_WIN', false)).toBe(1) // Special rule: always 1
    expect(getPointReward('GUARDIAN', true)).toBe(150)
  })
})
