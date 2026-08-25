import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import fs from 'node:fs'
import path from 'node:path'
import { validateAndSanitize } from '@/logic/auth/saveSanitizer'
import { checkPokemonLegality, repairPokemonLegality, hasIllegalPokemon } from '@/logic/pokemon/pokemonLegality'
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

  it('identifies and fully repairs all illegal Pokémon across team and box from Ash account', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/illegal_account_ash_case.json')
    const rawData = fs.readFileSync(fixturePath, 'utf8')
    const saveData = JSON.parse(rawData) as SaveDataDto

    const team = (saveData.team || []) as (Pokemon | null)[]
    const box = (saveData.box || []) as (Pokemon | null)[]
    const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null && typeof p === 'object' && !!p.id)

    let illegalFoundBefore = 0
    allPokes.forEach((p) => {
      const check = checkPokemonLegality(p)
      if (!check.isLegal || p.isIllegal) {
        illegalFoundBefore++
      }
    })

    // Run repair engine on all Pokemon
    let repairedCount = 0
    allPokes.forEach((p) => {
      const rep = repairPokemonLegality(p)
      if (rep.repaired) {
        repairedCount++
      }
    })

    // After repair, every single Pokemon must be 100% legal
    allPokes.forEach((p) => {
      expect(p.isIllegal).toBe(false)
      expect(p.illegalReasons).toEqual([])
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
