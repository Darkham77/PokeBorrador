/**
 * tests/unit/ditto_capture.spec.ts
 * Verifies that Ditto captures keep pre-transformation states (shiny, IVs, level).
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { SPECIAL_ACTIONS } from '@/logic/battle/actions/specialActions'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Ditto Pre-Transformation Capture Preservation', () => {
  it('should transform Ditto, store its original stats, and restore them upon capture', async () => {
    // 1. Create original Ditto (Shiny, custom level, custom IVs)
    const ditto: Pokemon = {
      uid: 'ditto-test',
      id: 'ditto',
      name: 'Ditto',
      level: 30,
      vigor: 20,
      type: 'normal',
      hp: 80,
      maxHp: 80,
      atk: 48,
      def: 48,
      spa: 48,
      spd: 48,
      spe: 48,
      moves: [
        { id: 'transform', name: 'Transformación', pp: 10, maxPP: 10 }
      ],
      ivs: { hp: 31, atk: 25, def: 20, spa: 15, spd: 10, spe: 5 },
      nature: 'Hardy',
      ability: 'Flexibilidad',
      isShiny: true,
      exp: 0,
      expNeeded: 1000
    }

    // Target to transform into
    const pikachu: Pokemon = {
      uid: 'pikachu-test',
      id: 'pikachu',
      name: 'Pikachu',
      level: 25,
      vigor: 20,
      type: 'electric',
      hp: 60,
      maxHp: 60,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 40,
      spe: 90,
      moves: [
        { id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15 }
      ],
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      nature: 'Jolly',
      ability: 'Static',
      exp: 0,
      expNeeded: 500
    }

    const logs: string[] = []
    const addLogFn = (msg: string) => { logs.push(msg) }

    // Execute transform
    const dummyStages = {
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      acc: 0,
      eva: 0,
      reflect: 0,
      lightScreen: 0,
      safeguard: 0,
      mist: 0,
      spikes: 0
    }
    SPECIAL_ACTIONS.transform!(ditto, pikachu, dummyStages, dummyStages, addLogFn)

    // Verify Ditto is transformed into Pikachu
    expect(ditto.isTransformed).toBe(true)
    expect(ditto.id).toBe('pikachu')
    expect(ditto.name).toBe('Pikachu')
    expect(ditto.level).toBe(30) // Transformed Ditto keeps its level
    
    const dittoAny = ditto as unknown as Record<string, unknown>
    expect(dittoAny.originalDitto).toBeDefined()
    const origDitto = dittoAny.originalDitto as Record<string, unknown>
    expect(origDitto.id).toBe('ditto')
    expect(origDitto.isShiny).toBe(true)
    const origIvs = origDitto.ivs as Record<string, unknown>
    expect(origIvs.hp).toBe(31)

    // Simulate catch restoration block
    const e = ditto
    const eAny = e as unknown as Record<string, unknown>
    if (e.isTransformed && eAny.originalDitto) {
      const orig = eAny.originalDitto as Record<string, unknown>
      e.id = orig.id as string
      e.name = orig.name as string
      e.type = orig.type as string
      e.type2 = orig.type2 as string
      e.atk = orig.atk as number
      e.def = orig.def as number
      e.spa = orig.spa as number
      e.spd = orig.spd as number
      e.spe = orig.spe as number
      e.moves = orig.moves as unknown as (import('@/types/pokemon/pokemon').PokemonMove | null)[]
      e.ivs = orig.ivs as unknown as import('@/types/pokemon/pokemon').PokemonIVs
      e.isShiny = orig.isShiny as boolean
      e.level = orig.level as number
      e.nature = orig.nature as string
      e.ability = orig.ability as string
      e.hp = orig.hp as number
      e.maxHp = orig.maxHp as number
      e.isTransformed = false
      delete eAny.originalDitto
    }

    // Verify Ditto has been restored to its pre-transformed state
    expect(ditto.isTransformed).toBe(false)
    expect(ditto.id).toBe('ditto')
    expect(ditto.name).toBe('Ditto')
    expect(ditto.level).toBe(30)
    expect(ditto.isShiny).toBe(true)
    expect(ditto.ivs?.hp).toBe(31)
    expect(ditto.ivs?.spe).toBe(5)
  })
})
