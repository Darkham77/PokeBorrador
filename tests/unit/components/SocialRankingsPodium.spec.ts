/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SocialRankingsPodium from '@/components/social/SocialRankingsPodium.vue'

import type { RankedPodiumWinner } from '@/types/battle/pvp'

describe('SocialRankingsPodium.vue', () => {
  it('renders loading spinner when loading is true', () => {
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

    // 4th place in rest list
    expect(wrapper.text()).toContain('#4')
    expect(wrapper.text()).toContain('TrainerGold')
    expect(wrapper.text()).toContain('2400 LP')
  })
})
