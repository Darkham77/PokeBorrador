/**
 * tests/node/auditors/validate_sql_migrations.test.ts
 *
 * Dedicated unit test suite for SqlMigrationAuditor:
 * - Validates monotonic timestamps, SQLite companions, and db_version parity
 * - Verifies in-memory execution of translated SQL migrations
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  SqlMigrationAuditor,
  SQL_MIGRATION_RULES,
  type SqlMigrationRuleId
} from '../../../scripts/auditors/persistence/validate_sql_migrations.ts';

describe('SqlMigrationAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and persistence family', () => {
      const auditor = new SqlMigrationAuditor();
      expect(auditor.id).toBe('validate_sql_migrations');
      expect(auditor.family).toBe('persistence');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in SQL_MIGRATION_RULES', () => {
      const expectedRules: SqlMigrationRuleId[] = [
        'sql-migration-orphan-sqlite',
        'sql-migration-invalid-timestamp',
        'sql-migration-duplicate-timestamp',
        'sql-migration-broken-monotonicity',
        'sql-migration-missing-dbversion',
        'sql-migration-missing-sqlite-companion',
        'sql-migration-sqlite-missing-dbversion',
        'sql-migration-dbversion-desync',
        'sql-migration-sqlite-exec-failure'
      ];

      for (const rule of expectedRules) {
        expect(SQL_MIGRATION_RULES).toContain(rule);
      }
      expect(SQL_MIGRATION_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all SQL migration auditor rules in suite declarations', () => {
      const auditor = new SqlMigrationAuditor();
      const rules = [
        'sql-migration-orphan-sqlite',
        'sql-migration-invalid-timestamp',
        'sql-migration-duplicate-timestamp',
        'sql-migration-broken-monotonicity',
        'sql-migration-missing-dbversion',
        'sql-migration-missing-sqlite-companion',
        'sql-migration-sqlite-missing-dbversion',
        'sql-migration-dbversion-desync',
        'sql-migration-sqlite-exec-failure'
      ];

      for (const r of rules) {
        expect(auditor.ruleIds).toContain(r);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new SqlMigrationAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['SQL migrations verified']).toBeGreaterThan(0);
    });

    it('records violations with error severity when migration integrity fails', () => {
      const auditor = new SqlMigrationAuditor();
      auditor.addViolation({
        ruleId: 'sql-migration-missing-sqlite-companion',
        severity: 'error',
        file: 'database/migrations/20260101000000_dummy.sql',
        line: 1,
        message: 'Missing SQLite companion migration file',
        context: '20260101000000_dummy.sqlite.sql'
      });
      expect(auditor.getErrorsByRule().get('sql-migration-missing-sqlite-companion')).toBe(1);
    });
  });
});
