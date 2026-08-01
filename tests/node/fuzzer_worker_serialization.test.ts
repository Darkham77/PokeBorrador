// tests/node/fuzzer_worker_serialization.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateTestBatches } from '../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import { runStandaloneBatch } from '../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';

describe('Fuzzer Worker Batch Serialization Test', () => {
  it('should execute a single batch and verify playerChoices, enemyChoices and seed are non-empty', async () => {
    const batches = generateTestBatches(1);
    assert.ok(batches.length > 0);
    
    const result = await runStandaloneBatch(batches[0], 1, 1);
    
    assert.ok(result.batch.playerChoices, 'playerChoices must exist');
    assert.ok(result.batch.playerChoices.length > 0, 'playerChoices must contain executed choices');
    assert.ok(result.batch.enemyChoices, 'enemyChoices must exist');
    assert.ok(result.batch.enemyChoices.length > 0, 'enemyChoices must contain executed choices');
    assert.ok(result.batch.seed, 'seed must exist');
  });
});
