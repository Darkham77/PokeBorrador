/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
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

describe('War Store Logic', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15')) // Wednesday
    
    const gs = useGameStore()
    gs.state = {
      money: 100000,
      warCoins: 0,
      warDailyCap: {},
      warDailyCoins: {},
      warPointsAccumulator: 0,
      faction: null
    }
    
    gs.db = {
      rpc: vi.fn().mockResolvedValue({ error: null }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ 
          eq: vi.fn().mockReturnValue({ 
            eq: vi.fn().mockResolvedValue({ error: null }) 
          }) 
        })
      })
    }
    
    const auth = useAuthStore()
    auth.user = { id: 'test_user' }

    const war = useWarStore()
    await war.loadWarData()
  })

  it('should allow initial faction choice for free', async () => {
    const war = useWarStore()
    const result = await war.chooseFaction('union')
    expect(result).toBe(true)
    expect(war.faction).toBe('union')
  })

  it('should charge 25k for faction change', async () => {
    const war = useWarStore()
    const gs = useGameStore()
    
    await war.chooseFaction('union')
    const result = await war.chooseFaction('poder')
    
    expect(result).toBe(true)
    expect(war.faction).toBe('poder')
    expect(gs.state.money).toBe(75000)
  })

  it('should enforce daily point cap per map', async () => {
    const war = useWarStore()
    await war.chooseFaction('union')
    
    // Add 40 points
    const added1 = await war.addPoints('route1', 'SHINY_CAPTURE', true)
    expect(added1).toBe(40)
    
    // Fill the cap (300)
    for(let i=0; i<35; i++) {
        await war.addPoints('route1', 'TRAINER_WIN', true)
    }
    
    const overCap = await war.addPoints('route1', 'TRAINER_WIN', true)
    expect(overCap).toBe(0)
  })

  it('should award coins based on points (1 coin per 10 PT)', async () => {
    const war = useWarStore()
    await war.chooseFaction('union')
    
    await war.addPoints('route1', 'SHINY_CAPTURE', true) // 40 PT = 4 coins
    expect(war.warCoins).toBe(4)
    expect(useGameStore().state.warDailyCoins[new Date().toDateString()]).toBe(4)
  })
})
