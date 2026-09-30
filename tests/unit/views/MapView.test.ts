// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MapView from '@/views/game/MapView.vue'
import { useGameStore } from '@/stores/game'

describe('MapView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts and renders PokemonCenter banner, HomeBreedingWidget, and MapGrid', () => {
    const wrapper = mount(MapView, {
      global: {
        stubs: {
          MapPokemonCenterBanner: { template: '<div class="stub-pokecenter">PokecenterBanner</div>' },
          HomeBreedingWidget: { template: '<div class="stub-breeding-widget">HomeBreedingWidget</div>' },
          MapGrid: { template: '<div class="stub-map-grid">MapGrid</div>' }
        }
      }
    })

    expect(wrapper.find('.stub-pokecenter').exists()).toBe(true)
    expect(wrapper.find('.stub-breeding-widget').exists()).toBe(true)
    expect(wrapper.find('.stub-map-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('REGIÓN DE KANTO')
    wrapper.unmount()
  })

  it('triggers checkRouteExpirations on mounted lifecycle', () => {
    const gameStore = useGameStore()
    const checkSpy = vi.spyOn(gameStore, 'checkRouteExpirations').mockImplementation(() => {})

    const wrapper = mount(MapView, {
      global: {
        stubs: {
          MapPokemonCenterBanner: true,
          HomeBreedingWidget: true,
          MapGrid: true
        }
      }
    })

    expect(checkSpy).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('cleans up expiration ticker on unmount without throwing errors', () => {
    const wrapper = mount(MapView, {
      global: {
        stubs: {
          MapPokemonCenterBanner: true,
          HomeBreedingWidget: true,
          MapGrid: true
        }
      }
    })

    expect(() => wrapper.unmount()).not.toThrow()
  })
})

