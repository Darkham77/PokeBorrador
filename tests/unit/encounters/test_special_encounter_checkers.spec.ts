import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  checkDebugForcedEncounter,
  checkRivalSpecialEncounter,
  checkDefenderSpecialEncounter,
} from '@/logic/encounters/specialEncounterCheckers'
import * as warEngine from '@/logic/war/warEngine'
import type { EncounterState } from '@/types/pokemon/encounters'

describe('specialEncounterCheckers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const dummyState: EncounterState = {
    playerClass: 'entrenador',
    classLevel: 5,
    trainerChance: 0.1,
    repelSecs: 0,
    faction: 'poder',
    gymProgress: {},
  } as unknown as EncounterState

  it('returns debug forced encounter when forceEncounterType is set', () => {
    const enc = checkDebugForcedEncounter({ forceEncounterType: 'trainer' })
    expect(enc).toEqual({ type: 'trainer' })
  })

  it('returns rival encounter when forceRival is true', () => {
    const enc = checkDebugForcedEncounter({ forceRival: true })
    expect(enc).toEqual({ type: 'rival' })
  })

  it('evaluates rival special encounter with rate override 100%', () => {
    const enc = checkRivalSpecialEncounter({ rivalChancePct: 100 }, dummyState, {})
    expect(enc).toEqual({ type: 'rival' })
  })

  it('ignores special encounters when options.forceEncounter is true', () => {
    const enc = checkRivalSpecialEncounter({ rivalChancePct: 100 }, dummyState, { forceEncounter: true })
    expect(enc).toBeNull()
  })

  it('evaluates defender special encounter when defender override is set during dominance phase', () => {
    vi.spyOn(warEngine, 'isDisputePhase').mockReturnValue(false)

    const enc = checkDefenderSpecialEncounter(
      { defenderChancePct: 100 },
      'route1',
      dummyState,
      { dominanceData: { route1: { winner: 'union' } } }
    )
    expect(enc).toEqual({ type: 'defender', faction: 'union' })
  })
})
