import { describe, it, expect } from 'vitest'
import { cleanCapturedPokemonForStorage } from '@/logic/battle/battleCatchProcessor'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('battleCatchProcessor', () => {
  it('cleans volatile flags and initializes capture metadata on caught pokemon', () => {
    const rawEnemy = makePokemon('rattata', 10, { bypassWhitelist: true }) as Pokemon
    rawEnemy.hp = 15
    rawEnemy.status = 'psn'
    rawEnemy.volatileCounters = { confusion: 2 }
    rawEnemy.furyCutterCount = 3

    const cleaned = cleanCapturedPokemonForStorage(rawEnemy, null, 'pokeball')

    expect(cleaned.caught).toBe(true)
    expect(cleaned.obtainedMethod).toBe('wild')
    expect(cleaned.volatileCounters).toEqual({})
    expect(cleaned.furyCutterCount).toBe(0)
    expect(cleaned.tags).toContain('ball:pokeball')
    expect(cleaned.status).toBe('psn')
  })

  it('reverts Castform to normal form on capture', () => {
    const castformEnemy = makePokemon('castform', 25, { bypassWhitelist: true }) as Pokemon
    castformEnemy.form = 'sunny'
    castformEnemy.type = 'fire'

    const cleaned = cleanCapturedPokemonForStorage(castformEnemy, null, 'ultraball')

    expect(cleaned.form).toBe('normal')
    expect(cleaned.type).toBe('normal')
    expect(cleaned.tags).toContain('ball:ultraball')
  })

  it('correctly uses initialEnemy snapshot from _initialEnemies in 2v2 wild battles', () => {
    const enemy1 = makePokemon('rattata', 10, { bypassWhitelist: true }) as Pokemon
    const enemy2 = makePokemon('pidgey', 12, { bypassWhitelist: true }) as Pokemon
    enemy1.uid = 'wild-seat-2'
    enemy2.uid = 'wild-seat-4'

    const initialEnemy1 = structuredClone(enemy1)
    const initialEnemy2 = structuredClone(enemy2)

    // Simulate in-combat mutations on enemy2 (e.g. hp dropped, volatile counters)
    const activeEnemy2 = structuredClone(enemy2)
    activeEnemy2.hp = Math.round(activeEnemy2.maxHp * 0.5)
    activeEnemy2.volatileCounters = { confusion: 1 }

    const battleState = {
      _initialEnemy: initialEnemy1,
      _initialEnemies: {
        [enemy1.uid]: initialEnemy1,
        [enemy2.uid]: initialEnemy2
      }
    }

    const resolvedInitial = (activeEnemy2.uid && battleState._initialEnemies?.[activeEnemy2.uid]) || battleState._initialEnemy
    expect(resolvedInitial.id).toBe('pidgey')
    expect(resolvedInitial.uid).toBe('wild-seat-4')

    const cleaned = cleanCapturedPokemonForStorage(activeEnemy2, resolvedInitial, 'greatball')
    expect(cleaned.id).toBe('pidgey')
    expect(cleaned.hp).toBe(activeEnemy2.hp)
    expect(cleaned.volatileCounters).toEqual({})
    expect(cleaned.caught).toBe(true)
  })
})
