import { describe, expect, it } from 'vitest';
import { abilityTriggeredInLog } from '../../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';
import { runStandaloneBatch } from '../../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';
import { generateTestBatches } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import type { AbilityId } from '../../../src/data/battle/abilities.ts';

const TARGET_ABILITY_IDS = ['lingeringaroma', 'moldbreaker', 'perishbody'] as const satisfies readonly AbilityId[];

describe('abilityTriggeredInLog', () => {
  it.each([
    [TARGET_ABILITY_IDS[0], '|-activate|p1a: Mew|ability: Lingering Aroma|p2a: Blissey'],
    [TARGET_ABILITY_IDS[1], '|-ability|p1a: Mew|Mold Breaker'],
    [TARGET_ABILITY_IDS[2], '|-ability|p1a: Mew|Perish Body'],
  ])('recognizes the Showdown event for %s', (abilityId, line) => {
    expect(abilityTriggeredInLog(line, abilityId)).toBe(true);
  });
});

describe('dynamic ability coverage', () => {
  it('records ability coverage from a generated test batch', async () => {
    const batches = generateTestBatches();
    const batch = batches.find(candidate => candidate.abilitiesToTest.length > 0);
    expect(batch).toBeDefined();
    const targetAbility = batch!.abilitiesToTest[0];
    expect(targetAbility).toBeDefined();
    const result = await runStandaloneBatch(batch!, 1, 1);
    expect(result.abilityCoverage[targetAbility!]?.status).toBe('PASS');
  });
});
