import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { calculateDetailedStatBreakdown } from '../../../src/logic/battle/statBreakdownHelper.ts'
import type { PurePokemon } from '../../../src/logic/battle/battleMathTypes.ts'

describe('calculateDetailedStatBreakdown', () => {
  const baseLapras: PurePokemon = {
    id: 'lapras',
    name: 'Lapras',
    type: 'water',
    type2: 'ice',
    hp: 125,
    maxHp: 125,
    atk: 56,
    def: 57,
    spa: 64,
    spd: 66,
    spe: 44,
    level: 32,
    ability: 'waterabsorb'
  }

  it('boosts Lapras defense by 1.5x in snow / coldwave', () => {
    const res = calculateDetailedStatBreakdown(
      baseLapras,
      'def',
      {},
      { type: 'snow', turns: 5 }
    )

    // 57 * 1.5 = 85.5 -> floor = 85
    assert.strictEqual(res.base, 57)
    assert.strictEqual(res.final, 85)
    assert.strictEqual(res.isUp, true)
    assert.strictEqual(res.isDown, false)
    assert.strictEqual(res.weatherMult, 1.5)
    assert.strictEqual(res.sources.length, 1)
    assert.strictEqual(res.sources[0]?.type, 'weather')
  })

  it('boosts Rock-type SpD by 1.5x in sandstorm', () => {
    const geodude: PurePokemon = {
      id: 'geodude',
      name: 'Geodude',
      type: 'rock',
      type2: 'ground',
      hp: 50,
      maxHp: 50,
      atk: 50,
      def: 60,
      spa: 30,
      spd: 40,
      spe: 20,
      level: 20
    }

    const res = calculateDetailedStatBreakdown(
      geodude,
      'spd',
      {},
      { type: 'sandstorm', turns: 5 }
    )

    // 40 * 1.5 = 60
    assert.strictEqual(res.base, 40)
    assert.strictEqual(res.final, 60)
    assert.strictEqual(res.isUp, true)
    assert.strictEqual(res.weatherMult, 1.5)
  })

  it('calculates stage modifiers correctly alongside ability', () => {
    const marill: PurePokemon = {
      id: 'marill',
      name: 'Marill',
      type: 'water',
      type2: 'fairy',
      hp: 50,
      maxHp: 50,
      atk: 30,
      def: 40,
      spa: 30,
      spd: 40,
      spe: 30,
      level: 20,
      ability: 'hugepower'
    }

    const res = calculateDetailedStatBreakdown(
      marill,
      'atk',
      { atk: 2 }, // +2 stages (2x)
      null
    )

    // Base 30 * Stage 2.0 = 60 * Ability 2.0 = 120
    assert.strictEqual(res.base, 30)
    assert.strictEqual(res.stage, 2)
    assert.strictEqual(res.stageMult, 2.0)
    assert.strictEqual(res.abilityMult, 2.0)
    assert.strictEqual(res.final, 120)
    assert.strictEqual(res.isUp, true)
  })

  it('applies paralysis speed reduction unless quickfeet is active', () => {
    const pikachu: PurePokemon = {
      id: 'pikachu',
      name: 'Pikachu',
      type: 'electric',
      hp: 40,
      maxHp: 40,
      atk: 40,
      def: 30,
      spa: 40,
      spd: 30,
      spe: 60,
      level: 20,
      status: 'par'
    }

    const parRes = calculateDetailedStatBreakdown(pikachu, 'spe')
    // 60 * 0.5 = 30
    assert.strictEqual(parRes.final, 30)
    assert.strictEqual(parRes.isDown, true)

    const ursaring: PurePokemon = {
      ...pikachu,
      ability: 'quickfeet',
      status: 'par'
    }

    const qfRes = calculateDetailedStatBreakdown(ursaring, 'spe')
    // Quick Feet: 1.5x and ignores par penalty: 60 * 1.5 = 90
    assert.strictEqual(qfRes.final, 90)
    assert.strictEqual(qfRes.isUp, true)
  })

  it('applies Choice Scarf speed boost', () => {
    const gengar: PurePokemon = {
      id: 'gengar',
      name: 'Gengar',
      type: 'ghost',
      type2: 'poison',
      hp: 100,
      maxHp: 100,
      atk: 60,
      def: 60,
      spa: 130,
      spd: 75,
      spe: 110,
      level: 50,
      heldItem: 'choicescarf'
    }

    const res = calculateDetailedStatBreakdown(gengar, 'spe')
    // 110 * 1.5 = 165
    assert.strictEqual(res.final, 165)
    assert.strictEqual(res.isUp, true)
    assert.strictEqual(res.itemMult, 1.5)
  })
})
