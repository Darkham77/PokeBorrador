// fallow-ignore-file security-sink
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { repairPokemonLegality, checkPokemonLegality } from '../../src/logic/pokemon/pokemonLegality.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon.ts';
import type { SaveDataDto } from '../../src/logic/validation/schemas.ts';

const DEFAULT_DB_PATHS = [
  path.resolve(process.cwd(), 'poke_local.db'),
  path.resolve(process.cwd(), 'database/poke_local.db'),
  path.resolve(process.cwd(), 'tests/fixtures/poke_local_ash.db')
];

function findDefaultDb(): string | null {
  for (const p of DEFAULT_DB_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      user: { type: 'string', short: 'u' },
      db: { type: 'string', short: 'd' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true
  });

  if (values.help) {
    console.log(`
Uso: npm run db:repair-account [opciones] [userId]

Opciones:
  -u, --user <userId>  ID de la cuenta a reparar (o pásalo como argumento posicional).
  -d, --db <path>      Ruta a la base de datos SQLite (.db). Por defecto busca poke_local.db.
  -h, --help           Muestra esta ayuda.

Ejemplo:
  npm run db:repair-account local_ash
  npm run db:repair-account -- --user=local_user --db=database/poke_local.db
`);
    process.exit(0);
  }

  const targetUserId = values.user || (positionals[0] ? String(positionals[0]) : null);
  const targetDbPath = values.db ? path.resolve(process.cwd(), values.db) : findDefaultDb();

  if (!targetDbPath || !fs.existsSync(targetDbPath)) {
    console.error(`❌ No se encontró ninguna base de datos SQLite. Especifica la ruta con --db=<ruta>.`);
    process.exit(1);
  }

  console.log(`\n📦 Abriendo base de datos: ${targetDbPath}`);
  using db = new DatabaseSync(targetDbPath);

  let queryStr = 'SELECT user_id, save_data FROM game_saves';
  const params: string[] = []; // no-domain
  if (targetUserId) {
    queryStr += ' WHERE user_id = ?';
    params.push(targetUserId);
  }

  const rows = db.prepare(queryStr).all(...params) as Array<{ user_id: string; save_data: string }>;

  if (rows.length === 0) {
    console.log(targetUserId ? `⚠️ No se encontró ninguna partida para el usuario "${targetUserId}".` : '⚠️ La tabla game_saves está vacía.');
    process.exit(0);
  }

  console.log(`🔍 Se encontraron ${rows.length} cuenta(s) para auditar y reparar.\n`);

  let totalAccountsRepaired = 0;
  let totalPokemonRepaired = 0;

  for (const row of rows) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 Evaluando cuenta: ${row.user_id}`);

    let saveData: SaveDataDto;
    try {
      saveData = JSON.parse(row.save_data) as SaveDataDto;
    } catch (e) {
      console.error(`❌ Error al parsear JSON del usuario ${row.user_id}: ${(e as Error).message}`);
      continue;
    }

    let accountModified = false;
    let accountFixedPokemonCount = 0;

    // 1. Auditar y reparar Equipo
    if (Array.isArray(saveData.team)) {
      saveData.team.forEach((p, idx) => {
        if (!p) return;
        const initialCheck = checkPokemonLegality(p as Pokemon);
        if (!initialCheck.isLegal || (p as Pokemon).isIllegal) {
          const report = repairPokemonLegality(p as Pokemon);
          if (report.repaired) {
            console.log(`  [Equipo Slot ${idx}] ${p.name} (UID: ${p.uid}):`);
            report.changes.forEach(ch => console.log(`    ↳ ✅ ${ch}`));
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
            console.log(`  [Caja Slot ${idx}] ${p.name} (UID: ${p.uid}):`);
            report.changes.forEach(ch => console.log(`    ↳ ✅ ${ch}`));
            accountModified = true;
            accountFixedPokemonCount++;
          }
        }
      });
    }

    if (accountModified) {
      const updatedJson = JSON.stringify(saveData);
      db.prepare('UPDATE game_saves SET save_data = ? WHERE user_id = ?').run(updatedJson, row.user_id);
      console.log(`✨ Guardado actualizado con éxito en la base de datos (${accountFixedPokemonCount} Pokémon corregidos).`);
      totalAccountsRepaired++;
      totalPokemonRepaired += accountFixedPokemonCount;
    } else {
      console.log(`  👌 Todos los Pokémon de esta cuenta son 100% legales.`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 Resumen de Reparación:`);
  console.log(`   - Cuentas auditadas: ${rows.length}`);
  console.log(`   - Cuentas reparadas: ${totalAccountsRepaired}`);
  console.log(`   - Pokémon reparados: ${totalPokemonRepaired}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(err => {
  console.error('Error fatal al reparar cuentas:', err);
  process.exit(1);
});
