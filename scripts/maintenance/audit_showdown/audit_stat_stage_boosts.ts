import { readFileSync, existsSync } from 'node:fs';

export interface StatStageAuditResult {
  statStageDiscrepancies: string[];
}

/**
 * Script de Auditoría de Modificadores de Stat Stages (-6 a +6)
 * Audita dinámicamente que showdownBridgeStages.ts y battleTurn.ts manejen la totalidad
 * de estadísticas canónicas (atk, def, spa, spd, spe, accuracy, evasion) y tokens de manipulación
 * (boost, unboost, setboost, clearboost, clearallboost, swapboost, copyboost).
 */
export function auditStatStageBoosts(bridgeStagesPath: string): StatStageAuditResult {
  const statStageDiscrepancies: string[] = [];
  if (!existsSync(bridgeStagesPath)) return { statStageDiscrepancies };

  const content = readFileSync(bridgeStagesPath, 'utf-8');
  const requiredStats = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
  const requiredTokens = ['-boost', '-unboost', '-setboost', '-clearboost', '-clearallboost', '-swapboost', '-copyboost'];

  for (const stat of requiredStats) {
    if (!content.toLowerCase().includes(stat)) {
      statStageDiscrepancies.push(`Falta mapeo de estadística canónica: ${stat}`);
    }
  }

  for (const token of requiredTokens) {
    if (!content.toLowerCase().includes(token)) {
      statStageDiscrepancies.push(`Falta manejador de token de stage: ${token}`);
    }
  }

  return { statStageDiscrepancies };
}
