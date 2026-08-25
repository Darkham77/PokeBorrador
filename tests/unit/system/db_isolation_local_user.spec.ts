/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupLocalStorageMock } from './localStorageMock.ts'

import { loadBestSave } from '@/logic/auth/loadService'
import { saveGame } from '@/logic/auth/saveService'
import type { DBRouter } from '@/logic/db/dbRouter'
import type { AuthUser } from '@/types/auth/auth'
import type { GameState } from '@/types/system/game'

vi.mock('@/logic/utils/opfsStorage', () => ({
  readOpfsFile: vi.fn(() => Promise.resolve(null)),
  writeOpfsFile: vi.fn(() => Promise.resolve())
}))

setupLocalStorageMock()

function createValidGameState(): GameState {
  return {
    trainer: 'Ash',
    gender: 'h',
    badges: 0,
    balls: 5,
    money: 1000,
    battleCoins: 0,
    trainerLevel: 1,
    trainerExp: 0,
    trainerExpNeeded: 100,
    inventory: {},
    team: [{
      uid: 'test-poke-1',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 5,
      exp: 0,
      expNeeded: 100,
      hp: 35,
      maxHp: 35,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 50,
      spe: 90,
      type: 'electric',
      status: '',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      moves: [{ id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxPP: 30, type: 'normal', cat: 'physical' }],
      ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: 'hardy',
      ability: 'static'
    }],
    box: [],
    eggs: [],
    pokedex: [],
    seenPokedex: [],
    defeatedGyms: [],
    starterChosen: true,
    eloRating: 1000,
    pvpStats: { wins: 0, losses: 0, draws: 0 },
    rankedMaxElo: 1000,
    passiveTeamActive: false,
    daycare_mission_refreshes: 3,
    boxCount: 4,
    classLevel: 1,
    classXP: 0,
    classData: {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0
    },
    warCoins: 0,
    warCoinsSpent: 0,
    lastPokemonCenterHeal: 0,
    playtime: 0
  } as unknown as GameState
}

describe('Database Isolation for Local User', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('should skip remote database queries in loadBestSave when db is online and user is local_user', async () => {
    const mockDb = {
      mode: 'online',
      from: vi.fn().mockImplementation(() => {
        throw new Error('Should not call db.from in online mode for local_user')
      })
    } as unknown as DBRouter

    const user = { id: 'local_user', db_version: 3 } as AuthUser

    const result = await loadBestSave(user, mockDb)
    expect(result.data).toBeNull()
    expect(mockDb.from).not.toHaveBeenCalled()
  })

  it('should skip remote database queries in saveGame when db is online and user is local_user', async () => {
    const mockDb = {
      mode: 'online',
      rpc: vi.fn().mockImplementation(() => {
        throw new Error('Should not call db.rpc in online mode for local_user')
      }),
      from: vi.fn().mockImplementation(() => {
        throw new Error('Should not call db.from in online mode for local_user')
      })
    } as unknown as DBRouter

    const user = { id: 'local_user', db_version: 3 } as AuthUser
    const state = createValidGameState()

    const result = await saveGame(state, user, { db: mockDb, skipRemote: false })
    expect(result?.success).toBe(true)
    expect(result?.remote).toBe(false)
    expect(mockDb.rpc).not.toHaveBeenCalled()
    expect(mockDb.from).not.toHaveBeenCalled()
  })

  it('should prevent concurrent overlapping calls to saveGame', async () => {
    const { writeOpfsFile } = await import('@/logic/utils/opfsStorage')
    
    let resolveSave: (value: void) => void = () => {}
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve
    })

    vi.mocked(writeOpfsFile).mockImplementationOnce(() => savePromise)

    const mockDb = {
      mode: 'online',
      rpc: vi.fn().mockResolvedValue({ data: { success: true, last_save_id: '123' } }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null })
          })
        })
      })
    } as unknown as DBRouter

    const user = { id: 'test_user', email: 'test@example.com', db_version: 3 } as AuthUser
    const state = createValidGameState()

    // Start first save (will block on writeOpfsFile)
    const firstSavePromise = saveGame(state, user, { db: mockDb, showNotif: false })

    // Call saveGame again concurrently (should return null immediately)
    const secondSaveResult = await saveGame(state, user, { db: mockDb, showNotif: false })
    expect(secondSaveResult).toBeNull()

    // Resolve the first save
    resolveSave()
    const firstSaveResult = await firstSavePromise
    expect(firstSaveResult?.success).toBe(true)
  })
})
