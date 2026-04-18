/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import * as warEngine from '@/logic/war/warEngine'

describe('WarStore (Migration v2)', () => {
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
    const gs = useGameStore()
    
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
    const gs = useGameStore()
    
    await war.addPoints('route1', 'SHINY_CAPTURE', true) // 40 PT = 4 coins
    expect(war.warCoins).toBe(4)
    expect(gs.state.warDailyCoins[new Date().toDateString()]).toBe(4)
  })
});
