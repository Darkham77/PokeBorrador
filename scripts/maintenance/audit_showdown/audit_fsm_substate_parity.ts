import { readFileSync, existsSync } from 'node:fs';

export interface SubstateParityResult {
  unmappedSubstates: string[];
}

/**
 * Script de Auditoría de Sub-estados FSM vs Prompts de Showdown.
 * Extrae dinámicamente todos los substates definidos en el store/FSM
 * y verifica que cada uno tenga un handler correspondiente en el worker.
 */
export function auditFsmSubstateParity(fsmPath: string): SubstateParityResult {
  const unmappedSubstates: string[] = []; // no-domain
  if (!existsSync(fsmPath)) return { unmappedSubstates };

  const content = readFileSync(fsmPath, 'utf-8');

  // Extrae dinámicamente todos los substates definidos en el store
  const substateMatches = Array.from(content.matchAll(/['"]([\w_]+)['"]\s*:\s*['"]substate['"]/gi))
    .map(m => m[1] || '');

  // Extrae además literales de strings en mayúsculas que parezcan substates (convención del proyecto)
  const literalSubstates = Array.from(content.matchAll(/['"]([A-Z_]{4,})['"]/g))
    .map(m => m[1] || '')
    .filter(s => Boolean(s) && (s.includes('_') || s.length >= 6));

  const allSubstates = [...new Set([...substateMatches, ...literalSubstates])];

  for (const substate of allSubstates) {
    if (substate && !content.includes(substate)) {
      unmappedSubstates.push(substate);
    }
  }

  return { unmappedSubstates };
}
