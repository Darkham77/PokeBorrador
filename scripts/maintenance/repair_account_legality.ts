// fallow-ignore-file security-sink
import { enableCompileCache } from 'node:module';
enableCompileCache?.();

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import postgres from 'postgres';
import { repairPokemonLegality, checkPokemonLegality } from '../../src/logic/pokemon/pokemonLegality.ts';
import { buildDatabaseUrl, getValidatedServerConfigs } from '../lib/supabaseClient.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon.ts';
import type { SaveDataDto } from '../../src/logic/validation/schemas.ts';

export interface RepairAccountOptions {
  userId?: string | null;
  all?: boolean;
  server?: string | null;
  dbPath?: string;
  silent?: boolean;
}

export interface AccountRepairDetail {
  userId: string;
  modified: boolean;
  fixedPokemonCount: number;
  details: string[]; // no-domain
}

export interface RepairSummary {
  accountsAudited: number;
  accountsRepaired: number;
  pokemonRepaired: number;
  accountReports: AccountRepairDetail[];
}

const DEFAULT_DB_PATHS = [
  path.resolve(process.cwd(), 'poke_local.db'),
  path.resolve(process.cwd(), 'database/poke_local.db'),
  path.resolve(process.cwd(), 'tests/fixtures/poke_local_ash.db')
];

export function findDefaultDb(): string | null {
  for (const p of DEFAULT_DB_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Aplica el algoritmo de auditoría y reparación sobre un objeto SaveDataDto.
 * Retorna true si se modificó algún Pokémon ilegal, junto con la lista de cambios.
 */
function auditAndRepairSaveData(
  saveData: SaveDataDto,
  isSilent: boolean
): { modified: boolean; fixedPokemonCount: number; details: string[] } {
  let accountModified = false;
  let accountFixedPokemonCount = 0;
  const accountDetails: string[] = []; // no-domain

  // 1. Auditar y reparar Equipo
  if (Array.isArray(saveData.team)) {
    saveData.team.forEach((p, idx) => {
      if (!p) return;
      const initialCheck = checkPokemonLegality(p as Pokemon);
      if (!initialCheck.isLegal || (p as Pokemon).isIllegal) {
        const report = repairPokemonLegality(p as Pokemon);
        if (report.repaired) {
          const logHeader = `[Equipo Slot ${idx}] ${p.name} (UID: ${p.uid}):`;
          accountDetails.push(logHeader);
          if (!isSilent) console.log(`  ${logHeader}`);
          report.changes.forEach(ch => {
            accountDetails.push(`  ↳ ${ch}`);
            if (!isSilent) console.log(`    ↳ ✅ ${ch}`);
          });
          accountModified = true;
          accountFixedPokemonCount++;
        }
      }
    });
  }

  // 2. Auditar y reparar Caja
  if (Array.isArray(saveData.box)) {
    saveData.box.forEach((p, idx) => {
      if (!p) return;
      const initialCheck = checkPokemonLegality(p as Pokemon);
      if (!initialCheck.isLegal || (p as Pokemon).isIllegal) {
        const report = repairPokemonLegality(p as Pokemon);
        if (report.repaired) {
          const logHeader = `[Caja Slot ${idx}] ${p.name} (UID: ${p.uid}):`;
          accountDetails.push(logHeader);
          if (!isSilent) console.log(`  ${logHeader}`);
          report.changes.forEach(ch => {
            accountDetails.push(`  ↳ ${ch}`);
            if (!isSilent) console.log(`    ↳ ✅ ${ch}`);
          });
          accountModified = true;
          accountFixedPokemonCount++;
        }
      }
    });
  }

  return {
    modified: accountModified,
    fixedPokemonCount: accountFixedPokemonCount,
    details: accountDetails
  };
}

/**
 * Repara cuentas almacenadas en una base de datos local SQLite.
 */
export function repairAccountsInSqlite(options: RepairAccountOptions): RepairSummary {
  const isAll = Boolean(options.all);
  const targetUserId = isAll ? null : (options.userId || null);
  const targetDbPath = options.dbPath ? path.resolve(process.cwd(), options.dbPath) : findDefaultDb();
  const isSilent = Boolean(options.silent);

  if (!targetDbPath || !fs.existsSync(targetDbPath)) {
    throw new Error(`No se encontró ninguna base de datos SQLite en "${targetDbPath || 'rutas por defecto'}".`);
  }

  if (!isSilent) {
    console.log(`\n📦 Abriendo base de datos SQLite: ${targetDbPath}`);
    if (isAll) {
      console.log(`🌐 Modo masivo (--all): Auditando y corrigiendo todas las cuentas registradas...`);
    } else {
      console.log(`🎯 Modo individual: Reparando cuenta "${targetUserId}"...`);
    }
  }

  using db = new DatabaseSync(targetDbPath);

  let queryStr = 'SELECT user_id, save_data FROM game_saves';
  const params: string[] = []; // no-domain
  if (targetUserId) {
    queryStr += ' WHERE user_id = ?';
    params.push(targetUserId);
  } else {
    queryStr += ' ORDER BY user_id ASC';
  }

  const rows = db.prepare(queryStr).all(...params) as Array<{ user_id: string; save_data: string }>;

  const summary: RepairSummary = {
    accountsAudited: rows.length,
    accountsRepaired: 0,
    pokemonRepaired: 0,
    accountReports: []
  };

  if (rows.length === 0) {
    if (!isSilent) {
      console.log(targetUserId ? `⚠️ No se encontró ninguna partida para el usuario "${targetUserId}".` : '⚠️ La tabla game_saves está vacía.');
    }
    return summary;
  }

  if (!isSilent) {
    console.log(`🔍 Se encontraron ${rows.length} cuenta(s) para auditar y reparar.\n`);
  }

  for (const row of rows) {
    if (!isSilent) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 Evaluando cuenta: ${row.user_id}`);
    }

    let saveData: SaveDataDto;
    try {
      saveData = JSON.parse(row.save_data) as SaveDataDto;
    } catch (e) {
      const errMsg = `Error al parsear JSON del usuario ${row.user_id}: ${(e as Error).message}`;
      if (!isSilent) console.error(`❌ ${errMsg}`);
      summary.accountReports.push({
        userId: row.user_id,
        modified: false,
        fixedPokemonCount: 0,
        details: [errMsg]
      });
      continue;
    }

    const { modified, fixedPokemonCount, details } = auditAndRepairSaveData(saveData, isSilent);

    if (modified) {
      const updatedJson = JSON.stringify(saveData);
      db.prepare('UPDATE game_saves SET save_data = ? WHERE user_id = ?').run(updatedJson, row.user_id);
      if (!isSilent) {
        console.log(`✨ Guardado actualizado con éxito en SQLite (${fixedPokemonCount} Pokémon corregidos).`);
      }
      summary.accountsRepaired++;
      summary.pokemonRepaired += fixedPokemonCount;
    } else {
      if (!isSilent) {
        console.log(`  👌 Todos los Pokémon de esta cuenta son 100% legales.`);
      }
    }

    summary.accountReports.push({
      userId: row.user_id,
      modified,
      fixedPokemonCount,
      details
    });
  }

  if (!isSilent) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 Resumen de Reparación (SQLite):`);
    console.log(`   - Cuentas auditadas: ${summary.accountsAudited}`);
    console.log(`   - Cuentas reparadas: ${summary.accountsRepaired}`);
    console.log(`   - Pokémon reparados: ${summary.pokemonRepaired}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  return summary;
}

/**
 * Repara cuentas almacenadas en un servidor Supabase / PostgreSQL.
 */
export async function repairAccountsInSupabase(options: RepairAccountOptions): Promise<RepairSummary> {
  const isAll = Boolean(options.all);
  const targetUser = isAll ? null : (options.userId || null);
  const profile = options.server;
  const isSilent = Boolean(options.silent);

  if (!profile) {
    throw new Error('Debes especificar un perfil de servidor (ej: server_franco, nas_franco).');
  }

  const { serverConfigs } = await getValidatedServerConfigs();
  const { findServerConfig } = await import('../lib/supabaseClient.ts');
  const conf = findServerConfig(serverConfigs, profile);

  if (!conf) {
    throw new Error(`El perfil o ID "${profile}" no existe en el archivo .env.`);
  }

  const dbUrl = buildDatabaseUrl(conf, profile);
  if (!dbUrl) {
    throw new Error(`No se pudo construir la URL de conexión Postgres para el perfil "${profile}".`);
  }

  if (dbUrl.includes('placeholder')) {
    throw new Error(`La contraseña para "${profile}" es un placeholder.`);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  if (!isSilent) {
    console.log(`\n🔌 Conectando al servidor Supabase [${profile}]...`);
    if (isAll) {
      console.log(`🌐 Modo masivo (--all): Auditando y corrigiendo todas las cuentas registradas...`);
    } else {
      console.log(`🎯 Modo individual: Reparando cuenta "${targetUser}"...`);
    }
  }

  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  const summary: RepairSummary = {
    accountsAudited: 0,
    accountsRepaired: 0,
    pokemonRepaired: 0,
    accountReports: []
  };

  try {
    let rows: Array<{ user_id: string; save_data: unknown }>;

    if (isAll || !targetUser) {
      rows = await sql`SELECT user_id, save_data FROM public.game_saves ORDER BY user_id ASC` as Array<{ user_id: string; save_data: unknown }>;
    } else {
      // 1. Intentar buscar directamente por user_id UUID
      let matchedRows = await sql`SELECT user_id, save_data FROM public.game_saves WHERE user_id::text = ${targetUser}` as Array<{ user_id: string; save_data: unknown }>;

      // 2. Si no encuentra por UUID, buscar en profiles por username o email
      if (matchedRows.length === 0) {
        const profiles = await sql`SELECT id, username, email FROM public.profiles WHERE username ILIKE ${targetUser} OR email ILIKE ${targetUser}` as Array<{ id: string; username: string; email: string }>;
        if (profiles.length === 1 && profiles[0]?.id) {
          const resolvedUuid = profiles[0].id;
          if (!isSilent) console.log(`👤 Usuario encontrado por perfil: ${profiles[0].username} (UUID: ${resolvedUuid})`);
          matchedRows = await sql`SELECT user_id, save_data FROM public.game_saves WHERE user_id::text = ${resolvedUuid}` as Array<{ user_id: string; save_data: unknown }>;
        } else if (profiles.length > 1) {
          throw new Error(`Se encontraron múltiples usuarios coincidentes con "${targetUser}". Usa el UUID explícito.`);
        }
      }

      rows = matchedRows;
    }

    summary.accountsAudited = rows.length;

    if (rows.length === 0) {
      if (!isSilent) {
        console.log(targetUser ? `⚠️ No se encontró ninguna partida para el usuario "${targetUser}".` : '⚠️ La tabla game_saves está vacía.');
      }
      return summary;
    }

    if (!isSilent) {
      console.log(`🔍 Se encontraron ${rows.length} cuenta(s) en Supabase para auditar y reparar.\n`);
    }

    for (const row of rows) {
      if (!isSilent) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👤 Evaluando cuenta: ${row.user_id}`);
      }

      let saveData: SaveDataDto;
      try {
        if (typeof row.save_data === 'string') {
          saveData = JSON.parse(row.save_data) as SaveDataDto;
        } else if (row.save_data && typeof row.save_data === 'object') {
          saveData = row.save_data as SaveDataDto;
        } else {
          throw new Error('Formato de save_data inválido');
        }
      } catch (e) {
        const errMsg = `Error al procesar JSON del usuario ${row.user_id}: ${(e as Error).message}`;
        if (!isSilent) console.error(`❌ ${errMsg}`);
        summary.accountReports.push({
          userId: row.user_id,
          modified: false,
          fixedPokemonCount: 0,
          details: [errMsg]
        });
        continue;
      }

      const { modified, fixedPokemonCount, details } = auditAndRepairSaveData(saveData, isSilent);

      if (modified) {
        const updatedJson = JSON.stringify(saveData);
        await sql`UPDATE public.game_saves SET save_data = ${updatedJson}::jsonb, updated_at = NOW() WHERE user_id = ${row.user_id}`;
        if (!isSilent) {
          console.log(`✨ Guardado actualizado con éxito en Supabase (${fixedPokemonCount} Pokémon corregidos).`);
        }
        summary.accountsRepaired++;
        summary.pokemonRepaired += fixedPokemonCount;
      } else {
        if (!isSilent) {
          console.log(`  👌 Todos los Pokémon de esta cuenta son 100% legales.`);
        }
      }

      summary.accountReports.push({
        userId: row.user_id,
        modified,
        fixedPokemonCount,
        details
      });
    }

    if (!isSilent) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎉 Resumen de Reparación (Supabase [${profile}]):`);
      console.log(`   - Cuentas auditadas: ${summary.accountsAudited}`);
      console.log(`   - Cuentas reparadas: ${summary.accountsRepaired}`);
      console.log(`   - Pokémon reparados: ${summary.pokemonRepaired}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    return summary;
  } finally {
    await sql.end();
  }
}

/**
 * Función principal unificada de reparación de cuentas para SQLite o Supabase.
 */
export async function repairAccountsInDatabase(options: RepairAccountOptions): Promise<RepairSummary> {
  if (options.server) {
    return await repairAccountsInSupabase(options);
  }
  return repairAccountsInSqlite(options);
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      user: { type: 'string', short: 'u' },
      all: { type: 'boolean', short: 'a' },
      'all-accounts': { type: 'boolean' },
      server: { type: 'string', short: 's' },
      db: { type: 'string', short: 'd' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true
  });

  if (values.help) {
    console.log(`
Uso:
  # Base de datos local (SQLite):
  npm run db:repair-account -- --user=<userId>
  npm run db:repair-account -- --all

  # Servidor remoto / Supabase (PostgreSQL):
  npm run db:repair-account -- --server=<perfil> --user=<userId>
  npm run db:repair-account -- --server=<perfil> --all

Opciones:
  -u, --user <userId>      ID, nombre de usuario o email de la cuenta a reparar.
  -a, --all                Corrige los Pokémon ilegales de TODAS las cuentas registradas, una por una.
  -s, --server <perfil>    Perfil de servidor Supabase (ej: server_franco, nas_franco, cloud).
  -d, --db <path>          Ruta a la base de datos SQLite (.db). Por defecto busca poke_local.db.
  -h, --help               Muestra esta ayuda.

Ejemplos:
  npm run db:repair-account -- --user=Ash
  npm run db:repair-account -- --all
  npm run db:repair-account -- --server=nas_franco --user=kenviota@gmail.com
  npm run db:repair-account -- --server=nas_franco --all
`);
    process.exit(0);
  }

  let targetServer = values.server;
  const remainingPositionals = [...positionals];

  if (!targetServer) {
    try {
      const { baseProfiles, allAvailable } = await getValidatedServerConfigs();
      const serverIdx = remainingPositionals.findIndex(p => allAvailable.includes(p) || baseProfiles.includes(p));
      if (serverIdx !== -1) {
        targetServer = remainingPositionals[serverIdx];
        remainingPositionals.splice(serverIdx, 1);
      }
    } catch {
      // Ignored if .env cannot be read in offline mode
    }
  }

  const isAll = Boolean(values.all) || Boolean(values['all-accounts']) || remainingPositionals.some(p => p === 'all' || p === '--all');
  const rawUserId = values.user || (remainingPositionals.find(p => p !== 'all' && p !== '--all') ? String(remainingPositionals.find(p => p !== 'all' && p !== '--all')) : null);
  const targetUserId = isAll ? null : rawUserId;

  if (!isAll && !targetUserId) {
    console.error(`❌ Debes especificar un usuario (ej: npm run db:repair-account <userId> o --user <userId>) o utilizar --all (o el argumento 'all') para corregir todas las cuentas registradas.`);
    console.log(`Usa --help para más información.\n`);
    process.exit(1);
  }

  try {
    await repairAccountsInDatabase({
      userId: targetUserId,
      all: isAll,
      server: targetServer,
      dbPath: values.db
    });
  } catch (err) {
    console.error(`❌ Error al reparar cuentas:`, (err as Error).message);
    process.exit(1);
  }
}

// Ejecutar CLI solo si se llama directamente
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error('Error fatal al reparar cuentas:', err);
    process.exit(1);
  });
}

