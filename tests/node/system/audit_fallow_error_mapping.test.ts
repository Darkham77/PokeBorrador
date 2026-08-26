import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { mapFallowJson, getViolationCategory, type FallowAuditData } from '@/../scripts/maintenance/audit_project.ts';

describe('Auditor: Fallow Structural Issues & Error Severity Mapping', () => {
  it('maps circular dependencies as severity error in Fallow audit/dead-code', () => {
    const mockData: FallowAuditData = {
      dead_code: {
        circular_dependencies: [
          {
            path: 'src/logic/db/dbRouter.ts',
            cycle: [
              'src/logic/db/dbRouter.ts',
              'src/logic/db/sqliteRpcEmulation.ts',
              'src/logic/db/rpcEmulations/eventRpc.ts',
              'src/types/system/stores.ts',
              'src/logic/db/dbRouter.ts'
            ]
          }
        ]
      }
    };

    const violations = mapFallowJson('dead-code', mockData);
    assert.strictEqual(violations.length, 1);
    const v = violations[0]!;
    assert.strictEqual(v.severity, 'error');
    assert.match(v.message, /Dependencia circular crítica \(Fallow\)/);
    assert.match(v.message, /src\/logic\/db\/dbRouter\.ts → src\/logic\/db\/sqliteRpcEmulation\.ts/);
    assert.strictEqual(getViolationCategory(v), 'Fallow: Dependencias circulares');
  });

  it('maps orphan/dead files as severity error (Dead Code)', () => {
    const mockData: FallowAuditData = {
      dead_code: {
        unused_files: [
          { path: 'src/logic/battle/actions/moveExecutor.ts' },
          { path: 'src/logic/battle/actions/switchActions.ts' }
        ]
      }
    };

    const violations = mapFallowJson('dead-code', mockData);
    assert.strictEqual(violations.length, 2);
    assert.strictEqual(violations[0]!.severity, 'error');
    assert.strictEqual(violations[1]!.severity, 'error');
    assert.strictEqual(getViolationCategory(violations[0]!), 'Fallow: Archivos huérfanos / Dead Code');
  });

  it('maps stale suppressions as severity error', () => {
    const mockData: FallowAuditData = {
      dead_code: {
        stale_suppressions: [
          {
            path: 'src/logic/battle/battleMinigames.ts',
            line: 3,
            message: 'unused-exports is not a recognized fallow issue kind'
          }
        ]
      }
    };

    const violations = mapFallowJson('dead-code', mockData);
    assert.strictEqual(violations.length, 1);
    const v = violations[0]!;
    assert.strictEqual(v.severity, 'error');
    assert.match(v.message, /Supresión obsoleta de Fallow/);
    assert.strictEqual(getViolationCategory(v), 'Fallow: Supresiones obsoletas');
  });

  it('maps ambiguous duplicate exports as severity error', () => {
    const mockData: FallowAuditData = {
      dead_code: {
        duplicate_exports: [
          {
            path: 'src/logic/battle/battleMinigames.ts',
            export_name: 'BattleMinigame'
          }
        ]
      }
    };

    const violations = mapFallowJson('dead-code', mockData);
    assert.strictEqual(violations.length, 1);
    const v = violations[0]!;
    assert.strictEqual(v.severity, 'error');
    assert.match(v.message, /Export duplicado ambiguo \(Fallow\)/);
    assert.strictEqual(getViolationCategory(v), 'Fallow: Exports duplicados');
  });

  it('maps unused dependencies in package.json as severity error', () => {
    const mockData: FallowAuditData = {
      dead_code: {
        unused_dependencies: [
          { package_name: 'unneeded-package', path: 'package.json', line: 1 }
        ]
      }
    };

    const violations = mapFallowJson('dead-code', mockData);
    assert.strictEqual(violations.length, 1);
    const v = violations[0]!;
    assert.strictEqual(v.severity, 'error');
    assert.match(v.message, /Dependencia de package\.json no usada \(Fallow\)/);
    assert.strictEqual(getViolationCategory(v), 'Fallow: Dependencias no usadas');
  });
});
