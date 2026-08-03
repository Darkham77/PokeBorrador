import { describe, expect, it } from 'vitest'
import { pokemonDataProvider } from '../../../src/logic/providers/pokemonDataProvider.ts'

describe('pokemonDataProvider in the Node fuzzer runtime', () => {
  it('resolves a form-change species without relying on Vite import.meta.env', () => {
    Reflect.set(globalThis, '__E2E__', true)
    expect(() => pokemonDataProvider.getPokemonData('eiscue')).not.toThrow()
  })
})
