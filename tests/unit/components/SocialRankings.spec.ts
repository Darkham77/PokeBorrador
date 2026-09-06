/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SocialRankings from '@/components/social/SocialRankings.vue'
import { useSocialStore } from '@/stores/social/social'
import { useLivePvPStore } from '@/stores/livePvP'
import { useModalStore } from '@/stores/modals'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'

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

    // Season tab active by default
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

    // Challenge button exists for other players
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
