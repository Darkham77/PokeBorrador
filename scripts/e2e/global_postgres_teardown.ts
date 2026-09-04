/**
 * @file global_postgres_teardown.ts
 * @description Playwright globalTeardown to clean up ephemeral PostgreSQL container
 * when SIM_DB_DRIVER=postgres.
 */

import { stopPostgresTestContainer } from '../testing/postgres_test_container.ts';

export default async function globalPostgresTeardown(): Promise<void> {
  if (process.env.SIM_DB_DRIVER === 'postgres' && process.env.KEEP_POSTGRES_ALIVE !== 'true') {
    console.log('\n[Playwright] Cleaning up ephemeral PostgreSQL container...');
    stopPostgresTestContainer();
  }
}
