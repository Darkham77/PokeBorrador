import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  certifyBattleCase,
  requireCertifiedBattleCaseDocument,
} from '../../../scripts/e2e/fuzzer/core/certifiedBattleCase.ts'
import type { TestBatch } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts'

const CERTIFIED_CASES_PATH = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json')

describe('certified fuzzer case integrity', () => {
  it('records ended consistently with the final Showdown state', () => {
    const rawDocument: unknown = JSON.parse(fs.readFileSync(CERTIFIED_CASES_PATH, 'utf8'))
    const document = requireCertifiedBattleCaseDocument(rawDocument, CERTIFIED_CASES_PATH)

    for (const battleCase of document.battle) {
      expect(battleCase.ended, `case ${battleCase.id}`).toBe(battleCase.finalState.isOver)
    }
  })

  it('refuses a non-terminal batch instead of serializing an unreplayable case', () => {
    const incomplete: TestBatch = {
      playerTeam: [],
      enemyTeam: [],
      movesToTest: [],
      abilitiesToTest: [],
      seed: [1, 2, 3, 4],
      playerChoices: [],
      enemyChoices: [],
      history: [],
      ended: false,
    }

    expect(() => certifyBattleCase(incomplete, 1)).toThrow('[FUZZER-CERTIFICATION]')
  })

  it('rejects auxiliary sections in the terminal replay document', () => {
    const rawDocument: unknown = JSON.parse(fs.readFileSync(CERTIFIED_CASES_PATH, 'utf8'))
    const document = requireCertifiedBattleCaseDocument(rawDocument, CERTIFIED_CASES_PATH)
    const contaminatedDocument = { ...document, items: [] }

    expect(() => requireCertifiedBattleCaseDocument(contaminatedDocument, 'contaminated-document')).toThrow('[FUZZER-CERTIFICATION]')
  })

  it('refuses choice arrays that diverge from the atomic history', () => {
    const rawDocument: unknown = JSON.parse(fs.readFileSync(CERTIFIED_CASES_PATH, 'utf8'))
    const document = requireCertifiedBattleCaseDocument(rawDocument, CERTIFIED_CASES_PATH)
    const source = document.battle[0]
    if (!source) throw new Error('The certified document must contain at least one battle case.')
    const mismatched: TestBatch = {
      ...source,
      playerChoices: [...source.playerChoices, 'move impossible'],
    }

    expect(() => certifyBattleCase(mismatched, source.idx)).toThrow('[FUZZER-CERTIFICATION]')
    const corruptedDocument = {
      battle: [{ ...source, playerChoices: mismatched.playerChoices }],
    }

    expect(() => requireCertifiedBattleCaseDocument(corruptedDocument, 'corrupted-document')).toThrow('[FUZZER-CERTIFICATION]')
  })

  it('rejects a persisted seed that cannot initialize a deterministic Showdown battle', () => {
    const rawDocument: unknown = JSON.parse(fs.readFileSync(CERTIFIED_CASES_PATH, 'utf8'))
    const document = requireCertifiedBattleCaseDocument(rawDocument, CERTIFIED_CASES_PATH)
    const source = document.battle[0]
    if (!source) throw new Error('The certified document must contain at least one battle case.')
    const corruptedDocument = {
      battle: [{ ...source, seed: source.seed.slice(0, 3) }],
    }

    expect(() => requireCertifiedBattleCaseDocument(corruptedDocument, 'invalid-seed-document')).toThrow('[FUZZER-CERTIFICATION]')
  })
})
