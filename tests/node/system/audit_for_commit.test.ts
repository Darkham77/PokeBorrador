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

  it('debe marcar una advertencia de 500 líneas como heredada si el archivo en origin/main ya superaba 500 líneas', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 1,
        message: 'Mantenibilidad (500/1000 Rule): El archivo tiene 550 líneas reales de código (SLOC).',
        context: 'SLOC: 550',
        severity: 'warning',
        ruleId: 'project-audit'
      }
    ];

    const originContent = '\n'.repeat(560); // 561 líneas en origin
    const result = filterNewWarnings(localWarnings, [], originContent, filePath);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.isNew, false);
  });

  it('debe marcar nuevas sugerencias de exports de Fallow como nuevas (isNew: true) y complejidad como métrica de salud (isNew: false)', () => {
    const localWarnings: Violation[] = [
      {
        file: filePath,
        line: 10,
        message: "Sugerencia de calidad (Fallow): Export no usado: 'MY_CONST'",
        context: 'Intelligent Project Audit',
        severity: 'warning',
        ruleId: 'Fallow: Calidad / Dead Code'
      },
      {
        file: filePath,
        line: 20,
        message: "Sugerencia de complejidad (Fallow): Complejidad ciclomática 15",
        context: 'Intelligent Project Audit',
        severity: 'warning',
        ruleId: 'Fallow: Complejidad'
      }
    ];

    const result = filterNewWarnings(localWarnings, [], 'const x = 1;', filePath);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]?.isNew, true);
    assert.strictEqual(result[1]?.isNew, false);
  });
});
