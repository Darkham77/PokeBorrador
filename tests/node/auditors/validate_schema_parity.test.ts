/**
 * tests/node/auditors/validate_schema_parity.test.ts
 *
 * Dedicated unit test suite for SchemaParityAuditor:
 * - Validates PostgreSQL and SQLite multi-engine schema parity
 * - Checks table and column equivalence in translated migrations
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  SchemaParityAuditor,
  SCHEMA_PARITY_RULES,
  type SchemaParityRuleId
} from '../../../scripts/auditors/persistence/validate_schema_parity.ts';

describe('SchemaParityAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and persistence family', () => {
      const auditor = new SchemaParityAuditor();
      expect(auditor.id).toBe('validate_schema_parity');
      expect(auditor.family).toBe('persistence');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in SCHEMA_PARITY_RULES', () => {
      const expectedRules: SchemaParityRuleId[] = [
        'schema-parity-missing-table',
        'schema-parity-missing-column'
      ];

      for (const rule of expectedRules) {
        expect(SCHEMA_PARITY_RULES).toContain(rule);
      }
      expect(SCHEMA_PARITY_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers schema-parity-missing-table rule registration', () => {
      const auditor = new SchemaParityAuditor();
      const rule: SchemaParityRuleId = 'schema-parity-missing-table';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers schema-parity-missing-column rule registration', () => {
      const auditor = new SchemaParityAuditor();
      const rule: SchemaParityRuleId = 'schema-parity-missing-column';
      expect(auditor.ruleIds).toContain(rule);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new SchemaParityAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Columns Checked']).toBeGreaterThan(0);
    });

    it('records violations with error severity when schema column parity is broken', () => {
      const auditor = new SchemaParityAuditor();
      auditor.addViolation({
        ruleId: 'schema-parity-missing-column',
        severity: 'error',
        file: 'database/schema.sql',
        line: 1,
        message: 'Column missing in sqlite companion schema',
        context: 'profiles.updated_at'
      });
      expect(auditor.getErrorsByRule().get('schema-parity-missing-column')).toBe(1);
    });
  });
});
