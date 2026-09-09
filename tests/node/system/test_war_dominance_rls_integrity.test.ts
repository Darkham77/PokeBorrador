import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('War Dominance RLS & Persistence Integrity (Anti-403 Regression)', () => {
  const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');

  it('guarantees war_dominance has explicit INSERT and UPDATE policies in migrations for authenticated users', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql'));
    let hasInsertPolicy = false;
    let hasUpdatePolicy = false;

    for (const file of files) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      if (content.includes('war_dominance')) {
        if (/CREATE\s+POLICY\s+["'].*?["']\s+ON\s+(?:public\.)?war_dominance\s+FOR\s+INSERT/i.test(content)) {
          hasInsertPolicy = true;
        }
        if (/CREATE\s+POLICY\s+["'].*?["']\s+ON\s+(?:public\.)?war_dominance\s+FOR\s+UPDATE/i.test(content)) {
          hasUpdatePolicy = true;
        }
      }
    }

    expect(
      hasInsertPolicy,
      'Missing INSERT policy on public.war_dominance in database/migrations/. Client weekly dominance settlement will trigger HTTP 403 Forbidden!'
    ).toBe(true);

    expect(
      hasUpdatePolicy,
      'Missing UPDATE policy on public.war_dominance in database/migrations/. Client weekly dominance settlement will trigger HTTP 403 Forbidden!'
    ).toBe(true);
  });
});
