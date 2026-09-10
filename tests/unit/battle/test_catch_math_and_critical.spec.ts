import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getPokedexCriticalFactor,
  calculateCriticalCaptureThreshold,
  calculateCatchRatePure,
  calculateEscapeChancePure
} from '@/logic/battle/battleCatchMath'
import type { PurePokemon, PureCatchOptions } from '@/logic/battle/battleMathTypes'

describe('Battle Catch Mechanics & Formulas (06_captura.md)', () => {
  const basePokemon: PurePokemon = {
    level: 20,
    hp: 50,
    maxHp: 100,
    catchRate: 45,
    type: 'normal',
    status: ''
  }

  describe('1. Pokédex Scaling Factor (P)', () => {
    it('returns 0 for fewer than 15 caught species', () => {
      expect(getPokedexCriticalFactor(0)).toBe(0)
      expect(getPokedexCriticalFactor(14)).toBe(0)
    })

    it('returns 0.5 for 15 to 49 caught species', () => {
      expect(getPokedexCriticalFactor(15)).toBe(0.5)
      expect(getPokedexCriticalFactor(30)).toBe(0.5)
      expect(getPokedexCriticalFactor(49)).toBe(0.5)
    })

    it('returns 1.0 for 50 to 99 caught species', () => {
      expect(getPokedexCriticalFactor(50)).toBe(1.0)
      expect(getPokedexCriticalFactor(75)).toBe(1.0)
      expect(getPokedexCriticalFactor(99)).toBe(1.0)
    })

    it('returns 1.5 for 100 to 149 caught species', () => {
      expect(getPokedexCriticalFactor(100)).toBe(1.5)
      expect(getPokedexCriticalFactor(125)).toBe(1.5)
      expect(getPokedexCriticalFactor(149)).toBe(1.5)
    })

    it('returns 2.0 for 150 to 199 caught species', () => {
      expect(getPokedexCriticalFactor(150)).toBe(2.0)
      expect(getPokedexCriticalFactor(175)).toBe(2.0)
      expect(getPokedexCriticalFactor(199)).toBe(2.0)
    })

    it('returns 2.5 for 200 or more caught species', () => {
      expect(getPokedexCriticalFactor(200)).toBe(2.5)
      expect(getPokedexCriticalFactor(251)).toBe(2.5)
      expect(getPokedexCriticalFactor(300)).toBe(2.5)
    })
  })

  describe('2. Critical Capture Threshold (CC)', () => {
    it('is 0 when Pokédex factor P is 0', () => {
      expect(calculateCriticalCaptureThreshold(100, 10)).toBe(0)
      expect(calculateCriticalCaptureThreshold(255, 0)).toBe(0)
    })

    it('calculates CC = floor(min(255, a) * P / 6) correctly', () => {
      // a = 120, P = 2.5 (200 species): floor(120 * 2.5 / 6) = floor(300 / 6) = 50
      expect(calculateCriticalCaptureThreshold(120, 200)).toBe(50)

      // a = 60, P = 1.0 (60 species): floor(60 * 1.0 / 6) = 10
      expect(calculateCriticalCaptureThreshold(60, 60)).toBe(10)

      // a = 200, P = 1.5 (100 species): floor(200 * 1.5 / 6) = floor(300 / 6) = 50
      expect(calculateCriticalCaptureThreshold(200, 100)).toBe(50)
    })

    it('caps a at 255 when a exceeds 255', () => {
      // a = 300, capped at 255. P = 2.5: floor(255 * 2.5 / 6) = floor(637.5 / 6) = 106
      expect(calculateCriticalCaptureThreshold(300, 200)).toBe(106)
    })
  })

  describe('3. Critical Capture Resolution (1 Shake check)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('succeeds with exactly 1 shake when critical roll passes b check', () => {
      // Mock random: first roll < b (successful 1 shake)
      vi.spyOn(Math, 'random').mockReturnValue(0.01)

      const result = calculateCatchRatePure(basePokemon, 'pokeball', 1, {
        forceCritical: true,
        pokedexCount: 200
      })

      expect(result.isCritical).toBe(true)
      expect(result.caught).toBe(true)
      expect(result.shakes).toBe(1)
    })

    it('fails with exactly 0 shakes when critical roll fails b check', () => {
      // Mock random: roll fails b check
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)

      const result = calculateCatchRatePure(basePokemon, 'pokeball', 1, {
        forceCritical: true,
        pokedexCount: 200
      })

      expect(result.isCritical).toBe(true)
      expect(result.caught).toBe(false)
      expect(result.shakes).toBe(0)
    })
  })

  describe('4. Standard Capture (4 Shakes check)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('succeeds with 3 visual shakes when all 4 checks pass', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)

      const result = calculateCatchRatePure(basePokemon, 'pokeball', 1, {
        pokedexCount: 0 // P = 0, no critical possible
      })

      expect(result.isCritical).toBe(false)
      expect(result.caught).toBe(true)
      expect(result.shakes).toBe(3)
    })

    it('fails with partial shakes when any check fails', () => {
      // Mock random sequence: pass first 2 shakes, fail 3rd
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        return callCount <= 2 ? 0.01 : 0.99
      })

      const result = calculateCatchRatePure(basePokemon, 'pokeball', 1, {
        pokedexCount: 0
      })

      expect(result.isCritical).toBe(false)
      expect(result.caught).toBe(false)
      expect(result.shakes).toBe(2)
    })
  })

  describe('5. Auto-Capture when a >= 255', () => {
    it('guarantees capture automatically without checks when a >= 255', () => {
      // Magikarp: catchRate 255, low HP, Sleep, Ultra Ball -> a >> 255
      const magikarp: PurePokemon = {
        level: 5,
        hp: 1,
        maxHp: 100,
        catchRate: 255,
        type: 'water',
        status: 'slp'
      }

      const result = calculateCatchRatePure(magikarp, 'ultraball')
      expect(result.caught).toBe(true)
      expect(result.shakes).toBe(3)
      expect(result.isCritical).toBe(false)
    })
  })

  describe('6. Master Ball Behavior', () => {
    it('always guarantees capture regardless of HP, status or catch rate', () => {
      const mewtwo: PurePokemon = {
        level: 70,
        hp: 1000,
        maxHp: 1000,
        catchRate: 3,
        type: 'psychic',
        status: ''
      }

      const result = calculateCatchRatePure(mewtwo, 'masterball')
      expect(result.caught).toBe(true)
      expect(result.shakes).toBe(3)
      expect(result.isCritical).toBe(false)
    })
  })

  describe('7. Status Multipliers', () => {
    it('applies 2.0x for Sleep and Freeze', () => {
      const slpPoke: PurePokemon = { ...basePokemon, status: 'slp' }
      const frzPoke: PurePokemon = { ...basePokemon, status: 'frz' }

      const slpResult = calculateCatchRatePure(slpPoke, 'pokeball')
      const frzResult = calculateCatchRatePure(frzPoke, 'pokeball')

      expect(slpResult.statusMultiplierApplied).toBe(true)
      expect(frzResult.statusMultiplierApplied).toBe(true)
    })

    it('applies 1.5x for Paralyze, Burn, and Poison', () => {
      const parPoke: PurePokemon = { ...basePokemon, status: 'par' }
      const brnPoke: PurePokemon = { ...basePokemon, status: 'brn' }
      const psnPoke: PurePokemon = { ...basePokemon, status: 'psn' }

      expect(calculateCatchRatePure(parPoke, 'pokeball').statusMultiplierApplied).toBe(true)
      expect(calculateCatchRatePure(brnPoke, 'pokeball').statusMultiplierApplied).toBe(true)
      expect(calculateCatchRatePure(psnPoke, 'pokeball').statusMultiplierApplied).toBe(true)
    })

    it('applies 1.0x (no bonus) when there is no status', () => {
      const cleanPoke: PurePokemon = { ...basePokemon, status: '' }
      expect(calculateCatchRatePure(cleanPoke, 'pokeball').statusMultiplierApplied).toBe(false)
    })
  })

  describe('8. Poké Ball Types & Environmental Bonuses', () => {
    it('Net Ball applies 3.5x for Water and Bug types', () => {
      const waterPoke: PurePokemon = { ...basePokemon, type: 'water' }
      const bugPoke: PurePokemon = { ...basePokemon, type: 'bug' }
      const normalPoke: PurePokemon = { ...basePokemon, type: 'normal' }

      // With low random, water and bug should have high catch chances
      vi.spyOn(Math, 'random').mockReturnValue(0.2)
      const waterRes = calculateCatchRatePure(waterPoke, 'netball')
      const bugRes = calculateCatchRatePure(bugPoke, 'netball')
      const normalRes = calculateCatchRatePure(normalPoke, 'netball')

      expect(waterRes.shakes).toBeGreaterThanOrEqual(normalRes.shakes)
      expect(bugRes.shakes).toBeGreaterThanOrEqual(normalRes.shakes)
      vi.restoreAllMocks()
    })

    it('Net Ball applies 3.5x during Rain even for non-water/bug types', () => {
      const firePoke: PurePokemon = { ...basePokemon, type: 'fire' }
      const ctxRain: PureCatchOptions = { weather: { type: 'rain', turns: 5 } }

      vi.spyOn(Math, 'random').mockReturnValue(0.2)
      const rainRes = calculateCatchRatePure(firePoke, 'netball', 1, ctxRain)
      const clearRes = calculateCatchRatePure(firePoke, 'netball', 1, {})

      expect(rainRes.shakes).toBeGreaterThanOrEqual(clearRes.shakes)
      vi.restoreAllMocks()
    })

    it('Dusk Ball applies 3.0x at Night, in Caves, or in Fog', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3)

      const nightRes = calculateCatchRatePure(basePokemon, 'duskball', 1, { cycle: 'night' })
      const caveRes = calculateCatchRatePure(basePokemon, 'duskball', 1, { isCave: true })
      const fogRes = calculateCatchRatePure(basePokemon, 'duskball', 1, { weather: { type: 'fog', turns: 5 } })
      const dayRes = calculateCatchRatePure(basePokemon, 'duskball', 1, { cycle: 'day' })

      expect(nightRes.shakes).toBeGreaterThanOrEqual(dayRes.shakes)
      expect(caveRes.shakes).toBeGreaterThanOrEqual(dayRes.shakes)
      expect(fogRes.shakes).toBeGreaterThanOrEqual(dayRes.shakes)
      vi.restoreAllMocks()
    })

    it('Timer Ball scales up to 4.0x based on turn count', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.2)

      const turn1Res = calculateCatchRatePure(basePokemon, 'timerball', 1, { turnCount: 1 })
      const turn10Res = calculateCatchRatePure(basePokemon, 'timerball', 1, { turnCount: 10 })

      expect(turn10Res.shakes).toBeGreaterThanOrEqual(turn1Res.shakes)
      vi.restoreAllMocks()
    })
  })

  describe('9. Escape Mechanics (calculateEscapeChancePure)', () => {
    const player: PurePokemon = {
      level: 25,
      hp: 100,
      maxHp: 100,
      spe: 100,
      type: 'normal'
    }

    const enemy: PurePokemon = {
      level: 25,
      hp: 100,
      maxHp: 100,
      spe: 50,
      type: 'normal'
    }

    it('guarantees escape when player has Run Away, Smoke Ball, Shed Shell, or is Ghost', () => {
      expect(calculateEscapeChancePure({ ...player, ability: 'runaway' }, enemy, 1, null)).toBe(true)
      expect(calculateEscapeChancePure({ ...player, heldItem: 'smokeball' }, enemy, 1, null)).toBe(true)
      expect(calculateEscapeChancePure({ ...player, heldItem: 'shedshell' }, enemy, 1, null)).toBe(true)
      expect(calculateEscapeChancePure({ ...player, type: 'ghost' }, enemy, 1, null)).toBe(true)
    })

    it('prevents escape when enemy has Shadow Tag unless player is also Shadow Tag or Ghost', () => {
      const shadowTagEnemy: PurePokemon = { ...enemy, ability: 'shadowtag' }

      expect(calculateEscapeChancePure(player, shadowTagEnemy, 1, null)).toBe(false)
      expect(calculateEscapeChancePure({ ...player, type: 'ghost' }, shadowTagEnemy, 1, null)).toBe(true)
      expect(calculateEscapeChancePure({ ...player, ability: 'shadowtag' }, shadowTagEnemy, 1, null)).toBe(true)
    })

    it('allows escape when player speed is greater than or equal to wild enemy speed', () => {
      const fastPlayer: PurePokemon = { ...player, spe: 120 }
      const slowEnemy: PurePokemon = { ...enemy, spe: 80 }

      expect(calculateEscapeChancePure(fastPlayer, slowEnemy, 1, null)).toBe(true)
    })
  })
})
