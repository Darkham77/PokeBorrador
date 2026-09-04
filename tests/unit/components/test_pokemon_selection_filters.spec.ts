// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PokemonSelectionFilters from '@/components/modals/PokemonSelectionFilters.vue'
import PokemonSortBar from '@/components/pokemon/PokemonSortBar.vue'

describe('PokemonSelectionFilters.vue', () => {
  it('debe resolver y renderizar correctamente el componente PokemonSortBar', () => {
    const warnSpy = vi.spyOn(console, 'warn')
    const wrapper = mount(PokemonSelectionFilters, {
      props: {
        searchQuery: '',
        'onUpdate:searchQuery': () => {},
        sortBy: 'recent',
        'onUpdate:sortBy': () => {},
        sortOrder: 'desc',
        'onUpdate:sortOrder': () => {},
        activeTags: [],
        'onUpdate:activeTags': () => {},
        filterCompatibleOnly: false,
        'onUpdate:filterCompatibleOnly': () => {}
      },
      global: {
        directives: {
          'gsap-hover': () => {}
        }
      }
    })

    const unresolvedWarnings = warnSpy.mock.calls.filter(args =>
      args.some(arg => typeof arg === 'string' && arg.includes('Failed to resolve component: PokemonSortBar'))
    )

    expect(unresolvedWarnings.length).toBe(0)
    expect(wrapper.findComponent(PokemonSortBar).exists()).toBe(true)

    warnSpy.mockRestore()
  })
})
