import { describe, it, expect } from 'vitest';
import {
  resolveBatchResumptionIndex,
  interleaveHeavyBatches,
  filterBatchesByEnv
} from '../../../scripts/e2e/helpers/batchSimulationHarness.ts';
import {
  getSuiteTimeoutForBatch,
  MAX_SUITE_TOTAL_TIMEOUT_MS,
  MAX_PER_ACTION_TIMEOUT_MS
} from '../../../scripts/e2e/simulation_config.ts';

describe('Batch Simulation Harness Helpers', () => {
  describe('resolveBatchResumptionIndex', () => {
    it('returns 0 when clean execution is requested even if checkpoint exists', () => {
      const idx = resolveBatchResumptionIndex({
        suiteName: 'test.simulation.ts',
        totalBatches: 100,
        isClean: true,
        checkpointBatchIndex: 25
      });
      expect(idx).toBe(0);
    });

    it('returns checkpoint index - 1 when valid checkpoint exists and not clean', () => {
      const idx = resolveBatchResumptionIndex({
        suiteName: 'test.simulation.ts',
        totalBatches: 100,
        isClean: false,
        checkpointBatchIndex: 25
      });
      expect(idx).toBe(24);
    });

    it('prioritizes explicit startFromIndex over checkpoint', () => {
      const idx = resolveBatchResumptionIndex({
        suiteName: 'test.simulation.ts',
        totalBatches: 100,
        isClean: false,
        checkpointBatchIndex: 25,
        startFromIndex: '50'
      });
      expect(idx).toBe(49);
    });

    it('prioritizes explicit startFromCaseId over checkpoint', () => {
      const batches = [{ id: 'case-aaa' }, { id: 'case-bbb' }, { id: 'case-ccc' }];
      const idx = resolveBatchResumptionIndex({
        suiteName: 'test.simulation.ts',
        totalBatches: batches.length,
        isClean: false,
        checkpointBatchIndex: 1,
        startFromCaseId: 'case-ccc',
        batches
      });
      expect(idx).toBe(2);
    });
  });

  describe('interleaveHeavyBatches', () => {
    it('conserves all elements and total count', () => {
      const items = [
        { id: '1', heavy: false },
        { id: '2', heavy: true },
        { id: '3', heavy: false },
        { id: '4', heavy: false },
        { id: '5', heavy: true },
        { id: '6', heavy: false },
      ];
      const interleaved = interleaveHeavyBatches(items, item => item.heavy);
      expect(interleaved.length).toBe(items.length);
      expect(interleaved.map(i => i.id).sort()).toEqual(items.map(i => i.id).sort());
    });

    it('returns identical array when there are no heavy items', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const interleaved = interleaveHeavyBatches(items, () => false);
      expect(interleaved).toEqual(items);
    });

    it('returns identical array when all items are heavy', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const interleaved = interleaveHeavyBatches(items, () => true);
      expect(interleaved).toEqual(items);
    });
  });

  describe('filterBatchesByEnv', () => {
    const batches = [
      { id: 'case-alpha' },
      { id: 'case-beta' },
      { id: 'case-gamma' },
      { id: 'case-delta' }
    ];

    it('returns all items when no filters are set', () => {
      const filtered = filterBatchesByEnv(batches, {});
      expect(filtered.length).toBe(4);
      expect(filtered[0]!.originalIndex).toBe(0);
      expect(filtered[3]!.originalIndex).toBe(3);
    });

    it('filters by single caseId', () => {
      const filtered = filterBatchesByEnv(batches, { caseIdFilter: 'case-beta' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.item.id).toBe('case-beta');
      expect(filtered[0]!.originalIndex).toBe(1);
    });

    it('filters by comma-separated caseId list', () => {
      const filtered = filterBatchesByEnv(batches, { caseIdFilter: 'case-alpha, case-delta' });
      expect(filtered.length).toBe(2);
      expect(filtered[0]!.item.id).toBe('case-alpha');
      expect(filtered[1]!.item.id).toBe('case-delta');
    });

    it('filters by 1-based case index', () => {
      const filtered = filterBatchesByEnv(batches, { caseFilter: '3' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.item.id).toBe('case-gamma');
      expect(filtered[0]!.originalIndex).toBe(2);
    });
  });

  describe('getSuiteTimeoutForBatch (Dynamic Batch Timeout Scaling)', () => {
    it('returns MAX_SUITE_TOTAL_TIMEOUT_MS when turnCount is undefined or zero', () => {
      expect(getSuiteTimeoutForBatch()).toBe(MAX_SUITE_TOTAL_TIMEOUT_MS);
      expect(getSuiteTimeoutForBatch(0)).toBe(MAX_SUITE_TOTAL_TIMEOUT_MS);
      expect(getSuiteTimeoutForBatch(-5)).toBe(MAX_SUITE_TOTAL_TIMEOUT_MS);
    });

    it('returns MAX_SUITE_TOTAL_TIMEOUT_MS for low turn count (< 18 turns)', () => {
      expect(getSuiteTimeoutForBatch(10)).toBe(MAX_SUITE_TOTAL_TIMEOUT_MS);
      expect(getSuiteTimeoutForBatch(15)).toBe(MAX_SUITE_TOTAL_TIMEOUT_MS);
    });

    it('scales dynamically beyond MAX_SUITE_TOTAL_TIMEOUT_MS for heavy turn counts', () => {
      const turns = 108;
      const expectedTimeout = turns * MAX_PER_ACTION_TIMEOUT_MS; // 108 * 10000 = 1080000ms
      expect(getSuiteTimeoutForBatch(turns)).toBe(expectedTimeout);
      expect(getSuiteTimeoutForBatch(turns)).toBeGreaterThan(MAX_SUITE_TOTAL_TIMEOUT_MS);
    });
  });
});
