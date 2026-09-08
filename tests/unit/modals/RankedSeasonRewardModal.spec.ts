/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RankedSeasonRewardModal from '@/components/modals/RankedSeasonRewardModal.vue'
import { useGameStore } from '@/stores/game'

describe('RankedSeasonRewardModal.vue', () => {
  let claimedAwards: string[]

  beforeEach(() => {
    setActivePinia(createPinia())
    claimedAwards = []

    const gameStore = useGameStore()
    gameStore.db = {
      rpc: vi.fn().mockImplementation((name: string, params: { p_award_id: string }) => {
        if (name === 'claim_award') {
          claimedAwards.push(params.p_award_id)
        }
        return Promise.resolve({ data: { ok: true, success: true }, error: null })
      })
    } as unknown as typeof gameStore.db
  })

  it('renders season celebration header, tier badge and soft reset preview', () => {
    const wrapper = mount(RankedSeasonRewardModal, {
      props: {
        show: true,
        seasonName: 'Temporada 1',
        tier: 'maestro',
        rank: 1,
        finalElo: 3500,
        awards: []
      },
      global: {
        stubs: { Teleport: true }
      }
    })

    expect(wrapper.text()).toContain('Temporada 1')
    expect(wrapper.text()).toContain('Maestro')
    expect(wrapper.text()).toContain('3500 LP')
    expect(wrapper.text()).toContain('PODIO #1')
    // Soft reset: 1000 + (2500 / 2) = 2250
    expect(wrapper.text()).toContain('Tu ELO para la próxima temporada será 2250 LP')
  })

  it('lists unlocked rewards including pokemon, tickets and battle coins', () => {
    const sampleAwards = [
      {
        id: 'aw_1',
        prize: { type: 'ranked_medal', tier: 'maestro', season: 'Temporada 1' }
      },
      {
        id: 'aw_2',
        prize: { type: 'pokemon', species: 'eevee', level: 50, shiny: true }
      },
      {
        id: 'aw_3',
        prize: { type: 'item', item: 'Ticket Cueva Celeste', qty: 3 }
      },
      {
        id: 'aw_4',
        prize: { type: 'bc', amount: 500, battleCoins: 500 }
      }
    ]

    const wrapper = mount(RankedSeasonRewardModal, {
      props: {
        show: true,
        seasonName: 'Temporada 1',
        tier: 'maestro',
        finalElo: 3500,
        awards: sampleAwards
      },
      global: {
        stubs: { Teleport: true }
      }
    })

    expect(wrapper.text()).toContain('RECOMPENSAS DESBLOQUEADAS (4)')
    expect(wrapper.text()).toContain('EEVEE ✨ SHINY')
    expect(wrapper.text()).toContain('Ticket Cueva Celeste')
    expect(wrapper.text()).toContain('500 Battle Coins')
    expect(wrapper.text()).toContain('Medalla de Temporada Temporada 1')
  })

  it('claims all awards when claim button is clicked and emits close and claimed', async () => {
    const sampleAwards = [
      { id: 'aw_poke', prize: { type: 'pokemon', species: 'eevee' } },
      { id: 'aw_bc', prize: { type: 'bc', amount: 500 } }
    ]

    const wrapper = mount(RankedSeasonRewardModal, {
      props: {
        show: true,
        seasonName: 'Temporada 1',
        tier: 'maestro',
        finalElo: 3500,
        awards: sampleAwards
      },
      global: {
        stubs: { Teleport: true }
      }
    })

    const claimBtn = wrapper.find('.claim-rewards-btn')
    expect(claimBtn.exists()).toBe(true)

    await claimBtn.trigger('click')

    // Expect claim_award called for each award
    expect(claimedAwards).toContain('aw_poke')
    expect(claimedAwards).toContain('aw_bc')

    // Emits
    expect(wrapper.emitted('claimed')).toBeTruthy()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('correctly handles battle_coins prize type and renders Medalla <Tier>', () => {
    const awards = [
      {
        id: 'aw_1',
        prize: { type: 'ranked_medal', tier: 'maestro', season: 'Temporada 1' }
      },
      {
        id: 'aw_2',
        prize: { type: 'battle_coins', amount: 500 }
      }
    ]

    const wrapper = mount(RankedSeasonRewardModal, {
      props: {
        show: true,
        seasonName: 'Temporada 1: Renacer de Kanto',
        tier: 'maestro',
        finalElo: 3500,
        awards
      },
      global: {
        stubs: { Teleport: true }
      }
    })

    expect(wrapper.text()).toContain('Medalla Maestro')
    expect(wrapper.text()).toContain('500 Monedas de Batalla')
  })
})
