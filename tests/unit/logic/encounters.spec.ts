import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateEncounter } from '@/logic/encounters'

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMaps: vi.fn(() => [
      { id: 'route1', wild: { day: ['pidgey'] }, lv: [2, 5], rates: [100] }
    ]),
    getPokemonData: vi.fn(() => ({ type: 'normal' }))
  }
}));

vi.mock('@/logic/pokemonFactory', () => ({
  makePokemon: vi.fn((id, lv) => ({ id, lv, name: id }))
}));

vi.mock('@/logic/war/warEngine', () => ({
  isDisputePhase: vi.fn(() => false)
}));

vi.mock('@/logic/war/guardianEngine', () => ({
  getGuardianData: vi.fn(() => null),
  GUARDIAN_CHANCE: 0.1
}));

vi.mock('@/logic/war/bonusEngine', () => ({
  applyEncounterBonuses: vi.fn(p => p)
}));

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({ 
    activeEvents: [],
    getSpeciesBonuses: vi.fn()
  }))
}));

vi.mock('@/logic/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day')
}));

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
    
    const result = await generateEncounter('route1', stateWithRepel as unknown as Parameters<typeof generateEncounter>[1], options)
    
    expect(result!.type).toBe('wild')
    expect(result!.pokemon!.id).toBe('pidgey')
  })

  it('should respect forceEncounter and bypass trainer chance', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // Would trigger trainer if chance > 1%
    const stateWithTrainer = { ...mockState, trainerChance: 5 }
    const options = { forceEncounter: true }
    
    const result = await generateEncounter('route1', stateWithTrainer as unknown as Parameters<typeof generateEncounter>[1], options)
    
    expect(result!.type).toBe('wild') // Should be wild because forceEncounter skips trainer check
  })

  it('should not block exclusive weather spawns by type-based weather multipliers', async () => {
    const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')
    ;(pokemonDataProvider.getMaps as any).mockReturnValueOnce([
      {
        id: 'route24',
        wild: { day: ['pidgey'] },
        rates: { day: [100] },
        lv: [12, 16],
        weather: {
          storm: { exclusive: ['zapdos'] }
        }
      } as any
    ])
    ;(pokemonDataProvider.getPokemonData as any).mockImplementation((id: string) => {
      if (id === 'zapdos') return { type: 'electric', type2: 'flying', hp: 90, atk: 90, def: 85, spa: 125, spd: 90, spe: 100 } as any
      return { type: 'flying', hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 } as any
    })

    const result = await generateEncounter(
      'route24',
      mockState as any,
      { forceEncounter: true, weather: 'storm' }
    )
    expect(result).toBeDefined()
    expect(result!.type).toBe('wild')
    expect(result!.pokemon!.id).toBe('zapdos')
  })
})
