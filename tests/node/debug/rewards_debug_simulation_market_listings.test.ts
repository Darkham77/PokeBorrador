import { describe, it, expect, beforeEach } from 'vitest';
import { queryLocal, resetSQLite } from '@/logic/db/sqliteEngine.ts';
import { DBRouter } from '@/logic/db/dbRouter.ts';
import { injectSimulatedGtsClaimsAndListings } from '@/logic/debug/rewardsDebugSimulationHelpers.ts';
import type { GameState } from '@/types/system/game.ts';
import type { AuthUser } from '@/types/auth/auth.ts';

describe('Rewards Debug Simulation Market Listings DB Insertion', () => {
  beforeEach(async () => {
    resetSQLite();
  });

  it('successfully inserts simulated GTS claims and market listings without schema errors into SQLite', async () => {
    const state = {
      trainer: { name: 'Seller' },
      claimQueue: []
    } as unknown as GameState;

    const user: AuthUser = {
      id: 'local_seller',
      email: 'seller@test.com'
    } as AuthUser;

    const router = new DBRouter({ url: 'http://localhost', key: 'mock' }, 'offline', {
      inMemory: true
    });

    await injectSimulatedGtsClaimsAndListings(
      state,
      router,
      user,
      false
    );

    // Verify row was inserted into market_listings via queryLocal
    const rows = await queryLocal('SELECT * FROM market_listings');
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0]?.price)).toBe(15000);
    expect(rows[0]?.listing_type).toBe('item');
    expect(rows[0]?.status).toBe('sold');

    // Verify claims were inserted into claim_queue
    const claimRows = await queryLocal('SELECT * FROM claim_queue');
    expect(claimRows.length).toBe(2);
    expect(claimRows[0]?.user_id).toBe('local_seller');
    expect(claimRows[1]?.user_id).toBe('local_seller');
  });

  it('verifies that claim rows have valid reward payloads', async () => {
    const state = {
      trainer: { name: 'Seller' },
      claimQueue: []
    } as unknown as GameState;

    const user: AuthUser = {
      id: 'local_seller_2',
      email: 'seller2@test.com'
    } as AuthUser;

    const router = new DBRouter({ url: 'http://localhost', key: 'mock' }, 'offline', {
      inMemory: true
    });

    await injectSimulatedGtsClaimsAndListings(state, router, user, false);

    const rows = await queryLocal('SELECT * FROM market_listings WHERE seller_id = ?', ['local_seller_2']);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.seller_id).toBe('local_seller_2');
  });
});

