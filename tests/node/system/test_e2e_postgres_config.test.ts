// test-fragmentation-ok: Isolated single-purpose regression test for E2E Postgres config resolution
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveInitialDbSession } from '../../../src/logic/db/dbClientFactory.ts';

import { switchServer, supabase } from '../../../src/logic/db/supabase.ts';
import { safeStorage } from '../../../src/logic/utils/storage.ts';

declare global {
  interface Window {
    __E2E__?: boolean;
    __E2E_DRIVER__?: string;
  }
}

describe('E2E PostgreSQL Configuration Parity', () => {
  const originalE2E = (globalThis as unknown as { __E2E__?: boolean }).__E2E__;
  const originalDriver = (globalThis as unknown as { __E2E_DRIVER__?: string }).__E2E_DRIVER__;

  beforeEach(() => {
    (globalThis as unknown as { __E2E__?: boolean }).__E2E__ = true;
    (globalThis as unknown as { __E2E_DRIVER__?: string }).__E2E_DRIVER__ = 'postgres';
  });

  afterEach(() => {
    (globalThis as unknown as { __E2E__?: boolean }).__E2E__ = originalE2E;
    (globalThis as unknown as { __E2E_DRIVER__?: string }).__E2E_DRIVER__ = originalDriver;
  });

  it('routes to local 54321 test container even when initial config contains production URL', () => {
    const prodConfig = {
      url: 'https://wakrkvizmoqdlrtnxcth.supabase.co',
      key: 'production_anon_key'
    };

    const session = resolveInitialDbSession(prodConfig, 'online', {});
    expect(session.mode).toBe('online');
    expect(session.config.url).toBe('http://127.0.0.1:54321');
  });

  it('switches server to test_postgres without falling back to default production server', () => {
    switchServer('test_postgres');
    expect(safeStorage.getItem('pokevicio_selected_server_id')).toBe('test_postgres');
    expect(supabase.config.url).toBe('http://127.0.0.1:54321');
  });
});
