import { readFileSync } from 'node:fs';
import { safeScanDirectoryFiles } from './audit_helpers.ts';

/**
 * Script de Auditoría de Compatibilidad de 4 Asientos (Mandato Mandatorio)
 * Detecta hardcodes de 2 asientos ('p1'/'p2') o lógica ramificada fija en lugar de bucles dinámicos sobre 'p1'..'p4'.
 */
export interface SeatAuditResult {
  hardcodedTwoSeatFiles: string[];
}

export function audit4SeatCompatibility(targetDir: string): SeatAuditResult {
  const hardcodedTwoSeatFiles: string[] = []; // no-domain
  const files = safeScanDirectoryFiles(targetDir);

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Busca patrones explícitos de 2 asientos sin contemplar p3/p4
    if (/const\s+seats\s*=\s*\[['"]p1['"]\s*,\s*['"]p2['"]\]/i.test(content) ||
        /typeof\s+seat\s*===\s*['"]p1['"]\s*\|\|\s*seat\s*===\s*['"]p2['"]/i.test(content)) {
      hardcodedTwoSeatFiles.push(file);
    }
  }

  return { hardcodedTwoSeatFiles };
}
