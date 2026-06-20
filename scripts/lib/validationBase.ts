/**
 * scripts/lib/validationBase.ts
 * 
 * Base validation helper to centralize script arg parsing, file access checks,
 * console output formatting, and report file generation.
 */

import fs from 'node:fs/promises';
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';
import { printConsoleHeader, printConsoleSummary, writeReportFile } from './reportUtils.ts';

enableCompileCache();

export interface ValidationConfig {
  title: string;
  requiredFiles: string[];
}

export function setupValidation(config: ValidationConfig) {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' },
      'errors-only': { type: 'boolean' }
    }
  });

  printConsoleHeader(config.title);

  return {
    values,
    checkFiles: async () => {
      try {
        for (const file of config.requiredFiles) {
          await fs.access(file);
        }
      } catch (_err) {
        console.error(styleText('red', `❌ Archivos requeridos no encontrados o no accesibles:\n${config.requiredFiles.map(f => `   - ${f}`).join('\n')}`));
        process.exit(1);
      }
    },
    finish: async (scannedMetrics: Record<string, number>, errors: string[], warnings: string[]) => {
      const finalWarnings = values['errors-only'] ? [] : warnings;
      const summaryData = {
        title: config.title,
        scannedMetrics,
        errors,
        warnings: finalWarnings
      };

      printConsoleSummary(summaryData, !values.summary);

      if (values.output) {
        await writeReportFile(values.output as string, summaryData);
      }

      if (errors.length > 0) {
        process.exit(1);
      }
    }
  };
}
