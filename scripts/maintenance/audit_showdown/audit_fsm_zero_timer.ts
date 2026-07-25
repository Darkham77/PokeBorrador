import { readFileSync } from 'node:fs';
import { safeScanDirectoryFiles } from './audit_helpers.js';

/**
 * Script de Auditoría Zero-Timer & Determinismo en FSM / Simulaciones
 * Escanea FSMs y tests para detectar uso prohibido de setTimeout / page.waitForTimeout.
 */
export interface TimerAuditResult {
  timerViolations: string[];
}

export function auditFSMZeroTimer(targetDir: string): TimerAuditResult {
  const timerViolations: string[] = [];
  const files = safeScanDirectoryFiles(targetDir);

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (/setTimeout\(/i.test(content) || /waitForTimeout\(/i.test(content)) {
      timerViolations.push(file);
    }
  }

  return { timerViolations };
}
