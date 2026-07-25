import { readFileSync, existsSync } from 'node:fs';

export interface MoveParityResult {
  missingMoveExecutors: string[];
}

/**
 * Script de Auditoría Dinámica de Movimientos Especiales de Showdown vs Bridge del Proyecto
 * Detecta efectos secundarios especiales en data/moves.ts de Showdown
 * y verifica que se manejen dinámicamente en el bridge o motor de batalla.
 */
export function auditShowdownMoveMechanics(showdownMovesPath: string, moveExecutorPath: string): MoveParityResult {
  const missingMoveExecutors: string[] = [];
  if (!existsSync(showdownMovesPath) || !existsSync(moveExecutorPath)) {
    return { missingMoveExecutors };
  }

  const showdownContent = readFileSync(showdownMovesPath, 'utf-8');
  const executorContent = readFileSync(moveExecutorPath, 'utf-8').toLowerCase();

  const movesWithSpecialSecondary = Array.from(showdownContent.matchAll(/([a-z0-9]+):\s*\{[^}]*secondary:\s*\{/gi)).map(m => m[1]);

  for (const moveId of movesWithSpecialSecondary) {
    if (moveId && !executorContent.includes(moveId.toLowerCase())) {
      missingMoveExecutors.push(moveId);
    }
  }

  return { missingMoveExecutors };
}
