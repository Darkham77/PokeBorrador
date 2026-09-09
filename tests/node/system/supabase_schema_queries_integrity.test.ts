import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Supabase Schema Queries Integrity (Anti-400 Regression)', () => {
  const PROFILES_SQL_COLUMNS = new Set([
    'id',
    'username',
    'email',
    'trainer_level',
    'player_class',
    'faction',
    'nick_style',
    'avatar_style',
    'elo_rating',
    'current_session_id',
    'created_at',
    'updated_at',
    'role',
    'pvp_wins',
    'pvp_losses',
    'pvp_draws',
    'is_banned',
    'ban_reason',
    'db_version',
    'last_renamed_at',
    'gender',
    'badges',
    'max_damage',
    'total_battles',
    'trade_volume',
    'playtime_seconds',
    'last_played_at'
  ]);

  it('guarantees src/stores/pvp.ts queries only valid SQL columns on public.profiles without camelCase fields', () => {
    const pvpStorePath = path.resolve(process.cwd(), 'src/stores/pvp.ts');
    const content = fs.readFileSync(pvpStorePath, 'utf-8');

    // Find queries targeting .from('profiles')
    const queryRegex = /\.from\(['"]profiles['"]\)\s*\.select\(['"]([^'"]+)['"]\)/g;
    let match: RegExpExecArray | null;
    let foundQueries = 0;

    while ((match = queryRegex.exec(content)) !== null) {
      foundQueries++;
      const selectFieldsRaw = match[1];
      if (!selectFieldsRaw) continue;
      const requestedColumns = selectFieldsRaw.split(',').map(c => c.trim()).filter(Boolean);

      for (const col of requestedColumns) {
        expect(
          PROFILES_SQL_COLUMNS.has(col),
          `Invalid column '${col}' queried on 'profiles' table in src/stores/pvp.ts. Column does not exist in PostgreSQL schema and will trigger HTTP 400 Bad Request!`
        ).toBe(true);
      }
    }

    expect(foundQueries).toBeGreaterThan(0);
  });
});
