import { describe, it, expect } from 'vitest'
import {
  manualTimersFrontend,
  zeroTimerBattleLogic,
  noPlaywrightWaitForTimeout,
  forbiddenFallbacks,
  sassTraps,
  normalizeFilePath,
  noDomainIdFallbacks
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

  describe('sassTraps', () => {
    it('flags lowercase grayscale() in scss files as an error and is not fixable automatically', () => {
      const code = `filter: grayscale(0.85);`
      const match = matchRule(sassTraps, code)
      expect(match).not.toBeNull()
      expect(sassTraps.severity).toBe('error')
      expect(sassTraps.fixable).toBe(false)
      expect(sassTraps.fix).toBeUndefined()
      if (match && sassTraps.check) {
        const isViolation = sassTraps.check(code, match, 'src/styles/components/_shop_cards.scss')
        expect(isViolation).toBe(true)
      }
    })

    it('flags lowercase drop-shadow() and rgba() in scss files', () => {
      const code = `filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));`
      const match = matchRule(sassTraps, code)
      expect(match).not.toBeNull()
    })

    it('does not flag SASS module calls like color.scale or math.random', () => {
      const code = `background: color.scale($color, $lightness: 20%);`
      const match = matchRule(sassTraps, code)
      if (match && sassTraps.check) {
        const isViolation = sassTraps.check(code, match, 'src/styles/main.scss')
        expect(isViolation).toBe(false)
      } else {
        expect(match).toBeNull()
      }
    })

    it('does not flag already capitalized functions like Grayscale and Rgba', () => {
      const code = `filter: Grayscale(0.85); background: Rgba(255, 255, 255, 0.5);`
      const match = matchRule(sassTraps, code)
      expect(match).toBeNull()
    })

    it('does not flag non-style ts/js files', () => {
      const code = `const color = 'rgba(255, 0, 0, 0.9)';`
      const match = matchRule(sassTraps, code)
      expect(match).not.toBeNull()
      if (match && sassTraps.check) {
        const isViolation = sassTraps.check(code, match, 'src/logic/utils/spriteOutliner.ts')
        expect(isViolation).toBe(false)
      }
    })
  })

  describe('normalizeFilePath (Cross-Platform Path Resolution)', () => {
    it('normalizes Windows paths with backslashes to POSIX lowercase relative paths', () => {
      const winPath = 'src\\logic\\pokemon\\pokemonFieldAbilities.ts'
      expect(normalizeFilePath(winPath)).toBe('src/logic/pokemon/pokemonfieldabilities.ts')
    })

    it('normalizes POSIX paths with forward slashes to POSIX lowercase relative paths', () => {
      const posixPath = 'src/logic/pokemon/pokemonFieldAbilities.ts'
      expect(normalizeFilePath(posixPath)).toBe('src/logic/pokemon/pokemonfieldabilities.ts')
    })
  })

  describe('noDomainIdFallbacks (Cross-Platform Detection)', () => {
    const fallbackCode = `const label = translation.name || pokemon.ability;`
    const cleanCode = `const label = translation.name;`

    it('detects domain fallback on Windows backslash paths', () => {
      const match = matchRule(noDomainIdFallbacks, fallbackCode)
      expect(match).not.toBeNull()
      if (match && noDomainIdFallbacks.check) {
        const isViolation = noDomainIdFallbacks.check(
          fallbackCode,
          match,
          'src\\logic\\pokemon\\pokemonFieldAbilities.ts'
        )
        expect(isViolation).toBe(true)
      }
    })

    it('detects domain fallback on POSIX forward slash paths', () => {
      const match = matchRule(noDomainIdFallbacks, fallbackCode)
      expect(match).not.toBeNull()
      if (match && noDomainIdFallbacks.check) {
        const isViolation = noDomainIdFallbacks.check(
          fallbackCode,
          match,
          'src/logic/pokemon/pokemonFieldAbilities.ts'
        )
        expect(isViolation).toBe(true)
      }
    })

    it('does not flag clean domain code without fallbacks', () => {
      const match = matchRule(noDomainIdFallbacks, cleanCode)
      expect(match).toBeNull()
    })
  })
})
