import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getFilesRecursively } from './audit_helpers.js';

export interface UntestedEffectReport {
  untestedMoves: string[];
  untestedAbilities: string[];
  untestedItems: string[];
}

/**
 * Buscador de Efectos y Mecánicas de Showdown sin Test.
 * Escanea dinámicamente la totalidad de data/ en external/ y verifica
 * contra la totalidad de las suites de test del proyecto.
 */
export function findUntestedShowdownEffects(showdownDataPath: string, testsPath: string): UntestedEffectReport {
  const untestedMoves: string[] = []; // no-domain
  const untestedAbilities: string[] = []; // no-domain
  const untestedItems: string[] = []; // no-domain

  if (!existsSync(showdownDataPath) || !existsSync(testsPath)) {
    return { untestedMoves, untestedAbilities, untestedItems };
  }

  const testFiles = getFilesRecursively(testsPath).filter(f => f.endsWith('.ts') || f.endsWith('.spec.ts'));
  const testBundleContent = testFiles.map(f => readFileSync(f, 'utf-8')).join('\n').toLowerCase();

  const scan = (dataFile: string): string[] => {
    const untested: string[] = []; // no-domain
    const fullPath = join(showdownDataPath, dataFile);
    if (!existsSync(fullPath)) return untested;
    const content = readFileSync(fullPath, 'utf-8');
    const ids = Array.from(content.matchAll(/^\s*([a-z0-9]+):\s*\{/gm)).map(m => m[1]);
    for (const id of ids) {
      if (id && id.length > 2 && !testBundleContent.includes(id)) {
        untested.push(id);
      }
    }
    return untested;
  };

  untestedMoves.push(...scan('moves.ts'));
  untestedAbilities.push(...scan('abilities.ts'));
  untestedItems.push(...scan('items.ts'));

  return { untestedMoves, untestedAbilities, untestedItems };
}
