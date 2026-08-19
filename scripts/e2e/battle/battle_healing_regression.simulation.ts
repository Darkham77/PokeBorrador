// fallow-ignore-file security-sink
import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import type { ItemId } from '../../../src/data/inventory/items.ts';
import type { CertifiedTestBatch } from '../e2e_helpers.ts';
import { requireCertifiedBattleCaseDocument } from '../fuzzer/core/certifiedBattleCase.ts';

import { certifyBattleCase } from '../fuzzer/core/certifiedBattleCase.ts';
import { getMedicineCase } from '../fuzzer/core/fuzzer_medicine_cases.ts';

const CERTIFIED_CASES_PATH = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
const MEDICINE_ITEM_IDS = ['potion', 'antidote', 'revive'] as const satisfies readonly ItemId[];

class HealingSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }
}

function requireCertifiedMedicineCase(itemId: ItemId): CertifiedTestBatch {
  if (fs.existsSync(CERTIFIED_CASES_PATH)) {
    try {
      const rawDocument: unknown = JSON.parse(fs.readFileSync(CERTIFIED_CASES_PATH, 'utf8'));
      const document = requireCertifiedBattleCaseDocument(rawDocument, CERTIFIED_CASES_PATH);
      const batch = document.battle.find((candidate) => candidate.history.some((entry) => entry.p1GameAction?.kind === 'bag-item'
        && entry.p1GameAction.itemId === itemId));
      if (batch) return batch;
    } catch {
      // canonical deterministic fallback
    }
  }

  return certifyBattleCase(getMedicineCase(itemId), 1);
}

test.describe('Certified Battle Medicine Replay (Playwright)', () => {
  for (const itemId of MEDICINE_ITEM_IDS) {
    test(`replays the current certified ${itemId} medicine case through official UI controls`, async ({ page }) => {
      const batch = requireCertifiedMedicineCase(itemId);
      const sim = new HealingSimWrapper(page, `Med_${itemId}`);
      await sim.setup();
      await sim.setupFuzzerScenario(batch);
      await sim.replayCertifiedBattle(batch);
    });
  }
});
