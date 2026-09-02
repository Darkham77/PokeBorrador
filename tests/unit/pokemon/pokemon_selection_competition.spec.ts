// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import PokemonSelectionModal from '@/components/modals/PokemonSelectionModal.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { ResolvedSubCompetition } from '@/logic/events/eventEngine'

const createMockPokemon = (overrides: Partial<Pokemon> = {}): Pokemon => ({
  uid: 'poke-test-1',
  id: requirePokemonSpeciesId('magikarp'),
  species: requirePokemonSpeciesId('magikarp'),
  name: 'Magikarp',
  level: 25,
  exp: 0,
  expNeeded: 100,
  hp: 45,
  maxHp: 45,
  atk: 10,
  def: 55,
  spa: 15,
  spd: 20,
  spe: 80,
  type: 'water',
  status: '',
  isShiny: false,
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  nature: 'adamant',
  ability: 'swiftswim',
  gender: 'm',
  moves: [],
  obtainedAt: 1724000000000,
  weight: 12.4,
  height: 1.1,
  friendship: 200,
  ...overrides
})

const mockGameStore = {
  state: { team: [] as Pokemon[], box: [] as Pokemon[], pokedex: [] as string[] },
  getPokemonByUid: (uid: string) => mockGameStore.state.team.find(p => p.uid === uid) || mockGameStore.state.box.find(p => p.uid === uid) || null
}

vi.mock('@/stores/game', () => ({
  useGameStore: () => mockGameStore
}))

describe('PokemonSelection - Competition Sub-Element & Context', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders competition-item-meta when subCompetition is provided for weight (min)', () => {
    const poke = createMockPokemon({ weight: 8.5 })
    const sub: ResolvedSubCompetition = {
      id: 'weight_magikarp',
      name: 'Menor Peso',
      metric: 'weight',
      order: 'min',
      speciesScope: 'per_species',
      targetSpecies: 'magikarp'
    }

    const wrapper = mount(PokemonSelectionItem, {
      props: {
        item: { pokemon: poke, _source: 'team', index: 0 },
        total: 250,
        subCompetition: sub
      }
    })

    const meta = wrapper.find('.competition-item-meta')
    expect(meta.exists()).toBe(true)
    expect(meta.text()).toContain('Menor Peso')
    expect(meta.text()).toContain('kg')
  })

  it('renders competition-item-meta when subCompetition is provided for height (max)', () => {
    const poke = createMockPokemon({ height: 1.4 })
    const sub: ResolvedSubCompetition = {
      id: 'height_magikarp',
      name: 'Mayor Altura',
      metric: 'height',
      order: 'max',
      speciesScope: 'per_species',
      targetSpecies: 'magikarp'
    }

    const wrapper = mount(PokemonSelectionItem, {
      props: {
        item: { pokemon: poke, _source: 'team', index: 0 },
        total: 250,
        subCompetition: sub
      }
    })

    const meta = wrapper.find('.competition-item-meta')
    expect(meta.exists()).toBe(true)
    expect(meta.text()).toContain('Mayor Altura')
    expect(meta.text()).toContain('m')
  })

  it('does NOT render competition-item-meta when subCompetition is null or omitted', () => {
    const poke = createMockPokemon()
    const wrapper = mount(PokemonSelectionItem, {
      props: {
        item: { pokemon: poke, _source: 'team', index: 0 },
        total: 250,
        subCompetition: null
      }
    })

    const meta = wrapper.find('.competition-item-meta')
    expect(meta.exists()).toBe(false)
  })

  it('PokemonSelectionModal sets appropriate initial sort order when subCompetition is passed', async () => {
    const poke1 = createMockPokemon({ uid: 'p1', weight: 12.0, height: 1.8 })
    const poke2 = createMockPokemon({ uid: 'p2', weight: 7.0, height: 0.9 })
    mockGameStore.state.team = [poke1, poke2]

    const subWeightMin: ResolvedSubCompetition = {
      id: 'weight_magikarp',
      name: 'Menor Peso',
      metric: 'weight',
      order: 'min',
      speciesScope: 'per_species',
      targetSpecies: 'magikarp'
    }

    const wrapper = mount(PokemonSelectionModal, {
      props: {
        show: true,
        title: 'SELECCIONAR POKÉMON',
        subCompetition: subWeightMin
      }
    })

    const vm = wrapper.vm as unknown as { sortBy: string; sortOrder: string }
    expect(vm.sortBy).toBe('weight')
    expect(vm.sortOrder).toBe('asc')

    // Verify item order: p2 (7.0kg) is first because it is smallest
    const itemsMin = wrapper.findAllComponents(PokemonSelectionItem)
    expect(itemsMin.length).toBe(2)
    expect(itemsMin[0]?.props('item')?.pokemon.uid).toBe('p2')

    // Dynamically switch to Mayor Altura (height max)
    const subHeightMax: ResolvedSubCompetition = {
      id: 'height_magikarp',
      name: 'Mayor Altura',
      metric: 'height',
      order: 'max',
      speciesScope: 'per_species',
      targetSpecies: 'magikarp'
    }
    await wrapper.setProps({ subCompetition: subHeightMax })

    expect(vm.sortBy).toBe('height')
    expect(vm.sortOrder).toBe('desc')

    // Verify item order: p1 (1.8m) is now first because it is tallest
    const itemsMax = wrapper.findAllComponents(PokemonSelectionItem)
    expect(itemsMax[0]?.props('item')?.pokemon.uid).toBe('p1')
  })
})
