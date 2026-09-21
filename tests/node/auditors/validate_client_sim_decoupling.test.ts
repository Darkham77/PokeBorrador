/**
 * tests/node/auditors/validate_client_sim_decoupling.test.ts
 *
 * Unit tests for ValidateClientSimDecouplingAuditor & Client Showdown Decoupling.
 */

import { describe, it, expect } from 'vitest';
import {
  isWorkerBoundaryFile,
  scanSourceForSimImports,
  checkViteConfigForSimChunks,
  checkDistAssetsForSimChunks
} from '../../../scripts/auditors/architecture/validate_client_sim_decoupling.ts';

describe('ValidateClientSimDecouplingAuditor', () => {
  describe('isWorkerBoundaryFile', () => {
    it('correctly identifies web worker and worker boundary paths', () => {
      expect(isWorkerBoundaryFile('src/logic/battle/showdown.worker.ts')).toBe(true);
      expect(isWorkerBoundaryFile('src/logic/render/render.worker.ts')).toBe(true);
      expect(isWorkerBoundaryFile('src/logic/battle/worker/spreadPatch.ts')).toBe(true);
      expect(isWorkerBoundaryFile('src/logic/battle/worker/helper.ts')).toBe(true);
    });

    it('returns false for standard client application code', () => {
      expect(isWorkerBoundaryFile('src/logic/battle/showdownAdapter.ts')).toBe(false);
      expect(isWorkerBoundaryFile('src/logic/pvp/pvpTeamHelper.ts')).toBe(false);
      expect(isWorkerBoundaryFile('src/components/battle/BattleArena.vue')).toBe(false);
      expect(isWorkerBoundaryFile('src/stores/battle.ts')).toBe(false);
    });
  });

  describe('scanSourceForSimImports', () => {
    it('allows compile-time pure type imports from @pkmn/sim', () => {
      const code = `
        import type { SideID } from '@pkmn/sim';
        import type { PokemonSet, ID, StatsTable } from '@pkmn/sim';
        import type { GenderName } from '@pkmn/sim';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/adapter.ts');
      expect(issues).toHaveLength(0);
    });

    it('allows inline type imports where all specifiers are types', () => {
      const code = `
        import { type SideID, type PokemonSet } from '@pkmn/sim';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/adapter.ts');
      expect(issues).toHaveLength(0);
    });

    it('allows multi-line inline type imports without false positives', () => {
      const code = `
        import {
          type SideID,
          type PokemonSet,
          type GenderName
        } from '@pkmn/sim';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/adapter.ts');
      expect(issues).toHaveLength(0);
    });

    it('flags runtime value imports of Dex or Battle from @pkmn/sim as ERROR', () => {
      const code = `
        import { Dex, Battle } from '@pkmn/sim';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/showdownAdapter.ts');
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('client-sim-value-import');
      expect(issues[0]?.message).toContain('Dex, Battle');
    });

    it('flags mixed inline specifiers where a value is imported alongside a type', () => {
      const code = `
        import { type SideID, Dex } from '@pkmn/sim';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/adapter.ts');
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('client-sim-value-import');
      expect(issues[0]?.message).toContain('Dex');
    });

    it('flags default or unparsed imports from @pkmn/sim', () => {
      const code = `
        import Sim from '@pkmn/sim';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/adapter.ts');
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('client-sim-value-import');
    });

    it('flags any import of @pkmn/randoms in client code', () => {
      const code = `
        import { TeamGenerators } from '@pkmn/randoms';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/rivalTeamGenerator.ts');
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('client-randoms-value-import');
    });

    it('ignores imports inside worker boundary files', () => {
      const code = `
        import { Battle, Pokemon, Side } from '@pkmn/sim';
        import { TeamGenerators } from '@pkmn/randoms';
      `;
      const issues = scanSourceForSimImports(code, 'src/logic/battle/showdown.worker.ts');
      expect(issues).toHaveLength(0);
    });
  });

  describe('checkViteConfigForSimChunks', () => {
    it('flags client manualChunks configuring vendor-pkmn-sim or vendor-randoms', () => {
      const mockViteConfig = `
        export default defineConfig({
          worker: {
            rollupOptions: {
              output: {
                manualChunks(id) {
                  if (id.includes('@pkmn/sim')) return 'worker-vendor-pkmn-sim';
                }
              }
            }
          },
          build: {
            rollupOptions: {
              output: {
                manualChunks(id) {
                  if (id.includes('node_modules/@pkmn/sim')) {
                    return 'vendor-pkmn-sim';
                  }
                  if (id.includes('node_modules/@pkmn/randoms')) {
                    return 'vendor-randoms';
                  }
                }
              }
            }
          }
        });
      `;
      const issues = checkViteConfigForSimChunks(mockViteConfig);
      expect(issues).toHaveLength(2);
      expect(issues[0]?.snippet).toContain("return 'vendor-pkmn-sim'");
      expect(issues[1]?.snippet).toContain("return 'vendor-randoms'");
    });
  });

  describe('checkDistAssetsForSimChunks', () => {
    it('returns empty array when directory does not exist', () => {
      const nonExistentDir = '/tmp/non-existent-dist-assets-dir-' + Date.now();
      expect(checkDistAssetsForSimChunks(nonExistentDir)).toEqual([]);
    });
  });
});
