import { describe, it, expect } from 'vitest'
import {
  buildKoText,
  calculateAttackerStatDisplay,
  buildTooltipDamageRange,
  buildTooltipSpeedInfo
} from '@/composables/battle/moveTooltipCalculator'
import type { PurePokemon } from '@/logic/battle/battleMath'
import type { SmogonTooltipResult } from '@/logic/battle/smogonAdapter'

describe('moveTooltipCalculator', () => {
  it('formats KO chance correctly with buildKoText', () => {
    expect(buildKoText({ n: 1, chance: 1 })).toBe('OHKO garantizado')
    expect(buildKoText({ n: 2, chance: 0.8 })).toBe('2HKO posible (80%)')
    expect(buildKoText({ n: 0, chance: 0 })).toBe('')
  })

  it('calculates attacker stat display for physical and special moves', () => {
    const dummyAttacker = {
      atk: 100,
      spa: 80,
      level: 50,
      name: 'Charizard',
      types: ['Fire', 'Flying'],
    } as unknown as PurePokemon

    const stat = calculateAttackerStatDisplay(
      dummyAttacker,
      null,
      true,
      false,
      { atk: 2 },
      null,
      'day',
      false
    )

    expect(stat).not.toBeNull()
    expect(stat?.name).toBe('ATAQUE')
    expect(stat?.base).toBe(100)
    expect(stat?.stage).toBe(2)
    expect(stat?.class).toBe('boosted')
  })

  it('builds tooltip damage range structure accurately', () => {
    const mockSmogonResult: SmogonTooltipResult = {
      minDmg: 50,
      maxDmg: 70,
      minPercent: 40.2,
      maxPercent: 55.8,
      critMinDmg: 75,
      critMaxDmg: 105,
      critMinPercent: 60.3,
      critMaxPercent: 83.7,
      koChance: { n: 2, chance: 0.9 },
      outspeeds: true,
      attackerSpeed: 120,
      defenderSpeed: 100,
      smogonDesc: '50-70 (40.2 - 55.8%) -- 2HKO',
      recovery: { min: 0, max: 0, text: '' },
      recoil: { min: 0, max: 0, text: '' },
      hasAssaultVest: false,
      hasEviolite: false,
      attackerWeight: 50,
      defenderWeight: 50,
      overrideOffensiveStat: undefined,
      overrideDefensiveStat: undefined,
      ignoreDefensive: false,
      breaksProtect: false,
      hasCrashDamage: false,
      terrainReductions: [],
      isLeechSeedActive: false,
      isForesightActive: false,
      attackerTera: undefined,
      defenderTera: undefined,
    }

    const range = buildTooltipDamageRange(mockSmogonResult)
    expect(range).not.toBeNull()
    expect(range?.normalMin).toBe(50)
    expect(range?.normalMax).toBe(70)
    expect(range?.normalPctMin).toBe(40)
    expect(range?.normalPctMax).toBe(56)
    expect(range?.koChanceText).toBe('2HKO posible (90%)')

    const speedInfo = buildTooltipSpeedInfo(mockSmogonResult, 1)
    expect(speedInfo?.priority).toBe(1)
    expect(speedInfo?.outspeeds).toBe(true)
  })
})
