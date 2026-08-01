// tests/node/fuzzer_worker_serialization.test.ts
import { describe, it, expect } from 'vitest';
import { generateTestBatches } from '../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import { runStandaloneBatch } from '../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';

describe('Fuzzer Worker Batch Serialization Test', () => {
  it('should execute a single batch and verify playerChoices, enemyChoices and seed are non-empty', async () => {
    const batches = generateTestBatches(1);
    const targetBatch = batches[0];
    expect(targetBatch).toBeDefined();
    const result = await runStandaloneBatch(targetBatch!, 1, 1);
    
    expect(result.batch.playerChoices).toBeDefined();
    expect(result.batch.playerChoices!.length).toBeGreaterThan(0);
    expect(result.batch.enemyChoices).toBeDefined();
    expect(result.batch.enemyChoices!.length).toBeGreaterThan(0);
    expect(result.batch.seed).toBeDefined();
  });
});
