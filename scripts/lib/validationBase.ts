// fallow-ignore-file security-sink
/**
 * scripts/lib/validationBase.ts
 * 
 * BACKWARD COMPATIBLE VALIDATION HELPER (Node.js 26+)
 * Bridges legacy validation scripts to the unified auditorBase and unifiedTheme engine.
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupAuditor } from './auditorBase.ts';
import { type AuditFamily } from './auditContract.ts';

enableCompileCache();

export interface ValidationConfig {
  title: string;
  requiredFiles?: string[];
  family?: AuditFamily;
  id?: string;
}

export interface ValidationContext {
  values: {
    output?: string;
    'errors-only'?: boolean;
  };
  logProgress: (msg: string) => void;
  logStep: (stepNumber: number, totalSteps: number, description: string) => void;
  checkFiles: () => Promise<void>;
  addError: (message: string, file?: string, line?: number, context?: string, ruleId?: string) => void;
  addWarning: (message: string, file?: string, line?: number, context?: string, ruleId?: string) => void;
  setMetric: (key: string, value: number | string) => void;
  finish: (scannedMetrics: Record<string, number | string>, errors?: string[], warnings?: string[]) => Promise<void>;
}

export function setupValidation(config: ValidationConfig): ValidationContext {
  const callerFile = process.argv[1] ? path.basename(process.argv[1], '.ts').replace(/\.js$/, '') : '';
  const derivedId = config.id || callerFile || config.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  
  let family: AuditFamily = config.family || 'domain_data';
  if (!config.family) {
    const stack = new Error().stack || '';
    for (const f of ['architecture', 'domain_data', 'persistence', 'fsm', 'assets', 'documentation'] as const) {
      if (stack.includes(`/auditors/${f}/`)) {
        family = f;
        break;
      }
    }
  }

  const auditor = setupAuditor({
    id: derivedId,
    name: config.title,
    family,
    requiredFiles: config.requiredFiles
  });

  return {
    values: auditor.values,
    logProgress: auditor.logProgress,
    logStep: auditor.logStep,
    checkFiles: auditor.checkFiles,
    addError: auditor.addError,
    addWarning: auditor.addWarning,
    setMetric: auditor.setMetric,
    finish: async (scannedMetrics: Record<string, number | string>, errors?: string[], warnings?: string[]) => {
      await auditor.finish(scannedMetrics, errors, warnings);
    }
  };
}
