import { defineCommand, runMain } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import { requireCertifiedBattleCaseDocument } from '../core/certifiedBattleCase.ts';

export function validateCertifiedCases(targetFilePath?: string): void {
  const casesPath = targetFilePath
    ? path.resolve(process.cwd(), targetFilePath)
    : path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');

  if (!fs.existsSync(casesPath)) {
    throw new Error(
      `[FUZZER-CERTIFICATION] Certified cases file is missing. context=${JSON.stringify({ casesPath })}`
    );
  }

  const fileContent = fs.readFileSync(casesPath, 'utf8');
  let rawDocument: unknown;
  try {
    rawDocument = JSON.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(
      `[FUZZER-CERTIFICATION] Certified cases JSON cannot be parsed. context=${JSON.stringify({
        casesPath,
        error: error instanceof Error ? error.message : String(error)
      })}`,
      { cause: error }
    );
  }

  const document = requireCertifiedBattleCaseDocument(rawDocument, casesPath);
  console.debug(
    `[FUZZER-CERTIFICATION] Validated ${document.battle.length} terminal cases with history-derived choice parity.`
  );
}

export const command = defineCommand({
  meta: {
    name: 'validate-certified-cases',
    description: 'Valida la integridad y esquema del documento JSON de casos certificados del fuzzer'
  },
  args: {
    file: {
      type: 'positional',
      description: 'Ruta al archivo JSON de casos certificados (opcional)',
      required: false,
      default: ''
    }
  },
  run({ args }) {
    validateCertifiedCases(args.file || undefined);
  }
});

runMain(command);
