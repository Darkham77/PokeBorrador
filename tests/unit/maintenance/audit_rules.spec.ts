import { loadAuditConfig } from '@francogp/auditor';
import {
  zeroTimerLogic as zeroTimerBattleLogic,
  forbiddenFallbacks,
  normalizeFilePath,
  noDomainIdFallbacks
} from '@francogp/auditor/suites/architecture/audit_rules';
import { describe, it, expect, beforeAll } from 'vite-plus/test';

describe('audit_rules.ts - Zero-Timer & Anti-Pattern Rules', () => {
  beforeAll(async () => {
    await loadAuditConfig();
  });

  const matchRule = (rule: { regex: RegExp }, code: string) => {
    rule.regex.lastIndex = 0;
    return rule.regex.exec(code);
  };

  describe('zeroTimerBattleLogic', () => {
    it('flags sleep() call in src/logic/battle/', () => {
      const code = `await sleep(500)`;
      const match = matchRule(zeroTimerBattleLogic, code);
      expect(match).not.toBeNull();
      if (match && zeroTimerBattleLogic.check) {
        const isViolation = zeroTimerBattleLogic.check(
          code,
          match,
          'src/logic/battle/battleFaintSequence.ts'
        );
        expect(isViolation).toBe(true);
      }
    });

    it('flags sleep() call in src/components/battle/', () => {
      const code = `await sleep(200)`;
      const match = matchRule(zeroTimerBattleLogic, code);
      expect(match).not.toBeNull();
      if (match && zeroTimerBattleLogic.check) {
        const isViolation = zeroTimerBattleLogic.check(
          code,
          match,
          'src/components/battle/BattleArena.vue'
        );
        expect(isViolation).toBe(true);
      }
    });

    it('does not flag gsapSleep in battle files', () => {
      const code = `await gsapSleep(500)`;
      const match = matchRule(zeroTimerBattleLogic, code);
      expect(match).toBeNull();
    });
  });

  describe('forbiddenFallbacks', () => {
    it('flags UID fallback chains (e.g. uid || targetUid)', () => {
      const code = `const targetUid = entry.p1ActiveUid || target?.pokemonUid`;
      const match = matchRule(forbiddenFallbacks, code);
      expect(match).not.toBeNull();
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(
          code,
          match,
          'src/logic/battle/base_battle.ts'
        );
        expect(isViolation).toBe(true);
      }
    });

    it('flags species or ID derivation fallbacks', () => {
      const code = `const name = speciesData.name || speciesData.id`;
      const match = matchRule(forbiddenFallbacks, code);
      expect(match).not.toBeNull();
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(code, match, 'src/logic/pokemon/helper.ts');
        expect(isViolation).toBe(true);
      }
    });

    it('flags data provider lookups with fallback operator (lookup() || ...)', () => {
      const code = `const data = pokemonDataProvider.getPokemonData(id) || fallback`;
      const match = matchRule(forbiddenFallbacks, code);
      expect(match).not.toBeNull();
      if (match && forbiddenFallbacks.check) {
        const isViolation = forbiddenFallbacks.check(
          code,
          match,
          'src/components/battle/BattleArena.vue'
        );
        expect(isViolation).toBe(true);
      }
    });

    it('does not flag clean code without fallbacks', () => {
      const code = `const targetUid = target.pokemonUid; if (!targetUid) throw new Error('Missing UID');`;
      const match = matchRule(forbiddenFallbacks, code);
      expect(match).toBeNull();
    });
  });

  describe('normalizeFilePath (Cross-Platform Path Resolution)', () => {
    it('normalizes Windows paths with backslashes to POSIX lowercase relative paths', () => {
      const winPath = 'src\\logic\\pokemon\\pokemonFieldAbilities.ts';
      expect(normalizeFilePath(winPath)).toBe('src/logic/pokemon/pokemonfieldabilities.ts');
    });

    it('normalizes POSIX paths with forward slashes to POSIX lowercase relative paths', () => {
      const posixPath = 'src/logic/pokemon/pokemonFieldAbilities.ts';
      expect(normalizeFilePath(posixPath)).toBe('src/logic/pokemon/pokemonfieldabilities.ts');
    });
  });

  describe('noDomainIdFallbacks (Cross-Platform Detection)', () => {
    const fallbackCode = `const label = translation.name || pokemon.ability;`;
    const cleanCode = `const label = translation.name;`;

    it('detects domain fallback on Windows backslash paths', () => {
      const match = matchRule(noDomainIdFallbacks, fallbackCode);
      expect(match).not.toBeNull();
      if (match && noDomainIdFallbacks.check) {
        const isViolation = noDomainIdFallbacks.check(
          fallbackCode,
          match,
          'src\\logic\\pokemon\\pokemonFieldAbilities.ts'
        );
        expect(isViolation).toBe(true);
      }
    });

    it('detects domain fallback on POSIX forward slash paths', () => {
      const match = matchRule(noDomainIdFallbacks, fallbackCode);
      expect(match).not.toBeNull();
      if (match && noDomainIdFallbacks.check) {
        const isViolation = noDomainIdFallbacks.check(
          fallbackCode,
          match,
          'src/logic/pokemon/pokemonFieldAbilities.ts'
        );
        expect(isViolation).toBe(true);
      }
    });

    it('does not flag clean domain code without fallbacks', () => {
      const match = matchRule(noDomainIdFallbacks, cleanCode);
      expect(match).toBeNull();
    });
  });
});
