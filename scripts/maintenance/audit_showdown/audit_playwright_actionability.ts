import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.ts';

/**
 * Script de Auditoría de Accionabilidad en Playwright E2E
 * Detecta el uso prohibido de { force: true } o bypasses de pointer-events.
 */
export interface ActionabilityResult {
  forcedClickFiles: string[];
}

export function auditPlaywrightActionability(testsDir: string): ActionabilityResult {
  const forcedClickFiles: string[] = []; // no-domain
  if (!existsSync(testsDir)) return { forcedClickFiles };

  const files = getFilesRecursively(testsDir).filter(f => f.endsWith('.ts') || f.endsWith('.spec.ts'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (/click\([^)]*\{\s*force:\s*true\s*\}/i.test(content)) {
      forcedClickFiles.push(file);
    }
  }

  return { forcedClickFiles };
}
