import { describe, it, expect, beforeAll } from 'vitest'
import { loadAuditConfig } from '@francogp/auditor'
import {
  zeroTimerLogic as zeroTimerBattleLogic,
  forbiddenFallbacks,
  normalizeFilePath,
  noDomainIdFallbacks
} from '@francogp/auditor/suites/architecture/audit_rules'
import { ValidateGsapAnimationsAuditor } from '@francogp/auditor/suites/architecture/validate_gsap_animations'
import { TestHygieneAuditor } from '@francogp/auditor/suites/architecture/validate_test_hygiene'
import { ErrorSuppressionAuditor } from '@francogp/auditor/suites/architecture/validate_error_suppression'

class TestGsapAuditor extends ValidateGsapAnimationsAuditor {
  public scan(relPath: string, content: string): void {
    if (!this.roots.some(r => relPath.startsWith(r))) {
      return
    }
    this.scanFile(relPath, content)
  }
}

class TestHygieneAuditorWrapper extends TestHygieneAuditor {
  public scan(relPath: string, content: string): void {
    this.scanFile(relPath, content)
  }
}

class TestErrorSuppressionAuditor extends ErrorSuppressionAuditor {
  public scan(relPath: string, content: string): void {
    this.scanFile(relPath, content)
  }
}

describe('audit_rules.ts - Zero-Timer & Anti-Pattern Rules', () => {
  beforeAll(async () => {
    await loadAuditConfig()
  })

  const matchRule = (rule: { regex: RegExp }, code: string) => {
    rule.regex.lastIndex = 0
    return rule.regex.exec(code)
  }

  describe('manualTimersFrontend (gsap-banned-ui-timers)', () => {
    it('flags setTimeout in src/ components or views files', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan('src/components/battle/MyComp.vue', `<script setup>\nconst timer = setTimeout(() => doSomething(), 1000)\n</script>`)
      expect(auditor.getErrorsByRule().get('gsap-banned-ui-timers')).toBeGreaterThan(0)

      const viewAuditor = new TestGsapAuditor()
      viewAuditor.scan('src/views/battle/BattleView.vue', `<script setup>\nconst timer = setTimeout(() => doSomething(), 1000)\n</script>`)
      expect(viewAuditor.getErrorsByRule().get('gsap-banned-ui-timers')).toBeGreaterThan(0)
    })

    it('flags setInterval in .vue files', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan('src/components/battle/BattleArena.vue', `<script setup>\nconst interval = setInterval(() => tick(), 500)\n</script>`)
      expect(auditor.getErrorsByRule().get('gsap-banned-ui-timers')).toBeGreaterThan(0)
    })

    it('does not flag GSAP delayedCall or gsapSleep', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan('src/components/battle/BattleArena.vue', `<script setup>\ngsap.delayedCall(1, () => resolve())\n</script>`)
      expect(auditor.getErrorsByRule().get('gsap-banned-ui-timers') ?? 0).toBe(0)
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

  describe('noPlaywrightWaitForTimeout (no-playwright-polling-waits)', () => {
    it('flags page.waitForTimeout in scripts/e2e/ files', () => {
      const auditor = new TestHygieneAuditorWrapper()
      auditor.scan('scripts/e2e/battle/battle_sim.ts', `await page.waitForTimeout(1000)`)
      expect(auditor.getErrorsByRule().get('no-playwright-polling-waits')).toBeGreaterThan(0)
    })

    it('flags page.waitForTimeout in scripts/e2e/ test files', () => {
      const auditor = new TestHygieneAuditorWrapper()
      auditor.scan('scripts/e2e/battle/my_test.spec.ts', `await page.waitForTimeout(500)`)
      expect(auditor.getErrorsByRule().get('no-playwright-polling-waits')).toBeGreaterThan(0)
    })

    it('does not flag event-driven waiting', () => {
      const auditor = new TestHygieneAuditorWrapper()
      auditor.scan('scripts/e2e/battle/battle_sim.ts', `await page.waitForEvent('battle-ready-for-input')`)
      expect(auditor.getErrorsByRule().get('no-playwright-polling-waits') ?? 0).toBe(0)
    })
  })

  describe('forbiddenFallbacks', () => {
    it('flags UID fallback chains (e.g. uid || targetUid)', () => {
      const code = `const targetUid = entry.p1ActiveUid || target?.pokemonUid`
      const match = matchRule(forbiddenFallbacks, code)
      expect(match).not.toBeNull()
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(code, match, 'src/logic/battle/base_battle.ts')
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

    it('flags silent promise catches (.catch(() => false/null)) via ErrorSuppressionAuditor', () => {
      const auditor = new TestErrorSuppressionAuditor()
      auditor.scan('src/logic/utils/modal_helpers.ts', `const isVisible = await modal.isVisible().catch(() => false)`)
      expect(auditor.getErrorsByRule().get('no-silent-promise-catch')).toBeGreaterThan(0)
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

  describe('noLayoutAnimationInGsap (gsap-no-layout-properties)', () => {
    it('flags backgroundPosition animation in gsap.to within src/ files', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan(
        'src/components/common/AtmosphereLayer.vue',
        `<script setup>\ngsap.to(el, { backgroundPosition: '100% 0', duration: 1 })\n</script>`
      )
      expect(auditor.getErrorsByRule().get('gsap-no-layout-properties')).toBeGreaterThan(0)
    })

    it('flags backgroundPositionY animation in timeline.to within src/ files', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan(
        'src/components/battle/WeatherEffect.vue',
        `<script setup>\ntimeline.to(layer, { backgroundPositionY: '500px', duration: 2 })\n</script>`
      )
      expect(auditor.getErrorsByRule().get('gsap-no-layout-properties')).toBeGreaterThan(0)
    })

    it('does not flag hardware accelerated transform properties (x, y, scale)', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan(
        'src/components/common/AtmosphereLayer.vue',
        `<script setup>\ngsap.to(el, { x: 100, y: 50, scale: 1.2, duration: 0.5 })\n</script>`
      )
      expect(auditor.getErrorsByRule().get('gsap-no-layout-properties') ?? 0).toBe(0)
    })

    it('respects justified ignore comment // layout-ok:', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan(
        'src/components/common/ShimmerText.vue',
        `<script setup>\n// layout-ok: Text shimmer gradient clip requires backgroundPosition\ngsap.to(el, { backgroundPosition: '200% 0', duration: 1.5 })\n</script>`
      )
      expect(auditor.getErrorsByRule().get('gsap-no-layout-properties') ?? 0).toBe(0)
    })

    it('ignores test files and files outside src/', () => {
      const auditor = new TestGsapAuditor()
      auditor.scan('tests/unit/anim.spec.ts', `gsap.to(el, { backgroundPosition: '100% 0' })`)
      expect(auditor.getErrorsByRule().get('gsap-no-layout-properties') ?? 0).toBe(0)
    })
  })
})
