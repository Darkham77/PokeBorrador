/**
 * tests/unit/pokemon/pokemon_box_and_storage_suite.spec.ts
 * Cohesive domain suite consolidating Box storage, Team management,
 * and Pokemon selection modals, filtering, sorting, and persistence.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useBoxStore } from '@/stores/box'
import { useGameStore } from '@/stores/game'
import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import PokemonSelectionModal from '@/components/modals/PokemonSelectionModal.vue'
import { filterAndSortPokemon, type PokemonFilterCriteria } from '@/logic/pokemon/pokemonSelectionFilter'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { ResolvedSubCompetition } from '@/logic/events/eventEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface SelectionModalInstance {
  sortBy: string;
  sortOrder: string;
  activeTags: string[];
  searchQuery: string;
  availablePokemon: Array<{ pokemon: { name: string; nickname: string } }>;
}

const createMockPokemon = (overrides: Partial<Pokemon> = {}): Pokemon => ({
  uid: 'poke-test-1',
  id: requirePokemonSpeciesId('magikarp'),
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

const localStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStore[key] = value.toString() }),
  removeItem: vi.fn((key: string) => { delete localStore[key] }),
  clear: vi.fn(() => { for (const k in localStore) delete localStore[k] }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(localStore)[index] || null)
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

describe('Pokemon Box & Storage Domain Suite', () => {
  describe('BoxStore Modernization & Tagging', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      const gs = useGameStore()
      Object.assign(gs.state, {
        money: 1000,
        box: [
          { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, maxHp: 30, hp: 10, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 0, maxPP: 35 }] },
          { id: 'rattata', name: 'Rattata', level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, maxHp: 20, hp: 20, ability: 'runaway', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] }
        ],
        team: [
          { id: 'bulbasaur', name: 'Bulbasaur', level: 5, maxHp: 20, hp: 5, ability: 'overgrow', moves: [{ id: 'tackle', name: 'Tackle', pp: 0, maxPP: 35 }] },
          { id: 'pidgey-team', name: 'Pidgey', level: 5, maxHp: 20, hp: 20, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] }
        ],
        boxCount: 4,
        starterChosen: true,
        playerClass: 'rocket'
      })
      gs.save = vi.fn()
    })

    it('should toggle tags correctly', () => {
      const box = useBoxStore()
      const gs = useGameStore()
      
      box.togglePokeTag(0, 'fav')
      const poke1 = gs.state.box[0] as Pokemon
      expect(poke1.tags).toContain('fav')
      
      box.togglePokeTag(0, 'fav')
      const poke2 = gs.state.box[0] as Pokemon
      expect(poke2.tags).not.toContain('fav')
    })

    it('should calculate Rocket Sell value with legacy formula', () => {
      const box = useBoxStore()
      box.boxRocketSelected = [0]
      const val = box.getRocketSellValue()
      expect(val).toBe(529)
    })

    it('should not heal pokemon when sent to box', () => {
      const gs = useGameStore()
      const bulbasaur = gs.state.team[0] as Pokemon
      
      gs.sendToBox(0)
      
      expect(bulbasaur.hp).toBe(5)
      expect(bulbasaur.moves![0]!.pp).toBe(0)
      expect(gs.state.box).toContain(bulbasaur)
    })

    it('should move pokemon between boxes', () => {
      const box = useBoxStore()
      const gs = useGameStore()
      
      gs.state.box = [
        { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon
      ]
      
      box.movePokemonToBox(0, 1)
      
      const pidgeyBox = gs.state.box[50] as Pokemon
      expect(pidgeyBox.name).toBe('Pidgey')
      expect(gs.state.box[0]).toBeNull()
    })

    it('should block selection of busy Pokémon for release and black market sale', () => {
      const box = useBoxStore()
      const gs = useGameStore()

      gs.state.box = [
        { id: 'pidgey', name: 'Pidgey', level: 10, inDaycare: true, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
        { id: 'rattata', name: 'Rattata', level: 5, onMission: true, ability: 'runaway', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
        { id: 'ekans', name: 'Ekans', level: 8, onDefense: true, ability: 'intimidate', moves: [{ id: 'wrap', name: 'Wrap', pp: 20, maxPP: 20 }] } as unknown as Pokemon,
        { id: 'zubat', name: 'Zubat', level: 7, ability: 'innerfocus', moves: [{ id: 'leechlife', name: 'Leech Life', pp: 15, maxPP: 15 }] } as unknown as Pokemon
      ]

      box.toggleBoxReleaseSelect(0)
      box.toggleBoxReleaseSelect(1)
      box.toggleBoxReleaseSelect(2)
      box.toggleBoxReleaseSelect(3)
      expect(box.boxReleaseSelected).toEqual([3])

      box.boxReleaseSelected = []

      box.toggleBoxRocketSelect(0)
      box.toggleBoxRocketSelect(1)
      box.toggleBoxRocketSelect(2)
      box.toggleBoxRocketSelect(3)
      expect(box.boxRocketSelected).toEqual([3])
    })

    it('should ignore/skip busy Pokémon during release and black market sale processing', () => {
      const box = useBoxStore()
      const gs = useGameStore()

      gs.state.box = [
        { id: 'pidgey', name: 'Pidgey', level: 10, inDaycare: true, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
        { id: 'zubat', name: 'Zubat', level: 7, ability: 'innerfocus', moves: [{ id: 'leechlife', name: 'Leech Life', pp: 15, maxPP: 15 }] } as unknown as Pokemon
      ]

      box.boxReleaseSelected = [0, 1]
      const released = box.doBoxRelease()
      
      expect(released).toEqual(['Zubat'])
      expect(gs.state.box[0]?.id).toBe('pidgey')
      expect(gs.state.box.length).toBe(1)

      gs.state.box = [
        { id: 'pidgey', name: 'Pidgey', level: 10, inDaycare: true, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ability: 'keeneye', moves: [{ id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon,
        { id: 'zubat', name: 'Zubat', level: 7, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ability: 'innerfocus', moves: [{ id: 'leechlife', name: 'Leech Life', pp: 15, maxPP: 15 }] } as unknown as Pokemon
      ]
      box.boxRocketSelected = [0, 1]
      const val = box.getRocketSellValue()
      const expectedZubatVal = Math.floor((7 * 50 + (60 / 186) * 500) * 0.8)
      expect(val).toBe(expectedZubatVal)

      const sold = box.doBoxRocketSell()
      expect(sold.count).toBe(1)
      expect(gs.state.box[0]?.id).toBe('pidgey')
    })
  })

  describe('Team Management Logic', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      const gs = useGameStore()
      Object.assign(gs.state, {
        team: [],
        box: [],
        pvpTeam: []
      })
      gs.save = vi.fn()
    })

    const populateTeam = (count = 4) => {
      const gs = useGameStore()
      for (let i = 1; i <= count; i++) {
        gs.addPokemon({ uid: `p${i}`, name: `P${i}` } as unknown as Pokemon, { notify: false })
      }
    }

    it('should auto-fill PVP team when adding pokemons', () => {
      const gs = useGameStore()
      
      gs.addPokemon({ uid: 'p1', name: 'P1' } as unknown as Pokemon, { notify: false })
      expect(gs.state.pvpTeam).toHaveLength(1)
      expect(gs.state.pvpTeam[0]).toBe('p1')

      gs.addPokemon({ uid: 'p2', name: 'P2' } as unknown as Pokemon, { notify: false })
      gs.addPokemon({ uid: 'p3', name: 'P3' } as unknown as Pokemon, { notify: false })
      expect(gs.state.pvpTeam).toHaveLength(3)
      expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])

      gs.addPokemon({ uid: 'p4', name: 'P4' } as unknown as Pokemon, { notify: false })
      expect(gs.state.pvpTeam).toHaveLength(3)
      expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])
    })

    it('should maintain PVP team size after sending to box', () => {
      const gs = useGameStore()
      
      for (let i = 1; i <= 6; i++) {
        gs.addPokemon({ uid: `p${i}`, name: `P${i}`, maxHp: 10, hp: 10 } as unknown as Pokemon, { notify: false })
      }
      
      expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])

      gs.sendToBox(0)
      expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])
      expect(gs.state.box[0]!.uid).toBe('p1')
    })

    it('should auto-fill empty slots if a PVP pokemon is removed', () => {
      const gs = useGameStore()
      populateTeam()

      gs.removePokemon('p2')
      
      expect(gs.state.pvpTeam).toHaveLength(3)
      expect(gs.state.pvpTeam).toContain('p1')
      expect(gs.state.pvpTeam).toContain('p3')
      expect(gs.state.pvpTeam).toContain('p4')
    })

    it('should swap slots correctly', () => {
      const gs = useGameStore()
      populateTeam()

      gs.swapPvpSlot(1, 'p4')
      expect(gs.state.pvpTeam).toEqual(['p1', 'p4', 'p3'])
    })

    it('should not allow duplicates in PVP team via swap', () => {
      const gs = useGameStore()
      populateTeam()

      gs.swapPvpSlot(1, 'p1')
      expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])
    })
  })

  describe('Pokemon Selection Filter - Allowed Species & Criteria', () => {
    const baseCriteria: PokemonFilterCriteria = {
      searchQuery: '',
      sortBy: 'recent',
      sortOrder: 'desc',
      activeTags: []
    }

    const createMockPoke = (species: string, uid: string, level: number, nickname?: string): Pokemon => {
      const p = makePokemon(requirePokemonSpeciesId(species), level, { bypassWhitelist: true })!
      p.uid = uid
      if (nickname) p.nickname = nickname
      return p
    }

    const pokes = [
      { pokemon: createMockPoke('pikachu', 'u1', 10), _source: 'team' as const, index: 0 },
      { pokemon: createMockPoke('magikarp', 'u2', 39, 'Chispa'), _source: 'team' as const, index: 1 },
      { pokemon: createMockPoke('gyarados', 'u3', 45), _source: 'box' as const, index: 0 },
      { pokemon: createMockPoke('pidgey', 'u4', 5), _source: 'box' as const, index: 1 }
    ]

    it('filters strictly to the allowed species', () => {
      const res = filterAndSortPokemon(pokes, {
        ...baseCriteria,
        allowedSpecies: ['magikarp']
      })

      expect(res).toHaveLength(1)
      expect(res[0]?.pokemon.id).toBe('magikarp')
    })

    it('handles multiple allowed species', () => {
      const res = filterAndSortPokemon(pokes, {
        ...baseCriteria,
        allowedSpecies: ['magikarp', 'gyarados']
      })

      expect(res).toHaveLength(2)
      const species = res.map(r => r.pokemon.id)
      expect(species).toContain('magikarp')
      expect(species).toContain('gyarados')
    })

    it('filters by single species', () => {
      const res = filterAndSortPokemon(pokes, {
        ...baseCriteria,
        allowedSpecies: ['gyarados']
      })

      expect(res).toHaveLength(1)
      expect(res[0]?.pokemon.id).toBe('gyarados')
    })

    it('returns all when allowedSpecies is null or empty', () => {
      const resNull = filterAndSortPokemon(pokes, {
        ...baseCriteria,
        allowedSpecies: null
      })
      expect(resNull).toHaveLength(4)

      const resEmpty = filterAndSortPokemon(pokes, {
        ...baseCriteria,
        allowedSpecies: []
      })
      expect(resEmpty).toHaveLength(4)
    })
  })

  describe('Pokemon Selection - Competition Sub-Element & Context', () => {
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
      const gs = useGameStore()
      const poke1 = createMockPokemon({ uid: 'p1', weight: 12.0, height: 1.8 })
      const poke2 = createMockPokemon({ uid: 'p2', weight: 7.0, height: 0.9 })
      gs.state.team = [poke1, poke2]

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

      const itemsMin = wrapper.findAllComponents(PokemonSelectionItem)
      expect(itemsMin.length).toBe(2)
      expect(itemsMin[0]?.props('item')?.pokemon.uid).toBe('p2')

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

      const itemsMax = wrapper.findAllComponents(PokemonSelectionItem)
      expect(itemsMax[0]?.props('item')?.pokemon.uid).toBe('p1')
    })
  })

  describe('PokemonSelectionModal Persistence & Search Filtering', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      localStorage.clear()
      vi.clearAllMocks()
    })

    it('saves filters to localStorage when changed', async () => {
      const wrapper = mount(PokemonSelectionModal, {
        props: {
          isOpen: true,
          pokemons: [],
          title: 'Select'
        }
      })

      const vm = wrapper.vm as unknown as SelectionModalInstance

      vm.sortBy = 'level'
      vm.sortOrder = 'desc'
      vm.activeTags = ['team']
      vm.searchQuery = 'pikachu'

      await new Promise(resolve => setTimeout(resolve, 50))

      const saved = JSON.parse(localStorage.getItem('pv_selection_filters') || '{}') as Record<string, unknown>
      expect(saved).not.toBeNull()
      expect(saved.sortBy).toBe('level')
      expect(saved.sortOrder).toBe('desc')
      expect(saved.activeTags).toContain('team')
      expect(saved.searchQuery).toBe('pikachu')
    })

    it('restores filters from localStorage on mount', () => {
      const savedState = {
        sortBy: 'name',
        sortOrder: 'asc',
        activeTags: ['box'],
        searchQuery: 'char'
      }
      localStorage.setItem('pv_selection_filters', JSON.stringify(savedState))

      const wrapper = mount(PokemonSelectionModal, {
        props: {
          isOpen: true,
          pokemons: [],
          title: 'Select'
        }
      })

      const vm = wrapper.vm as unknown as SelectionModalInstance

      expect(vm.sortBy).toBe('name')
      expect(vm.sortOrder).toBe('asc')
      expect(vm.activeTags).toContain('box')
      expect(vm.searchQuery).toBe('char')
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('pv_selection_filters', 'invalid-json')

      const wrapper = mount(PokemonSelectionModal, {
        props: {
          isOpen: true,
          pokemons: [],
          title: 'Select'
        }
      })

      const vm = wrapper.vm as unknown as SelectionModalInstance

      expect(vm.sortBy).toBe('recent')
      expect(vm.sortOrder).toBe('desc')
      expect(vm.activeTags).toEqual([])
    })

    it('filters available pokemon by nickname', async () => {
      const gs = useGameStore()
      gs.state.team = [
        { uid: 'u1', id: 'pikachu', name: 'Pikachu', nickname: 'Sparky', level: 10 } as unknown as Pokemon,
        { uid: 'u2', id: 'bulbasaur', name: 'Bulbasaur', nickname: 'Leafy 🌿', level: 5 } as unknown as Pokemon
      ]

      const wrapper = mount(PokemonSelectionModal, {
        global: {
          stubs: {
            BaseModal: true,
            PVTooltip: true
          }
        }
      })

      const vm = wrapper.vm as unknown as SelectionModalInstance

      vm.searchQuery = 'spark'
      expect(vm.availablePokemon).toHaveLength(1)
      expect(vm.availablePokemon[0]!.pokemon.nickname).toBe('Sparky')

      vm.searchQuery = '🌿'
      expect(vm.availablePokemon).toHaveLength(1)
      expect(vm.availablePokemon[0]!.pokemon.nickname).toBe('Leafy 🌿')

      vm.searchQuery = 'bulba'
      expect(vm.availablePokemon).toHaveLength(1)
      expect(vm.availablePokemon[0]!.pokemon.name).toBe('Bulbasaur')
    })

    it('filters available pokemon by allowedSpecies prop', async () => {
      const gs = useGameStore()
      gs.state.team = [
        { uid: 'u1', id: 'pikachu', name: 'Pikachu', level: 10 } as unknown as Pokemon,
        { uid: 'u2', id: 'magikarp', name: 'Magikarp', nickname: 'Chispa', level: 39 } as unknown as Pokemon,
        { uid: 'u3', id: 'pidgey', name: 'Pidgey', level: 5 } as unknown as Pokemon
      ]

      const wrapper = mount(PokemonSelectionModal, {
        props: {
          allowedSpecies: ['magikarp']
        },
        global: {
          stubs: {
            BaseModal: true,
            PVTooltip: true
          }
        }
      })

      const vm = wrapper.vm as unknown as SelectionModalInstance
      expect(vm.availablePokemon).toHaveLength(1)
      expect(vm.availablePokemon[0]!.pokemon.name).toBe('Magikarp')
    })
  })
})
