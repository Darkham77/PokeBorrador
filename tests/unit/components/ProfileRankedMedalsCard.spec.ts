/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileRankedMedalsCard from '@/components/profile/ProfileRankedMedalsCard.vue'
import type { RankedSeasonMedal } from '@/types/battle/pvp.ts'

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

  it('renders medal cards with tier badges, ELO, and podium tags when medals exist', () => {
    const testMedals: RankedSeasonMedal[] = [
      {
        id: 'medal_1',
        seasonName: 'Temporada 1',
        tier: 'maestro',
        rank: 1,
        finalElo: 3500,
        awardedAt: '2026-09-01T00:00:00Z'
      },
      {
        id: 'medal_2',
        seasonName: 'Temporada 2',
        tier: 'diamante',
        rank: 4,
        finalElo: 2850,
        awardedAt: '2026-10-01T00:00:00Z'
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

    // First medal: Maestro, Season 1, Podio #1
    expect(items[0]!.text()).toContain('Temporada 1')
    expect(items[0]!.text()).toContain('Maestro • 3500 LP')
    expect(items[0]!.find('.podium-tag').text()).toBe('#1')

    // Second medal: Diamante, Season 2, Podio #4
    expect(items[1]!.text()).toContain('Temporada 2')
    expect(items[1]!.text()).toContain('Diamante • 2850 LP')
    expect(items[1]!.find('.podium-tag').text()).toBe('#4')
  })
})
