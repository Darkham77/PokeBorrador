/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SocialRankings from '@/components/social/SocialRankings.vue'
import SocialRankingsPodium from '@/components/social/SocialRankingsPodium.vue'
import SocialRankingsTheater from '@/components/social/SocialRankingsTheater.vue'
import { useSocialStore } from '@/stores/social/social'
import { useLivePvPStore } from '@/stores/livePvP'
import { useModalStore } from '@/stores/modals'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import type { RankedPodiumWinner } from '@/types/battle/pvp'
import type { BattleCode } from '@/types/battle/pvp'

describe('Social Rankings & Theater Suite', () => {
  describe('SocialRankings.vue', () => {
    beforeEach(() => {
      setActivePinia(createPinia())

      const authStore = useAuthStore()
      authStore.user = { id: 'my_user_id', email: 'me@example.com' } as unknown as typeof authStore.user

      const pvpStore = usePvPStore()
      pvpStore.elo = 1850

      const gameStore = useGameStore()
      gameStore.db = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as unknown as typeof gameStore.db

      const socialStore = useSocialStore()
      vi.spyOn(socialStore, 'fetchLeaderboard').mockImplementation(async () => {
        socialStore.leaderboardLoading = false
      })
      socialStore.leaderboardLoading = false
      socialStore.leaderboard = [
        {
          id: 'user_champ',
          username: 'ChampionBlue',
          elo: 2800,
          level: 50,
          badges: 8,
          playerClass: 'ace_trainer',
          faction: 'poder',
          isOnline: true,
          gender: 'h'
        },
        {
          id: 'my_user_id',
          username: 'TrainerRed',
          elo: 1850,
          level: 25,
          badges: 4,
          playerClass: 'hiker',
          faction: 'union',
          isOnline: true,
          gender: 'h'
        }
      ]
    })

    it('renders all 3 sub-tabs and defaults to season tab with tier status', () => {
      const wrapper = mount(SocialRankings, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-loop': {},
            'gsap-nick': {}
          }
        }
      })

      expect(wrapper.text()).toContain('TEMPORADA')
      expect(wrapper.text()).toContain('RANKING')
      expect(wrapper.text()).toContain('SALÓN DE LA FAMA')

      expect(wrapper.text()).toContain('TEMPORADA 1: RENACER DE KANTO')
      expect(wrapper.text()).toContain('1850 LP')
      expect(wrapper.text()).toContain('BUSCAR COMBATE RANKED')
      expect(wrapper.text()).toContain('6v6 Flat Level 50')
    })

    it('triggers matchmaking search when clicking search button', async () => {
      const livePvPStore = useLivePvPStore()
      const searchSpy = vi.spyOn(livePvPStore, 'startSearch').mockImplementation(async () => {})

      const wrapper = mount(SocialRankings, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-loop': {},
            'gsap-nick': {}
          }
        }
      })

      const searchBtn = wrapper.find('#btn-start-ranked-matchmaking')
      expect(searchBtn.exists()).toBe(true)

      await searchBtn.trigger('click')
      expect(searchSpy).toHaveBeenCalledTimes(1)
    })

    it('switches to Ranking tab and renders leaderboard entries with challenge action', async () => {
      const modalStore = useModalStore()
      const openModalSpy = vi.spyOn(modalStore, 'open').mockReturnValue('modal_id')

      const wrapper = mount(SocialRankings, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-loop': {},
            'gsap-nick': {}
          }
        }
      })

      const leaderboardTabBtn = wrapper.find('#tab-pvp-leaderboard')
      await leaderboardTabBtn.trigger('click')

      expect(wrapper.text()).toContain('ChampionBlue')
      expect(wrapper.text()).toContain('TrainerRed')
      expect(wrapper.text()).toContain('(TÚ)')

      const challengeBtn = wrapper.find('#btn-challenge-player-user_champ')
      expect(challengeBtn.exists()).toBe(true)

      await challengeBtn.trigger('click')
      expect(openModalSpy).toHaveBeenCalledWith(
        'PvPChallenge',
        expect.objectContaining({
          opponentId: 'user_champ',
          opponentName: 'ChampionBlue'
        })
      )
    })

    it('switches to Salón de la Fama tab and displays empty state when no concluded season exists', async () => {
      const wrapper = mount(SocialRankings, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-loop': {},
            'gsap-nick': {}
          }
        }
      })

      const podiumTabBtn = wrapper.find('#tab-pvp-podium')
      await podiumTabBtn.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('SALÓN DE LA FAMA EN DISPUTA')
      expect(wrapper.text()).toContain('La temporada actual sigue en curso')
    })
  })

  describe('SocialRankingsPodium.vue', () => {
    it('renders skeleton loading state when loading is true', () => {
      const wrapper = mount(SocialRankingsPodium, {
        props: {
          podiumWinners: [],
          loading: true
        },
        global: {
          directives: {
            'gsap-loop': {}
          }
        }
      })

      expect(wrapper.text()).toContain('Cargando Salón de la Fama...')
    })

    it('renders empty message when not loading and winners array is empty', () => {
      const wrapper = mount(SocialRankingsPodium, {
        props: {
          podiumWinners: [],
          loading: false
        },
        global: {
          directives: { 'gsap-loop': {} }
        }
      })

      expect(wrapper.text()).toContain('SALÓN DE LA FAMA EN DISPUTA')
      expect(wrapper.text()).toContain('La temporada actual sigue en curso')
    })

    it('renders top 3 podium steps and subsequent places when winners are provided', () => {
      const sampleWinners: RankedPodiumWinner[] = [
        { rank: 1, user_id: 'u1', username: 'ChampionRed', elo: 3500, tier: 'maestro' },
        { rank: 2, user_id: 'u2', username: 'RivalBlue', elo: 3200, tier: 'diamante' },
        { rank: 3, user_id: 'u3', username: 'AceGreen', elo: 2800, tier: 'platino' },
        { rank: 4, user_id: 'u4', username: 'TrainerGold', elo: 2400, tier: 'oro' }
      ]

      const wrapper = mount(SocialRankingsPodium, {
        props: {
          podiumWinners: sampleWinners,
          loading: false
        },
        global: {
          directives: { 'gsap-loop': {} }
        }
      })

      expect(wrapper.text()).toContain('ChampionRed')
      expect(wrapper.text()).toContain('3500 LP')
      expect(wrapper.text()).toContain('RivalBlue')
      expect(wrapper.text()).toContain('3200 LP')
      expect(wrapper.text()).toContain('AceGreen')
      expect(wrapper.text()).toContain('2800 LP')

      expect(wrapper.text()).toContain('#4')
      expect(wrapper.text()).toContain('TrainerGold')
      expect(wrapper.text()).toContain('2400 LP')
    })
  })

  describe('SocialRankingsTheater.vue', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    const mockFeaturedRows = [
      {
        id: 'rep_feat_1',
        battle_code: 'BTL-FEAT-0001',
        season_id: 'season_1',
        theme_id: 'kanto_classic',
        p1_data: JSON.stringify({
          userId: 'u1',
          username: 'ChampionAsh',
          tier: 'maestro',
          elo: 2500,
          team: []
        }),
        p2_data: JSON.stringify({
          userId: 'u2',
          username: 'RivalGary',
          tier: 'maestro',
          elo: 2480,
          team: []
        }),
        turns_count: 18,
        winner_side: 'p1',
        choice_stream: '[]',
        initial_seed: '[1, 2, 3, 4]',
        is_top10_archived: true,
        views_count: 120,
        created_at: '2026-09-06T00:00:00Z'
      }
    ]

    it('fetches featured replays on mount and renders cards', async () => {
      const gameStore = useGameStore()
      const rpcSpy = vi.fn().mockResolvedValue({ data: mockFeaturedRows, error: null })
      gameStore.db = {
        rpc: rpcSpy
      } as unknown as typeof gameStore.db

      const wrapper = mount(SocialRankingsTheater, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-nick': {}
          }
        }
      })

      await flushPromises()

      expect(rpcSpy).toHaveBeenCalledWith('fn_get_featured_replays', { p_limit: 10 })
      expect(wrapper.text()).toContain('BUSCADOR DE REPETICIONES')
      expect(wrapper.text()).toContain('COMBATES DESTACADOS DEL MES')
      expect(wrapper.text()).toContain('ChampionAsh')
      expect(wrapper.text()).toContain('RivalGary')
      expect(wrapper.text()).toContain('BTL-FEAT-0001')
    })

    it('formats battle code input as user types', async () => {
      const gameStore = useGameStore()
      gameStore.db = {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null })
      } as unknown as typeof gameStore.db

      const wrapper = mount(SocialRankingsTheater, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-nick': {}
          }
        }
      })

      await flushPromises()

      const input = wrapper.find('#input-battle-code-search')
      expect(input.exists()).toBe(true)

      const inputEl = input.element as HTMLInputElement
      inputEl.value = 'btlabcd1234'
      await input.trigger('input')

      expect((input.element as HTMLInputElement).value).toBe('BTL-ABCD-1234')
    })

    it('shows error message if searching with an invalid code format', async () => {
      const gameStore = useGameStore()
      gameStore.db = {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null })
      } as unknown as typeof gameStore.db

      const wrapper = mount(SocialRankingsTheater, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-nick': {}
          }
        }
      })

      await flushPromises()

      const input = wrapper.find('#input-battle-code-search')
      const inputEl = input.element as HTMLInputElement
      inputEl.value = 'INVALID'
      await input.trigger('input')

      const searchBtn = wrapper.find('#btn-search-replay')
      await searchBtn.trigger('click')

      expect(wrapper.text()).toContain('Formato de código inválido')
    })

    it('successfully searches by valid code and plays replay', async () => {
      const gameStore = useGameStore()
      const livePvPStore = useLivePvPStore()
      const watchReplaySpy = vi.spyOn(livePvPStore, 'watchReplay').mockImplementation(() => {})

      gameStore.db = {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockFeaturedRows[0], error: null })
        })
      } as unknown as typeof gameStore.db

      const wrapper = mount(SocialRankingsTheater, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-nick': {}
          }
        }
      })

      await flushPromises()

      const input = wrapper.find('#input-battle-code-search')
      const inputEl = input.element as HTMLInputElement
      inputEl.value = 'BTL-FEAT-0001'
      await input.trigger('input')

      const searchBtn = wrapper.find('#btn-search-replay')
      await searchBtn.trigger('click')
      await flushPromises()

      expect(watchReplaySpy).toHaveBeenCalledTimes(1)
      const record = watchReplaySpy.mock.calls[0]?.[0]
      expect(record).toBeDefined()
      expect(record?.battleCode).toBe('BTL-FEAT-0001' as BattleCode)
    })

    it('shows error if searched code is not found in db', async () => {
      const gameStore = useGameStore()

      gameStore.db = {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
        })
      } as unknown as typeof gameStore.db

      const wrapper = mount(SocialRankingsTheater, {
        global: {
          directives: {
            'gsap-hover': {},
            'gsap-nick': {}
          }
        }
      })

      await flushPromises()

      const input = wrapper.find('#input-battle-code-search')
      const inputEl = input.element as HTMLInputElement
      inputEl.value = 'BTL-9999-9999'
      await input.trigger('input')

      const searchBtn = wrapper.find('#btn-search-replay')
      await searchBtn.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('No se encontró ninguna repetición con ese código.')
    })
  })
})
