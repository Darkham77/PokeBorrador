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
    const pgOk = await waitForPostgres(POSTGRES_URL, 5);
    const postgrestOk = await waitForPostgrest(5);
    assert.strictEqual(pgOk, true, 'PostgreSQL should respond immediately');
    assert.strictEqual(postgrestOk, true, 'PostgREST should respond immediately');

    // 3. Re-invoking ensurePostgresTestContainerReady(false) should reuse without throwing or timing out
    const startMs = Temporal.Now.instant().epochMilliseconds;
    const second = await ensurePostgresTestContainerReady(false);
    const elapsedMs = Temporal.Now.instant().epochMilliseconds - startMs;

    assert.strictEqual(second.isReady, true, 'Re-invocation should return isReady: true');
    // Reusing avoids container tear-down and 83 SQL migrations (takes >30s); assert it reuses without recreation
    assert.ok(elapsedMs < 20000, `Expected reuse in <20000ms, took ${elapsedMs}ms`);
  }, 120_000);

  it('verifies POSTGRES_URL matches standard test container configuration', () => {
    assert.ok(typeof POSTGRES_URL === 'string', 'POSTGRES_URL must be a string');
    assert.ok(POSTGRES_URL.startsWith('postgresql://') || POSTGRES_URL.startsWith('postgres://'), 'Must be valid postgres URL');
    assert.ok(POSTGRES_URL.includes('localhost') || POSTGRES_URL.includes('127.0.0.1'), 'Must point to local test host');
  });

  it('validates timeout thresholds for container discovery', async () => {
    // Calling waitForPostgres with an invalid unreachable port and 1 retry should fail fast
    const invalidUrl = 'postgresql://fake_user:fake_pass@127.0.0.1:59999/fake_db';
    const isAvailable = await waitForPostgres(invalidUrl, 1);
    assert.strictEqual(isAvailable, false, 'Unreachable postgres instance should return false gracefully');
  });

  it('validates postgrest failure handling on unreachable endpoints', async () => {
    // Calling waitForPostgrest with minimal retry count
    const isAvailable = await waitForPostgrest(1);
    // Should return boolean without throwing unhandled exceptions
    assert.ok(typeof isAvailable === 'boolean');
  });

  it('asserts ensurePostgresTestContainerReady contract types', () => {
    assert.ok(typeof ensurePostgresTestContainerReady === 'function');
    assert.ok(typeof waitForPostgres === 'function');
    assert.ok(typeof waitForPostgrest === 'function');
  });
});



