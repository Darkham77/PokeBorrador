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

  it('renders all 8 Kanto gyms and shows correct conquered count and difficulty chips', () => {
    const gameStore = useGameStore()
    gameStore.state.defeatedGyms = ['pewter', 'cerulean']
    gameStore.state.gymProgress = {
      pewter: { easy: true, normal: true, hard: true, attempts: 3 },
      cerulean: { easy: true, normal: false, hard: false, attempts: 1 }
    }

    const wrapper = mount(HomeGymsProgress, {
      global: { plugins: [pinia] }
    })

    expect(wrapper.text()).toContain('GIMNASIOS DE KANTO')
    expect(wrapper.text()).toContain('2/8 Medallas Conquistadas')
    expect(wrapper.text()).toContain('4/24 Dificultades')
    expect(wrapper.findAll('.medal-slot')).toHaveLength(8)

    const conqueredSlots = wrapper.findAll('.medal-slot.is-conquered')
    expect(conqueredSlots).toHaveLength(2)

    const masteredSlots = wrapper.findAll('.medal-slot.is-mastered')
    expect(masteredSlots).toHaveLength(1)
    const firstMastered = masteredSlots.at(0)
    expect(firstMastered).toBeDefined()
    expect(firstMastered?.text()).toContain('DOMINADO')
    expect(firstMastered?.find('.master-crown').exists()).toBe(true)

    // Check chips
    const slots = wrapper.findAll('.medal-slot')
    const pewterSlot = slots.at(0)
    expect(pewterSlot).toBeDefined()
    expect(pewterSlot?.find('.diff-chip.is-easy.won').exists()).toBe(true)
    expect(pewterSlot?.find('.diff-chip.is-normal.won').exists()).toBe(true)
    expect(pewterSlot?.find('.diff-chip.is-hard.won').exists()).toBe(true)

    const ceruleanSlot = slots.at(1)
    expect(ceruleanSlot).toBeDefined()
    expect(ceruleanSlot?.find('.diff-chip.is-easy.won').exists()).toBe(true)
    expect(ceruleanSlot?.find('.diff-chip.is-normal.won').exists()).toBe(false)
    expect(ceruleanSlot?.find('.diff-chip.is-hard.won').exists()).toBe(false)
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
