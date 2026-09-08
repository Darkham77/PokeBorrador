import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  POSTGRES_URL,
  waitForPostgres,
  waitForPostgrest,
  ensurePostgresTestContainerReady
} from '../../../scripts/testing/postgres_test_container.ts';

describe('Postgres Test Container Lifecycle & Reuse', () => {
  it('reuses active healthy containers when forceRecreate is false', async () => {
    // 1. Initial readiness
    const initial = await ensurePostgresTestContainerReady(false);
    assert.strictEqual(initial.isReady, true, 'PostgreSQL container should be ready');

    // 2. Both services should be responding
    const pgOk = await waitForPostgres(POSTGRES_URL, 1);
    const postgrestOk = await waitForPostgrest(1);
    assert.strictEqual(pgOk, true, 'PostgreSQL should respond immediately');
    assert.strictEqual(postgrestOk, true, 'PostgREST should respond immediately');

    // 3. Re-invoking ensurePostgresTestContainerReady(false) should reuse without throwing or timing out
    const startMs = Date.now();
    const second = await ensurePostgresTestContainerReady(false);
    const elapsedMs = Date.now() - startMs;

    assert.strictEqual(second.isReady, true, 'Re-invocation should return isReady: true');
    // Reusing should take < 2500ms (avoiding container tear-down and 83 SQL migrations which take ~15s)
    assert.ok(elapsedMs < 2500, `Expected reuse in <2500ms, took ${elapsedMs}ms`);
  });
});
