import { Temporal } from '@js-temporal/polyfill'
// @ts-nocheck
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
    setMockTime: vi.fn((d) => { mockTimeOffset = Temporal.Instant.fromEpochMilliseconds(d).epochMilliseconds - Temporal.Now.instant().epochMilliseconds }),
    resetTime: vi.fn(() => { mockTimeOffset = 0 }),
    rpc: vi.fn().mockResolvedValue({ data: { players_count: 10 }, error: null })
  }
}))

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key) => { delete store[key] }
  }
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
      window.__VITE_DEBUG__.setMoney(5000)
      expect(game.state.money).toBe(5000)
    })

    it('registers and executes commands with parameters (setLevel)', () => {
      const game = useGameStore()
      window.__VITE_DEBUG__.setLevel(25)
      expect(game.state.trainerLevel).toBe(25)
    })

    it('registers and executes commands with parameters (setElo)', () => {
      const auth = useAuthStore()
      auth.user = { id: 'test_user' }
      const pvp = usePvPStore()
      window.__VITE_DEBUG__.setElo(2000)
      expect(pvp.elo).toBe(2000)
    })

    it('registers and executes commands with parameters (setBadges)', () => {
      const game = useGameStore()
      window.__VITE_DEBUG__.setBadges(8)
      expect(game.state.badges).toBe(8)
    })

    it('handles map dominance simulation', () => {
      const map = useMapStore()
      map.maps = [{ id: 'route1' }, { id: 'route2' }]
      window.__VITE_DEBUG__.setDominance('poder')
      expect(map.mapWinners['route1'].winner_faction).toBe('poder')
      expect(map.mapWinners['route2'].winner_faction).toBe('poder')
    })

    it('handles time cycle simulation', () => {
      const map = useMapStore()
      window.__VITE_DEBUG__.setCycle('night')
      expect(map.forcedCycle).toBe('night')
    })

    it('handles map grid and performance toggles', () => {
      const ui = useUIStore()
      window.__VITE_DEBUG__.toggleGrid()
      expect(ui.isDebugGridMode).toBe(true)
      window.__VITE_DEBUG__.togglePerf()
      expect(ui.isDebugPerformanceMode).toBe(true)
    })

    it('handles weather simulation', () => {
      const map = useMapStore()
      const weatherSpy = vi.spyOn(map, 'setGlobalWeather')
      window.__VITE_DEBUG__.setWeather('rain')
      expect(weatherSpy).toHaveBeenCalledWith('rain')
    })

    it('handles item addition', () => {
      const game = useGameStore()
      window.__VITE_DEBUG__.addItem('Poke Ball', 50)
      expect(game.state.inventory['Poke Ball']).toBe(50)
    })

    it('handles faction simulation', () => {
      const game = useGameStore()
      window.__VITE_DEBUG__.setFaction('poder')
      expect(game.state.faction).toBe('poder')
      window.__VITE_DEBUG__.setFaction('none')
      expect(game.state.faction).toBeNull()
    })

    it('handles player class simulation', () => {
      const game = useGameStore()
      window.__VITE_DEBUG__.setPlayerClass('criador')
      expect(game.state.playerClass).toBe('criador')
    })

    it('handles time offset (addHours)', () => {
      const game = useGameStore()
      const initialOffset = game.db.getTimeOffset()
      window.__VITE_DEBUG__.addHours(2)
      expect(game.db.getTimeOffset()).toBe(initialOffset + (2 * 3600 * 1000))
    })

    it('handles pokedex mode simulation', () => {
      const ui = useUIStore()
      window.__VITE_DEBUG__.setPokedexMode('seen')
      expect(ui.debugPokedexMode).toBe('seen')
    })

    it('handles pokedex synchronization', async () => {
      const game = useGameStore()
      game.state.team = [{ id: 'pikachu' }]
      await window.__VITE_DEBUG__.syncPokedex(true)
      expect(game.state.pokedex).toContain('pikachu')
    })

    it('handles mock time simulation', () => {
      const game = useGameStore()
      const setMockTimeSpy = vi.spyOn(game.db, 'setMockTime')
      const resetTimeSpy = vi.spyOn(game.db, 'resetTime')
      window.__VITE_DEBUG__.setMockTime('2026-01-01')
      expect(setMockTimeSpy).toHaveBeenCalledWith('2026-01-01')
      window.__VITE_DEBUG__.resetTime()
      expect(resetTimeSpy).toHaveBeenCalled()
    })

    it('handles mission management', () => {
      const game = useGameStore()
      const breeding = useBreedingStore()
      const regenSpy = vi.spyOn(breeding, 'regenerateMissions')
      window.__VITE_DEBUG__.regenerateMissions()
      expect(regenSpy).toHaveBeenCalled()
      game.state.daycare_missions = [{ id: 1 }]
      window.__VITE_DEBUG__.clearMissions()
      expect(game.state.daycare_missions).toHaveLength(0)
    })

    it('handles pokedex reset', async () => {
      const game = useGameStore()
      game.state.pokedex = ['pikachu']
      await window.__VITE_DEBUG__.resetPokedexDB(true)
      expect(game.state.pokedex).toHaveLength(0)
    })

    it('handles pvp team clearing', async () => {
      const game = useGameStore()
      const ui = useUIStore()
      game.state.pvpTeam = [{ id: 'poke1' }]
      await window.__VITE_DEBUG__.clearPvpTeam(true)
      expect(game.state.pvpTeam).toHaveLength(0)
      expect(ui.pvpAutoFillDisabled).toBe(true)
    })

    it('handles modal stack test', async () => {
      const modalStore = useModalStore()
      const openSpy = vi.spyOn(modalStore, 'open')
      await window.__VITE_DEBUG__.testModalStack(3)
      expect(openSpy).toHaveBeenCalledTimes(3)
    })

    it('handles close all modals', () => {
      const modalStore = useModalStore()
      const closeAllSpy = vi.spyOn(modalStore, 'closeAll')
      window.__VITE_DEBUG__.closeAllModals()
      expect(closeAllSpy).toHaveBeenCalled()
    })

    it('handles test error trigger', () => {
      const errorStore = useErrorStore()
      const setErrorSpy = vi.spyOn(errorStore, 'setError')
      window.__VITE_DEBUG__.triggerTestError()
      expect(setErrorSpy).toHaveBeenCalled()
    })

    describe('Navigation Commands', () => {
      it('handles navigate(tabId)', () => {
        const ui = useUIStore()
        window.__VITE_DEBUG__.navigate('pc')
        expect(ui.activeTab).toBe('pc')
      })

      it('handles openModal and closeModal', () => {
        const ui = useUIStore()
        const openSpy = vi.spyOn(ui, 'open')
        const closeSpy = vi.spyOn(ui, 'close')
        window.__VITE_DEBUG__.openModal('Inventory', { test: true })
        expect(openSpy).toHaveBeenCalledWith('Inventory', { test: true })
        window.__VITE_DEBUG__.closeModal('Inventory')
        expect(closeSpy).toHaveBeenCalledWith('Inventory')
      })

      it('handles setLibraryTab', () => {
        const ui = useUIStore()
        window.__VITE_DEBUG__.setLibraryTab('pokedex')
        expect(ui.libraryTab).toBe('pokedex')
      })

      it('handles inspectPokemon', () => {
        const game = useGameStore()
        const ui = useUIStore()
        const openDetailSpy = vi.spyOn(ui, 'openPokemonDetail')
        const mockPoke = { id: 'pikachu_test' }
        game.state.team = [mockPoke]
        window.__VITE_DEBUG__.inspectPokemon(0, 'team')
        expect(openDetailSpy).toHaveBeenCalledWith(mockPoke, 0, 'team')
      })

      it('handles toggleHud', () => {
        const ui = useUIStore()
        const toggleSpy = vi.spyOn(ui, 'toggleHudGroup')
        window.__VITE_DEBUG__.toggleHud('MARKET')
        expect(toggleSpy).toHaveBeenCalledWith('MARKET')
      })
    })

    describe('Admin & Emergency Commands', () => {
      it('handles saveEvent', async () => {
        const eventData = { id: 'test_event', name: 'Test' }
        await window.__VITE_DEBUG__.saveEvent(eventData)
        expect(mockChain.upsert).toHaveBeenCalledWith(eventData)
      })

      it('handles saveRankedRules', async () => {
        const rules = { seasonName: 'S1', levelCap: 50 }
        await window.__VITE_DEBUG__.saveRankedRules(rules)
        expect(mockChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
          season_name: 'S1',
          config: expect.objectContaining({ levelCap: 50 })
        }))
      })

      it('handles closeRankedSeason', async () => {
        const game = useGameStore()
        const rpcSpy = vi.spyOn(game.db, 'rpc')
        await window.__VITE_DEBUG__.closeRankedSeason('S1')
        expect(rpcSpy).toHaveBeenCalledWith('fn_award_ranked_season_automated', {
          target_season_name: 'S1'
        })
      })

      it('handles forceSyncCloud', async () => {
        const game = useGameStore()
        const saveSpy = vi.spyOn(game, 'save')
        await window.__VITE_DEBUG__.forceSyncCloud()
        expect(saveSpy).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('Registration System', () => {
    it('prevents duplicate tool registration', () => {
      const debug = useDebugStore()
      const initialCount = debug.tools.length
      debug.register({ id: 'core-set-money', command: 'setMoney', action: () => {} })
      expect(debug.tools.length).toBe(initialCount)
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
      expect(window.__VITE_DEBUG__.customCmd).toBeDefined()
      window.__VITE_DEBUG__.customCmd('hello')
      expect(testAction).toHaveBeenCalledWith('hello')
    })
  })
})
