import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.js';

export interface SilentFallbackResult {
  fallbackViolations: string[];
}

/**
 * Script de Auditoría de Fallbacks Silenciosos (Strict Zero-Fallback Mandate).
 * Escanea todo src/ buscando patrones de auto-healing, objetos vacíos como fallback,
 * catch vacíos o valores por defecto en resoluciones de ID de dominio.
 * No se limita a funciones específicas — detecta el patrón de fallback genéricamente.
 */
export function auditSilentFallbackPatterns(srcDir: string): SilentFallbackResult {
  const fallbackViolations: string[] = []; // no-domain
  if (!existsSync(srcDir)) return { fallbackViolations };

  const files = getFilesRecursively(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.vue'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    const hasFallback =
      // Patrón: lookup() || {} (fallback a objeto vacío)
      /\w+By(?:Id|Name|Key)\([^)]*\)\s*\|\|\s*\{\s*\}/i.test(content) ||
      // Patrón: lookup() ?? {} (nullish fallback a objeto vacío)
      /\w+By(?:Id|Name|Key)\([^)]*\)\s*\?\?\s*\{\s*\}/i.test(content) ||
      // Patrón: sanitizePokemon() — auto-healing explícitamente prohibido
      /sanitizePokemon\s*\(/i.test(content) ||
      // Patrón: catch silencioso que no relanza ni registra
      /catch\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*)?\s*\}/i.test(content) ||
      // Patrón: return '' como fallback en lookup de ID
      /(?:getPoke|getItem|getMove|getAbility)\([^)]*\)\s*\?\?\s*['"]{2}/i.test(content);

    if (hasFallback) {
      fallbackViolations.push(file);
    }
  }

  return { fallbackViolations };
}
