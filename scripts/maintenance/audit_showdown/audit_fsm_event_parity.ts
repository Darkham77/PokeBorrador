import { readFileSync, existsSync } from 'node:fs';

/**
 * Script de Auditoría de Paridad de Eventos FSM y Showdown Worker
 * Compara los eventos parseados en showdown.worker.ts con las transiciones
 * de FSM registradas en src/stores/battle.ts y src/machines/.
 */
export interface FSMParityResult {
  unhandledWorkerEvents: string[];
  unhandledFSMStates: string[];
}

export function auditFSMEventParity(workerPath: string, battleStorePath: string): FSMParityResult {
  const unhandledWorkerEvents: string[] = [];
  const unhandledFSMStates: string[] = [];

  if (!existsSync(workerPath) || !existsSync(battleStorePath)) {
    return { unhandledWorkerEvents, unhandledFSMStates };
  }

  const workerContent = readFileSync(workerPath, 'utf-8');
  const storeContent = readFileSync(battleStorePath, 'utf-8');

  // Extrae casos del worker y listeners del store
  const workerCases = Array.from(workerContent.matchAll(/case\s+['"]([a-z0-9_-]+)['"]:/gi))
    .map(m => m[1] || '')
    .filter(Boolean);
  const storeHandlers = Array.from(storeContent.matchAll(/on\(['"]([a-z0-9_-]+)['"]/gi))
    .map(m => m[1] || '')
    .filter(Boolean);

  for (const wCase of workerCases) {
    if (!storeHandlers.includes(wCase) && !unhandledWorkerEvents.includes(wCase)) {
      unhandledWorkerEvents.push(wCase);
    }
  }

  return { unhandledWorkerEvents, unhandledFSMStates };
}
