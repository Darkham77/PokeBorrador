import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getFilesRecursively } from './audit_helpers.ts';

export interface SchemaAuditResult {
  missingFieldsInTypes: string[];
  mismatchedTypes: string[];
}

/**
 * Script de Auditoría de Request Schema entre Showdown y las interfaces en src/.
 * Extrae dinámicamente los campos del Request JSON generados por Showdown (side.ts)
 * y verifica que estén presentes en los tipos TypeScript del proyecto (src/types/).
 */
export function auditRequestSchema(showdownSimPath: string, srcTypesPath: string): SchemaAuditResult {
  const missingFieldsInTypes: string[] = []; // no-domain
  const mismatchedTypes: string[] = []; // no-domain

  const sideFile = join(showdownSimPath, 'side.ts');
  if (!existsSync(sideFile) || !existsSync(srcTypesPath)) {
    return { missingFieldsInTypes, mismatchedTypes };
  }

  const sideContent = readFileSync(sideFile, 'utf-8');

  // Extrae dinámicamente los campos del objeto de request que Showdown genera en getRequestData()
  const requestFieldMatches = Array.from(sideContent.matchAll(/(\w+):\s*(?:this\.|pokemon\.|{)/g))
    .map(m => m[1] || '')
    .filter(Boolean);
  const canonicalRequestFields = [...new Set(requestFieldMatches)].filter(f => f && f.length > 2);

  // Agrega el contenido de todos los archivos de tipos del proyecto
  const typeFiles = getFilesRecursively(srcTypesPath).filter(f => f.endsWith('.ts'));
  let combinedTypes = '';
  for (const file of typeFiles) {
    combinedTypes += `\n${readFileSync(file, 'utf-8')}`;
  }

  for (const field of canonicalRequestFields) {
    if (field && !combinedTypes.includes(field)) {
      missingFieldsInTypes.push(field);
    }
  }

  return { missingFieldsInTypes, mismatchedTypes };
}
