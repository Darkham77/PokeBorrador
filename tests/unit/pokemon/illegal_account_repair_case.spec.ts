import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import fs from 'node:fs'
import path from 'node:path'
import { validateAndSanitize } from '@/logic/auth/saveSanitizer'
import { checkPokemonLegality, hasIllegalPokemon } from '@/logic/pokemon/pokemonLegality'
import { auditAndRepairSaveData } from '../../../scripts/maintenance/repair_account_legality.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { SaveDataDto } from '@/logic/validation/schemas'

describe('Illegal Account Case - Ash Fixture Repair & Resilience Test', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads the extracted illegal Ash account case without crashing', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/illegal_account_ash_case.json')
    const rawData = fs.readFileSync(fixturePath, 'utf8')
    const saveData = JSON.parse(rawData) as SaveDataDto

    const sanitized = validateAndSanitize(saveData)
    expect(sanitized.valid).toBe(true)
    expect(sanitized.data).toBeDefined()
  })

  it('identifies, purges disabled species, and fully repairs all illegal Pokémon across team and box from Ash account', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/illegal_account_ash_case.json')
    const rawData = fs.readFileSync(fixturePath, 'utf8')
    const saveData = JSON.parse(rawData) as SaveDataDto

    // Run unified repair engine on the Ash account
    const result = auditAndRepairSaveData(saveData, true)
    expect(result.modified).toBe(true)

    const team = (saveData.team || []) as (Pokemon | null)[]
    const box = (saveData.box || []) as (Pokemon | null)[]
    const remainingPokes = [...team, ...box].filter((p): p is Pokemon => p !== null && typeof p === 'object' && !!p.id)

    // After repair, every single remaining Pokemon must be 100% legal
    remainingPokes.forEach((p) => {
      expect(!p.isIllegal).toBe(true)
      expect(p.illegalReasons || []).toEqual([])
      expect(p.level).toBeGreaterThanOrEqual(1)
      expect(p.level).toBeLessThanOrEqual(100)

      const finalCheck = checkPokemonLegality(p)
      if (!finalCheck.isLegal) {
        console.error(`Pokemon ${p.name || p.id} (UID: ${p.uid}) failed legality check after repair:`, finalCheck.issues)
      }
      expect(finalCheck.isLegal).toBe(true)
      expect(finalCheck.issues).toHaveLength(0)
    })

    expect(hasIllegalPokemon(team)).toBe(false)
    expect(hasIllegalPokemon(box)).toBe(false)
  })
})
