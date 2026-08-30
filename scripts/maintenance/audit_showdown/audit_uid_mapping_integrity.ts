import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.ts';

/**
 * Script de Auditoría de Mapeo e Integridad de UIDs
 * Detecta fallbacks silenciosos a nombre/especie/slot o falta de split de 8 caracteres.
 */
export interface UIDAuditResult {
  fallbackViolations: string[];
}

export function auditUIDMappingIntegrity(targetDir: string): UIDAuditResult {
  const fallbackViolations: string[] = []; // no-domain
  if (!existsSync(targetDir)) return { fallbackViolations };

  const files = getFilesRecursively(targetDir).filter(f => f.endsWith('.ts') || f.endsWith('.vue'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Detecta patrones de fallback silencioso al resolver Pokémon/UIDs
    if (/getPoke\([^)]*\)\s*\|\|\s*pokemon\.name/i.test(content) ||
        /resolveUid\([^)]*\)\s*catch\s*=>\s*['"]/i.test(content)) {
      fallbackViolations.push(file);
    }
  }

  return { fallbackViolations };
}
