
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEvolutionStore } from '@/stores/evolution'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) }))
    }))
  }
}))


vi.mock('@/logic/db/sqliteEngine', () => ({
  initSQLite: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', db_version: 2 },
    sessionMode: 'offline'
  })
}))

// Mock de la lógica base para no depender de la DB completa de pokémon
vi.mock('@/logic/evolution/evolutionLogic', () => ({
  evolvePokemonData: vi.fn((pokemon: { id: string; name: string }, targetId: string) => {
    const fromId = pokemon.id;
    pokemon.id = targetId;
    pokemon.name = targetId.toUpperCase();
    return { pendingMoves: [], fromId, toId: targetId };
  }),
  checkLevelUpEvolution: vi.fn(),
  checkStoneEvolution: vi.fn()
}))

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id: string) => ({ id, name: id.toUpperCase() }))
  }
}))

describe('Evolution System', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('debe iniciar la secuencia de evolución correctamente', () => {
    const evoStore = useEvolutionStore()
    const p = { id: 'bulbasaur', name: 'Bulba' } as unknown as Pokemon
    
    evoStore.startEvolution(p, 'ivysaur')
    
    expect(evoStore.isEvolving).toBe(true)
    expect(evoStore.sourcePokemon).toStrictEqual(p)
    expect(evoStore.targetId).toBe('ivysaur')
  })

  it('debe transformar al pokémon y registrarlo en la Pokedex', () => {
    const evoStore = useEvolutionStore()
    const gameStore = useGameStore()
    const p = { id: 'bulbasaur', name: 'Bulba' } as unknown as Pokemon
    
    evoStore.startEvolution(p, 'ivysaur')
    evoStore.evolve()
    
    expect(p.id).toBe('ivysaur')
    expect(p.name).toBe('IVYSAUR')
    expect(gameStore.state.pokedex).toContain('ivysaur')
  })

  it('debe limpiar el estado al finalizar', () => {
    const evoStore = useEvolutionStore()
    const p = { id: 'bulbasaur', name: 'Bulba' } as unknown as Pokemon
    
    evoStore.startEvolution(p, 'ivysaur')
    evoStore.finishEvolution()
    
    expect(evoStore.isEvolving).toBe(false)
    expect(evoStore.sourcePokemon).toBeNull()
  })
})
