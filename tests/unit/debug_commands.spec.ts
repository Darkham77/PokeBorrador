

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { usePvPStore } from '@/stores/pvp'
import { useBreedingStore } from '@/stores/breeding'
import { useModalStore } from '@/stores/modals'
import { useErrorStore } from '@/stores/errorStore'
import type { AuthUser } from '@/types/auth'
import type { Pokemon } from '@/types/pokemon'
import type { DaycareMission } from '@/types/breeding'
// Actually, I'll just use a helper to avoid 'any' in the main logic.
const callDebug = (cmd: string, ...args: unknown[]) => {
  const d = window.__VITE_DEBUG__ as Record<string, unknown>;
  if (d && typeof d[cmd] === 'function') {
    return (d[cmd] as (...args: unknown[]) => unknown)(...args);
  }
  return undefined;
};

// Stable mock object for chain calls
const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  eq: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  single: vi.fn().mockResolvedValue({ data: { is_banned: false } })
}

// Mock Supabase
let mockTimeOffset = 0
vi.mock('@/logic/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => mockChain),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    getTimeOffset: vi.fn(() => mockTimeOffset),
    setTimeOffset: vi.fn((ms) => { mockTimeOffset = ms }),
    setMockTime: vi.fn((d) => { 
      const target = d.includes('Z') ? Temporal.Instant.from(d) : Temporal.PlainDateTime.from(d).toZonedDateTime('UTC').toInstant();
      mockTimeOffset = target.epochMilliseconds - Temporal.Now.instant().epochMilliseconds 
    }),
    resetTime: vi.fn(() => { mockTimeOffset = 0 }),
    rpc: vi.fn().mockResolvedValue({ data: { players_count: 10 }, error: null })
  }
}))

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key: string) => { delete store[key] },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null
  } as unknown as Storage
}

describe('Debug System (Commands & Tools)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    delete window.__VITE_DEBUG__
    
    // Force debug store initialization for command tests
    const auth = useAuthStore()
    auth.sessionMode = 'offline'
    const debug = useDebugStore()
    debug.updateGlobalProxy()
  })

  describe('Command Execution & Parameters', () => {
    it('registers and executes commands with parameters (setMoney)', () => {
      const game = useGameStore()
      callDebug('setMoney', 5000)
      expect(game.state.money).toBe(5000)
    })

    it('registers and executes commands with parameters (setLevel)', () => {
      const game = useGameStore()
      callDebug('setLevel', 25)
      expect(game.state.trainerLevel).toBe(25)
    })

    it('registers and executes commands with parameters (setElo)', async () => {
      const auth = useAuthStore()
      const pvp = usePvPStore()
      auth.user = { id: 'test_user', user_metadata: { username: 'test_user' } } as unknown as AuthUser
      callDebug('setElo', 2000)
      // Watchers are async in Vue 3
      await new Promise<void>(resolve => window.setTimeout(resolve, 0))
      expect(pvp.elo).toBe(2000)
    })

    it('registers and executes commands with parameters (setBadges)', () => {
      const game = useGameStore()
      callDebug('setBadges', 8)
      expect(game.state.badges).toBe(8)
    })

    it('handles map dominance simulation', () => {
      const map = useMapStore()
      map.maps = [{ id: 'route1' }, { id: 'route2' }] as unknown as (ReturnType<typeof useMapStore>['maps'])
      callDebug('setDominance', 'poder')
      expect(map.mapWinners['route1']?.winner).toBe('poder')
      expect(map.mapWinners['route2']?.winner).toBe('poder')
    })

    it('handles time cycle simulation', () => {
      const map = useMapStore()
      callDebug('setCycle', 'night')
      expect(map.forcedCycle).toBe('night')
    })

    it('handles map grid and performance toggles', () => {
      const ui = useUIStore()
      callDebug('toggleGrid')
      expect(ui.isDebugGridMode).toBe(true)
      callDebug('togglePerf')
      expect(ui.isDebugPerformanceMode).toBe(true)
    })

    it('handles weather simulation', () => {
      const map = useMapStore()
      const weatherSpy = vi.spyOn(map, 'setGlobalWeather')
      callDebug('setWeather', 'rain')
      expect(weatherSpy).toHaveBeenCalledWith('rain')
    })

    it('handles item addition', () => {
      const game = useGameStore()
      callDebug('addItem', 'Poke Ball', 50)
      expect(game.state.inventory['Poke Ball']).toBe(50)
    })

    it('handles faction simulation', () => {
      const game = useGameStore()
      callDebug('setFaction', 'poder')
      expect(game.state.faction).toBe('poder')
      callDebug('setFaction', 'none')
      expect(game.state.faction).toBeNull()
    })

    it('handles player class simulation', () => {
      const game = useGameStore()
      callDebug('setPlayerClass', 'criador')
      expect(game.state.playerClass).toBe('criador')
    })

    it('handles time offset (addHours)', () => {
      const game = useGameStore()
      const initialOffset = game.db.getTimeOffset()
      callDebug('addHours', 2)
      expect(game.db.getTimeOffset()).toBe(initialOffset + (2 * 3600 * 1000))
    })

    it('handles pokedex mode simulation', () => {
      const ui = useUIStore()
      callDebug('setPokedexMode', 'seen')
      expect(ui.debugPokedexMode).toBe('seen')
    })

    it('handles pokedex synchronization', async () => {
      const game = useGameStore()
      game.state.team = [{ id: 'pikachu' }] as unknown as Pokemon[]
      await (callDebug('syncPokedex', true) as unknown as Promise<void>)
      expect(game.state.pokedex).toContain('pikachu')
    })

    it('handles mock time simulation', () => {
      const game = useGameStore()
      const setMockTimeSpy = vi.spyOn(game.db, 'setMockTime')
      const resetTimeSpy = vi.spyOn(game.db, 'resetTime')
      callDebug('setMockTime', '2026-01-01')
      expect(setMockTimeSpy).toHaveBeenCalledWith('2026-01-01')
      callDebug('resetTime')
      expect(resetTimeSpy).toHaveBeenCalled()
    })

    it('handles mission management', () => {
      const game = useGameStore()
      const breeding = useBreedingStore()
      const regenSpy = vi.spyOn(breeding, 'regenerateMissions')
      callDebug('regenerateMissions')
      expect(regenSpy).toHaveBeenCalled()
      game.state.daycare_missions = [{ targetId: 'pikachu' }] as unknown as DaycareMission[]
      callDebug('clearMissions')
      expect(game.state.daycare_missions).toHaveLength(0)
    })

    it('handles pokedex reset', async () => {
      const game = useGameStore()
      game.state.pokedex = ['pikachu']
      await (callDebug('resetPokedexDB', true) as unknown)
      expect(game.state.pokedex).toHaveLength(0)
    })

    it('handles pvp team clearing', async () => {
      const game = useGameStore()
      const ui = useUIStore()
      game.state.pvpTeam = ['poke1']
      await (callDebug('clearPvpTeam', true) as unknown)
      expect(game.state.pvpTeam).toHaveLength(0)
      expect(ui.pvpAutoFillDisabled).toBe(true)
    })

    it('handles modal stack test', async () => {
      const modalStore = useModalStore()
      const openSpy = vi.spyOn(modalStore, 'open')
      await (callDebug('testModalStack', 3) as unknown)
      expect(openSpy).toHaveBeenCalledTimes(3)
    })

    it('handles close all modals', () => {
      const modalStore = useModalStore()
      const closeAllSpy = vi.spyOn(modalStore, 'closeAll')
      callDebug('closeAllModals')
      expect(closeAllSpy).toHaveBeenCalled()
    })

    it('handles test error trigger', () => {
      const errorStore = useErrorStore()
      const setErrorSpy = vi.spyOn(errorStore, 'setError')
      callDebug('triggerTestError')
      expect(setErrorSpy).toHaveBeenCalled()
    })

    describe('Navigation Commands', () => {
      it('handles navigate(tabId)', () => {
        const ui = useUIStore()
        callDebug('navigate', 'pc')
        expect(ui.activeTab).toBe('pc')
      })

      it('handles openModal and closeModal', () => {
        const ui = useUIStore()
        const openSpy = vi.spyOn(ui, 'open')
        const closeSpy = vi.spyOn(ui, 'close')
        callDebug('openModal', 'Inventory', { test: true })
        expect(openSpy).toHaveBeenCalledWith('Inventory', { test: true })
        callDebug('closeModal', 'Inventory')
        expect(closeSpy).toHaveBeenCalledWith('Inventory')
      })

      it('handles setLibraryTab', () => {
        const ui = useUIStore()
        callDebug('setLibraryTab', 'pokedex')
        expect(ui.libraryTab).toBe('pokedex')
      })

      it('handles inspectPokemon', () => {
        const game = useGameStore()
        const ui = useUIStore()
        const openDetailSpy = vi.spyOn(ui, 'openPokemonDetail')
        const mockPoke = { uid: 'u1', id: 'pikachu_test' } as unknown as Pokemon
        game.state.team = [mockPoke]
        callDebug('inspectPokemon', 0, 'team')
        expect(openDetailSpy).toHaveBeenCalledWith(mockPoke, 0, 'team')
      })

      it('handles toggleHud', () => {
        const ui = useUIStore()
        const toggleSpy = vi.spyOn(ui, 'toggleHudGroup')
        callDebug('toggleHud', 'MARKET')
        expect(toggleSpy).toHaveBeenCalledWith('MARKET')
      })
    })

    describe('Admin & Emergency Commands', () => {
      it('handles saveEvent', async () => {
        const eventData = { id: 'test_event', name: 'Test' }
        await (callDebug('saveEvent', eventData) as unknown)
        expect(mockChain.upsert).toHaveBeenCalledWith(eventData)
      })

      it('handles saveRankedRules', async () => {
        const rules = { seasonName: 'S1', levelCap: 50 }
        await (callDebug('saveRankedRules', rules) as unknown)
        expect(mockChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
          season_name: 'S1',
          config: expect.objectContaining({ levelCap: 50 })
        }))
      })

      it('handles closeRankedSeason', async () => {
        const game = useGameStore()
        const rpcSpy = vi.spyOn(game.db, 'rpc')
        await (callDebug('closeRankedSeason', 'S1') as unknown)
        expect(rpcSpy).toHaveBeenCalledWith('fn_award_ranked_season_automated', {
          target_season_name: 'S1'
        })
      })

      it('handles forceSyncCloud', async () => {
        const game = useGameStore()
        const saveSpy = vi.spyOn(game, 'save')
        await (callDebug('forceSyncCloud') as unknown)
        expect(saveSpy).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('Registration System', () => {
    it('prevents duplicate tool registration', () => {
      const debug = useDebugStore()
      const testId = 'duplicate-test'
      debug.register({ id: testId, command: 'test', action: () => {} })
      const count = debug.tools.length
      debug.register({ id: testId, command: 'test', action: () => {} })
      expect(debug.tools.length).toBe(count)
    })

    it('updates global proxy when new tools are registered', () => {
      const debug = useDebugStore()
      const testAction = vi.fn()
      debug.register({
        id: 'custom-tool',
        command: 'customCmd',
        action: testAction,
        category: 'misc'
      })
      expect((window.__VITE_DEBUG__ as Record<string, unknown>).customCmd).toBeDefined()
      callDebug('customCmd', 'hello')
      expect(testAction).toHaveBeenCalledWith('hello')
    })
  })
})
