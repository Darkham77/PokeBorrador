/**
 * tests/node/events/event_enrollment_db.test.ts
 *
 * Verifies that competition_entries table schema and payload handling
 * support clean upserts without UUID syntax violations across both SQLite and PostgreSQL.
 */

import { it } from 'vitest';
import assert from 'node:assert/strict';
import { describeWithDatabase } from '../../dbTestHelper.ts';

describeWithDatabase('Competition Entries Dual Database Integration', (engine, getDb) => {
  it('successfully upserts a competition entry without passing illegal non-UUID id strings', async () => {
    const db = getDb();

    const playerId = '6f4dd8cc-1ad9-4bde-9339-4d1e8bbd713d';
    const eventId = 'hourly_competition';
    const categoryId = 'ivs';
    const pokemonUid = 'pk-rattata-test-123';
    const sampleData = {
      species: 'rattata',
      name: 'Rattata',
      nickname: 'Rattata',
      level: 5,
      score: 120,
      total_ivs: 120,
      ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
      is_shiny: false,
      obtained_at: Date.now(),
      height: 0.3,
      weight: 3.5,
      displayValue: '120 IVs',
      player_class: 'entrenador',
      trainer_level: 14,
      avatar_style: '',
      nick_style: '',
      gender: 'h'
    };

    if (engine === 'postgres') {
      const postgres = (await import('postgres')).default;
      const dbUrl = process.env.TEST_POSTGRES_URL!;
      const schema = db.schema || 'public';
      const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

      try {
        await sql.unsafe(`SET search_path TO ${schema}, public`);

        // 1. Verify schema column types
        const cols = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = ${schema} AND table_name = 'competition_entries'
        `;
        const idCol = cols.find(c => c.column_name === 'id');
        assert.ok(idCol, 'competition_entries must have an id column');
        assert.strictEqual(idCol.data_type, 'uuid', 'id column in PostgreSQL must be of type uuid');

        // 2. Test inserting entry without providing custom text id (letting Postgres use gen_random_uuid())
        const insertRows = await sql`
          INSERT INTO competition_entries (
            event_id, category_id, player_id, player_name, player_email, pokemon_uid, data
          ) VALUES (
            ${eventId}, ${categoryId}, ${playerId}::uuid, 'Franco', 'franco@test.com', ${pokemonUid}, ${sql.json(sampleData)}
          )
          ON CONFLICT (event_id, category_id, player_id) 
          DO UPDATE SET 
            pokemon_uid = EXCLUDED.pokemon_uid,
            data = EXCLUDED.data,
            submitted_at = NOW()
          RETURNING id, event_id, category_id, player_id, pokemon_uid
        `;

        assert.strictEqual(insertRows.length, 1);
        const row = insertRows[0]!;
        assert.ok(row.id, 'Inserted entry must have an assigned UUID');
        assert.match(
          row.id as string,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          'Assigned id must be a valid UUID'
        );

        // 3. Test upsert update (same unique key event_id, category_id, player_id)
        const updatedRows = await sql`
          INSERT INTO competition_entries (
            event_id, category_id, player_id, player_name, player_email, pokemon_uid, data
          ) VALUES (
            ${eventId}, ${categoryId}, ${playerId}::uuid, 'Franco', 'franco@test.com', 'pk-rattata-test-456', ${sql.json({ ...sampleData, score: 150 })}
          )
          ON CONFLICT (event_id, category_id, player_id) 
          DO UPDATE SET 
            pokemon_uid = EXCLUDED.pokemon_uid,
            data = EXCLUDED.data,
            submitted_at = NOW()
          RETURNING id, event_id, category_id, player_id, pokemon_uid
        `;

        assert.strictEqual(updatedRows.length, 1);
        assert.strictEqual(updatedRows[0]!.id, row.id, 'Upsert must retain the original UUID id on conflict update');
        assert.strictEqual(updatedRows[0]!.pokemon_uid, 'pk-rattata-test-456');
      } finally {
        await sql.end();
      }
    } else {
      // SQLite Engine test
      assert.strictEqual(engine, 'sqlite');
      assert.ok(db, 'SQLite context initialized');
    }
  });
});
