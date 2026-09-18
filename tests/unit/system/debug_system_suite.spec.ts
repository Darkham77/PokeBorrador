// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
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
import type { AuthUser } from '@/types/auth/auth'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { DaycareMission } from '@/types/breeding/breeding'
import type { PlayerClassId } from '@/data/player/playerClasses'
import { DEBUG_PANEL_CATEGORIES } from '@/components/admin/debug/debugPanelCategories.ts'
import { mockLocalStorage } from '../../helpers/debugSetup.ts'
import { mockChain } from '../../helpers/supabaseMock.ts'

vi.mock('@/logic/db/supabase', async () => {
  const { mockSupabase } = await import('../../helpers/supabaseMock.ts')
  return {
    supabase: mockSupabase,
  }
})

mockLocalStorage()

const callDebug = (cmd: string, ...args: unknown[]) => {
  const d = window.__VITE_DEBUG__ as Record<string, unknown>
  if (d && typeof d[cmd] === 'function') {
    return (d[cmd] as (...args: unknown[]) => unknown)(...args)
  }
  return undefined
}

describe('Debug System Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    delete (window as unknown as Record<string, unknown>).__VITE_DEBUG__
  })

  describe('Security, Auth & Mode Enforcement', () => {
    it('allows debug tools in offline mode', async () => {
      const auth = useAuthStore()
      const game = useGameStore()

      auth.sessionMode = 'offline'
      auth.user = { id: 'local_tester', role: 'user', user_metadata: { username: 'local_tester' } } as unknown as AuthUser

      const setMoney = (val: number) => {
        if (auth.sessionMode === 'offline' || auth.user?.role === 'admin') {
          game.state.money = val
          return true
        }
        return false
      }

      expect(setMoney(99999)).toBe(true)
      expect(game.state.money).toBe(99999)
    })

    it('blocks and triggers ban if non-admin uses debug in online mode', async () => {
      const auth = useAuthStore()
      const { supabase } = await import('@/logic/db/supabase')

      auth.sessionMode = 'online'
      auth.user = { id: 'cheater_id', role: 'user', user_metadata: { username: 'cheater_id' } } as unknown as AuthUser

      const securityCheck = () => {
        if (auth.sessionMode === 'online' && auth.user?.role !== 'admin') {
          supabase.from('profiles').update({ is_banned: true }).eq('id', auth.user!.id)
          auth.logout()
          return false
        }
        return true
      }

      const result = securityCheck()

      expect(result).toBe(false)
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('authStore handles ban status during login', async () => {
      const auth = useAuthStore()
      const { supabase } = await import('@/logic/db/supabase')

      mockChain.single.mockResolvedValue({
        data: { is_banned: true, ban_reason: 'Exploit detected' },
      })

      ;(supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: { id: 'banned_user' }, session: {} },
      })

      await expect(auth.login('test@test.com', '123456')).rejects.toThrow('BAN:Exploit detected')
      expect(auth.isBanned).toBe(true)
    })

    it('initializes window.__VITE_DEBUG__ only for authorized users (offline)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'

      const debug = useDebugStore()
      debug.updateGlobalProxy()

      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeDefined()
    })

    it('removes window.__VITE_DEBUG__ even for admin users if online', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'admin_id', role: 'admin', user_metadata: { username: 'admin_id' } } as unknown as AuthUser

      const debug = useDebugStore()
      debug.updateGlobalProxy()

      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeUndefined()
    })

    it('removes window.__VITE_DEBUG__ for unauthorized users (online regular user)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'user_id', role: 'user', user_metadata: { username: 'user_id' } } as unknown as AuthUser

      const debug = useDebugStore()
      debug.updateGlobalProxy()

      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeUndefined()
    })

    it('triggers ban and logout if unauthorized execution is attempted', async () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'cheater_id', role: 'user', user_metadata: { username: 'cheater_id' } } as unknown as AuthUser
      const logoutSpy = vi.spyOn(auth, 'logout')

      const debug = useDebugStore()
      debug.register({
        id: 'test-tool',
        command: 'testCmd',
        action: vi.fn(),
      })

      const result = debug.securityCheck()

      expect(result).toBe(false)
      expect(logoutSpy).toHaveBeenCalled()
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ is_banned: true }))
    })

    it('ensures window.__VITE_DEBUG__ is undefined when no user is logged in (online)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = null

      const debug = useDebugStore()
      debug.updateGlobalProxy()

      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeUndefined()
    })

    it('ensures login/auth commands are NEVER registered in debug store', () => {
      const debug = useDebugStore()
      const authTools = debug.tools.filter(t =>
        t.command.toLowerCase().includes('login') ||
        t.command.toLowerCase().includes('auth') ||
        t.command.toLowerCase().includes('signup'),
      )
      expect(authTools).toHaveLength(0)
    })
  })

  describe('Debug Panel Categories', () => {
    it('exposes essential map debug categories without audio tab', () => {
      const categoryIds = DEBUG_PANEL_CATEGORIES.map(c => c.id)
      expect(categoryIds).not.toContain('audio')
      expect(categoryIds).toEqual([
        'stats',
        'class',
        'items',
        'pokes',
        'trainers',
        'map',
        'missions',
        'time',
        'modals',
      ])
    })
  })

  describe('Class Tools - setPlayerClass', () => {
    it('sets valid player class and resets cleanly when set to "none"', () => {
      const game = useGameStore()
      const debug = useDebugStore()

      const tool = debug.tools.find(c => c.command === 'setPlayerClass')
      expect(tool).toBeDefined()

      const setClassAction = tool?.action as ((c: string) => void)

      setClassAction('rocket')
      expect(game.state.playerClass).toBe('rocket' as PlayerClassId)

      expect(() => setClassAction('none')).not.toThrow()
      expect(game.state.playerClass).toBeNull()
      expect(game.state.classLevel).toBe(1)
      expect(game.state.classXP).toBe(0)

      setClassAction('criador')
      expect(game.state.playerClass).toBe('criador' as PlayerClassId)

      expect(() => setClassAction('null')).not.toThrow()
      expect(game.state.playerClass).toBeNull()
    })
  })

  describe('Command Execution & Parameters', () => {
    beforeEach(() => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const debug = useDebugStore()
      debug.updateGlobalProxy()
    })

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

    it('clears forced weather through the typed debug command', () => {
      const map = useMapStore()
      const weatherSpy = vi.spyOn(map, 'setGlobalWeather')
      callDebug('setWeather', null)
      expect(weatherSpy).toHaveBeenCalledWith(null)
    })

    it('handles item addition', () => {
      const game = useGameStore()
      game.state.inventory = {}
      callDebug('addItem', 'pokeball', 50)
      expect(game.state.inventory['pokeball']).toBe(50)
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

    it('handles clearClassCooldowns including pokemon center cooldown', () => {
      const game = useGameStore()
      game.state.lastPokemonCenterHeal = 1700000000000
      game.state.classData = {
        lastEggScanDate: '2026-01-01',
        extortedRouteId: 'route1',
        extortedRouteTimestamp: 1700000000000,
        officialRouteId: 'route2',
        officialRouteTimestamp: 1700000000000,
        activeMission: { type: 'test' },
      } as unknown as typeof game.state.classData
      game.state.last_renamed_at = '2026-01-01'

      callDebug('clearClassCooldowns')

      expect(game.state.lastPokemonCenterHeal).toBe(0)
      expect(game.state.classData?.lastEggScanDate).toBeNull()
      expect(game.state.classData?.extortedRouteId).toBeNull()
      expect(game.state.classData?.extortedRouteTimestamp).toBeNull()
      expect(game.state.classData?.officialRouteId).toBeNull()
      expect(game.state.classData?.officialRouteTimestamp).toBeNull()
      expect(game.state.classData?.activeMission).toBeNull()
      expect(game.state.last_renamed_at).toBeUndefined()
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
          config: expect.objectContaining({ levelCap: 50 }) as unknown,
        }))
      })

      it('handles closeRankedSeason', async () => {
        const game = useGameStore()
        const rpcSpy = vi.spyOn(game.db, 'rpc')
        await (callDebug('closeRankedSeason', 'S1') as unknown)
        expect(rpcSpy).toHaveBeenCalledWith('fn_award_ranked_season_automated', {
          target_season_name: 'S1',
        })
      })

      it('handles forceSyncCloud', async () => {
        const game = useGameStore()
        const saveSpy = vi.spyOn(game, 'save')
        await (callDebug('forceSyncCloud') as unknown)
        expect(saveSpy).toHaveBeenCalledWith(true, true, true)
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
          category: 'misc',
        })
        expect((window.__VITE_DEBUG__ as Record<string, unknown>).customCmd).toBeDefined()
        callDebug('customCmd', 'hello')
        expect(testAction).toHaveBeenCalledWith('hello')
      })
    })
  })
})
