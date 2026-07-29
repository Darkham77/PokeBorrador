/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { getConflictZones, getGuardianData } from '@/logic/war/guardianEngine'
import { getPreviousWeekId } from '@/logic/war/warEngine'
import type { GameState } from '@/types/system/game'
import type { DBRouter } from '@/logic/db/dbRouter'
import type { MapRouteId } from '@/data/world/map-assets'

describe('War System Integration', () => {
  let insertedPoints: Array<{ map_id: string; points: number }>
  let dominanceRecords: Array<{ week_id: string; map_id: string; winner_faction: string }>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime('2026-04-15T12:00:00Z') // Wednesday, Dispute Phase

    insertedPoints = []
    dominanceRecords = []

    const gs = useGameStore()
    gs.state = {
      starterChosen: true,
      team: [{ id: 'pikachu', hp: 100 }],
      box: [],
      money: 50000,
      warCoins: 0,
      warDailyCap: {},
      warDailyCoins: {},
      warPointsAccumulator: 0,
      faction: 'union',
      save: vi.fn().mockResolvedValue(true)
    } as unknown as GameState

    gs.db = {
      rpc: vi.fn().mockImplementation((fnName: string, params: { p_map_id: string; p_points: number }) => {
        if (fnName === 'add_war_points') {
          insertedPoints.push({ map_id: params.p_map_id, points: params.p_points })
          return Promise.resolve({ error: null })
        }
        return Promise.resolve({ error: null })
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'war_user_points') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ points: 1600 }], // User reached 1600 PT (Milestone 1501 -> 150 coins)
                  error: null
                })
              })
            })
          }
        }
        if (table === 'guardian_captures') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'war_points') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { map_id: 'route1', faction: 'union', points: 500 },
                  { map_id: 'route1', faction: 'poder', points: 200 },
                  { map_id: 'route2', faction: 'union', points: 400 }
                ],
                error: null
              })
            })
          }
        }
        if (table === 'war_dominance') {
          return {
            select: vi.fn().mockImplementation((cols: string) => {
              if (cols === 'map_id') {
                return {
                  eq: vi.fn().mockResolvedValue({ data: [], error: null })
                }
              }
              return {
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { winner_faction: 'union' },
                    { winner_faction: 'union' },
                    { winner_faction: 'poder' }
                  ],
                  error: null
                })
              }
            }),
            upsert: vi.fn().mockImplementation((rows: Array<{ week_id: string; map_id: string; winner_faction: string }>) => {
              dominanceRecords.push(...rows)
              return Promise.resolve({ error: null })
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

    const auth = useAuthStore()
    auth.user = { id: 'trainer_01', user_metadata: { username: 'Trainer01' } } as unknown as typeof auth.user
  })

  it('integrated flow: conflict zones -> guardian encounter -> point accumulation -> weekly resolution', async () => {
    const warStore = useWarStore()
    const gameStore = useGameStore()

    await warStore.loadWarData()

    const allMaps: MapRouteId[] = [
      'route1', 'route2', 'forest', 'route3', 'mt_moon',
      'route4', 'route24', 'route25', 'route5', 'route6',
      'route8', 'route9', 'route10', 'rock_tunnel', 'power_plant',
    ]
    const today = Temporal.Instant.from('2026-04-15T12:00:00Z')

    // 1. Verify 12 conflict zones generated
    const conflictZones = getConflictZones(allMaps, today)
    expect(conflictZones).toHaveLength(12)

    // 2. Obtain guardian data for a conflict zone
    const targetMap = conflictZones[0]!
    const guardian = getGuardianData(targetMap, allMaps, today)
    expect(guardian).not.toBeNull()
    expect(guardian?.isGuardian).toBe(true)

    // 3. Claim guardian capture
    await warStore.claimGuardian(targetMap, false)
    expect(warStore.dailyGuardianCaptures).toContain(targetMap)
    expect(insertedPoints.length).toBeGreaterThan(0)

    // 4. Test weekly settlement
    await warStore.resolveWeekIfNeeded()
    expect(dominanceRecords.length).toBeGreaterThan(0)

    // 5. Test weekly coins distribution (30 PT coins + 150 milestone + 50 victory bonus = 230)
    await warStore.distributeWeeklyWarCoins()
    expect(warStore.warCoins).toBe(230)
    expect(gameStore.state.warCoins).toBe(230)
    expect(gameStore.state.lastResolvedWeek).toBe(getPreviousWeekId(today))
  })
})
