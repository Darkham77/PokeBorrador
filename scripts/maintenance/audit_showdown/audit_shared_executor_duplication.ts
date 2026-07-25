import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.js';

/**
 * Script de Auditoría de Código Compartido (100% Shared Execution)
 * Verifica que simuladores e2e y replayers headless importen el mismo showdownExecutor.ts sin duplicar lógica de selección.
 */
export interface ExecutorDuplicationResult {
  duplicatedExecutorFiles: string[];
}

export function auditSharedExecutorDuplication(testsDir: string): ExecutorDuplicationResult {
  const duplicatedExecutorFiles: string[] = [];
  if (!existsSync(testsDir)) return { duplicatedExecutorFiles };

  const files = getFilesRecursively(testsDir).filter(f => f.endsWith('.ts') && (f.includes('replayer') || f.includes('simulation')));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (!content.includes('showdownExecutor') && /makeChoice\s*\(|sendChoice\s*\(/i.test(content)) {
      duplicatedExecutorFiles.push(file);
    }
  }

  return { duplicatedExecutorFiles };
}
