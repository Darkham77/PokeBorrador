/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLivePvPStore } from '@/stores/livePvP'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import type { BattleInvite } from '@/types/battle/pvp'

describe('Matchmaking Queue Lifecycle & Ranked Pairing Integration', () => {
  let rankedQueueEntries: Record<string, { user_id: string; elo: number; status?: string; created_at: string }>
  let dbInvites: Record<string, BattleInvite>

  beforeEach(() => {
    setActivePinia(createPinia())
    rankedQueueEntries = {}
    dbInvites = {}

    const authStore = useAuthStore()
    authStore.user = { id: 'usr-player-alice', email: 'alice@poke.com' } as unknown as typeof authStore.user

    const gameStore = useGameStore()
    Object.assign(gameStore.state, {
      eloRating: 1650, // Oro
      team: [],
      box: [],
      pvpTeam: ['p1', 'p2', 'p3'],
      pvpTeam6: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    })

    gameStore.db = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ranked_queue') {
          return {
            upsert: vi.fn().mockImplementation((entry: { user_id: string; elo: number; status?: string; created_at: string }) => {
              rankedQueueEntries[entry.user_id] = entry
              return Promise.resolve({ error: null })
            }),
            delete: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'user_id') delete rankedQueueEntries[val]
                return Promise.resolve({ error: null })
              }),
              in: vi.fn().mockImplementation((col: string, vals: string[]) => {
                if (col === 'user_id') {
                  vals.forEach(id => delete rankedQueueEntries[id])
                }
                return Promise.resolve({ error: null })
              })
            })),
            select: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockImplementation(() => {
                    const opponent = Object.values(rankedQueueEntries).find(e => e.user_id !== 'usr-player-alice')
                    return Promise.resolve({
                      data: opponent ? [opponent] : [],
                      error: null
                    })
                  })
                })
              })
            })
          }
        }

        if (table === 'battle_invites') {
          return {
            insert: vi.fn().mockImplementation((payload: Partial<BattleInvite>) => {
              const id = 'invite-' + Math.random().toString(36).substring(2, 9)
              const record: BattleInvite = {
                id,
                sender_id: payload.sender_id || 'usr-player-alice',
                challenger_id: payload.challenger_id || 'usr-player-alice',
                opponent_id: payload.opponent_id || '',
                status: payload.status || 'ranked_match',
                created_at: new Date().toISOString(),
                config: payload.config
              }
              dbInvites[id] = record
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: record, error: null })
                })
              }
            })
          }
        }

        return {}
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb: (status: string) => void) => {
          cb('SUBSCRIBED')
          return { unsubscribe: vi.fn() }
        }),
        send: vi.fn(),
        unsubscribe: vi.fn()
      })
    } as unknown as typeof gameStore.db
  })

  it('enrolls into ranked_queue with user ELO when search is initiated', async () => {
    const livePvP = useLivePvPStore()

    expect(livePvP.isSearching).toBe(false)
    await livePvP.startSearch()

    expect(livePvP.isSearching).toBe(true)
    expect(rankedQueueEntries['usr-player-alice']).toBeDefined()
    expect(rankedQueueEntries['usr-player-alice']!.elo).toBe(1650)
  })

  it('cancels search and cleanly removes entry from ranked_queue', async () => {
    const livePvP = useLivePvPStore()

    await livePvP.startSearch()
    expect(rankedQueueEntries['usr-player-alice']).toBeDefined()

    await livePvP.cancelSearch()
    expect(livePvP.isSearching).toBe(false)
    expect(rankedQueueEntries['usr-player-alice']).toBeUndefined()
  })

  it('pairs players when an eligible opponent is waiting in queue', async () => {
    // Bob is already waiting in queue with 1600 ELO (Oro, same tier)
    rankedQueueEntries['usr-player-bob'] = {
      user_id: 'usr-player-bob',
      elo: 1600,
      created_at: new Date().toISOString()
    }

    const livePvP = useLivePvPStore()
    await livePvP.startSearch()

    // Match found: invites created, players removed from queue
    expect(Object.keys(dbInvites).length).toBe(1)
    const createdInvite = Object.values(dbInvites)[0]!
    expect(createdInvite.status).toBe('ranked_match')
    expect(createdInvite.opponent_id).toBe('usr-player-bob')

    // Both players removed from queue
    expect(rankedQueueEntries['usr-player-alice']).toBeUndefined()
    expect(rankedQueueEntries['usr-player-bob']).toBeUndefined()
    expect(livePvP.isSearching).toBe(false)
    expect(livePvP.battleState.active).toBe(true)
    expect(livePvP.battleState.isRanked).toBe(true)
  })
})
