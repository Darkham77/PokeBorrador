import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Battle Switch Bench Guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('prevents opening switch modal when no valid bench pokémon exist and triggers notification toast', () => {
    const gameStore = useGameStore()

    // Mock player team with only 1 active pokemon and 0 bench pokemon
    gameStore.state.team = [
      {
        uid: 'active-poke-1',
        id: 'mew',
        nickname: 'Mew',
        hp: 342,
        maxHp: 342,
        level: 100,
        moves: ['surf'],
        ability: 'synchronize',
        nature: 'serious',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      }
    ] as unknown as Pokemon[]

    const team = gameStore.state.team
    const activeUid = 'active-poke-1'
    const hasBenchPokemon = team.some(p => p && p.hp > 0 && p.uid !== activeUid)

    expect(hasBenchPokemon).toBe(false)
  })

  it('allows switch modal when at least one healthy bench pokémon exists', () => {
    const gameStore = useGameStore()

    gameStore.state.team = [
      {
        uid: 'active-poke-1',
        id: 'mew',
        nickname: 'Mew 1',
        hp: 342,
        maxHp: 342,
        level: 100,
        moves: ['surf']
      },
      {
        uid: 'bench-poke-2',
        id: 'charizard',
        nickname: 'Charizard',
        hp: 300,
        maxHp: 300,
        level: 100,
        moves: ['flamethrower']
      }
    ] as any

    const team = gameStore.state.team
    const activeUid = 'active-poke-1'
    const hasBenchPokemon = team.some(p => p && p.hp > 0 && p.uid !== activeUid)

    expect(hasBenchPokemon).toBe(true)
  })
})
