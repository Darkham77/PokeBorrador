/**
 * scripts/validation/validate_backup_saves.ts
 * 
 * PLAYER SAVES INTEGRITY & COMPATIBILITY AUDIT (Node.js 26+ Native)
 * Reads the latest player backup JSON and audits every save's Pokemon, moves, and abilities
 * using @pkmn/sim (Showdown Dex) directly, eliminating local static database imports.
 * 
 * Usage: node --permission --experimental-strip-types --allow-fs-read=. scripts/validation/validate_backup_saves.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { setupValidation } from '../lib/validationBase.ts';
import { Dex } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';

const BACKUP_FILE = path.resolve(process.cwd(), 'database/backups/server_franco/server_franco_backup_2026-06-15T05-25-25-945573975Z.json');
const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  const validator = setupValidation({
    title: 'PLAYER SAVES BACKUP AUDITOR',
    requiredFiles: [BACKUP_FILE, SHOWDOWN_DB_PATH]
  });

  await validator.checkFiles();

  // 1. Load Showdown database
  // 1. Load Showdown database
  let showdownDB: { moves: Record<string, { name?: string }>; abilities: Record<string, { name?: string }> };
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData) as typeof showdownDB;
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando base de datos de Showdown: ${(error as Error).message}`));
    process.exit(1);
  }

  // 2. Mapeos inversos usando la base de datos oficial traducida de Showdown
  const moveNameToId = new Map<string, string>();
  for (const [id, data] of Object.entries(showdownDB.moves) as [string, { name?: string }][]) {
    if (data.name) {
      moveNameToId.set(normalize(data.name), id);
    }
  }

  const abilityNameToId = new Map<string, string>();
  for (const [id, data] of Object.entries(showdownDB.abilities) as [string, { name?: string }][]) {
    if (data.name) {
      abilityNameToId.set(normalize(data.name), id);
    }
  }

  // Traducciones alternativas legacy comunes
  const LEGACY_MOVE_TRANSLATIONS: Record<string, string> = {
    'destructor': 'pound',
    'arena': 'sandattack',
    'portazo': 'slam',
    'acidificacion': 'acid',
    'bubblebeam': 'bubblebeam',
    'rodar': 'rollout',
    'huesumerang': 'bonemerang',
    'golpecabeza': 'headbutt',
    'picotazo': 'peck',
    'persecucion': 'pursuit',
    'cola': 'tailwhip',
    'chupavidas': 'leechlife',
    'envolver': 'wrap',
    'golpekaratazo': 'karatechop',
    'movsismico': 'seismictoss',
    'punolodo': 'mudslap',
    'megapuno': 'megapunch',
    'minimizar': 'minimize',
    'pantallahumo': 'smokescreen',
    'huesorus': 'bonerush'
  };

  // 3. Load Backup file
  interface SavePoke {
    id: string;
    level?: number;
    moves?: Array<{ name: string }>;
    ability?: string;
    nature?: string;
    nickname?: string;
    name?: string;
  }
  interface SaveData {
    team?: SavePoke[];
    box?: SavePoke[];
  }
  interface SaveEntry {
    user_id: string;
    save_data?: SaveData;
  }
  let backupData: { data?: { game_saves?: SaveEntry[] } };
  try {
    const rawBackup = await fs.readFile(BACKUP_FILE, 'utf8');
    backupData = JSON.parse(rawBackup) as typeof backupData;
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando archivo de backup: ${(error as Error).message}`));
    process.exit(1);
  }

  const gameSaves = backupData.data?.game_saves || [];
  console.log(`📂 Cargados ${gameSaves.length} saves del backup de server_franco.\n`);

  const errors: string[] = [];
  const warnings: string[] = [];
  let totalPokemonScanned = 0;

  const gen = Dex.forGen(ACTIVE_GENERATION);

  // 4. Audit each save
  for (const saveEntry of gameSaves) {
    const userId = saveEntry.user_id;
    const saveData = saveEntry.save_data;
    if (!saveData) continue;

    const team = saveData.team || [];
    const box = saveData.box || [];
    const allPokes = [...team, ...box].filter(Boolean);

    for (const poke of allPokes) {
      totalPokemonScanned++;
      const tag = `[User: ${userId}] Pokémon: ${poke.name || poke.id} (Lvl ${poke.level ?? '?'})`;

      // A. Validate Species ID using Dex
      if (!poke.id) {
        errors.push(`${tag} - No tiene especie (id) definida.`);
        continue;
      }

      const species = gen.species.get(poke.id);
      if (!species.exists) {
        errors.push(`${tag} - Especie '${poke.id}' no existe en el Dex de @pkmn/sim.`);
      }

      // B. Validate Ability using Dex
      if (poke.ability) {
        const normAbilityName = normalize(poke.ability);
        const abilityId = abilityNameToId.get(normAbilityName) || normAbilityName;
        const ability = gen.abilities.get(abilityId);
        if (!ability.exists) {
          warnings.push(`${tag} - Habilidad '${poke.ability}' (ID: ${abilityId}) no existe en el Dex de @pkmn/sim.`);
        }
      } else {
        warnings.push(`${tag} - No tiene habilidad definida.`);
      }

      // C. Validate Nature
      if (poke.nature) {
        const validNatures = ['active', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty', 'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky'];
        const natureKey = normalize(poke.nature);
        if (!validNatures.includes(natureKey)) {
          warnings.push(`${tag} - Naturaleza '${poke.nature}' no válida.`);
        }
      }

      // D. Validate Moves using Dex
      const moves = poke.moves || [];
      if (moves.length === 0) {
        warnings.push(`${tag} - No tiene movimientos asignados.`);
      }

      for (const m of moves) {
        if (!m || !m.name) {
          errors.push(`${tag} - Movimiento nulo o sin nombre asignado.`);
          continue;
        }

        const normMoveName = normalize(m.name);
        let resolvedId = moveNameToId.get(normMoveName);

        // Si no se encuentra, buscar por traducción alternativa
        if (!resolvedId && LEGACY_MOVE_TRANSLATIONS[normMoveName]) {
          resolvedId = LEGACY_MOVE_TRANSLATIONS[normMoveName];
        }

        if (!resolvedId) {
          errors.push(`${tag} - Movimiento '${m.name}' no se pudo resolver a ningún ID de Showdown.`);
          continue;
        }

        const move = gen.moves.get(resolvedId);
        if (!move.exists) {
          errors.push(`${tag} - Movimiento '${m.name}' (ID: ${resolvedId}) no existe en el Dex de @pkmn/sim.`);
        }
      }
    }
  }

  // 5. Finalize and save report
  await validator.finish(
    {
      'Saves validados': gameSaves.length,
      'Pokémon totales auditados': totalPokemonScanned
    },
    errors,
    warnings
  );
}

main().catch((err: unknown) => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
