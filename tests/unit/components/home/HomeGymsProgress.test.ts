// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeGymsProgress from '@/components/home/HomeGymsProgress.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

describe('HomeGymsProgress.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders all 8 Kanto gyms and shows correct conquered count', () => {
    const gameStore = useGameStore()
    gameStore.state.defeatedGyms = ['pewter', 'cerulean']

    const wrapper = mount(HomeGymsProgress, {
      global: { plugins: [pinia] }
    })

    expect(wrapper.text()).toContain('GIMNASIOS DE KANTO')
    expect(wrapper.text()).toContain('2/8 Medallas Conquistadas')
    expect(wrapper.findAll('.medal-slot')).toHaveLength(8)

    const conqueredSlots = wrapper.findAll('.medal-slot.is-conquered')
    expect(conqueredSlots).toHaveLength(2)
  })

  it('switches to gyms tab when clicking challenge button', async () => {
    const uiStore = useUIStore()
    const wrapper = mount(HomeGymsProgress, {
      global: { plugins: [pinia] }
    })

    const challengeBtn = wrapper.find('#home-gyms-open-btn')
    expect(challengeBtn.exists()).toBe(true)

    await challengeBtn.trigger('click')
    expect(uiStore.activeTab).toBe('gyms')
  })
})
