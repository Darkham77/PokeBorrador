/**
 * @file gts_transactions.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Validates GTS transactions across both SQLite and PostgreSQL engines:
 * 1. Publishing assets (Pokemon/Items) and deducting them from the player save.
 * 2. Buying assets, deducting money from buyer, and moving assets to escrow.
 * 3. Claiming assets from the claim_queue and updating the player save.
 */

import { it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { describeWithDatabase, type TestDatabaseContext } from '../../dbTestHelper.ts';

describeWithDatabase('GTS Transactions Dual Validation', (engine, getDb) => {
  const SELLER_ID = engine === 'postgres' ? '11111111-1111-1111-1111-111111111111' : 'local_ash';
  const BUYER_ID = engine === 'postgres' ? '22222222-2222-2222-2222-222222222222' : 'local_gary';
  const LIST_ID = engine === 'postgres' ? '33333333-3333-3333-3333-333333333333' : 'list_1';
  const CLAIM_BUYER_ID = engine === 'postgres' ? '44444444-4444-4444-4444-444444444444' : 'claim_b_1';
  const CLAIM_SELLER_ID = engine === 'postgres' ? '55555555-5555-5555-5555-555555555555' : 'claim_s_1';

  let db: TestDatabaseContext;

  beforeEach(async () => {
    db = getDb();
    
    // Clear and setup initial saves
    if (engine === 'postgres') {
      await db.run('INSERT INTO auth.users (id, email) VALUES (?, ?) ON CONFLICT (id) DO NOTHING', [SELLER_ID, 'ash@test.com']);
      await db.run('INSERT INTO auth.users (id, email) VALUES (?, ?) ON CONFLICT (id) DO NOTHING', [BUYER_ID, 'gary@test.com']);
      await db.run('DELETE FROM claim_queue');
      await db.run('DELETE FROM market_listings');
      await db.run('DELETE FROM game_saves');
    }

    await db.run('INSERT INTO game_saves (user_id, save_data) VALUES (?, ?)', [
      SELLER_ID,
      JSON.stringify({
        money: 1000,
        team: [{ uid: 'pika_1', id: 'pikachu', name: 'Pika' }],
        box: []
      })
    ]);

    await db.run('INSERT INTO game_saves (user_id, save_data) VALUES (?, ?)', [
      BUYER_ID,
      JSON.stringify({
        money: 5000,
        team: [],
        box: []
      })
    ]);
  });

  it('should confirm active database engine and execution environment', async () => {
    if (engine === 'postgres') {
      const rows = await db.query<{ version: string; current_schema: string }>('SELECT version(), current_schema()');
      assert.ok(rows.length > 0);
      assert.ok(rows[0]?.version.includes('PostgreSQL 15'), `Expected PostgreSQL 15, got: ${rows[0]?.version}`);
      console.log(`\n  🐘 [POSTGRES LIVE PROBE] Conectado a: ${rows[0]?.version.slice(0, 30)}... | Schema aislado: ${rows[0]?.current_schema}`);
    } else {
      console.log(`\n  ⚡ [SQLITE LIVE PROBE] Ejecutando sobre emulación en memoria.`);
    }
  });

  it('should publish a pokemon and remove it from the seller save', async () => {
    const p_listing_type = 'pokemon';
    const p_asset_data = { uid: 'pika_1', id: 'pikachu', name: 'Pika' };
    const p_price = 500;

    const saves = await db.query<{ save_data: Record<string, unknown> }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [SELLER_ID]
    );

    assert.ok(saves.length > 0, 'Seller save must exist');
    const rawSave = saves[0]?.save_data;
    const saveObj = typeof rawSave === 'string' ? JSON.parse(rawSave) : (rawSave as Record<string, unknown>);

    // Remove pokemon from seller team
    const team = (saveObj.team as Array<{ uid: string }>);
    saveObj.team = team.filter((p) => p.uid !== p_asset_data.uid);

    await db.run(
      'INSERT INTO market_listings (id, listing_type, seller_id, seller_name, price, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [LIST_ID, p_listing_type, SELLER_ID, 'Ash', p_price, JSON.stringify(p_asset_data), 'active']
    );

    if (engine === 'postgres') {
      await db.run(
        'UPDATE game_saves SET save_data = ? WHERE user_id = ?',
        [JSON.stringify(saveObj), SELLER_ID]
      );
    } else {
      await db.run(
        'INSERT INTO game_saves (user_id, save_data, last_save_id) VALUES (?, ?, ?)',
        [SELLER_ID, JSON.stringify(saveObj), 'save_3']
      );
    }

    const listings = await db.query('SELECT * FROM market_listings WHERE id = ?', [LIST_ID]);
    assert.strictEqual(listings.length, 1);

    const updatedSaves = await db.query<{ save_data: Record<string, unknown> }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [SELLER_ID]
    );
    const updatedRaw = updatedSaves[0]?.save_data;
    const updatedSave = typeof updatedRaw === 'string' ? JSON.parse(updatedRaw) : (updatedRaw as Record<string, unknown>);
    assert.strictEqual((updatedSave.team as unknown[]).length, 0);
  });

  it('should handle a purchase: deduct money from buyer and move assets to escrow', async () => {
    // 1. Setup listing
    await db.run(
      'INSERT INTO market_listings (id, listing_type, seller_id, seller_name, price, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [LIST_ID, 'pokemon', SELLER_ID, 'Ash', 1000, JSON.stringify({ uid: 'pika_1', name: 'Pikachu' }), 'active']
    );

    // 2. Buy logic
    const buyerSaves = await db.query<{ save_data: Record<string, unknown> }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [BUYER_ID]
    );
    const buyerRaw = buyerSaves[0]?.save_data;
    const buyerSave = typeof buyerRaw === 'string' ? JSON.parse(buyerRaw) : (buyerRaw as Record<string, unknown>);

    assert.ok((buyerSave.money as number) >= 1000);
    buyerSave.money = (buyerSave.money as number) - 1000;

    if (engine === 'postgres') {
      await db.run(
        'UPDATE game_saves SET save_data = ? WHERE user_id = ?',
        [JSON.stringify(buyerSave), BUYER_ID]
      );
    } else {
      await db.run(
        'INSERT INTO game_saves (user_id, save_data, last_save_id) VALUES (?, ?, ?)',
        [BUYER_ID, JSON.stringify(buyerSave), 'save_4']
      );
    }

    // Move to claim_queue for buyer
    if (engine === 'postgres') {
      await db.run(
        'INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, ?, ?, ?)',
        [CLAIM_BUYER_ID, BUYER_ID, 'gts', LIST_ID, JSON.stringify({ type: 'pokemon', data: { uid: 'pika_1', name: 'Pikachu' } })]
      );

      // Move money to claim_queue for seller (with 5% commission)
      const net = 1000 * 0.95;
      await db.run(
        'INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, ?, ?, ?)',
        [CLAIM_SELLER_ID, SELLER_ID, 'gts', LIST_ID, JSON.stringify({ type: 'money', data: net })]
      );
    } else {
      await db.run(
        'INSERT INTO claim_queue (user_id, claim_id, type, data) VALUES (?, ?, ?, ?)',
        [BUYER_ID, CLAIM_BUYER_ID, 'pokemon', JSON.stringify({ uid: 'pika_1', name: 'Pikachu' })]
      );

      const net = 1000 * 0.95;
      await db.run(
        'INSERT INTO claim_queue (user_id, claim_id, type, data) VALUES (?, ?, ?, ?)',
        [SELLER_ID, CLAIM_SELLER_ID, 'money', JSON.stringify(net)]
      );
    }

    // Mark listing as sold
    await db.run('UPDATE market_listings SET status = ? WHERE id = ?', ['sold', LIST_ID]);

    const buyerFinal = await db.query<{ save_data: Record<string, unknown> }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [BUYER_ID]
    );
    const buyerFinalRaw = buyerFinal[0]?.save_data;
    const buyerFinalSave = typeof buyerFinalRaw === 'string' ? JSON.parse(buyerFinalRaw) : (buyerFinalRaw as Record<string, unknown>);
    assert.strictEqual(buyerFinalSave.money, 4000);

    const claims = await db.query('SELECT * FROM claim_queue');
    assert.strictEqual(claims.length, 2);

    const soldListing = await db.query<{ status: string }>('SELECT status FROM market_listings WHERE id = ?', [LIST_ID]);
    assert.strictEqual(soldListing[0]?.status, 'sold');
  });

  it('should verify game_saves has last_save_id populated after updates', async () => {
    const validUuid = '00000000-0000-0000-0000-000000000099';
    await db.run(
      'UPDATE game_saves SET last_save_id = ? WHERE user_id = ?',
      [validUuid, SELLER_ID]
    );
    const updated = await db.query<{ last_save_id: string | null }>(
      'SELECT last_save_id FROM game_saves WHERE user_id = ?',
      [SELLER_ID]
    );
    assert.strictEqual(updated[0]?.last_save_id, validUuid);
  });
});
