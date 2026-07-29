/**
 * tests/unit/world/guardian_lockout.spec.ts
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWarStore } from '@/stores/war'
import { checkSpecialEncounters } from '@/logic/encounters/encounterHelpers'
import { getNpcEncounterChances } from '@/logic/weather/weatherUtils'
import { requireISODateKey } from '@/types/system/game'

// Mock dependencies
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMaps: vi.fn(() => [
      { id: 'route1', wild: { day: ['pidgey'] }, lv: [2, 5], rates: [100] }
    ]),
    getPokemonData: vi.fn(() => ({ type: 'normal', name: 'Pidgey' }))
  }
}));

vi.mock('@/logic/pokemon/pokemonFactory', () => ({
  makePokemon: vi.fn((id, lv) => ({ id, lv, name: id }))
}));

vi.mock('@/logic/war/guardianEngine', () => ({
  getGuardianData: vi.fn((mapId) => {
    if (mapId === 'route1') return { id: 'zapdos', lv: 50, pts: 150 };
    return null;
  }),
  GUARDIAN_CHANCE: 0.1
}));

vi.mock('@/logic/war/bonusEngine', () => ({
  applyEncounterBonuses: vi.fn(p => p)
}));

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({ 
    activeEvents: []
  }))
}));

vi.mock('@/logic/utils/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day'),
  normalizeZonedDateTime: vi.fn(() => Temporal.Now.zonedDateTimeISO())
}));

describe('Guardian Lockout System Integrity', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize empty guardianCaptures', () => {
    const gameStore = useGameStore()
    expect(gameStore.state.guardianCaptures).toEqual({})
    expect(gameStore.dailyGuardianCaptures).toEqual([])
  })

  it('should lockout guardian locally when claimGuardian is executed', async () => {
    const gameStore = useGameStore()
    const warStore = useWarStore()

    // Mock save method
    gameStore.save = vi.fn().mockResolvedValue(true)

    const today = requireISODateKey(Temporal.Now.plainDateISO().toString())

    await warStore.claimGuardian('route1', false)

    // Lockout registered in GameState
    expect(gameStore.state.guardianCaptures?.route1).toBe(today)

    // Exposed reactively in gameStore.dailyGuardianCaptures
    expect(gameStore.dailyGuardianCaptures).toContain('route1')
  })

  it('should suppress guardian encounters when locked out', async () => {
    const gameStore = useGameStore()
    gameStore.save = vi.fn().mockResolvedValue(true)

    const today = requireISODateKey(Temporal.Now.plainDateISO().toString())
    gameStore.state.guardianCaptures = { route1: today }

    // Check special encounters with lockout
    const res = checkSpecialEncounters('route1', gameStore.state, {}, ['route1'])
    expect(res).toBeNull() // Should be null (blocked)
  })

  it('should suppress guardian in NPC encounter chances when locked out', async () => {
    const gameStore = useGameStore()
    const today = requireISODateKey(Temporal.Now.plainDateISO().toString())
    gameStore.state.guardianCaptures = { route1: today }

    const chances = getNpcEncounterChances('route1', gameStore.state, {}, ['route1'])
    const guardianChance = chances.find(c => c.type === 'guardian')
    expect(guardianChance?.active).toBe(false)
    expect(guardianChance?.chance).toBe(0)
  })

  it('should release the lockout when the date changes', async () => {
    const gameStore = useGameStore()
    
    // Captured yesterday
    gameStore.state.guardianCaptures = { route1: requireISODateKey('2000-01-01') }

    // dailyGuardianCaptures evaluates to empty since it is a different date
    expect(gameStore.dailyGuardianCaptures).not.toContain('route1')

    // Guardian is allowed to appear again
    const chances = getNpcEncounterChances('route1', gameStore.state, {}, ['route1'])
    const guardianChance = chances.find(c => c.type === 'guardian')
    expect(guardianChance?.active).toBe(true)
    expect(guardianChance?.chance).toBeGreaterThan(0)
  })
})
