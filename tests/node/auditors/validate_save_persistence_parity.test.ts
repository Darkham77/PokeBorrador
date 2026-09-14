/**
 * tests/node/auditors/validate_save_persistence_parity.test.ts
 *
 * Unit tests for SavePersistenceParityAuditor.
 */

import { describe, it, expect } from 'vitest';
import { SavePersistenceParityAuditor } from '../../../scripts/auditors/persistence/validate_save_persistence_parity.ts';

describe('SavePersistenceParityAuditor', () => {
  it('instantiates with correct metadata and requiredFiles', () => {
    const auditor = new SavePersistenceParityAuditor();
    expect(auditor.id).toBe('validate_save_persistence_parity');
    expect(auditor.family).toBe('persistence');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.requiredFiles.length).toBe(4);
  });

  it('runs audit against persistence contracts and collects metrics', async () => {
    const auditor = new SavePersistenceParityAuditor();
    await auditor.runAudit();
    expect(auditor.getFilesScanned()).toBe(4);
  });
});
