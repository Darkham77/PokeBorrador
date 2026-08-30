// fallow-ignore-file security-sink
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

export interface AuditorConfig {
  id: string;
  name: string;
  family: AuditFamily;
  requiredFiles?: string[];
}

export interface AuditorContext {
  values: {
    output?: string;
    'errors-only'?: boolean;
  };
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

  const isSubprocess = process.env.AUDIT_SUBPROCESS === 'true';
  const findings: AuditFinding[] = [];
  const metrics: Record<string, number | string> = {};

  return {
    values: values as AuditorContext['values'],
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

        if (values.output) {
          const outPath = path.resolve(process.cwd(), values.output as string);
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
