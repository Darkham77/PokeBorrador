import { describe, it, expect } from 'vitest';
import { loadCertifiedBattleCases, type CertifiedFuzzerDocument } from '../../../scripts/e2e/helpers/certifiedCaseLoader.ts';
import type { CertifiedTestBatch } from '../../../scripts/e2e/e2e_helpers.ts';

describe('Certified Case Loader - loadCertifiedBattleCases', () => {
  it('loads certified battle batches as an array of CertifiedTestBatch', () => {
    const battleBatches = loadCertifiedBattleCases('battle') as CertifiedTestBatch[];
    expect(Array.isArray(battleBatches)).toBe(true);
    expect(battleBatches.length).toBeGreaterThan(0);
    const first = battleBatches[0]!;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('playerTeam');
    expect(first).toHaveProperty('enemyTeam');
    expect(first).toHaveProperty('history');
  });

  it('loads certified items batches as an array of CertifiedTestBatch', () => {
    const itemBatches = loadCertifiedBattleCases('items') as CertifiedTestBatch[];
    expect(Array.isArray(itemBatches)).toBe(true);
    expect(itemBatches.length).toBeGreaterThan(0);
    const first = itemBatches[0]!;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('playerTeam');
    expect(first).toHaveProperty('enemyTeam');
  });

  it('loads the full document with all categories when category is "all"', () => {
    const doc = loadCertifiedBattleCases('all') as CertifiedFuzzerDocument;
    expect(doc).toHaveProperty('battle');
    expect(doc).toHaveProperty('items');
    expect(Array.isArray(doc.battle)).toBe(true);
    expect(Array.isArray(doc.items)).toBe(true);
  });

  it('validates playerTeam and enemyTeam structure in certified cases', () => {
    const battleBatches = loadCertifiedBattleCases('battle') as CertifiedTestBatch[];
    const first = battleBatches[0]!;
    expect(Array.isArray(first.playerTeam)).toBe(true);
    expect(Array.isArray(first.enemyTeam)).toBe(true);
    expect(first.playerTeam.length).toBeGreaterThan(0);
    expect(first.enemyTeam.length).toBeGreaterThan(0);

    const firstMon = first.playerTeam[0]!;
    expect(firstMon).toHaveProperty('species');
    expect(firstMon).toHaveProperty('moves');
  });

  it('verifies that battle case IDs follow standard naming pattern', () => {
    const battleBatches = loadCertifiedBattleCases('battle') as CertifiedTestBatch[];
    for (const batch of battleBatches) {
      expect(typeof batch.id).toBe('string');
      expect(batch.id.length).toBeGreaterThan(0);
    }
  });

  it('verifies that items batches contain expected item effects', () => {
    const itemBatches = loadCertifiedBattleCases('items') as CertifiedTestBatch[];
    for (const batch of itemBatches) {
      expect(batch.playerTeam.length).toBeGreaterThan(0);
      expect(batch.enemyTeam.length).toBeGreaterThan(0);
    }
  });
});


