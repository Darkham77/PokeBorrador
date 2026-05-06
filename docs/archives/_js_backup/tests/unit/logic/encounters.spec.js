import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateEncounter } from '@/logic/encounters'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { makePokemon } from '@/logic/pokemonFactory'
import { isDisputePhase } from '@/logic/war/warEngine'

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMaps: vi.fn(() => [
      { id: 'route1', wild: { day: ['pidgey'] }, lv: [2, 5], rates: [100] }
    ]),
    getPokemonData: vi.fn(() => ({ type: 'normal' }))
  }
}))

vi.mock('@/logic/pokemonFactory', () => ({
  makePokemon: vi.fn((id, lv) => ({ id, lv, name: id }))
}))

vi.mock('@/logic/war/warEngine', () => ({
  isDisputePhase: vi.fn(() => false)
}))

vi.mock('@/logic/war/guardianEngine', () => ({
  getGuardianData: vi.fn(() => null),
  GUARDIAN_CHANCE: 0.1
}))

vi.mock('@/logic/war/bonusEngine', () => ({
  applyEncounterBonuses: vi.fn(p => p)
}))

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({ activeEvents: [] }))
}))

vi.mock('@/logic/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day')
}))

describe('encounters.js', () => {
  const mockState = {
    faction: 'red',
    team: [{ level: 10 }],
    repelSecs: 0,
    trainerChance: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // Default to something not triggering 20% chances
  })

  it('should respect forceEncounter and bypass repellent', async () => {
    const stateWithRepel = { ...mockState, repelSecs: 100 }
    // Normally repellent would prevent low level wild encounters (0.5 > 0.1 ratio)
    // But with forceEncounter, we skip the repellent block
    const options = { forceEncounter: true }
    
    const result = await generateEncounter('route1', stateWithRepel, options)
    
    expect(result.type).toBe('wild')
    expect(result.pokemon.id).toBe('pidgey')
  })

  it('should respect forceEncounter and bypass trainer chance', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // Would trigger trainer if chance > 1%
    const stateWithTrainer = { ...mockState, trainerChance: 5 }
    const options = { forceEncounter: true }
    
    const result = await generateEncounter('route1', stateWithTrainer, options)
    
    expect(result.type).toBe('wild') // Should be wild because forceEncounter skips trainer check
  })
})
