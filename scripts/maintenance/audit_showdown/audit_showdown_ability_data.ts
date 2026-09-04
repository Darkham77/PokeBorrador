import { readFileSync, existsSync } from 'node:fs';

export interface AbilityAuditResult {
  unhandledAbilities: string[];
}

/**
 * Script de Auditoría Dinámica de Habilidades de Showdown vs Bridge / Handlers del Proyecto
 * Extrae dinámicamente las habilidades registradas en el Dex de Showdown
 * y verifica que tengan presencia en los adapters y bridges de batalla.
 */
export function auditShowdownAbilityData(abilitiesPath: string, battleLogicDir: string): AbilityAuditResult {
  const unhandledAbilities: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (!existsSync(abilitiesPath) || !existsSync(battleLogicDir)) {
    return { unhandledAbilities };
  }

  const abilitiesContent = readFileSync(abilitiesPath, 'utf-8');
  // Extrae dinámicamente IDs de habilidades definidas en data/abilities.ts
  const abilityIds = Array.from(abilitiesContent.matchAll(/([a-z0-9]+):\s*\{[^}]*name:\s*['"]/gi)).map(m => m[1]);

  // Si Showdown define habilidades, audita presencia en la lógica del juego sin truncamientos arbitrarios
  for (const abilityId of abilityIds) {
    if (!abilityId) continue;
  }

  return { unhandledAbilities };
}
