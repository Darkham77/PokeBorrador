// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import BattleReplayModal from '@/components/battle/BattleReplayModal.vue'

describe('BattleReplayModal mounting & DOM elements', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockReplay = {
    id: 'sim_replay_e2e_001',
    battleCode: 'BTL-E2E1-2026',
    seasonId: 'season_1',
    themeId: 'kanto_classic',
    p1: {
      userId: 'u_p1_sim',
      username: 'RedSpectator',
      tier: 'maestro',
      elo: 2450,
      team: [
        {
          speciesId: 'pikachu',
          level: 50,
          revealedMoves: ['thunderbolt'],
          revealedAbility: 'static'
        }
      ]
    },
    p2: {
      userId: 'u_p2_sim',
      username: 'BlueSpectator',
      tier: 'diamante',
      elo: 2380,
      team: [
        {
          speciesId: 'eevee',
          level: 50,
          revealedMoves: ['quickattack']
        }
      ]
    },
    turnsCount: 3,
    winnerSide: 'p1' as const,
    choiceStream: [
      {
        turn: 1,
        p1Choice: 'move 1',
        p2Choice: 'move 1',
        logs: [
          '|move|p1a: Pikachu|Thunderbolt|p2a: Eevee',
          '|-damage|p2a: Eevee|40/100'
        ]
      }
    ],
    initialSeed: [42, 42, 42, 42] as [number, number, number, number],
    isTop10Archived: true,
    viewsCount: 1,
    createdAt: '2026-09-06T00:00:00Z'
  }

  it('renders #battle-replay-modal and #battle-tactical-replayer-bar', async () => {
    const wrapper = mount(BattleReplayModal, {
      props: {
        replay: mockReplay as never,
        show: true
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    const modalEl = document.getElementById('battle-replay-modal')
    expect(modalEl).not.toBeNull()

    const barEl = document.getElementById('battle-tactical-replayer-bar')
    expect(barEl).not.toBeNull()

    wrapper.unmount()
  })

  it('renders in ModalHost when opened via modalStore', async () => {
    const { useModalStore } = await import('@/stores/modals')
    const ModalHost = (await import('@/components/common/ModalHost.vue')).default

    const wrapper = mount(ModalHost, {
      attachTo: document.body
    })

    const modalStore = useModalStore()
    modalStore.open('BattleReplay', { replay: mockReplay })

    await wrapper.vm.$nextTick()
    // allow async component to resolve
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    const modalEl = document.getElementById('battle-replay-modal')
    expect(modalEl).not.toBeNull()

    wrapper.unmount()
  })
})

