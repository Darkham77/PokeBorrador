import { describe, it, expect, beforeEach, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import { clearVolatileStatus } from '@/logic/battle/battleStatus'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: () => 'mock-url',
  ASSET_TYPES: { MOVE: 'move' }
}))

// Mock components to avoid deep rendering issues in simple unit tests
vi.mock('@/components/shared/PokemonTypeTag.vue', () => ({
  default: { render: () => h('div', 'TypeTag') }
}))
vi.mock('@/components/common/PVTooltip.vue', () => ({
  default: { render: () => h('div', 'Tooltip') }
}))
vi.mock('@/components/battle/MoveTooltip.vue', () => ({
  default: { render: () => h('div', 'MoveTooltip') }
}))

describe('Battle Choice Items UI & Logic Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('disables other moves when a choice move is selected', () => {
    const pokemon = {
      uid: 'p1',
      name: 'Charizard',
      heldItem: 'choicespecs',
      choiceMove: 'Lanzallamas',
      moves: [
        { id: 'flamethrower', name: 'Lanzallamas', pp: 15, maxPP: 15 },
        { id: 'airslash', name: 'Tajo Aéreo', pp: 15, maxPP: 15 }
      ]
    } as unknown as Pokemon

    // Mount Lanzallamas slot
    const wrapperFlamethrower = mount(BattleMoveSlot, {
      props: {
        move: pokemon.moves[0] as Move,
        index: 0,
        playerInfo: pokemon
      }
    })

    // Mount Tajo Aéreo slot
    const wrapperAirSlash = mount(BattleMoveSlot, {
      props: {
        move: pokemon.moves[1] as Move,
        index: 1,
        playerInfo: pokemon
      }
    })

    // Lanzallamas (the selected choiceMove) should NOT be disabled
    expect(wrapperFlamethrower.classes()).not.toContain('is-disabled')

    // Tajo Aéreo (another move) should be disabled
    expect(wrapperAirSlash.classes()).toContain('is-disabled')
    expect(wrapperAirSlash.find('button').attributes('disabled')).toBeDefined()
  })

  it('resets choiceMove restriction when clearVolatileStatus is called (e.g. on switch out)', () => {
    const pokemon = {
      uid: 'p1',
      name: 'Charizard',
      heldItem: 'choicespecs',
      choiceMove: 'Lanzallamas'
    } as unknown as Pokemon & { choiceMove?: string }

    clearVolatileStatus(pokemon)

    expect(pokemon.choiceMove).toBeUndefined()
  })
})
