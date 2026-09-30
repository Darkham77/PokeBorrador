import { describe, it, expect, vi } from 'vitest'
import { buildTrainerTeam } from '@/logic/battle/trainerFactory'

vi.mock('@/logic/evolution/evolutionLogic', () => ({
  getEvolvedForm: vi.fn((id: string) => id),
}))

vi.mock('@/logic/pokemon/pokemonFactory', () => ({
  makePokemon: vi.fn((id: string, lv: number) => ({
    id,
    level: lv,
    name: id.toUpperCase(),
  })),
  recalcPokemonStats: vi.fn(),
  validatePokemon: vi.fn(),
}))

describe('trainerFactory - buildTrainerTeam', () => {
  it('should generate an empty team if size is 0', async () => {
    const team = await buildTrainerTeam(['pidgey'], 10, 0)
    expect(team).toEqual([])
  })

  it('should generate a team of specified size and level', async () => {
    const team = await buildTrainerTeam(['pidgey', 'rattata'], 15, 3)
    expect(team.length).toBe(3)
    expect(team[0]?.level).toBe(15)
    expect(team[0]?.id).toBeDefined()
    interface ExtendedPokemon {
      _revealed?: boolean;
    }
    expect((team[0] as unknown as ExtendedPokemon)._revealed).toBe(true)
  })

  it('should generate a team where all members have the specified level', async () => {
    const team = await buildTrainerTeam(['pidgey'], 25, 4)
    expect(team.length).toBe(4)
    for (const mon of team) {
      expect(mon.level).toBe(25)
      expect(mon.id).toBe('pidgey')
    }
  })

  it('should select members strictly from the provided species pool', async () => {
    const allowedPool = ['pidgey', 'rattata'] as const
    const team = await buildTrainerTeam(allowedPool, 5, 5)
    expect(team.length).toBe(5)
    for (const mon of team) {
      expect(allowedPool).toContain(mon.id)
    }
  })

  it('should handle single pokemon species pool without crash', async () => {
    const team = await buildTrainerTeam(['rattata'] as const, 12, 2)
    expect(team.length).toBe(2)
    expect(team[0]?.id).toBe('rattata')
    expect(team[1]?.id).toBe('rattata')
  })
})


