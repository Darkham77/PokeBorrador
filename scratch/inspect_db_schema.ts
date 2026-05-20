import fsPromises from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

async function main() {
  const ENV_FILE = path.resolve(process.cwd(), '.env');
  const envContent = await fsPromises.readFile(ENV_FILE, 'utf-8');
  const lines = envContent.split('\n');
  const conf: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^SERVER_cloud_([^=]+)=(.*)$/);
    if (match && match[1] && match[2]) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      conf[match[1].trim()] = val;
    }
  }

  let dbUrl = conf.DATABASE_URL || conf.POSTGRES_URL || conf.PG_URL || '';
  if (!dbUrl) {
    const pass = conf.POSTGRES_PASSWORD || conf.DB_PASSWORD || '';
    const rawPubUrl = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || '';
    if (rawPubUrl && pass) {
      const u = new URL(rawPubUrl);
      dbUrl = `postgres://postgres:${encodeURIComponent(pass)}@db.${u.hostname}:5432/postgres`;
    }
  }

  console.log(`Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  const sql = postgres(dbUrl, { ssl: 'require' });

  const tables = [
    'market_listings', 'battle_invites', 'ranked_queue', 'passive_battle_reports',
    'daycare_slots', 'daycare_upgrades', 'pokedex_entries', 'trade_offers', 'eggs',
    'guardian_captures', 'war_defenders', 'chat_messages', 'claim_queue', 'friendships',
    'global_chat_messages'
  ];

  for (const table of tables) {
    try {
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${table}
      `;
      const colNames = columns.map(c => c.column_name as string);
      console.log(`Table: ${table} -> ${colNames.join(', ') || 'NOT FOUND'}`);
    } catch (e: any) {
      console.error(`Error inspecting table ${table}: ${e.message}`);
    }
  }

  await sql.end();
}

main().catch(console.error);
