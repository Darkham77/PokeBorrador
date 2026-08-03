// scripts/e2e/fuzzer/tools/validate_certified_cases.ts
import fs from 'node:fs';
import path from 'node:path';
import { requireCertifiedBattleCaseDocument } from '../core/certifiedBattleCase.ts';

const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');

if (!fs.existsSync(casesPath)) {
  throw new Error(`[FUZZER-CERTIFICATION] Certified cases file is missing. context=${JSON.stringify({ casesPath })}`);
}

const fileContent = fs.readFileSync(casesPath, 'utf8');
let rawDocument: unknown;
try {
  rawDocument = JSON.parse(fileContent);
} catch (error: unknown) {
  throw new Error(`[FUZZER-CERTIFICATION] Certified cases JSON cannot be parsed. context=${JSON.stringify({
    casesPath,
    error: error instanceof Error ? error.message : String(error),
  })}`);
}

const document = requireCertifiedBattleCaseDocument(rawDocument, casesPath);
console.debug(`[FUZZER-CERTIFICATION] Validated ${document.battle.length} terminal cases with history-derived choice parity.`);
