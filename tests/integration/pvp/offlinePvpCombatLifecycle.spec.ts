/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLivePvPStore } from '@/stores/livePvP'
import { usePvPStore } from '@/stores/pvp'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { resolveOfflineRivalTeam } from '@/logic/pvp/pvpTeamHelper'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Offline Rival Asynchronous Combat Lifecycle Integration', () => {
  let rpcCalls: Array<{ name: string; params: Record<string, unknown> }>
  let profileUpdates: Record<string, Record<string, unknown>>

  const makeTestPoke = (uid: string, name: string, isIllegal = false): Pokemon => ({
    uid,
    id: 25,
    name,
    level: 50,
    hp: 100,
    maxHp: 100,
    moves: ['thunderbolt'],
    stats: { hp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    isIllegal
  } as unknown as Pokemon)

  beforeEach(() => {
    setActivePinia(createPinia())
    rpcCalls = []
    profileUpdates = {}

    const authStore = useAuthStore()
    authStore.user = { id: 'usr-attacker-1', user_metadata: { username: 'AttackerRed' } } as unknown as typeof authStore.user

    const gameStore = useGameStore()
    Object.assign(gameStore.state, {
      trainer: 'AttackerRed',
      eloRating: 1500,
      battleCoins: 100,
      team: [makeTestPoke('pk-1', 'Pikachu')],
      box: [makeTestPoke('pk-2', 'Raichu'), makeTestPoke('pk-3', 'Charizard')],
      pvpTeam: ['pk-1', 'pk-2', 'pk-3'],
      pvpTeam6: []
    })

    // Mock DB with game_saves, profiles and rpc
    gameStore.db = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'game_saves') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    save_data: JSON.stringify({
                      trainer: 'DefenderBlue',
                      team: [makeTestPoke('def-1', 'Blastoise')],
                      box: [makeTestPoke('def-2', 'Gengar'), makeTestPoke('def-3', 'Alakazam')],
                      pvpTeam: ['def-1'], // incomplete team, needs auto-fill
                      eloRating: 1520
                    })
                  },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'profiles') {
          return {
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
              eq: vi.fn().mockImplementation((_col: string, val: string) => {
                profileUpdates[val] = payload
                return Promise.resolve({ error: null })
              })
            }))
          }
        }

        return {}
      }),
      rpc: vi.fn().mockImplementation((name: string, params: Record<string, unknown>) => {
        rpcCalls.push({ name, params })
        return Promise.resolve({ data: { ok: true, success: true }, error: null })
      })
    } as unknown as typeof gameStore.db
  })

  it('resolves offline rival team with auto-fill from box when dedicated team is incomplete', () => {
    const rawSave = {
      trainer: 'DefenderBlue',
      team: [makeTestPoke('def-1', 'Blastoise')],
      box: [makeTestPoke('def-2', 'Gengar'), makeTestPoke('def-3', 'Alakazam')],
      pvpTeam: ['def-1'] // only 1 member specified
    }

    const team3v3 = resolveOfflineRivalTeam(rawSave, '3v3')
    expect(team3v3.length).toBe(3)
    expect(team3v3[0]!.uid).toBe('def-1')
    expect(team3v3.map(p => p.uid)).toContain('def-2')
    expect(team3v3.map(p => p.uid)).toContain('def-3')
  })

  it('updates attacker ELO & Battle Coins and records passive battle RPC upon victory', async () => {
    const livePvP = useLivePvPStore()
    const pvpStore = usePvPStore()

    // Initialize battleState as an asynchronous ranked match against DefenderBlue
    livePvP.battleState.active = true
    livePvP.battleState.isRanked = true
    livePvP.battleState.opponentId = 'usr-defender-blue'
    livePvP.battleState.opponentName = 'DefenderBlue'
    livePvP.battleState.opponentElo = 1520
    livePvP.battleState.config = {
      format: '3v3',
      levelRule: 'flat50',
      arena: { gymId: 'celadon' },
      mode: 'ranked',
      isAsynchronous: true
    }
    livePvP.battleState.logs = ['Turno 1: Ataque', 'Turno 2: Victoria']

    // Simulating attacker victory
    const attackerInitialElo = pvpStore.elo
    const attackerInitialBc = useGameStore().state.battleCoins

    // Trigger endBattle through internal pick / forfeit outcome
    // We can directly call endBattle or simulate forfeit
    await (livePvP as unknown as { endBattle: (won: boolean, reason: string) => Promise<void> }).endBattle(true, '¡Victoria contra rival offline!')

    // Attacker gained ELO and Battle Coins
    expect(pvpStore.elo).toBeGreaterThan(attackerInitialElo)
    expect(useGameStore().state.battleCoins).toBe(attackerInitialBc + 15) // +15 BC for ranked win

    // RPC record_passive_battle_result was invoked for DefenderBlue
    expect(rpcCalls.length).toBe(1)
    const rpc = rpcCalls[0]!
    expect(rpc.name).toBe('record_passive_battle_result')
    expect(rpc.params.p_defender_id).toBe('usr-defender-blue')
    expect(rpc.params.p_result).toBe('defeat') // From defender's perspective
    expect(Number(rpc.params.p_delta_elo)).toBeLessThan(0) // Negative delta for defender
  })
})
