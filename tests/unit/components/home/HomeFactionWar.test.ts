// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeFactionWar from '@/components/home/HomeFactionWar.vue'
import { useWarStore } from '@/stores/war'
import { useModalStore } from '@/stores/modals'

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

  it('opens FactionWar modal when clicking map button', async () => {
    const modalStore = useModalStore()
    const wrapper = mount(HomeFactionWar, {
      global: { plugins: [pinia] }
    })

    const warBtn = wrapper.find('#home-war-open-btn')
    expect(warBtn.exists()).toBe(true)

    await warBtn.trigger('click')
    expect(modalStore.isOpen('FactionWar')).toBe(true)
  })

  it('opens WarShop modal when clicking shop button', async () => {
    const modalStore = useModalStore()
    const wrapper = mount(HomeFactionWar, {
      global: { plugins: [pinia] }
    })

    const shopBtn = wrapper.find('#home-war-shop-btn')
    expect(shopBtn.exists()).toBe(true)

    await shopBtn.trigger('click')
    expect(modalStore.isOpen('WarShop')).toBe(true)
  })
})
