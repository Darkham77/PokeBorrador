import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import PokemonSummaryTab, { type SpeciesSummaryData } from '@/components/pokemon-detail/PokemonSummaryTab.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('PokemonSummaryTab.vue', () => {
  const dummySpecies: SpeciesSummaryData = {
    name: 'Charizard',
    type: ['fire', 'flying'],
    description: 'Escupe fuego que puede derretir las rocas.',
    height: 1.7,
    weight: 90.5,
    nationalId: '006',
  }

  it('renders species category and description correctly in Pokedex mode', () => {
    const wrapper = mount(PokemonSummaryTab, {
      global: {
        plugins: [createPinia()],
        stubs: {
          PVTooltip: { template: '<div><slot /></div>' },
          PokemonStatusSection: true,
        },
      },
      props: {
        species: dummySpecies,
        cleanCategory: 'Llama',
        isInstance: false,
        instancePhysicalData: null,
        targetPokemon: null,
        targetSpeciesId: 'charizard',
        captureDateFormatted: null,
      },
    })

    expect(wrapper.text()).toContain('CATEGORÍA')
    expect(wrapper.text()).toContain('Llama')
    expect(wrapper.text()).toContain('Escupe fuego que puede derretir las rocas.')
  })

  it('renders unique DB ID and nickname in instance mode', () => {
    const dummyInstance = {
      id: 'charizard',
      name: 'Charizard',
      nickname: 'Fuego',
      uid: 'poke_uid_12345',
      trophies: [],
    } as unknown as Pokemon

    const wrapper = mount(PokemonSummaryTab, {
      global: {
        plugins: [createPinia()],
        stubs: {
          PVTooltip: { template: '<div><slot /></div>' },
          PokemonStatusSection: true,
        },
      },
      props: {
        species: dummySpecies,
        cleanCategory: 'Llama',
        isInstance: true,
        instancePhysicalData: null,
        targetPokemon: dummyInstance,
        targetSpeciesId: 'charizard',
        captureDateFormatted: '12/05/2026',
      },
    })

    expect(wrapper.text()).toContain('ID ÚNICO DB:')
    expect(wrapper.text()).toContain('poke_uid_12345')
    expect(wrapper.text()).toContain('CAPTURADO EL:')
    expect(wrapper.text()).toContain('12/05/2026')
  })
})
