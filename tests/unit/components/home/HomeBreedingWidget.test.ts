import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeBreedingWidget from '@/components/home/HomeBreedingWidget.vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'

describe('HomeBreedingWidget.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders walking eggs and calculates steps percentage accurately', () => {
    const gameStore = useGameStore()
    gameStore.state.eggs = [
      {
        uid: 'egg-1',
        species: 'eevee',
        steps: 100,
        totalSteps: 500,
        ready: false
      } as any
    ]

    const wrapper = mount(HomeBreedingWidget, {
      global: {
        stubs: {
          EggSprite: {
            template: '<span class="egg-sprite-mock">🥚</span>'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('EN CAMINATA & CRIANZA')
    expect(wrapper.text()).toContain('CAMINANDO')
    expect(wrapper.text()).toContain('80%')
    expect(wrapper.text()).toContain('400 / 500 pasos')
  })

  it('renders empty state and opens Daycare modal on click when no eggs are walking', async () => {
    const gameStore = useGameStore()
    const modalStore = useModalStore()
    gameStore.state.eggs = []

    const wrapper = mount(HomeBreedingWidget, {
      global: {
        stubs: {
          EggSprite: {
            template: '<span class="egg-sprite-mock">🥚</span>'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('No hay huevos en caminata')
    await wrapper.find('.empty-breeding-card').trigger('click')
    expect(modalStore.isOpen('Daycare')).toBe(true)
  })
})
