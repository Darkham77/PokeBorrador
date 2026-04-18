// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { TRAINER_RANKS } from '@/data/trainer'

vi.mock('@/logic/pokemonFactory', () => ({
  makePokemon: vi.fn(),
  levelUpPokemon: vi.fn((p) => {
    p.level++
    p.expNeeded = p.level * 100
    // Simular aprendizaje de ataque en nivel 10
    return p.level === 10 ? [{ name: 'Impactrueno', id: 'thundershock' }] : []
  })
}))

describe('Leveling System (Trainer & Pokémon)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Mock UI notification
    const uiStore = useUIStore()
    uiStore.notify = vi.fn()
    uiStore.addToLearnQueue = vi.fn()
  })

  describe('Trainer Leveling', () => {
    it('starts at level 1 with 0 exp', () => {
      const gameStore = useGameStore()
      expect(gameStore.state.trainerLevel).toBe(1)
      expect(gameStore.state.trainerExp).toBe(0)
    })

    it('accumulates exp correctly', () => {
      const gameStore = useGameStore()
      gameStore.addTrainerExp(50)
      expect(gameStore.state.trainerExp).toBe(50)
      expect(gameStore.state.trainerLevel).toBe(1)
    })

    it('levels up when reaching threshold', () => {
      const gameStore = useGameStore()
      const uiStore = useUIStore()
      
      const expToLevel2 = TRAINER_RANKS[0].expNeeded
      gameStore.addTrainerExp(expToLevel2)
      
      expect(gameStore.state.trainerLevel).toBe(2)
      expect(gameStore.state.trainerExp).toBe(0)
      expect(uiStore.notify).toHaveBeenCalledWith(expect.stringContaining('Nivel 2'), '⭐')
    })
  })

  describe('Pokémon Leveling (checkLevelUp)', () => {
    it('debe subir de nivel al Pokémon cuando tiene suficiente EXP', () => {
      const gameStore = useGameStore()
      const uiStore = useUIStore()
      
      const pokemon = {
        name: 'Pikachu',
        level: 5,
        exp: 1000,
        expNeeded: 500
      }

      gameStore.checkLevelUp(pokemon)

      expect(pokemon.level).toBe(6)
      expect(pokemon.exp).toBe(500)
      expect(uiStore.notify).toHaveBeenCalledWith(expect.stringContaining('subió al nivel 6'), '📈')
    })

    it('debe manejar múltiples niveles y encolar movimientos', () => {
      const gameStore = useGameStore()
      const uiStore = useUIStore()
      
      const pokemon = {
        name: 'Pikachu',
        level: 8,
        exp: 3000,
        expNeeded: 800
      }

      // Nivel 8 -> 9 (800 exp) -> Nivel 9 -> 10 (900 exp) -> Nivel 10 -> 11 (1000 exp)
      gameStore.checkLevelUp(pokemon)

      expect(pokemon.level).toBe(11)
      expect(uiStore.addToLearnQueue).toHaveBeenCalledWith([
        expect.objectContaining({ move: { name: 'Impactrueno', id: 'thundershock' } })
      ])
    })
  })
})
