import { describe, it, vi, beforeEach, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let memoryDb: DatabaseSync;

vi.mock('@/logic/db/sqliteEngine.ts', () => ({
  queryLocal: vi.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT');
    const stmt = memoryDb.prepare(sql);
    if (isSelect) {
      return stmt.all(...(params as (string | number | bigint | null)[])) as Record<string, unknown>[]; // open-record: Generic key-value data dictionary container
    }
    stmt.run(...(params as (string | number | bigint | null)[]));
    return [];
  }),
  persistSQLite: vi.fn(async () => {})
}));

import { emulateAwardRankedSeasonAutomated, emulateRecordPassiveBattleResult } from '@/logic/db/rpcEmulations/rankedRpc.ts';
import { queryLocal } from '@/logic/db/sqliteEngine.ts';
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts';

describe('Tier 2 Integration: Ranked Season Awarding & Passive Combat Parity', () => {
  beforeEach(async () => {
    memoryDb = new DatabaseSync(':memory:');

    // Create minimal schema for ranked season awarding & passive combat
    await queryLocal(`
      CREATE TABLE IF NOT EXISTS ranked_rules_config (
        id TEXT PRIMARY KEY,
        season_name TEXT DEFAULT 'TEMPORADA ACTUAL',
        config TEXT DEFAULT '{}',
        last_awarded_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT,
        elo_rating INTEGER DEFAULT 1000,
        pvp_wins INTEGER DEFAULT 0,
        pvp_losses INTEGER DEFAULT 0,
        pvp_draws INTEGER DEFAULT 0
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS awards (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        winner_id TEXT,
        winner_name TEXT,
        winner_email TEXT,
        prize TEXT,
        awarded_at TEXT,
        claimed INTEGER DEFAULT 0,
        received_at TEXT
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS competition_results (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        winners TEXT,
        ended_at TEXT
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS passive_battle_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        opponent_id TEXT,
        result TEXT,
        report_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  it('validates that PostgreSQL migration contains proper variable declarations and permissions', async () => {
    const migrationPath = path.resolve(process.cwd(), 'database/migrations/20260906000000_create_fn_award_ranked_season_automated.sql');
    const content = await fs.readFile(migrationPath, 'utf-8');

    // Verify PL/pgSQL variable declarations
    expect(content).toMatch(/DECLARE\s+[\s\S]*?v_eligible_count\s+INT/i);
    expect(content).toMatch(/DECLARE\s+[\s\S]*?v_awards_count\s+INT/i);
    expect(content).toMatch(/DECLARE\s+[\s\S]*?v_podium\s+JSONB/i);

    // Verify security & grant statements
    expect(content).toMatch(/GRANT EXECUTE ON FUNCTION public\.fn_award_ranked_season_automated\s*\(\s*TEXT\s*\)\s*TO\s+[^;]*authenticated/i);
    expect(content).toMatch(/GRANT EXECUTE ON FUNCTION public\.record_passive_battle_result\s*\(\s*UUID,\s*TEXT,\s*INT,\s*JSONB\s*\)\s*TO\s+authenticated/i);

    // Verify proportional soft reset formula in Postgres
    expect(content).toMatch(/GREATEST\s*\(\s*1000\s*,\s*1000\s*\+\s*\(\s*\(\s*COALESCE\s*\(\s*elo_rating/i);

    // Verify ranked_medal insertion
    expect(content).toMatch(/jsonb_build_object\s*\(\s*'type',\s*'ranked_medal'/i);
  });

  it('executes automated ranked season awarding with tier prizes, medals, podium and soft reset', async () => {
    // Seed test profiles
    // 1. Maestro (3500 ELO, 10 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_maestro', 'AshChampion', 'ash@poke.com', 3500, 10, 0)`);
    // 2. Diamante (2800 ELO, 8 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_diamante', 'GaryOak', 'gary@poke.com', 2800, 7, 1)`);
    // 3. Platino (2200 ELO, 6 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_platino', 'BrockRock', 'brock@poke.com', 2200, 4, 2)`);
    // 4. Oro (1700 ELO, 5 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_oro', 'MistyWater', 'misty@poke.com', 1700, 3, 2)`);
    // 5. Plata (1300 ELO, 5 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_plata', 'SurgeElectric', 'surge@poke.com', 1300, 2, 3)`);
    // 6. Bronce (1050 ELO, 5 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_bronce', 'BugCatcher', 'bug@poke.com', 1050, 1, 4)`);
    // 7. Ineligible (< 5 matches)
    await queryLocal(`INSERT INTO profiles (id, username, email, elo_rating, pvp_wins, pvp_losses) VALUES ('u_ineligible', 'RookieTrainer', 'rookie@poke.com', 1500, 2, 0)`);

    const res = await emulateAwardRankedSeasonAutomated({} as SQLiteDatabase, { target_season_name: 'Temporada 1' });
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();

    const data = res.data as { ok: boolean; eligible_players: number; awards_created: number; podium_count: number };
    expect(data.ok).toBe(true);
    expect(data.eligible_players).toBe(6); // 6 eligible players (u_ineligible excluded)
    expect(data.podium_count).toBe(6);

    // Verify awards in SQLite table
    const awards = (await queryLocal(`SELECT * FROM awards ORDER BY id ASC`)) as Array<{
      id: string;
      winner_id: string;
      prize: string;
    }>;
    expect(awards.length).toBeGreaterThanOrEqual(15);

    // Verify Maestro awards
    const maestroAwards = awards.filter(a => a.winner_id === 'u_maestro');
    expect(maestroAwards.length).toBe(5); // 1 medal + 1 pokemon + 2 tickets + 1 bc
    const maestroMedal = maestroAwards.find(a => a.prize.includes('"ranked_medal"'));
    expect(maestroMedal).toBeDefined();
    expect(maestroMedal!.prize).toContain('"tier":"maestro"');
    expect(maestroMedal!.prize).toContain('"season":"Temporada 1"');

    const maestroShinyEevee = maestroAwards.find(a => a.prize.includes('"shiny":true'));
    expect(maestroShinyEevee).toBeDefined();

    // Verify Ineligible received 0 awards
    const ineligibleAwards = awards.filter(a => a.winner_id === 'u_ineligible');
    expect(ineligibleAwards.length).toBe(0);

    // Verify podium was saved in competition_results
    const results = (await queryLocal(`SELECT * FROM competition_results`)) as Array<{
      event_id: string;
      winners: string;
    }>;
    expect(results.length).toBe(1);
    expect(results[0]!.event_id).toBe('ranked_season_Temporada 1');
    const podiumParsed = JSON.parse(results[0]!.winners) as Array<{ rank: number; player_name: string; tier: string }>;
    expect(podiumParsed[0]!.player_name).toBe('AshChampion');
    expect(podiumParsed[0]!.tier).toBe('maestro');

    // Verify Proportional ELO Soft Reset
    const profiles = (await queryLocal(`SELECT id, elo_rating FROM profiles`)) as Array<{ id: string; elo_rating: number }>;
    const getElo = (id: string) => profiles.find(p => p.id === id)!.elo_rating;

    // 3500 -> 1000 + (2500 / 2) = 2250
    expect(getElo('u_maestro')).toBe(2250);
    // 2800 -> 1000 + (1800 / 2) = 1900
    expect(getElo('u_diamante')).toBe(1900);
    // 2200 -> 1000 + (1200 / 2) = 1600
    expect(getElo('u_platino')).toBe(1600);
    // 1700 -> 1000 + (700 / 2) = 1350
    expect(getElo('u_oro')).toBe(1350);
    // 1300 -> 1000 + (300 / 2) = 1150
    expect(getElo('u_plata')).toBe(1150);
    // 1050 -> 1000 + (50 / 2) = 1025
    expect(getElo('u_bronce')).toBe(1025);

    // Verify 10-minute lockout guard prevents immediate duplicate execution
    const duplicateRes = await emulateAwardRankedSeasonAutomated({} as SQLiteDatabase, { target_season_name: 'Temporada 1' });
    expect(duplicateRes.data).toEqual({ ok: false, error: 'Ya premiado recientemente.' });
  });

  it('records passive battle results and safely updates defender ELO with floor 1000', async () => {
    await queryLocal(`INSERT INTO profiles (id, username, elo_rating) VALUES ('u_defender', 'RivalTrainer', 1010)`);

    // Defender loses 25 ELO -> should floor at 1000 (1010 - 25 = 985 -> floor 1000)
    const res1 = await emulateRecordPassiveBattleResult(
      {} as SQLiteDatabase,
      {
        p_defender_id: 'u_defender',
        p_result: 'defeat',
        p_delta_elo: -25,
        p_report_data: { opponent: 'PlayerAttacker', turns: 12 }
      },
      { userId: 'u_attacker', username: 'PlayerAttacker' }
    );

    expect(res1.error).toBeNull();
    expect((res1.data as { ok: boolean }).ok).toBe(true);

    const defenderProfile = (await queryLocal(`SELECT elo_rating FROM profiles WHERE id = 'u_defender'`)) as Array<{ elo_rating: number }>;
    expect(defenderProfile[0]!.elo_rating).toBe(1000); // Floored at 1000

    // Defender wins 30 ELO -> 1000 + 30 = 1030
    const res2 = await emulateRecordPassiveBattleResult(
      {} as SQLiteDatabase,
      {
        p_defender_id: 'u_defender',
        p_result: 'victory',
        p_delta_elo: 30,
        p_report_data: { opponent: 'PlayerAttacker2', turns: 8 }
      },
      { userId: 'u_attacker2', username: 'PlayerAttacker2' }
    );

    expect(res2.error).toBeNull();
    const updatedProfile = (await queryLocal(`SELECT elo_rating FROM profiles WHERE id = 'u_defender'`)) as Array<{ elo_rating: number }>;
    expect(updatedProfile[0]!.elo_rating).toBe(1030);

    // Verify passive_battle_reports row was created
    const reports = (await queryLocal(`SELECT * FROM passive_battle_reports WHERE user_id = 'u_defender'`)) as Array<{
      user_id: string;
      opponent_id: string;
      result: string;
      report_data: string;
    }>;
    expect(reports.length).toBe(2);
    expect(reports[0]!.result).toBe('defeat');
    expect(reports[1]!.result).toBe('victory');
  });
});
