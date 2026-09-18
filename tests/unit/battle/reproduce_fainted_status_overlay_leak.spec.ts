// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BattleCombatantStatusOverlay from '@/components/battle/BattleCombatantStatusOverlay.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

function createMockPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    id: 'charizard',
    uid: 'poke-charizard-1',
    name: 'Charizard',
    level: 50,
    hp: 150,
    maxHp: 150,
    status: 'brn',
    isShiny: false,
    isGuardian: false,
    types: ['fire', 'flying'],
    moves: [],
    baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    stats: { hp: 150, atk: 100, def: 95, spa: 125, spd: 100, spe: 115 },
    ...overrides
  } as unknown as Pokemon
}

describe('BattleCombatantStatusOverlay Fainted & Transition Leak (RED Reproduction)', () => {
  setActivePinia(createPinia())

  it('should keep status overlay visible while wild defeat animation is in progress (hp: 0, isFainting: true)', () => {
    const faintedPokemon = createMockPokemon({ hp: 0, status: 'brn' })
    const wrapper = mount(BattleCombatantStatusOverlay, {
      props: {
        pokemon: faintedPokemon,
        side: 'enemy',
        baseSize: 100,
        position: { x: 0, y: 0 },
        isFainting: true
      },
      global: {
        provide: {
          virtualSpace: {
            worldWidth: 3000,
            worldHeight: 3000,
            virtualScale: 1
          }
        }
      }
    })

    // Status FX must stay visible during defeat sinking animation
    expect(wrapper.find('.combatant-status-overlay').exists()).toBe(true)
  })

  it('should keep status overlay visible while trainer defeat animation is in progress (hp: 0, animState: "catching")', () => {
    const faintedPokemon = createMockPokemon({ hp: 0, status: 'brn' })
    const wrapper = mount(BattleCombatantStatusOverlay, {
      props: {
        pokemon: faintedPokemon,
        side: 'enemy',
        baseSize: 100,
        position: { x: 0, y: 0 },
        animState: 'catching'
      },
      global: {
        provide: {
          virtualSpace: {
            worldWidth: 3000,
            worldHeight: 3000,
            virtualScale: 1
          }
        }
      }
    })

    // Status FX must stay visible while Pokémon is being pulled into the Pokéball
    expect(wrapper.find('.combatant-status-overlay').exists()).toBe(true)
  })

  it('should hide status overlay once defeat animation finishes in trainer combat (hp: 0, animState: "trapped")', () => {
    const faintedPokemon = createMockPokemon({ hp: 0, status: 'brn' })
    const wrapper = mount(BattleCombatantStatusOverlay, {
      props: {
        pokemon: faintedPokemon,
        side: 'enemy',
        baseSize: 100,
        position: { x: 0, y: 0 },
        animState: 'trapped'
      },
      global: {
        provide: {
          virtualSpace: {
            worldWidth: 3000,
            worldHeight: 3000,
            virtualScale: 1
          }
        }
      }
    })

    // Once trapped inside the Pokéball, status overlay must be hidden
    expect(wrapper.find('.combatant-status-overlay').exists()).toBe(false)
  })

  it('should hide status overlay once defeat animation has ended (hp: 0, isFainting: false, animState: null)', () => {
    const faintedPokemon = createMockPokemon({ hp: 0, status: 'brn' })
    const wrapper = mount(BattleCombatantStatusOverlay, {
      props: {
        pokemon: faintedPokemon,
        side: 'enemy',
        baseSize: 100,
        position: { x: 0, y: 0 },
        isFainting: false,
        animState: null
      },
      global: {
        provide: {
          virtualSpace: {
            worldWidth: 3000,
            worldHeight: 3000,
            virtualScale: 1
          }
        }
      }
    })

    // Defeated Pokémon without active defeat animation must NOT render status overlay (prevents leak)
    expect(wrapper.find('.combatant-status-overlay').exists()).toBe(false)
  })

  it('should hide status overlay during send-out release animation (animState: "releasing")', () => {
    const emergingPokemon = createMockPokemon({ hp: 100, status: 'brn' })
    const wrapper = mount(BattleCombatantStatusOverlay, {
      props: {
        pokemon: emergingPokemon,
        side: 'enemy',
        baseSize: 100,
        position: { x: 0, y: 0 },
        animState: 'releasing'
      },
      global: {
        provide: {
          virtualSpace: {
            worldWidth: 3000,
            worldHeight: 3000,
            virtualScale: 1
          }
        }
      }
    })

    expect(wrapper.find('.combatant-status-overlay').exists()).toBe(false)
  })

  it('should render status overlay when Pokémon is healthy and on the field', () => {
    const healthyPokemon = createMockPokemon({ hp: 100, status: 'brn' })
    const wrapper = mount(BattleCombatantStatusOverlay, {
      props: {
        pokemon: healthyPokemon,
        side: 'enemy',
        baseSize: 100,
        position: { x: 0, y: 0 },
        animState: null
      },
      global: {
        provide: {
          virtualSpace: {
            worldWidth: 3000,
            worldHeight: 3000,
            virtualScale: 1
          }
        }
      }
    })

    expect(wrapper.find('.combatant-status-overlay').exists()).toBe(true)
  })
})
