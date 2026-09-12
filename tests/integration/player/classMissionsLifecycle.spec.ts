/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

let simulatedServerTime = 1700000000000

vi.mock('@/logic/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { db_version: 2 }, error: null })),
          order: vi.fn(() => ({ single: vi.fn() }))
        }))
      }))
    })),
    getServerTime: vi.fn(() => Promise.resolve(simulatedServerTime))
  }
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', db_version: 2 },
    sessionMode: 'offline'
  })
}))

vi.mock('@/logic/auth/saveService', () => ({
  saveGame: vi.fn(() => Promise.resolve({ success: true }))
}))

describe('Class Missions Lifecycle Integration (All 4 Classes)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    simulatedServerTime = 1700000000000
  })

  it('1. Rocket: Sacrifices poison pokemon, deducts no upfront money, awards modernized bounty + nugget, increments criminality and class XP', async () => {
    const gameStore = useGameStore()
    const classStore = usePlayerClassStore()

    gameStore.state.playerClass = 'rocket'
    gameStore.state.classLevel = 1
    gameStore.state.trainerLevel = 10
    gameStore.state.money = 5000
    gameStore.state.badges = 4

    // Create an Ekans (Poison type)
    const ekans = makePokemon('ekans', 15) as Pokemon
    ekans.heldItem = 'cheriberry'
    gameStore.state.box = [ekans]

    // Start 6h mission
    await classStore.startMission('mission_6h', { targetPokemonUid: ekans.uid, targetPokemonIdx: 0 })

    expect(gameStore.state.money).toBe(5000) // No upfront money cost for Rocket
    expect(classStore.activeMission).not.toBeNull()
    expect(classStore.activeMission?.projectedReward).toBeGreaterThanOrEqual(15000)
    expect(ekans.onMission).toBe(true)

    // Fast-forward time past mission completion
    simulatedServerTime += (6 * 3600 * 1000) + 1000
    expect(classStore.isMissionDone).toBe(true)

    // Collect mission
    await classStore.collectMission()

    // Ekans sacrificed (removed from box), but heldItem returned to inventory
    expect(gameStore.state.box.find(p => p && p.uid === ekans.uid)).toBeUndefined()
    expect(gameStore.state.inventory?.cheriberry).toBe(1)

    // Money received should be >= 15,000 + 5,000 base
    expect(gameStore.state.money).toBeGreaterThanOrEqual(20000)
    // Nugget received
    expect(gameStore.state.inventory?.nugget).toBe(1)
    // Criminality and XP gained
    expect(gameStore.state.classData?.criminality).toBe(5)
    expect(gameStore.state.classXP).toBe(50)
    expect(classStore.activeMission).toBeNull()
  })

  it('2. Cazabichos: Generates Bug-type pokemon into box with IV floors and drops Netballs', async () => {
    const gameStore = useGameStore()
    const classStore = usePlayerClassStore()

    gameStore.state.playerClass = 'cazabichos'
    gameStore.state.classLevel = 1
    gameStore.state.trainerLevel = 10
    gameStore.state.money = 10000
    gameStore.state.box = []
    gameStore.state.badges = 8

    // Start 6h expedition (costs 5,000 money)
    await classStore.startMission('mission_6h')

    expect(classStore.activeMission).not.toBeNull()
    expect(gameStore.state.money).toBe(5000) // 5,000 money cost deducted

    // Fast-forward time past 6h
    simulatedServerTime += (6 * 3600 * 1000) + 1000

    await classStore.collectMission()

    // 3 Bug Pokémon added to box
    expect(gameStore.state.box.length).toBe(3)
    for (const p of gameStore.state.box) {
      if (!p) continue
      expect(['bug']).toContain(p.type === 'bug' || p.type2 === 'bug' ? 'bug' : 'other')
      // IV floor check (min 5 for 6h mission)
      if (p.ivs) {
        expect(p.ivs.hp).toBeGreaterThanOrEqual(5)
        expect(p.ivs.atk).toBeGreaterThanOrEqual(5)
      }
    }

    // 3 Net Balls dropped
    expect(gameStore.state.inventory?.netball).toBe(3)
    expect(gameStore.state.classXP).toBe(50)
    expect(classStore.activeMission).toBeNull()
  })

  it('3. Entrenador: Deducts money cost, awards Battle Coins, and levels up participating Pokémon', async () => {
    const gameStore = useGameStore()
    const classStore = usePlayerClassStore()

    gameStore.state.playerClass = 'entrenador'
    gameStore.state.classLevel = 1
    gameStore.state.trainerLevel = 10
    gameStore.state.money = 10000
    gameStore.state.battleCoins = 50

    const pikachu = makePokemon('pikachu', 20) as Pokemon
    pikachu.exp = 0
    gameStore.state.box = [pikachu]

    // Start 6h mission (costs 5,000 money)
    await classStore.startMission('mission_6h', { targetPokemonUid: pikachu.uid, targetPokemonIdx: 0 })

    expect(gameStore.state.money).toBe(5000)
    expect(pikachu.onMission).toBe(true)

    // Fast-forward time
    simulatedServerTime += (6 * 3600 * 1000) + 1000

    await classStore.collectMission()

    // Pikachu gained EXP / levels
    expect(pikachu.level).toBeGreaterThanOrEqual(21)
    expect(pikachu.onMission).toBe(false)

    // 50 BC awarded
    expect(gameStore.state.battleCoins).toBe(100)
    expect(gameStore.state.classXP).toBe(50)
    expect(classStore.activeMission).toBeNull()
  })

  it('4. Criador: Enhances genetic IVs, consumes vigor, grants breeding items, and applies hatch step reduction', async () => {
    const gameStore = useGameStore()
    const classStore = usePlayerClassStore()
    const breedingStore = useBreedingStore()

    gameStore.state.playerClass = 'criador'
    gameStore.state.classLevel = 1
    gameStore.state.trainerLevel = 10
    gameStore.state.battleCoins = 500

    const squirtle = makePokemon('squirtle', 10) as Pokemon
    squirtle.vigor = 30
    squirtle.ivs = { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
    gameStore.state.box = [squirtle]

    // Start 6h mission (costs 300 Battle Coins)
    await classStore.startMission('mission_6h', { targetPokemonUid: squirtle.uid, targetPokemonIdx: 0 })

    expect(gameStore.state.battleCoins).toBe(200)

    // Fast-forward time
    simulatedServerTime += (6 * 3600 * 1000) + 1000

    await classStore.collectMission()

    // Everstone awarded
    expect(gameStore.state.inventory?.everstone).toBe(1)
    // Vigor consumed (5 points for 6h)
    expect(squirtle.vigor).toBe(25)
    // Total IVs increased by 1 point
    const totalIvs = Object.values(squirtle.ivs).reduce((a, b) => a + b, 0)
    expect(totalIvs).toBe(61)

    // Verify Criador 25% hatch step reduction in breedingStore
    gameStore.state.eggs = [{
      id: 'egg-test',
      species: 'charmander',
      steps: 100,
      totalSteps: 100,
      ready: false
    }] as unknown as typeof gameStore.state.eggs

    // Base reduction for 'battle' is 2 steps.
    // For Criador: 2 * (1 / (1 - 0.25)) = 2 * 1.33333... = 2.6666...
    breedingStore.reduceHatchTimers('battle')
    expect(gameStore.state.eggs?.[0]?.steps).toBeCloseTo(100 - (2 * (1 / 0.75)), 1)
  })
})
