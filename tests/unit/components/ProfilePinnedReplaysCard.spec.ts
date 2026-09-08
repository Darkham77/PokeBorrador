/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProfilePinnedReplaysCard from '@/components/profile/ProfilePinnedReplaysCard.vue'
import type { BattleReplayRecord, BattleCode } from '@/types/battle/pvp'

describe('ProfilePinnedReplaysCard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

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
      isTop10Archived: true,
      viewsCount: 15,
      createdAt: '2026-09-05T20:00:00Z'
    }
  ]

  it('renders empty state when pinnedReplays array is empty', () => {
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

    // Unpin buttons should NOT exist when isOwnProfile is false
    expect(wrapper.find('.action-btn.unpin').exists()).toBe(false)
  })

  it('correctly inverts rival and result when userId matches p2', () => {
    const wrapper = mount(ProfilePinnedReplaysCard, {
      props: {
        pinnedReplays: sampleReplays,
        isOwnProfile: false,
        userId: 'u2' // In sampleReplays[0], u2 is p2 who lost against Red
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    // In sampleReplays[0], winnerSide is 'p1'. So for u2 (p2), it is a DERROTA against Red
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
