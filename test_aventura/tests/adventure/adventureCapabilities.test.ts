import { describe, it, beforeEach } from 'vitest'
import assert from 'node:assert/strict'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../../../src/stores/game.ts'
import { useAdventureCapabilities } from '../../../src/components/map/adventure/useAdventureCapabilities.ts'
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts'
import type { MapNode } from '../../../src/components/map/adventure/adventureMapData.ts'
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts'
import { requirePokemonMoveId } from '../../../src/data/battle/moves.ts'

function createMockPokemon(moves: string[], speciesName = 'squirtle'): Pokemon {
  const species = requirePokemonSpeciesId(speciesName)
  return {
    uid: 'mock-uid-1',
    id: species,
    name: speciesName,
    species,
    level: 25,
    exp: 100,
    expNeeded: 200,
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    type: 'water',
    status: '',
    isShiny: false,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    nature: 'hardy',
    moves: moves.map(m => ({
      id: requirePokemonMoveId(m),
      name: m,
      pp: 15,
      maxPP: 15
    }))
  }
}

describe('useAdventureCapabilities', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('detects Surf only when a Pokemon knows surf AND badges >= 5', () => {
    const gameStore = useGameStore()
    gameStore.state.team = [createMockPokemon(['tackle', 'watergun'])]
    gameStore.state.badges = 0

    const { hasSurf, checkNodePass } = useAdventureCapabilities()
    assert.strictEqual(hasSurf.value, false)

    const waterNode: MapNode = {
      name: 'Ruta 19',
      type: 'route_water',
      x: 800,
      y: 1550,
      hasCenter: false,
      requiresMO: 'Surf',
      blockMsg: 'El agua es profunda. Necesitas MO Surf.',
      farm: { t: 0, w: 0, m: 0, f: 0 }
    }

    // Blocked with 0 badges and no move
    assert.strictEqual(checkNodePass(waterNode).canPass, false)

    // Has move but only 4 badges -> still blocked
    gameStore.state.team = [createMockPokemon(['surf'])]
    gameStore.state.badges = 4
    assert.strictEqual(hasSurf.value, false)
    assert.strictEqual(checkNodePass(waterNode).canPass, false)

    // Has move and 5 badges -> unlocked
    gameStore.state.badges = 5
    assert.strictEqual(hasSurf.value, true)
    assert.strictEqual(checkNodePass(waterNode).canPass, true)
  })

  it('detects Cut only when a Pokemon knows cut AND badges >= 2', () => {
    const gameStore = useGameStore()
    gameStore.state.team = [createMockPokemon(['cut'])]
    gameStore.state.badges = 1

    const { hasCut } = useAdventureCapabilities()
    assert.strictEqual(hasCut.value, false)

    gameStore.state.badges = 2
    assert.strictEqual(hasCut.value, true)
  })

  it('detects follower Pokemon from the first team member', () => {
    const gameStore = useGameStore()
    gameStore.state.team = [createMockPokemon(['tackle'], 'pikachu')]

    const { followerSpeciesId } = useAdventureCapabilities()
    assert.strictEqual(followerSpeciesId.value, 'pikachu')
  })
})
