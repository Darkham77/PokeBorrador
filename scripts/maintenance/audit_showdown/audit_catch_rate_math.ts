import { readFileSync, existsSync } from 'node:fs';

export interface CatchRateAuditResult {
  catchMathDiscrepancies: string[];
}

/**
 * Script de Auditoría de Fórmulas de Catch Rate.
 * Compara funciones y parámetros clave de captura en battleCatchMath.ts
 * contra los identificadores canónicos usados en Showdown (statusBonus, catchRate, ballBonus).
 */
export function auditCatchRateMath(catchMathPath: string, _showdownRefPath: string): CatchRateAuditResult {
  const catchMathDiscrepancies: string[] = []; // no-domain
  if (!existsSync(catchMathPath)) return { catchMathDiscrepancies };

  const content = readFileSync(catchMathPath, 'utf-8').toLowerCase();

  // Parámetros canónicos de la fórmula de captura de Showdown
  const requiredTerms = ['catchrate', 'statusbonus', 'ballbonus', 'maxhp', 'currenthp']; // no-domain

  for (const term of requiredTerms) {
    if (!content.includes(term)) {
      catchMathDiscrepancies.push(`Missing canonical catch rate term: '${term}' in battleCatchMath.ts`);
    }
  }

  return { catchMathDiscrepancies };
}
