/**
 * scripts/lib/auditorBase.ts
 * 
 * BASE AUDITOR FRAMEWORK (Node.js 26+ Native)
 * Mandatory base orchestrator for all sub-auditors in scripts/auditors/.
 * Enforces the StandardAuditResult contract:
 *   1. Always outputs the clean Box-Drawing summary table to console.
 *   2. Always writes 100% complete structured JSON to scratch/audits/<family>/<id>.json.
 */

import fs from 'node:fs/promises';
import nodeFs from 'node:fs';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import {
  type AuditFamily,
  type AuditFinding,
  type StandardAuditResult
} from './auditContract.ts';
import {
  renderBanner,
  renderAuditTaskRow,
  renderFindingsDetail
} from './unifiedTheme.ts';

enableCompileCache();

export const CANONICAL_IGNORE_DIRS: ReadonlySet<string> = new Set([ // runtime-set: Fast O(1) membership lookup set
  'node_modules',
  '.git',
  '.agents',
  '.fallow',
  '.vscode',
  '.github',
  'dist',
  'dev-dist',
  'backup_legacy_code',
  'external',
  'scratch',
  'tmp',
  'test-results',
  'public',
  'docs',
  'test aventura',
  'showdown',
  '_raw-assets'
]);

export const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.js', '.vue', '.cjs', '.mjs']); // runtime-set: Fast O(1) membership lookup set

/**
 * Validates that a path component is safe against path traversal.
 */
export function assertSafePathComponent(component: string): void {
  if (component.includes('..')) {
    throw new Error(`Path traversal attempt detected in path component: ${component}`);
  }
}

/**
 * Loads directory ignore patterns from .fallowrc.json if present.
 */
export function loadFallowIgnorePatterns(projectRoot = process.cwd()): string[] {
  const fallowRcPath = path.resolve(projectRoot, '.fallowrc.json');
  try {
    if (nodeFs.existsSync(fallowRcPath)) {
      const raw = nodeFs.readFileSync(fallowRcPath, 'utf-8');
      const data = JSON.parse(raw) as { ignorePatterns?: string[] };
      return Array.isArray(data.ignorePatterns) ? data.ignorePatterns : [];
    }
  } catch {
    // Ignore fallback
  }
  return [];
}

/**
 * Determines whether a relative POSIX path belongs to an ignored directory or matches directory ignore patterns.
 */
export function isPathIgnored(relPath: string, extraIgnorePatterns: readonly string[] = []): boolean {
  const normalized = relPath.split(path.sep).join(path.posix.sep).toLowerCase();
  const segments = normalized.split('/');

  for (const seg of segments) {
    if (CANONICAL_IGNORE_DIRS.has(seg)) {
      return true;
    }
  }

  for (const pattern of extraIgnorePatterns) {
    const cleanPattern = pattern.replace(/\/\*\*$/, '').replace(/\/\*$/, '').toLowerCase();
    if (cleanPattern && (normalized === cleanPattern || normalized.startsWith(cleanPattern + '/'))) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively collects scannable files from a directory, applying ignore filters.
 */
export function collectRepositoryFiles(
  dir: string,
  projectRoot = process.cwd(),
  extraIgnorePatterns: readonly string[] = [],
  allowedExtensions: ReadonlySet<string> = SCANNABLE_EXTENSIONS
): string[] {
  const results: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (!nodeFs.existsSync(dir)) return results;

  const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);
    const relPath = path.relative(projectRoot, fullPath).split(path.sep).join(path.posix.sep);

    if (entry.isDirectory()) {
      if (!isPathIgnored(relPath, extraIgnorePatterns)) {
        results.push(...collectRepositoryFiles(fullPath, projectRoot, extraIgnorePatterns, allowedExtensions));
      }
    } else if (entry.isFile()) {
      if (!isPathIgnored(relPath, extraIgnorePatterns)) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExtensions.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }
  return results;
}

export interface AuditorConfig {
  id: string;
  name: string;
  family: AuditFamily;
  requiredFiles?: string[];
  extraIgnorePatterns?: string[];
}

export interface AuditorContext {
  values: {
    output?: string;
    'errors-only'?: boolean;
  };
  ignorePatterns: readonly string[];
  isPathIgnored: (relPath: string) => boolean;
  collectFiles: (roots?: string[], allowedExtensions?: ReadonlySet<string>) => string[];
  logProgress: (msg: string) => void;
  logStep: (stepNumber: number, totalSteps: number, description: string) => void;
  addFinding: (finding: AuditFinding) => void;
  addError: (message: string, file?: string, line?: number, context?: string, ruleId?: string) => void;
  addWarning: (message: string, file?: string, line?: number, context?: string, ruleId?: string) => void;
  setMetric: (key: string, value: number | string) => void;
  checkFiles: () => Promise<void>;
  finish: (finalMetrics?: Record<string, number | string>, legacyErrors?: string[], legacyWarnings?: string[]) => Promise<StandardAuditResult>;
}

export function setupAuditor(config: AuditorConfig): AuditorContext {
  const startTime = performance.now();
  const args = process.argv.slice(2);
  const normalized = args.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : (['errors-only'].includes(a) ? `--${a}` : a));

  const { values } = parseArgs({
    args: normalized,
    options: {
      output: { type: 'string', short: 'o' },
      'errors-only': { type: 'boolean' }
    },
    strict: false
  });

  const projectRoot = process.cwd();
  const fallowIgnores = loadFallowIgnorePatterns(projectRoot);
  const combinedIgnores = [...fallowIgnores, ...(config.extraIgnorePatterns || [])];

  const isSubprocess = process.env.AUDIT_SUBPROCESS === 'true';
  const findings: AuditFinding[] = [];
  const metrics: Record<string, number | string> = {};

  return {
    values: values as AuditorContext['values'],
    ignorePatterns: combinedIgnores,
    isPathIgnored: (relPath: string) => isPathIgnored(relPath, combinedIgnores),
    collectFiles: (roots = ['scripts', 'src', 'database', 'tests', 'supabase'], allowedExtensions = SCANNABLE_EXTENSIONS) => {
      const all: string[] = []; // no-domain: Non-domain utility collection or data structure
      for (const root of roots) {
        const fullRoot = path.resolve(projectRoot, root);
        all.push(...collectRepositoryFiles(fullRoot, projectRoot, combinedIgnores, allowedExtensions));
      }
      return all;
    },
    logProgress: (msg: string) => {
      console.log(msg);
    },
    logStep: (stepNumber: number, totalSteps: number, description: string) => {
      console.log(`🔍 [${stepNumber}/${totalSteps}] ${description}`);
    },
    addFinding: (f: AuditFinding) => findings.push(f),
    addError: (message: string, file?: string, line?: number, context?: string, ruleId?: string) => {
      findings.push({ severity: 'error', message, file, line, context, ruleId });
    },
    addWarning: (message: string, file?: string, line?: number, context?: string, ruleId?: string) => {
      if (!values['errors-only']) {
        findings.push({ severity: 'warning', message, file, line, context, ruleId });
      }
    },
    setMetric: (key: string, value: number | string) => {
      metrics[key] = value;
    },
    checkFiles: async () => {
      if (!config.requiredFiles || config.requiredFiles.length === 0) return;
      try {
        for (const file of config.requiredFiles) {
          await fs.access(file);
        }
      } catch (_err) {
        console.error(styleText('red', `❌ Archivos requeridos no encontrados o no accesibles:\n${config.requiredFiles.map(f => `   - ${f}`).join('\n')}`));
        process.exit(1);
      }
    },
    finish: async (finalMetrics?: Record<string, number | string>, legacyErrors?: string[], legacyWarnings?: string[]) => {
      // Merge legacy arrays if provided
      if (legacyErrors) {
        for (const err of legacyErrors) {
          findings.push({ severity: 'error', message: err });
        }
      }
      if (legacyWarnings && !values['errors-only']) {
        for (const warn of legacyWarnings) {
          findings.push({ severity: 'warning', message: warn });
        }
      }

      if (finalMetrics) {
        Object.assign(metrics, finalMetrics);
      }

      const durationMs = Math.round(performance.now() - startTime);
      const errorsCount = findings.filter(f => f.severity === 'error').length;
      const warningsCount = findings.filter(f => f.severity === 'warning').length;
      const infoCount = findings.filter(f => f.severity === 'info').length;

      const result: StandardAuditResult = {
        id: config.id,
        name: config.name,
        family: config.family,
        status: errorsCount === 0 ? 'passed' : 'failed',
        durationMs,
        metrics,
        findings,
        summary: {
          errors: errorsCount,
          warnings: warningsCount,
          info: infoCount
        }
      };

      // 1. Persist complete JSON to clean scratch directory (if write permissions are granted)
      const scratchFamilyDir = path.resolve(process.cwd(), 'scratch/audits', config.family);
      const targetJsonPath = path.join(scratchFamilyDir, `${config.id}.json`);
      const latestJsonPath = path.resolve(process.cwd(), 'scratch/audits', `latest_${config.id}.json`);

      try {
        await fs.mkdir(scratchFamilyDir, { recursive: true });
        const jsonString = JSON.stringify(result, null, 2);
        await fs.writeFile(targetJsonPath, jsonString, 'utf-8');
        await fs.writeFile(latestJsonPath, jsonString, 'utf-8');

        if (typeof values.output === 'string' && values.output && !values.output.includes('..')) {
          const outPath = path.resolve(process.cwd(), values.output);
          await fs.writeFile(outPath, jsonString, 'utf-8');
        }
      } catch {
        // Ignorar errores de escritura si el comando se ejecuta en modo solo lectura (--allow-fs-read)
      }

      // 2. ALWAYS output human summary table to console when run standalone
      if (!isSubprocess) {
        console.log(renderBanner(config.name, `Familia: ${config.family.toUpperCase()}  |  ID: ${config.id}`));
        console.log(renderAuditTaskRow(result));

        if (findings.length > 0) {
          console.log(renderFindingsDetail(findings));
        }

        const relPath = path.relative(process.cwd(), targetJsonPath);
        console.log(`\n${result.status === 'passed' ? styleText('green', '✨ Auditoría completada con éxito.') : styleText('red', '🚨 Auditoría finalizada con errores.')}`);
        console.log(styleText('dim', `💾 Reporte detallado guardado en: ${relPath}\n`));
      }

      if (errorsCount > 0) {
        process.exit(1);
      }

      return result;
    }
  };
}
