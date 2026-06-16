import { describe, it, expect, vi } from 'vitest'
import { buildTrainerTeam } from '@/logic/battle/trainerFactory'

vi.mock('@/logic/evolution/evolutionLogic', () => ({
  getEvolvedForm: vi.fn((id) => id),
}))

vi.mock('@/logic/pokemon/pokemonFactory', () => ({
  makePokemon: vi.fn((id, lv) => ({
    id,
    level: lv,
    name: id.toUpperCase(),
  })),
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
})
