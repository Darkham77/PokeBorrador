import { describe, it, expect } from 'vitest'
import { getNpcEncounterChances } from '@/logic/encounters/npcEncounterChances'
import type { EncounterState } from '@/types/pokemon/encounters'

describe('npcEncounterChances', () => {
  const dummyState: EncounterState = {
    playerClass: 'entrenador',
    classLevel: 5,
    trainerChance: 0.1,
    repelSecs: 0,
    faction: null,
    gymProgress: {},
  } as unknown as EncounterState

  it('calculates default chances for rival and common trainer', () => {
    const chances = getNpcEncounterChances('route1', dummyState, {}, ['route1', 'route2'])
    expect(chances.length).toBe(4)

    const rival = chances.find(c => c.type === 'rival')
    expect(rival).toBeDefined()
    expect(rival?.active).toBe(true)

    const trainer = chances.find(c => c.type === 'trainer')
    expect(trainer).toBeDefined()
    expect(trainer?.name).toBe('Entrenador Común')
  })

  it('detects police officer for rocket with 100 criminality', () => {
    const rocketState: EncounterState = {
      ...dummyState,
      playerClass: 'rocket',
      classData: { criminality: 100 },
    } as unknown as EncounterState

    const chances = getNpcEncounterChances('route1', rocketState, {}, ['route1', 'route2'])
    const police = chances.find(c => c.type === 'police')
    expect(police).toBeDefined()
    expect(police?.name).toBe('Oficial de Policía')
  })
})
