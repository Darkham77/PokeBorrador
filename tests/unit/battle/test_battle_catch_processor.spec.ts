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
})
