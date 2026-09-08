/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import UnifiedPokemonDetailModal from '@/components/modals/UnifiedPokemonDetailModal.vue'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(() => '/assets/mock-sprite.png'),
  ASSET_TYPES: { POKEMON: 'pokemon', ITEM: 'item' }
}))

describe('UnifiedPokemonDetailModal - Gender Badge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders gender badge between edit button and name for male pokemon instance', () => {
    const malePokemon = {
      uid: 'wartortle_1',
      id: 'wartortle',
      name: 'Wartortle',
      level: 35,
      hp: 94,
      maxHp: 94,
      gender: 'm',
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['watergun'],
      isShiny: false
    } as unknown as Pokemon

    const gameStore = useGameStore()
    gameStore.state.team = [malePokemon]

    const wrapper = mount(UnifiedPokemonDetailModal, {
      props: {
        show: true,
        pokemon: malePokemon,
        index: 0,
        context: 'team'
      },
      global: {
        stubs: {
          BaseModal: { template: '<div><slot /></div>' },
          PokemonSummaryTab: true,
          PokemonStatsTab: true,
          PokemonMovesTab: true,
          PokemonEvolutionsTab: true,
          PokemonTmsTab: true,
          PokemonTrophiesTab: true,
          PokemonActionFooter: true,
          UnifiedBadgePill: true,
          PVSpriteFX: true
        }
      }
    })

    const nameWithEdit = wrapper.find('.name-with-edit')
    expect(nameWithEdit.exists()).toBe(true)

    // Edit button exists
    const editBtn = nameWithEdit.find('.edit-nick-btn')
    expect(editBtn.exists()).toBe(true)

    // Gender badge exists and has male class
    const genderBadge = nameWithEdit.findComponent(PVGenderBadge)
    expect(genderBadge.exists()).toBe(true)
    expect(genderBadge.classes()).toContain('male')
    expect(genderBadge.classes()).toContain('sm')

    // Verify ordering: edit-btn before gender-badge before name-container
    const children = nameWithEdit.element.children
    expect(children[0]?.classList.contains('edit-nick-btn')).toBe(true)
    expect(children[1]?.classList.contains('pv-gender-badge')).toBe(true)
    expect(children[2]?.classList.contains('name-container')).toBe(true)
  })

  it('renders female badge when pokemon is female', () => {
    const femalePokemon = {
      uid: 'wartortle_2',
      id: 'wartortle',
      name: 'Wartortle',
      level: 35,
      hp: 94,
      maxHp: 94,
      gender: 'f',
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['watergun'],
      isShiny: false
    } as unknown as Pokemon

    const gameStore = useGameStore()
    gameStore.state.team = [femalePokemon]

    const wrapper = mount(UnifiedPokemonDetailModal, {
      props: {
        show: true,
        pokemon: femalePokemon,
        index: 0,
        context: 'team'
      },
      global: {
        stubs: {
          BaseModal: { template: '<div><slot /></div>' },
          PokemonSummaryTab: true,
          PokemonStatsTab: true,
          PokemonMovesTab: true,
          PokemonEvolutionsTab: true,
          PokemonTmsTab: true,
          PokemonTrophiesTab: true,
          PokemonActionFooter: true,
          UnifiedBadgePill: true,
          PVSpriteFX: true
        }
      }
    })

    const genderBadge = wrapper.findComponent(PVGenderBadge)
    expect(genderBadge.exists()).toBe(true)
    expect(genderBadge.classes()).toContain('female')
  })
})
