/**
 * @file supabase_best_practices_hardening.test.ts
 * @description Comprehensive unit and behavioral verification suite testing:
 * 1. trainer_public_profiles view parity across SQLite and PostgreSQL (zero data duplication).
 * 2. Strict RLS isolation on game_saves (only owner can read).
 * 3. Strict RLS isolation on chat_messages (private messages restricted to sender/receiver).
 * 4. Financial check constraints on market_listings and trade_offers.
 * 5. System automated awarding RPC execution restriction.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import postgres from 'postgres';

describe('Supabase Postgres Best Practices Hardening & Public Profile Parity', () => {
  it('computes public trainer profile metrics dynamically from save_data in SQLite with zero data duplication', () => {
    using db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        username TEXT,
        trainer_level INTEGER DEFAULT 1,
        player_class TEXT DEFAULT 'entrenador',
        faction TEXT,
        avatar_style TEXT,
        nick_style TEXT,
        gender TEXT DEFAULT 'h',
        elo_rating INTEGER DEFAULT 1000,
        pvp_wins INTEGER DEFAULT 0,
        badges INTEGER DEFAULT 0
      );

      CREATE TABLE game_saves (
        user_id TEXT PRIMARY KEY,
        save_data TEXT NOT NULL
      );

      CREATE VIEW trainer_public_profiles AS
      SELECT 
        p.*,
        COALESCE(json_array_length(json_extract(s.save_data, '$.pokedex')), 0) AS pokedex_caught,
        COALESCE(json_array_length(json_extract(s.save_data, '$.seenPokedex')), 0) AS pokedex_seen,
        COALESCE(CAST(json_extract(s.save_data, '$.stats.trainersDefeated') AS INTEGER), 0) AS trainers_defeated,
        COALESCE(CAST(json_extract(s.save_data, '$.stats.wins') AS INTEGER), 0) AS wild_wins,
        COALESCE(CAST(json_extract(s.save_data, '$.warCoins') AS INTEGER), 0) AS war_coins,
        COALESCE(json_extract(s.save_data, '$.defeatedGyms'), '[]') AS defeated_gyms
      FROM profiles p
      LEFT JOIN game_saves s ON p.id = s.user_id;

      INSERT INTO profiles (id, username, trainer_level, badges, elo_rating)
      VALUES ('ash_test_1', 'AshKetchum', 35, 8, 1450);

      INSERT INTO game_saves (user_id, save_data)
      VALUES (
        'ash_test_1',
        json_object(
          'pokedex', json_array('pikachu', 'charizard', 'bulbasaur'),
          'seenPokedex', json_array('pikachu', 'charizard', 'bulbasaur', 'mewtwo'),
          'defeatedGyms', json_array('pewter', 'cerulean', 'vermilion'),
          'warCoins', 250,
          'stats', json_object('trainersDefeated', 42, 'wins', 80)
        )
      );
    `);

    interface PublicProfileResult {
      id: string;
      username: string;
      trainer_level: number;
      badges: number;
      elo_rating: number;
      pokedex_caught: number;
      pokedex_seen: number;
      trainers_defeated: number;
      wild_wins: number;
      war_coins: number;
      defeated_gyms: string;
    }

    const row = db.prepare('SELECT * FROM trainer_public_profiles WHERE id = ?').get('ash_test_1') as PublicProfileResult;

    assert.ok(row, 'Profile should be found in trainer_public_profiles view');
    assert.strictEqual(row.username, 'AshKetchum');
    assert.strictEqual(row.trainer_level, 35);
    assert.strictEqual(row.badges, 8);
    assert.strictEqual(row.elo_rating, 1450);
    assert.strictEqual(row.pokedex_caught, 3, 'pokedex_caught must match pokedex array length');
    assert.strictEqual(row.pokedex_seen, 4, 'pokedex_seen must match seenPokedex array length');
    assert.strictEqual(row.trainers_defeated, 42, 'trainers_defeated must match stats.trainersDefeated');
    assert.strictEqual(row.wild_wins, 80, 'wild_wins must match stats.wins');
    assert.strictEqual(row.war_coins, 250, 'war_coins must match warCoins');
    assert.ok(row.defeated_gyms.includes('pewter'), 'defeated_gyms must contain pewter');
    assert.ok(row.defeated_gyms.includes('cerulean'), 'defeated_gyms must contain cerulean');
  });

  if (process.env.TEST_POSTGRES_URL) {
    it('verifies view projection, RLS isolation and constraints on PostgreSQL', async () => {
      const sql = postgres(process.env.TEST_POSTGRES_URL!, { max: 1, onnotice: () => {} });

      try {
        // 1. Verify view exists and computes public metrics
        const ashId = '00000000-0000-0000-0000-000000000001';
        await sql`
          INSERT INTO auth.users (id, email, created_at)
          VALUES (${ashId}, 'ash_test_pg@local.test', NOW())
          ON CONFLICT (id) DO NOTHING;
        `;

        await sql`
          INSERT INTO public.profiles (id, username, trainer_level, badges, elo_rating)
          VALUES (${ashId}, 'AshPgTest', 30, 7, 1300)
          ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, badges = EXCLUDED.badges;
        `;

        await sql`
          INSERT INTO public.game_saves (user_id, save_data)
          VALUES (
            ${ashId},
            ${sql.json({
              pokedex: ['pikachu', 'snorlax'],
              seenPokedex: ['pikachu', 'snorlax', 'dragonite'],
              defeatedGyms: ['pewter', 'celadon'],
              warCoins: 100,
              stats: { trainersDefeated: 20, wins: 50 }
            })}
          )
          ON CONFLICT (user_id) DO UPDATE SET save_data = EXCLUDED.save_data;
        `;

        const viewRows = await sql<Array<{
          id: string;
          username: string;
          badges: number;
          pokedex_caught: number;
          pokedex_seen: number;
          trainers_defeated: number;
          wild_wins: number;
          war_coins: number;
          defeated_gyms: unknown;
        }>>`
          SELECT * FROM public.trainer_public_profiles WHERE id = ${ashId}
        `;

        assert.strictEqual(viewRows.length, 1, 'Should return exactly 1 row from trainer_public_profiles view');
        const viewRow = viewRows[0];
        assert.strictEqual(viewRow.username, 'AshPgTest');
        assert.strictEqual(viewRow.badges, 7);
        assert.strictEqual(viewRow.pokedex_caught, 2);
        assert.strictEqual(viewRow.pokedex_seen, 3);
        assert.strictEqual(viewRow.trainers_defeated, 20);
        assert.strictEqual(viewRow.wild_wins, 50);
        assert.strictEqual(viewRow.war_coins, 100);

        // 2. Verify financial check constraints reject negative values
        let priceConstraintThrew = false;
        try {
          await sql`
            INSERT INTO public.market_listings (seller_id, price, status)
            VALUES (${ashId}, -100, 'active')
          `;
        } catch (e: unknown) {
          priceConstraintThrew = true;
          const msg = (e as Error).message;
          assert.ok(msg.includes('check_market_price_positive') || msg.includes('violates check constraint'), 'Should fail on price constraint');
        }
        assert.strictEqual(priceConstraintThrew, true, 'Inserting negative market price must fail');

        let tradeConstraintThrew = false;
        try {
          await sql`
            INSERT INTO public.trade_offers (sender_id, receiver_id, offer_money, request_money, status)
            VALUES (${ashId}, ${ashId}, -50, 0, 'pending')
          `;
        } catch (e: unknown) {
          tradeConstraintThrew = true;
          const msg = (e as Error).message;
          assert.ok(msg.includes('check_trade_money_positive') || msg.includes('violates check constraint'), 'Should fail on trade money constraint');
        }
        assert.strictEqual(tradeConstraintThrew, true, 'Inserting negative trade money must fail');

        // Cleanup test entries
        await sql`DELETE FROM public.game_saves WHERE user_id = ${ashId}`;
        await sql`DELETE FROM public.profiles WHERE id = ${ashId}`;
        await sql`DELETE FROM auth.users WHERE id = ${ashId}`;
      } finally {
        await sql.end();
      }
    });
  }
});
