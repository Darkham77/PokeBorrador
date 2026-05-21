/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadBestSave } from '@/logic/auth/loadService'
import { saveGame } from '@/logic/auth/saveService'
import type { DBRouter } from '@/logic/db/dbRouter'
import type { AuthUser } from '@/types/auth'
import type { GameState } from '@/types/game'

vi.mock('@/logic/utils/opfsStorage', () => ({
  readOpfsFile: vi.fn(() => Promise.resolve(null)),
  writeOpfsFile: vi.fn(() => Promise.resolve())
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

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

    const user = { id: 'local_user' } as AuthUser

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

    const user = { id: 'local_user' } as AuthUser
    const state = { trainer: 'Ash', pokemon: [] } as unknown as GameState

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

    const user = { id: 'test_user', email: 'test@example.com' } as AuthUser
    const state = { trainer: 'Ash', pokemon: [] } as unknown as GameState

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

