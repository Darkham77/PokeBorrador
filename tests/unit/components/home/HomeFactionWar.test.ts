// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeFactionWar from '@/components/home/HomeFactionWar.vue'
import { useWarStore } from '@/stores/war'

describe('HomeFactionWar.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders territorial war dominance information and user stats', () => {
    const warStore = useWarStore()
    warStore.faction = 'union'
    warStore.weeklyPoints = 350
    warStore.warCoins = 75

    const wrapper = mount(HomeFactionWar, {
      global: { plugins: [pinia] }
    })

    expect(wrapper.text()).toContain('GUERRA TERRITORIAL DE FACCIONES')
    expect(wrapper.text()).toContain('UNIÓN')
    expect(wrapper.text()).toContain('PODER')
    expect(wrapper.text()).toContain('350 PT')
    expect(wrapper.text()).toContain('75 🪙')
  })

  it('does not render redundant HUD navigation buttons (war map and shop)', () => {
    const wrapper = mount(HomeFactionWar, {
      global: { plugins: [pinia] }
    })

    expect(wrapper.find('#home-war-open-btn').exists()).toBe(false)
    expect(wrapper.find('#home-war-shop-btn').exists()).toBe(false)
    expect(wrapper.find('.header-actions').exists()).toBe(true)
  })
})
