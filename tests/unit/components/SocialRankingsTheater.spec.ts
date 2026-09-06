/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SocialRankingsTheater from '@/components/social/SocialRankingsTheater.vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import type { BattleCode } from '@/types/battle/pvp'

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

    // Trigger input event with lowercase and unhyphenated text
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
