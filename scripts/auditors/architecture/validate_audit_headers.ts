/**
 * scripts/auditors/architecture/validate_audit_headers.ts
 *
 * ILLEGAL AUDIT HEADERS & FILE-LEVEL SUPPRESSIONS AUDITOR (Node.js 26+)
 *
 * Enforces the project's Absolute Prohibition on File-Level Audit Ignores
 * and Zero-Ignore policies across the codebase:
 *   - Detects fallow file-level ignore directives.
 *   - Detects whole-file eslint-disable blocks.
 *   - Detects banned TypeScript compiler bypasses (@ts-nocheck, @ts-ignore, @ts-expect-error).
 *   - Detects auditor escape hatches misused as standalone file header comments.
 *   - Strictly respects project-level DIRECTORY IGNORES.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/architecture/validate_audit_headers.ts
 *   npm run validate:audit-headers
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';
import type { FindingSeverity } from '../../lib/auditContract.ts';

enableCompileCache();

export const MAX_HEADER_LINES_CHECK = 10;

export type HeaderRuleId =
  | 'file-level-fallow-ignore'
  | 'file-level-eslint-disable'
  | 'banned-ts-suppression'
  | 'header-auditor-escape';

export interface HeaderViolation {
  readonly file: string;
  readonly line: number;
  readonly ruleId: HeaderRuleId;
  readonly message: string;
  readonly context: string;
  readonly severity: FindingSeverity;
}

export interface AuditHeadersResult {
  readonly filesScanned: number;
  readonly violations: readonly HeaderViolation[];
  readonly passed: boolean;
  readonly countsByRule: Record<string, number>;
}

import {
  CANONICAL_IGNORE_DIRS,
  isPathIgnored,
  loadFallowIgnorePatterns,
  collectRepositoryFiles
} from '../../lib/auditorBase.ts';

export { CANONICAL_IGNORE_DIRS, isPathIgnored, loadFallowIgnorePatterns };

const FALLOW_IGNORE_FILE_REGEX = /^\s*\/\/\s*fallow-ignore-file\b/i;
const TS_SUPPRESSION_REGEX = /^\s*\/\/\s*@ts-(nocheck|ignore|expect-error)\b/i;
const ESLINT_DISABLE_BLOCK_REGEX = /^\s*\/\*\s*eslint-disable\b(?!\s*-(next-line|line)\b)/i;
const ESLINT_DISABLE_TEMPLATE_REGEX = /^\s*<!--\s*eslint-disable\b(?!\s*-(next-line|line)\b)/i;
const STANDALONE_ESCAPE_HATCHES_REGEX = /^\s*\/\/\s*(domain-ok|singleton-ok|no-magic|magic-ok|number-ok|string-ok|any-ok|boolean-ok|type-ok|alias-ok|value-ok|const-ok|o1-ok|linear-search-ok|map-ok|promise-ok|import-ok|result-ok|brand-ok|no-domain|text-ok)\b\s*$/i;

/**
 * Validates that a path component is safe against path traversal.
 */
function assertSafePathComponent(component: string): void {
  if (component.includes('..')) {
    throw new Error(`Path traversal attempt detected in path component: ${component}`);
  }
}

/**
 * Scans file contents for illegal suppression headers or file-level ignores.
 */
export function scanFileForIllegalHeaders(filePath: string, content: string): HeaderViolation[] {
  const violations: HeaderViolation[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();

    // 1. Check for // fallow-ignore-file starting the comment line
    if (FALLOW_IGNORE_FILE_REGEX.test(rawLine)) {
      violations.push({
        file: filePath,
        line: lineNum,
        ruleId: 'file-level-fallow-ignore',
        message: `Cabecera ilegal 'fallow-ignore-file' detectada. Está ESTRICTAMENTE PROHIBIDO silenciar auditorías para archivos completos. Resuelve el problema en el código o excluye el directorio a nivel de configuración global.`,
        context: trimmed,
        severity: 'error'
      });
      continue;
    }

    // 2. Check for @ts-nocheck, @ts-ignore, @ts-expect-error starting the comment line
    if (TS_SUPPRESSION_REGEX.test(rawLine)) {
      violations.push({
        file: filePath,
        line: lineNum,
        ruleId: 'banned-ts-suppression',
        message: `Supresión de TypeScript detectada ('@ts-ignore/@ts-nocheck/@ts-expect-error'). Prohibido por la política 'Zero-Ignore'.`,
        context: trimmed,
        severity: 'error'
      });
      continue;
    }

    // 3. Check for file-level / block-level /* eslint-disable */
    if (ESLINT_DISABLE_BLOCK_REGEX.test(rawLine)) {
      violations.push({
        file: filePath,
        line: lineNum,
        ruleId: 'file-level-eslint-disable',
        message: `Bloque '/* eslint-disable */' a nivel de archivo detectado. Usa 'eslint-disable-next-line' acotado a la línea específica únicamente cuando esté estrictamente justificado.`,
        context: trimmed,
        severity: 'error'
      });
      continue;
    }

    // Check for template-level <!-- eslint-disable -->
    if (ESLINT_DISABLE_TEMPLATE_REGEX.test(rawLine)) {
      violations.push({
        file: filePath,
        line: lineNum,
        ruleId: 'file-level-eslint-disable',
        message: `Directiva '<!-- eslint-disable -->' a nivel de template detectada. Evita deshabilitar reglas en templates enteros.`,
        context: trimmed,
        severity: 'error'
      });
      continue;
    }

    // 4. Check for standalone escape hatches in header lines
    if (lineNum <= MAX_HEADER_LINES_CHECK && STANDALONE_ESCAPE_HATCHES_REGEX.test(rawLine)) {
      violations.push({
        file: filePath,
        line: lineNum,
        ruleId: 'header-auditor-escape',
        message: `Anotación de escape '${trimmed}' usada indebidamente como cabecera de archivo. Las anotaciones de escape deben añadirse únicamente al final de sentencias de código activas.`,
        context: trimmed,
        severity: 'error'
      });
      continue;
    }
  }

  return violations;
}

/**
 * Full repository audit runner for illegal headers and suppressions.
 */
export function auditAuditHeaders(targetDir = process.cwd()): AuditHeadersResult {
  assertSafePathComponent(targetDir);
  const extraIgnorePatterns = loadFallowIgnorePatterns(targetDir);
  const canonicalRoots = ['src', 'scripts', 'tests', 'database', 'supabase'] as const;
  const rootsToScan = canonicalRoots
    .map(r => path.resolve(targetDir, r))
    .filter(p => fs.existsSync(p));

  const allFiles: string[] = []; // no-domain
  for (const root of rootsToScan) {
    allFiles.push(...collectRepositoryFiles(root, targetDir, extraIgnorePatterns));
  }

  const violations: HeaderViolation[] = [];
  const countsByRule: Record<string, number> = {
    'file-level-fallow-ignore': 0,
    'file-level-eslint-disable': 0,
    'banned-ts-suppression': 0,
    'header-auditor-escape': 0
  };

  for (const file of allFiles) {
    const relPath = path.relative(targetDir, file).split(path.sep).join(path.posix.sep);
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const fileViolations = scanFileForIllegalHeaders(relPath, content);
      for (const v of fileViolations) {
        violations.push(v);
        countsByRule[v.ruleId] = (countsByRule[v.ruleId] || 0) + 1;
      }
    } catch {
      // Ignorar errores de lectura en archivos bloqueados
    }
  }

  return {
    filesScanned: allFiles.length,
    violations,
    passed: violations.length === 0,
    countsByRule
  };
}

// Direct CLI Execution Integration
if (process.argv[1] && (process.argv[1].endsWith('validate_audit_headers.ts') || process.argv[1].endsWith('validate_audit_headers.js'))) {
  const context = setupValidation({
    title: 'Audit Headers & Suppression Validator',
    id: 'validate_audit_headers',
    family: 'architecture'
  });

  context.logProgress('Scanning repository for illegal file-level audit ignores and suppression headers...');

  const result = auditAuditHeaders(process.cwd());

  for (const v of result.violations) {
    if (v.severity === 'error') {
      context.addError(v.message, v.file, v.line, v.context, v.ruleId);
    } else {
      context.addWarning(v.message, v.file, v.line, v.context, v.ruleId);
    }
  }

  context.setMetric('Files Scanned', result.filesScanned);
  context.setMetric('Fallow File Ignores', result.countsByRule['file-level-fallow-ignore'] || 0);
  context.setMetric('ESLint File Disables', result.countsByRule['file-level-eslint-disable'] || 0);
  context.setMetric('Banned TS Suppressions', result.countsByRule['banned-ts-suppression'] || 0);
  context.setMetric('Header Escape Hatches', result.countsByRule['header-auditor-escape'] || 0);

  const errors = result.violations.filter(v => v.severity === 'error').map(v => `${v.file}:${v.line} [${v.ruleId}] ${v.message}`);
  const warnings = result.violations.filter(v => v.severity === 'warning').map(v => `${v.file}:${v.line} [${v.ruleId}] ${v.message}`);

  await context.finish(
    {
      'Files Scanned': result.filesScanned,
      'Total Violations': result.violations.length
    },
    errors,
    warnings
  );
}
