/**
 * tests/node/system/audit_for_commit.test.ts
 * 
 * VITEST (vite-node) — node environment
 * 
 * Verifica el filtrado de advertencias (warnings) de audit_for_commit.ts.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { filterNewWarnings } from '../../../scripts/maintenance/audit_for_commit.ts';
import type { Violation } from '../../../scripts/maintenance/audit_for_commit.ts';

describe('Warnings Diff Logic (audit_for_commit.ts)', () => {
  const filePath = 'src/components/TestComponent.vue';

  it('debe marcar todas las advertencias como nuevas si el archivo no existe en origin/main (originContent es null)', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 10,
        message: 'Unused variable x',
        context: 'const x = 1;',
        severity: 'warning',
        ruleId: 'no-unused-vars'
      }
    ];

    const result = filterNewWarnings(localWarnings, [], null, filePath);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.isNew, true);
  });

  it('debe marcar una advertencia como heredada (isNew: boolean) si ya existía en origin/main para ESLint', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 10,
        message: 'Unused variable x',
        context: 'const x = 1;',
        severity: 'warning',
        ruleId: 'no-unused-vars'
      }
    ];

    const originWarnings: Violation[] = [
      {
        file: filePath,
        line: 8, // La línea puede haber cambiado
        message: 'Unused variable x',
        context: 'const x = 1;',
        severity: 'warning',
        ruleId: 'no-unused-vars'
      }
    ];

    const result = filterNewWarnings(localWarnings, originWarnings, 'const x = 1;', filePath);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.isNew, false);
  });

  it('debe marcar una advertencia como nueva (isNew: boolean) si no existía en origin/main para ESLint', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 10,
        message: 'Unused variable x',
        context: 'const x = 1;',
        severity: 'warning',
        ruleId: 'no-unused-vars'
      }
    ];

    const originWarnings: Violation[] = []; // Sin advertencias previas

    const result = filterNewWarnings(localWarnings, originWarnings, 'const x = 1;', filePath);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.isNew, true);
  });

  it('debe marcar una advertencia de auditoría del proyecto como heredada si su contexto existe en originContent', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 15,
        message: 'Falta will-change',
        context: 'filter: blur(5px);',
        severity: 'warning',
        ruleId: 'project-audit'
      }
    ];

    const originContent = 'div { filter: blur(5px); }';

    const result = filterNewWarnings(localWarnings, [], originContent, filePath);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.isNew, false);
  });

  it('debe marcar una advertencia de auditoría del proyecto como nueva si su contexto NO existe en originContent', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 15,
        message: 'Falta will-change',
        context: 'filter: blur(5px);',
        severity: 'warning',
        ruleId: 'project-audit'
      }
    ];

    const originContent = 'div { display: flex; }'; // No contiene el contexto 'filter: blur(5px);'

    const result = filterNewWarnings(localWarnings, [], originContent, filePath);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.isNew, true);
  });
});
