import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MapView from '@/views/game/MapView.vue'

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
  })
})
