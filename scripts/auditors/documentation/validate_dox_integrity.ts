/**
 * scripts/auditors/documentation/validate_dox_integrity.ts
 *
 * DOX & AGENTS.md HIERARCHY AND INTEGRITY AUDITOR (Node.js 26+ Native)
 *
 * Enforces documentation governance and link integrity across all AGENTS.md files:
 *   1. Verifies that every code directory contains an AGENTS.md file.
 *   2. Verifies that child AGENTS.md files are registered in their nearest parent index.
 *   3. Enforces relative links (forbids absolute paths).
 *   4. Verifies target files exist on disk (no broken links).
 *   5. Forbids linking to git-ignored files (.gitignore).
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/documentation/validate_dox_integrity.ts
 *   npm run validate:dox-integrity
 */

import { enableCompileCache } from 'node:module';
import { BaseAuditor, CANONICAL_IGNORE_DIRS } from '../../lib/auditorBase.ts';
import { checkDoxIntegrity } from '../../maintenance/analyzers/doxAnalyzer.ts';

enableCompileCache();

export type DoxRuleId =
  | 'dox-missing-agents-md'
  | 'dox-unregistered-child'
  | 'dox-absolute-link'
  | 'dox-broken-link'
  | 'dox-gitignore-target';

export const DOX_RULES: readonly DoxRuleId[] = [
  'dox-missing-agents-md',
  'dox-unregistered-child',
  'dox-absolute-link',
  'dox-broken-link',
  'dox-gitignore-target'
] as const;

export class DoxIntegrityAuditor extends BaseAuditor<DoxRuleId> {
  private readonly rootDir: string;

  constructor(rootDir?: string) {
    super({
      id: 'validate_dox_integrity',
      name: 'DOX & AGENTS.md Integrity Validator',
      description: 'Valida jerarquía, enlaces e integridad de AGENTS.md',
      family: 'documentation',
      ruleIds: DOX_RULES,
      ruleDescriptions: {
        'dox-missing-agents-md': 'Falta archivo AGENTS.md obligatorio en directorio',
        'dox-unregistered-child': 'Archivo AGENTS.md no registrado en índice DOX padre',
        'dox-absolute-link': 'Ruta absoluta prohibida detectada en enlace AGENTS.md',
        'dox-broken-link': 'Enlace roto hacia archivo o recurso inexistente en disco',
        'dox-gitignore-target': 'Enlace hacia archivo o directorio ignorado por Git'
      }
    });
    this.rootDir = rootDir || process.cwd();
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 1, 'Escaneando jerarquía e integridad de índices AGENTS.md...');

    const rawViolations = await checkDoxIntegrity(this.rootDir, new Set(CANONICAL_IGNORE_DIRS));
    this.filesScannedCount = rawViolations.length > 0 ? rawViolations.length : 1;

    for (const v of rawViolations) {
      let ruleId: DoxRuleId = 'dox-missing-agents-md';
      const msg = v.message;

      if (msg.includes('Falta el archivo')) {
        ruleId = 'dox-missing-agents-md';
      } else if (msg.includes('no está registrado en el índice')) {
        ruleId = 'dox-unregistered-child';
      } else if (msg.includes('absolut') || msg.includes('ruta completa')) {
        ruleId = 'dox-absolute-link';
      } else if (msg.includes('roto')) {
        ruleId = 'dox-broken-link';
      } else if (msg.includes('ignorado por Git')) {
        ruleId = 'dox-gitignore-target';
      }

      this.addViolation({
        ruleId,
        severity: v.severity || 'error',
        file: v.file,
        line: v.line || 1,
        message: v.message,
        context: v.context
      });
    }

    this.context.setMetric('Total Violations Found', rawViolations.length);
  }
}

if (process.argv[1] && (
  process.argv[1].endsWith('validate_dox_integrity.ts') ||
  (typeof import.meta.filename === 'string' && process.argv[1] === import.meta.filename)
)) {
  await BaseAuditor.runCli(new DoxIntegrityAuditor());
}
