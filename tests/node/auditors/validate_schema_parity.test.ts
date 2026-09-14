/**
 * tests/node/auditors/validate_schema_parity.test.ts
 *
 * Unit tests for SchemaParityAuditor.
 */

import { describe, it, expect } from 'vitest';
import { SchemaParityAuditor } from '../../../scripts/auditors/persistence/validate_schema_parity.ts';

describe('SchemaParityAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new SchemaParityAuditor();
    expect(auditor.id).toBe('validate_schema_parity');
    expect(auditor.family).toBe('persistence');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('runs audit comparing PostgreSQL and SQLite schemas and achieves 100% parity', async () => {
    const auditor = new SchemaParityAuditor();
    await auditor.runAudit();
    expect(auditor.getFilesScanned()).toBeGreaterThan(0);

    // Assert zero missing tables and zero missing columns between engines
    const missingTables = auditor.getCountsByRule().get('schema-parity-missing-table') ?? 0;
    const missingColumns = auditor.getCountsByRule().get('schema-parity-missing-column') ?? 0;
    expect(missingTables).toBe(0);
    expect(missingColumns).toBe(0);
  });
});
