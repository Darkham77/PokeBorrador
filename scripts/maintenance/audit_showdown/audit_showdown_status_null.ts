import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.ts';

export interface StatusNullAuditResult {
  statusNullViolations: string[];
}

/**
 * Script de Auditoría de Asignación de Status en Instancias de Simulador Showdown.
 * Restricción Técnica: Asignar `null` a la propiedad `status` en instancias del simulador Showdown (@pkmn/sim)
 * provoca crashes por desreferenciación (ej. calling .startsWith en null).
 * Debe utilizarse estrictamente cadena vacía '' en las instancias del simulador.
 */
export function auditShowdownStatusNull(targetDir: string): StatusNullAuditResult {
  const statusNullViolations: string[] = []; // no-domain
  if (!existsSync(targetDir)) return { statusNullViolations };

  const files = getFilesRecursively(targetDir).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Detecta asignaciones de status = null en cualquier referencia a objeto de tipo Pokemon/Sim/Showdown
    if (/\.status\s*=\s*null/i.test(content) && (file.includes('showdown') || file.includes('sim') || file.includes('executor'))) {
      statusNullViolations.push(file);
    }
  }

  return { statusNullViolations };
}
