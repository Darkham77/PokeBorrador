

/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { getWeekId, getPreviousWeekId, isDisputePhase, getPointReward } from '@/logic/war/warEngine'
import { getConflictZones, getGuardianData } from '@/logic/war/guardianEngine'
import type { GameState } from '@/types/system/game'
import type { DBRouter } from '@/logic/db/dbRouter'

describe('War Engine & Guardian Logic', () => {
  it('calculates week ID correctly for Monday', () => {
    // 2026-04-13 is Monday
    const date = Temporal.Instant.from('2026-04-13T12:00:00Z')
    expect(getWeekId(date)).toBe('2026-W16')
  })

  it('calculates previous week ID correctly', () => {
    const date = Temporal.Instant.from('2026-04-13T12:00:00Z') // Week 16
    expect(getPreviousWeekId(date)).toBe('2026-W15')
  })

  it('calculates same week ID for Tuesday as previous Monday', () => {
    const monday = Temporal.Instant.from('2026-04-13T12:00:00Z')
    const tuesday = Temporal.Instant.from('2026-04-14T12:00:00Z')
    expect(getWeekId(tuesday)).toBe(getWeekId(monday))
  })

  it('calculates same week ID for Sunday as previous Monday', () => {
    const monday = Temporal.Instant.from('2026-04-13T12:00:00Z')
    const sunday = Temporal.Instant.from('2026-04-19T12:00:00Z')
    expect(getWeekId(sunday)).toBe(getWeekId(monday))
  })

  it('identifies dispute phase (Mon-Fri) correctly', () => {
    const monday = Temporal.Instant.from('2026-04-13T12:00:00Z')
    const friday = Temporal.Instant.from('2026-04-17T12:00:00Z')
    const saturday = Temporal.Instant.from('2026-04-18T12:00:00Z')
    const sunday = Temporal.Instant.from('2026-04-19T12:00:00Z')

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

  it('generates 12 conflict zones deterministically', () => {
    const mockMaps = Array.from({ length: 20 }, (_, i) => `route_${i + 1}`)
    const date = Temporal.Instant.from('2026-04-15T12:00:00Z')
    const zones = getConflictZones(mockMaps, date)
    expect(zones).toHaveLength(12)
    expect(new Set(zones).size).toBe(12)
  })

  it('returns valid guardian data with updated tier points', () => {
    const mockMaps = Array.from({ length: 20 }, (_, i) => `route_${i + 1}`)
    const date = Temporal.Instant.from('2026-04-15T12:00:00Z')
    const zones = getConflictZones(mockMaps, date)
    const guardianMap = zones[0]!

    const guardian = getGuardianData(guardianMap, mockMaps, date)
    expect(guardian).not.toBeNull()
    expect(guardian?.isGuardian).toBe(true)
    if (guardian?.tier === 'common') expect(guardian.pts).toBe(150)
    else if (guardian?.tier === 'rare') expect(guardian.pts).toBe(300)
    else if (guardian?.tier === 'elite') expect(guardian.pts).toBe(750)
  })
})

describe('War Store Logic', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime('2026-04-15T00:00:00Z') // Wednesday
    
    const gs = useGameStore()
    gs.state = {
      money: 100000,
      warCoins: 0,
      warDailyCap: {},
      warDailyCoins: {},
      warPointsAccumulator: 0,
      faction: null,
      save: vi.fn().mockResolvedValue(true)
    } as unknown as GameState
    
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
    } as unknown as DBRouter
    
    const auth = useAuthStore()
    auth.user = { id: 'test_user', user_metadata: { username: 'test_user' } } as unknown as typeof auth.user

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
    const gameStore = useGameStore()
    await war.chooseFaction('union')
    
    await war.addPoints('route1', 'SHINY_CAPTURE', true) // 40 PT = 4 coins
    expect(war.warCoins).toBe(4)
    expect(gameStore.state.warCoins).toBe(4)
  })

  it('should distribute weekly war coins with victory bonus', async () => {
    const war = useWarStore()
    const gameStore = useGameStore()
    await war.chooseFaction('union')

    // Mock DB queries for previous week points and dominance
    gameStore.db = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'war_user_points') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [{ points: 600 }], error: null })
              })
            })
          }
        }
        if (table === 'war_dominance') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { winner_faction: 'union' },
                  { winner_faction: 'union' },
                  { winner_faction: 'poder' }
                ],
                error: null
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      })
    } as unknown as DBRouter

    await war.distributeWeeklyWarCoins()

    // 600 PT milestone awards 75 coins + 50 coins victory bonus = 125 coins
    expect(war.warCoins).toBe(125)
    expect(gameStore.state.warCoins).toBe(125)
    expect(gameStore.state.lastResolvedWeek).toBe('2026-W15')
  })
})
