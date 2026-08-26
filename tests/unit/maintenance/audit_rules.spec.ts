import { describe, it, expect } from 'vitest'
import {
  manualTimersFrontend,
  zeroTimerBattleLogic,
  noPlaywrightWaitForTimeout,
  forbiddenFallbacks
} from '@/../scripts/maintenance/audit_rules.ts'

describe('audit_rules.ts - Zero-Timer & Anti-Pattern Rules', () => {
  const matchRule = (rule: { regex: RegExp }, code: string) => {
    rule.regex.lastIndex = 0
    return rule.regex.exec(code)
  }

  describe('manualTimersFrontend', () => {
    it('flags setTimeout in src/ components or logic files', () => {
      const code = `const timer = setTimeout(() => doSomething(), 1000)`
      const match = matchRule(manualTimersFrontend, code)
      expect(match).not.toBeNull()
      if (match && manualTimersFrontend.check) {
        const isViolation = manualTimersFrontend.check(code, match, 'src/components/battle/MyComp.vue')
        expect(isViolation).toBe(true)
        const isTsViolation = manualTimersFrontend.check(code, match, 'src/logic/battle/myLogic.ts')
        expect(isTsViolation).toBe(true)
      }
    })

    it('flags setInterval in src/ files', () => {
      const code = `const interval = setInterval(() => tick(), 500)`
      const match = matchRule(manualTimersFrontend, code)
      expect(match).not.toBeNull()
      if (match && manualTimersFrontend.check) {
        const isViolation = manualTimersFrontend.check(code, match, 'src/composables/battle/useAnim.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('does not flag GSAP delayedCall or gsapSleep', () => {
      const code = `gsap.delayedCall(1, () => resolve())`
      const match = matchRule(manualTimersFrontend, code)
      expect(match).toBeNull()
    })
  })

  describe('zeroTimerBattleLogic', () => {
    it('flags sleep() call in src/logic/battle/', () => {
      const code = `await sleep(500)`
      const match = matchRule(zeroTimerBattleLogic, code)
      expect(match).not.toBeNull()
      if (match && zeroTimerBattleLogic.check) {
        const isViolation = zeroTimerBattleLogic.check(code, match, 'src/logic/battle/battleFaintSequence.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('flags sleep() call in src/components/battle/', () => {
      const code = `await sleep(200)`
      const match = matchRule(zeroTimerBattleLogic, code)
      expect(match).not.toBeNull()
      if (match && zeroTimerBattleLogic.check) {
        const isViolation = zeroTimerBattleLogic.check(code, match, 'src/components/battle/BattleArena.vue')
        expect(isViolation).toBe(true)
      }
    })

    it('does not flag gsapSleep in battle files', () => {
      const code = `await gsapSleep(500)`
      const match = matchRule(zeroTimerBattleLogic, code)
      expect(match).toBeNull()
    })
  })

  describe('noPlaywrightWaitForTimeout', () => {
    it('flags page.waitForTimeout in scripts/e2e/ files', () => {
      const code = `await page.waitForTimeout(1000)`
      const match = matchRule(noPlaywrightWaitForTimeout, code)
      expect(match).not.toBeNull()
      if (match && noPlaywrightWaitForTimeout.check) {
        const isViolation = noPlaywrightWaitForTimeout.check(code, match, 'scripts/e2e/battle/battle_sim.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('flags page.waitForTimeout in tests/ files', () => {
      const code = `await page.waitForTimeout(500)`
      const match = matchRule(noPlaywrightWaitForTimeout, code)
      expect(match).not.toBeNull()
      if (match && noPlaywrightWaitForTimeout.check) {
        const isViolation = noPlaywrightWaitForTimeout.check(code, match, 'tests/e2e/my_test.spec.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('does not flag event-driven waiting', () => {
      const code = `await page.waitForEvent('battle-ready-for-input')`
      const match = matchRule(noPlaywrightWaitForTimeout, code)
      expect(match).toBeNull()
    })
  })

  describe('forbiddenFallbacks', () => {
    it('flags UID fallback chains (e.g. uid || targetUid)', () => {
      const code = `const targetUid = entry.p1ActiveUid || target?.pokemonUid`
      const match = matchRule(forbiddenFallbacks, code)
      expect(match).not.toBeNull()
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(code, match, 'scripts/e2e/base_battle_simulation.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('flags species or ID derivation fallbacks', () => {
      const code = `const name = speciesData.name || speciesData.id`
      const match = matchRule(forbiddenFallbacks, code)
      expect(match).not.toBeNull()
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(code, match, 'src/logic/pokemon/helper.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('flags silent promise catches (.catch(() => false/null))', () => {
      const code = `const isVisible = await modal.isVisible().catch(() => false)`
      const match = matchRule(forbiddenFallbacks, code)
      expect(match).not.toBeNull()
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(code, match, 'scripts/e2e/e2e_helpers.ts')
        expect(isViolation).toBe(true)
      }
    })

    it('flags data provider lookups with fallback operator (lookup() || ...)', () => {
      const code = `const data = pokemonDataProvider.getPokemonData(id) || fallback`
      const match = matchRule(forbiddenFallbacks, code)
      expect(match).not.toBeNull()
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(code, match, 'src/components/battle/BattleArena.vue')
        expect(isViolation).toBe(true)
      }
    })

    it('does not flag clean code without fallbacks', () => {
      const code = `const targetUid = target.pokemonUid; if (!targetUid) throw new Error('Missing UID');`
      const match = matchRule(forbiddenFallbacks, code)
      expect(match).toBeNull()
    })
  })
})
