// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { TRAINER_RANKS } from '@/data/trainer'

describe('Trainer Leveling System', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Mock UI notification
    const uiStore = useUIStore()
    uiStore.notify = vi.fn()
  })

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
    
    const expToLevel2 = TRAINER_RANKS[0].expNeeded // 100
    gameStore.addTrainerExp(expToLevel2)
    
    expect(gameStore.state.trainerLevel).toBe(2)
    expect(gameStore.state.trainerExp).toBe(0)
    expect(uiStore.notify).toHaveBeenCalledWith(expect.stringContaining('Principiante'), '⭐')
  })

  it('handles multiple level ups at once', () => {
    const gameStore = useGameStore()
    // Level 1: 100, Level 2: 250 -> Total 350 to reach level 3
    gameStore.addTrainerExp(400)
    
    expect(gameStore.state.trainerLevel).toBe(3)
    expect(gameStore.state.trainerExp).toBe(50) // 400 - 100 - 250
  })

  it('does not exceed max level 30', () => {
    const gameStore = useGameStore()
    gameStore.state.trainerLevel = 29
    gameStore.state.trainerExp = 0
    
    // 29 -> 30: 151500 exp (based on trainer.js)
    gameStore.addTrainerExp(200000)
    
    expect(gameStore.state.trainerLevel).toBe(30)
    // Exp stays because it's the last level
    expect(gameStore.state.trainerExp).toBeGreaterThan(0)
    
    // Try to add more
    const currentExp = gameStore.state.trainerExp
    gameStore.addTrainerExp(1000)
    expect(gameStore.state.trainerLevel).toBe(30)
    expect(gameStore.state.trainerExp).toBe(currentExp + 1000)
  })
})
