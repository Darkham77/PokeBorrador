/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProfilePinnedReplaysCard from '@/components/profile/ProfilePinnedReplaysCard.vue'
import ProfileRankedMedalsCard from '@/components/profile/ProfileRankedMedalsCard.vue'
import type { BattleReplayRecord, BattleCode, RankedSeasonMedal } from '@/types/battle/pvp'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { usePvPStore } from '@/stores/pvp'

describe('Profile Cards Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('ProfilePinnedReplaysCard.vue', () => {
    const sampleReplays: BattleReplayRecord[] = [
      {
        id: 'rep_1',
        battleCode: 'BTL-WIN1-2026' as BattleCode,
        seasonId: 's1',
        themeId: 'kanto_classic',
        p1: {
          userId: 'u1',
          username: 'Red',
          tier: 'maestro',
          elo: 2200,
          team: []
        },
        p2: {
          userId: 'u2',
          username: 'Blue',
          tier: 'diamante',
          elo: 2150,
          team: []
        },
        turnsCount: 15,
        winnerSide: 'p1',
        choiceStream: [],
        initialSeed: [1, 2, 3, 4],
        isTop10Archived: true,
        viewsCount: 42,
        createdAt: '2026-09-06T00:00:00Z'
      },
      {
        id: 'rep_2',
        battleCode: 'BTL-LOS1-2026' as BattleCode,
        seasonId: 's1',
        themeId: 'monotype_clash',
        p1: {
          userId: 'u1',
          username: 'Red',
          tier: 'maestro',
          elo: 2200,
          team: []
        },
        p2: {
          userId: 'u3',
          username: 'Green',
          tier: 'maestro',
          elo: 2280,
          team: []
        },
        turnsCount: 20,
        winnerSide: 'p2',
        choiceStream: [],
        initialSeed: [5, 6, 7, 8],
        isTop10Archived: false,
        viewsCount: 10,
        createdAt: '2026-09-05T00:00:00Z'
      }
    ]

    it('renders empty state when no pinned replays are passed', () => {
      const wrapper = mount(ProfilePinnedReplaysCard, {
        props: {
          pinnedReplays: [],
          isOwnProfile: false
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      expect(wrapper.text()).toContain('REPETICIONES FIJADAS (0 / 5)')
      expect(wrapper.text()).toContain('Sin combates fijados en el perfil.')
      expect(wrapper.find('.empty-sub').exists()).toBe(false)
    })

    it('shows help hint in empty state when isOwnProfile is true', () => {
      const wrapper = mount(ProfilePinnedReplaysCard, {
        props: {
          pinnedReplays: [],
          isOwnProfile: true
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      expect(wrapper.find('.empty-sub').exists()).toBe(true)
      expect(wrapper.text()).toContain('Fija tus victorias más épicas')
    })

    it('renders list of pinned replays with victory and defeat badges', () => {
      const wrapper = mount(ProfilePinnedReplaysCard, {
        props: {
          pinnedReplays: sampleReplays,
          isOwnProfile: false
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      expect(wrapper.text()).toContain('REPETICIONES FIJADAS (2 / 5)')
      expect(wrapper.text()).toContain('VICTORIA')
      expect(wrapper.text()).toContain('DERROTA')
      expect(wrapper.text()).toContain('vs Blue (2150 LP)')
      expect(wrapper.text()).toContain('vs Green (2280 LP)')
      expect(wrapper.text()).toContain('BTL-WIN1-2026')
      expect(wrapper.text()).toContain('BTL-LOS1-2026')

      expect(wrapper.find('.action-btn.unpin').exists()).toBe(false)
    })

    it('correctly inverts rival and result when userId matches p2', () => {
      const wrapper = mount(ProfilePinnedReplaysCard, {
        props: {
          pinnedReplays: sampleReplays,
          isOwnProfile: false,
          userId: 'u2'
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      expect(wrapper.text()).toContain('DERROTA')
      expect(wrapper.text()).toContain('vs Red (2200 LP)')
    })

    it('emits watch-replay when play button is clicked', async () => {
      const wrapper = mount(ProfilePinnedReplaysCard, {
        props: {
          pinnedReplays: sampleReplays,
          isOwnProfile: false
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const watchBtn = wrapper.find('#btn-profile-watch-BTL-WIN1-2026')
      expect(watchBtn.exists()).toBe(true)

      await watchBtn.trigger('click')
      const watchEmitted = wrapper.emitted('watch-replay')
      expect(watchEmitted).toBeTruthy()
      expect(watchEmitted?.[0]?.[0]).toEqual(sampleReplays[0])
    })

    it('emits unpin-replay when unpin button is clicked on own profile', async () => {
      const wrapper = mount(ProfilePinnedReplaysCard, {
        props: {
          pinnedReplays: sampleReplays,
          isOwnProfile: true
        },
        global: {
          directives: {
            'gsap-hover': {}
          }
        }
      })

      const unpinBtn = wrapper.find('#btn-profile-unpin-rep_1')
      expect(unpinBtn.exists()).toBe(true)

      await unpinBtn.trigger('click')
      const unpinEmitted = wrapper.emitted('unpin-replay')
      expect(unpinEmitted).toBeTruthy()
      expect(unpinEmitted?.[0]?.[0]).toBe('rep_1')
    })
  })

  describe('ProfileRankedMedalsCard.vue', () => {
    it('renders empty state when no medals are passed', () => {
      const wrapper = mount(ProfileRankedMedalsCard, {
        props: {
          medals: []
        }
      })

      expect(wrapper.text()).toContain('MEDALLAS DE TEMPORADA RANKED (0)')
      expect(wrapper.text()).toContain('Sin medallas de temporada competitiva aún.')
      expect(wrapper.find('.empty-ranked-medals').exists()).toBe(true)
    })

    it('renders medal cards with tournament names, tier badges, ELO, and podium tags', () => {
      const testMedals: RankedSeasonMedal[] = [
        {
          id: 'medal_1',
          seasonName: 'Temporada 9',
          tournamentName: 'Frontera Kanto & Johto',
          themeId: 'johto_kanto_frontier',
          tier: 'maestro',
          rank: 1,
          finalElo: 3500,
          awardedAt: '2026-09-15T15:00:00Z'
        },
        {
          id: 'medal_2',
          seasonName: 'Temporada 10',
          tier: 'diamante',
          rank: 4,
          finalElo: 2850,
          awardedAt: '2026-10-15T15:00:00Z'
        }
      ]

      const wrapper = mount(ProfileRankedMedalsCard, {
        props: {
          medals: testMedals
        }
      })

      expect(wrapper.text()).toContain('MEDALLAS DE TEMPORADA RANKED (2)')
      expect(wrapper.find('.empty-ranked-medals').exists()).toBe(false)

      const items = wrapper.findAll('.ranked-medal-item')
      expect(items.length).toBe(2)

      expect(items[0]!.text()).toContain('Frontera Kanto & Johto')
      expect(items[0]!.text()).toContain('Septiembre 2026')
      expect(items[0]!.text()).toContain('Maestro • 3500 LP')
      expect(items[0]!.find('.podium-tag').text()).toBe('🥇')

      expect(items[1]!.text()).toContain('Noche de Brujas')
      expect(items[1]!.text()).toContain('Octubre 2026')
      expect(items[1]!.text()).toContain('Diamante • 2850 LP')
      expect(items[1]!.find('.podium-tag').text()).toBe('Top 4')
    })

    it('interacts on click: opens Arena modal when available or notifies when finished', async () => {
      const modalStore = useModalStore()
      const uiStore = useUIStore()
      const pvpStore = usePvPStore()

      const openSpy = vi.spyOn(modalStore, 'open')
      const notifySpy = vi.spyOn(uiStore, 'notify')

      pvpStore.currentSeasonRules = {
        name: 'Frontera Kanto & Johto',
        maxPokemon: 6,
        levelCap: 50,
        allowedTypes: [],
        bannedPokemonIds: []
      }

      const testMedals: RankedSeasonMedal[] = [
        {
          id: 'medal_active',
          seasonName: 'Temporada 9',
          tournamentName: 'Frontera Kanto & Johto',
          themeId: 'johto_kanto_frontier',
          tier: 'maestro',
          rank: 1,
          finalElo: 3500,
          awardedAt: new Date().toISOString()
        },
        {
          id: 'medal_expired',
          seasonName: 'Temporada 1',
          tournamentName: 'Clásico Kanto',
          themeId: 'kanto_classic',
          tier: 'oro',
          rank: 12,
          finalElo: 1800,
          awardedAt: '2025-01-15T12:00:00Z'
        }
      ]

      const wrapper = mount(ProfileRankedMedalsCard, {
        props: {
          medals: testMedals
        }
      })

      const items = wrapper.findAll('.ranked-medal-item')
      expect(items.length).toBe(2)

      await items[0]!.trigger('click')
      expect(openSpy).toHaveBeenCalledWith('RankedTournamentDetail', {
        themeId: 'johto_kanto_frontier',
        tournamentName: 'Frontera Kanto & Johto',
        medal: testMedals[0]
      })

      await items[1]!.trigger('click')
      expect(notifySpy).toHaveBeenCalledWith(
        expect.stringContaining('Clásico Kanto'),
        'ℹ️'
      )
    })
  })
})
