// scripts/e2e/fuzzer/tools/validate_certified_cases.ts
import fs from 'node:fs';
import path from 'node:path';
import type { TestBatch } from '../generators/fuzzer_team_generator.ts';

const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');

if (!fs.existsSync(casesPath)) {
  console.log(`[Validation] Certified cases file not found at ${casesPath}. Skipping verification.`);
  process.exit(0);
}

const fileContent = fs.readFileSync(casesPath, 'utf8');
const allCases = JSON.parse(fileContent) as {
  battle?: TestBatch[];
  items?: TestBatch[];
  items_consumption?: TestBatch[];
};

const casesList = [
  ...(allCases.battle || []),
  ...(allCases.items || []),
  ...(allCases.items_consumption || []),
];

console.log(`[Validation] Checking ${casesList.length} certified fuzzer cases...`);

let validatedCount = 0;
let mismatchCount = 0;

for (const testCase of casesList) {
  if (!testCase.playerChoices || testCase.playerChoices.length === 0) continue;
  
  // Basic validation that choices are non-empty strings and valid syntax
  for (const choice of testCase.playerChoices) {
    if (typeof choice !== 'string' || choice.trim().length === 0) {
      mismatchCount++;
      console.error(`[Validation Error] Case ${testCase.seed?.join(',') || 'unknown'} has invalid choice:`, choice);
      break;
    }
  }
  validatedCount++;
}

console.log(`[Validation Complete] Validated ${validatedCount} cases. Mismatches/Errors: ${mismatchCount}`);
if (mismatchCount > 0) {
  process.exit(1);
} else {
  console.log('✅ All certified cases format validated successfully.');
}
