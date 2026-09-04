/**
 * @file global_postgres_setup.ts
 * @description Playwright globalSetup to ensure ephemeral PostgreSQL container
 * is running and migrated when SIM_DB_DRIVER=postgres.
 */

import { ensurePostgresTestContainerReady } from '../testing/postgres_test_container.ts';

export default async function globalPostgresSetup(): Promise<void> {
  if (process.env.SIM_DB_DRIVER === 'postgres') {
    console.log('\n[Playwright] Preparing ephemeral PostgreSQL container for simulation...');
    const result = await ensurePostgresTestContainerReady();
    if (!result.isReady) {
      throw new Error('[Playwright] Failed to initialize ephemeral PostgreSQL test container in Docker.');
    }

    try {
      await fetch('http://localhost:5174/');
      await fetch('http://localhost:5174/src/main.ts');
      await fetch('http://localhost:5174/src/views/game/MainGameView.vue');
    } catch {
      // Non-blocking pre-warm
    }
  }
}
