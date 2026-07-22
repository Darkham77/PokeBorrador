import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';

describe('Database Parallelism & Isolation Validator', () => {
  it('should guarantee absolute data isolation between multiple concurrent in-memory databases initialized from the same schema', () => {
    // 1. Simulate two concurrent client worker databases starting up
    using db1 = new DatabaseSync(':memory:');
    using db2 = new DatabaseSync(':memory:');

    // Initialize both from the master schema
    TABLES_SCHEMA.forEach(schema => {
      db1.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
      db2.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
    });

    // 2. Perform write operations on db1
    db1.prepare("INSERT INTO profiles (id, username, email) VALUES (?, ?, ?)")
      .run("user_1", "TrainerOne", "one@pkv.io");

    // 3. Perform different write operations on db2
    db2.prepare("INSERT INTO profiles (id, username, email) VALUES (?, ?, ?)")
      .run("user_2", "TrainerTwo", "two@pkv.io");

    // 4. Verify DB 1 only contains TrainerOne
    const profiles1 = db1.prepare("SELECT username FROM profiles").all() as { username: string }[];
    assert.strictEqual(profiles1.length, 1);
    assert.strictEqual(profiles1[0]?.username, "TrainerOne");

    // 5. Verify DB 2 only contains TrainerTwo (No state leakage)
    const profiles2 = db2.prepare("SELECT username FROM profiles").all() as { username: string }[];
    assert.strictEqual(profiles2.length, 1);
    assert.strictEqual(profiles2[0]?.username, "TrainerTwo");

    // 6. Verify that even if we query concurrently, their states are completely isolated
    const hasUser1InDb2 = db2.prepare("SELECT 1 FROM profiles WHERE id = ?").all("user_1");
    assert.strictEqual(hasUser1InDb2.length, 0, "State from DB 1 leaked into DB 2!");

    const hasUser2InDb1 = db1.prepare("SELECT 1 FROM profiles WHERE id = ?").all("user_2");
    assert.strictEqual(hasUser2InDb1.length, 0, "State from DB 2 leaked into DB 1!");
  });
});
