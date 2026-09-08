/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RankedTournamentDetailModal from '@/components/modals/RankedTournamentDetailModal.vue'

describe('RankedTournamentDetailModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders tournament card with banner, rules, and exclusive master reward', () => {
    const wrapper = mount(RankedTournamentDetailModal, {
      props: {
        show: true,
        themeId: 'johto_kanto_frontier',
        tournamentName: 'Frontera Kanto & Johto'
      },
      global: {
        stubs: {
          BaseModal: {
            template: '<div class="base-modal-stub"><slot /></div>'
          },
          PokemonTypeTag: true
        }
      }
    })

    expect(wrapper.text()).toContain('TORNEO DE TEMPORADA')
    expect(wrapper.text()).toContain('Frontera Kanto & Johto')
    expect(wrapper.text()).toContain('RECOMPENSA EXCLUSIVA MAESTRO')
    expect(wrapper.find('.season-tournament-card').exists()).toBe(true)
    expect(wrapper.find('.tournament-banner-wrapper').exists()).toBe(true)
  })

  it('resolves theme from medal prop if themeId is omitted', () => {
    const wrapper = mount(RankedTournamentDetailModal, {
      props: {
        show: true,
        medal: {
          id: 'test_medal',
          seasonName: 'Temporada 9',
          tournamentName: 'Copa Monotipo',
          themeId: 'monotype_clash',
          tier: 'maestro',
          rank: 1,
          finalElo: 3500,
          awardedAt: '2026-01-15T12:00:00Z'
        }
      },
      global: {
        stubs: {
          BaseModal: {
            template: '<div class="base-modal-stub"><slot /></div>'
          },
          PokemonTypeTag: true
        }
      }
    })

    expect(wrapper.text()).toContain('Copa Monotipo')
    expect(wrapper.text()).toContain('Monotipo')
    expect(wrapper.text()).toContain('charizard')
  })
})
