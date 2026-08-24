import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleCombatantState } from '@/components/battle/useBattleCombatantState'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import type { BattleCombatantProps } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('useBattleCombatantState helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('correctly calculates dynamic ball target coordinates for grounded player pokemon', () => {
    const mockPokemon: Pokemon = {
      id: 'pikachu',
      uid: 'p1_pikachu_001',
      name: 'Pikachu',
      level: 50,
      hp: 100,
      maxHp: 100,
      status: null
    } as any

    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: mockPokemon,
      position: { x: 100, y: 200 },
      baseSize: WORLD_CONSTANTS.BASE_ENTITY_SIZE_PLAYER,
      groundY: '75%',
      animState: 'releasing',
      hasSeat: true
    }

    const spriteRef = ref<HTMLElement | null>(null)
    const emit = () => {}

    const state = useBattleCombatantState(props, emit, spriteRef)

    expect(state.cacheKey.value).toBe('player-100-200-p1_pikachu_001')
    expect(state.isFloating.value).toBe(false)

    const coords = state.getBallTargetCoords()
    expect(coords.x).toBe(0)
    const expectedY = -WORLD_CONSTANTS.POKEBALL_SIZE_PLAYER * 0.35
    expect(coords.y).toBeCloseTo(expectedY, 2)
  })

  it('correctly calculates dynamic ball target coordinates with floatOffset for floating species', () => {
    const mockFlyingPokemon: Pokemon = {
      id: 'butterfree',
      uid: 'enemy_butterfree_002',
      name: 'Butterfree',
      level: 50,
      hp: 100,
      maxHp: 100,
      status: null
    } as any

    const props: BattleCombatantProps = {
      side: 'enemy',
      pokemon: mockFlyingPokemon,
      position: { x: 500, y: 300 },
      baseSize: WORLD_CONSTANTS.BASE_ENTITY_SIZE_ENEMY,
      groundY: '75%',
      animState: 'releasing',
      hasSeat: true
    }

    const spriteRef = ref<HTMLElement | null>(null)
    const emit = () => {}

    const state = useBattleCombatantState(props, emit, spriteRef)

    expect(state.cacheKey.value).toBe('enemy-500-300-enemy_butterfree_002')
    expect(state.isFloating.value).toBe(true)

    const coords = state.getBallTargetCoords()
    expect(coords.x).toBe(0)
    const expectedY = -WORLD_CONSTANTS.POKEBALL_SIZE_ENEMY * 0.35
    expect(coords.y).toBeCloseTo(expectedY, 2)
  })

  it('isolates cacheKey between seats in 2v2 battles even with identical pokemon species', () => {
    const pokemonA: Pokemon = { id: 'pikachu', uid: 'uid_seat1', name: 'Pikachu' } as any
    const pokemonB: Pokemon = { id: 'pikachu', uid: 'uid_seat3', name: 'Pikachu' } as any

    const spriteRef = ref<HTMLElement | null>(null)
    const emit = () => {}

    const stateSeat1 = useBattleCombatantState({
      side: 'player',
      pokemon: pokemonA,
      position: { x: 100, y: 200 },
      baseSize: 300
    } as any, emit, spriteRef)

    const stateSeat3 = useBattleCombatantState({
      side: 'ally',
      pokemon: pokemonB,
      position: { x: 150, y: 250 },
      baseSize: 300
    } as any, emit, spriteRef)

    expect(stateSeat1.cacheKey.value).toBe('player-100-200-uid_seat1')
    expect(stateSeat3.cacheKey.value).toBe('ally-150-250-uid_seat3')
    expect(stateSeat1.cacheKey.value).not.toBe(stateSeat3.cacheKey.value)
  })
})
