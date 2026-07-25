import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.js';

/**
 * Script de Auditoría de SSoT de Generación Activa
 * Escanea el código para detectar si hay hardcoding de 'gen5', 'gen9', etc., fuera de tests unitarios específicos.
 */
export interface GenAuditResult {
  hardcodedGenFiles: string[];
}

export function auditActiveGenSSoT(targetDir: string): GenAuditResult {
  const hardcodedGenFiles: string[] = [];
  if (!existsSync(targetDir)) return { hardcodedGenFiles };

  const files = getFilesRecursively(targetDir).filter(f => f.endsWith('.ts') && !f.includes('.spec.') && !f.includes('.test.'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (/['"]gen[1-9]customgame['"]/i.test(content) || /format:\s*['"]gen[1-9]/i.test(content)) {
      hardcodedGenFiles.push(file);
    }
  }

  return { hardcodedGenFiles };
}
