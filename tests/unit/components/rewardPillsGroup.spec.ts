// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'

describe('RewardPillsGroup.vue', () => {
  const globalStubs = {
    PVTooltip: {
      template: '<div class="pv-tooltip-stub"><slot /></div>'
    }
  }

  it('renders money, battle coins and item pills correctly from a mixed prize object', () => {
    const prize = {
      type: 'mixed' as const,
      money: 25000,
      battleCoins: 150,
      items: {
        goldbottlecap: 1,
        rarecandy: 5
      }
    }

    const wrapper = mount(RewardPillsGroup, {
      props: { prize, size: 'sm' },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('₽25.000')
    expect(text).toContain('150 BC')
    expect(text).toContain('Chapa Dorada')
    expect(text).toContain('x1')
    expect(text).toContain('Caramelo Raro')
    expect(text).toContain('x5')

    const moneyPill = wrapper.find('.reward-pill.money')
    expect(moneyPill.exists()).toBe(true)

    const bcPill = wrapper.find('.reward-pill.bc')
    expect(bcPill.exists()).toBe(true)

    const itemPills = wrapper.findAll('.reward-pill.item')
    expect(itemPills.length).toBe(2)
  })

  it('renders rewards map correctly when passed via rewards prop', () => {
    const rewards = {
      rarecandy: 3,
      bigpearl: 2
    }

    const wrapper = mount(RewardPillsGroup, {
      props: { rewards },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('Caramelo Raro')
    expect(text).toContain('x3')
    expect(text).toContain('Perla Grande')
    expect(text).toContain('x2')
  })
})
