/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatBattleCodeBadge from '@/components/social/ChatBattleCodeBadge.vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import { useUIStore } from '@/stores/ui'
import type { BattleCode } from '@/types/battle/pvp'

describe('ChatBattleCodeBadge.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders swords icon and battle code correctly', () => {
    const wrapper = mount(ChatBattleCodeBadge, {
      props: {
        battleCode: 'BTL-ABCD-1234'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    expect(wrapper.find('.swords-icon').text()).toBe('⚔️')
    expect(wrapper.find('.code-text').text()).toBe('BTL-ABCD-1234')
    expect(wrapper.find('.watch-replay-btn').text()).toContain('VER')
  })

  it('fetches replay from db and calls livePvPStore.watchReplay when clicked', async () => {
    const gameStore = useGameStore()
    const livePvPStore = useLivePvPStore()
    const watchReplaySpy = vi.spyOn(livePvPStore, 'watchReplay').mockImplementation(() => {})

    const mockReplayData = {
      id: 'replay_1',
      battle_code: 'BTL-ABCD-1234',
      season_id: 'season_1',
      theme_id: 'monotype_clash',
      p1_data: JSON.stringify({
        userId: 'u1',
        username: 'Red',
        tier: 'oro',
        elo: 1500,
        team: []
      }),
      p2_data: JSON.stringify({
        userId: 'u2',
        username: 'Blue',
        tier: 'oro',
        elo: 1520,
        team: []
      }),
      turns_count: 12,
      winner_side: 'p1',
      choice_stream: JSON.stringify([]),
      initial_seed: JSON.stringify([1, 2, 3, 4]),
      is_top10_archived: false,
      views_count: 5,
      created_at: '2026-09-06T00:00:00Z'
    }

    gameStore.db = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockReplayData, error: null })
      })
    } as unknown as typeof gameStore.db

    const wrapper = mount(ChatBattleCodeBadge, {
      props: {
        battleCode: 'BTL-ABCD-1234'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const watchBtn = wrapper.find('.watch-replay-btn')
    await watchBtn.trigger('click')
    await flushPromises()

    expect(watchReplaySpy).toHaveBeenCalledTimes(1)
    const calledRecord = watchReplaySpy.mock.calls[0]?.[0]
    expect(calledRecord).toBeDefined()
    expect(calledRecord?.battleCode).toBe('BTL-ABCD-1234' as BattleCode)
    expect(calledRecord?.turnsCount).toBe(12)
    expect(calledRecord?.p1.username).toBe('Red')
  })

  it('notifies error when replay is not found', async () => {
    const gameStore = useGameStore()
    const uiStore = useUIStore()
    const notifySpy = vi.spyOn(uiStore, 'notify').mockImplementation(() => {})

    gameStore.db = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      })
    } as unknown as typeof gameStore.db

    const wrapper = mount(ChatBattleCodeBadge, {
      props: {
        battleCode: 'BTL-NOTF-0000'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const watchBtn = wrapper.find('.watch-replay-btn')
    await watchBtn.trigger('click')
    await flushPromises()

    expect(notifySpy).toHaveBeenCalledWith('No se encontró la repetición BTL-NOTF-0000', '🔍')
  })
})
