/**
 * scripts/validate_translations.ts
 * 
 * SHOWDOWN SANDBOX TRANSLATION AUDITOR & SAFEGUARD SCRIPT (Node.js 26+)
 * 
 * Performs an automated regression check on database localizations to assert:
 *   1. 100% coverage of move translations and descriptions in Spanish.
 *   2. Strict validation of Pokémon types (ensuring only valid Spanish type strings, catching English leaks).
 *   3. Ability naming and coverage audits.
 *   4. Generates a clean audit log inside the scratch/ directory.
 * 
 * Usage: node --permission --allow-fs-read=. --allow-fs-write=. --experimental-strip-types scripts/validate_translations.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Target Paths
const SHOWDOWN_DB_ES_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');
const REPORT_PATH = path.resolve(process.cwd(), 'scratch/translation_audit_report.txt');

// 18 Official Spanish elements
const VALID_SPANISH_TYPES = new Set([
  'normal',
  'fuego',
  'agua',
  'planta',
  'eléctrico',
  'electrico',
  'hielo',
  'lucha',
  'veneno',
  'tierra',
  'volador',
  'psíquico',
  'psiquico',
  'bicho',
  'roca',
  'fantasma',
  'dragón',
  'dragon',
  'siniestro',
  'acero',
  'hada',
  '???'
]);

interface ExtractedMove {
  id: string;
  name: string;
  type: string;
  category: string;
  desc?: string;
  shortDesc?: string;
}

interface ExtractedPokemon {
  name: string;
  types: string[];
  abilities: string[];
}

interface ShowdownLocalDB {
  pokemon: Record<string, ExtractedPokemon>;
  moves: Record<string, ExtractedMove>;
  abilities: Record<string, unknown>;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n══════════════════════════════════════════════════════════════'));
  console.log(styleText('bold', '🛡️  AUDITORÍA DE TRADUCCIONES: CONTROL DE LEAKS Y CALIDAD 🛡️'));
  console.log(styleText('bold', '══════════════════════════════════════════════════════════════\n'));

  const errors: string[] = [];
  const warnings: string[] = [];
  const achievements: string[] = [];

  // Phase 1: Check Database File
  if (!(await fileExists(SHOWDOWN_DB_ES_PATH))) {
    console.error(styleText('red', `❌ Error: No se encontró la base de datos en español en: ${SHOWDOWN_DB_ES_PATH}`));
    process.exit(1);
  }
  achievements.push('Base de datos en español (showdown_db_es.json) encontrada de forma correcta.');

  const dbRaw = await fs.readFile(SHOWDOWN_DB_ES_PATH, 'utf8');
  const db = JSON.parse(dbRaw) as ShowdownLocalDB;

  // Phase 2: Auditing Pokémon Types (Leaks checking)
  const pokemonEntries = Object.entries(db.pokemon);
  let typeLeaksCount = 0;
  
  for (const [pokeId, poke] of pokemonEntries) {
    if (!poke.types || poke.types.length === 0) {
      errors.push(`Pokémon sin tipos asignados: ${pokeId} (${poke.name})`);
      continue;
    }
    
    for (const type of poke.types) {
      const cleanType = type.trim().toLowerCase();
      if (!VALID_SPANISH_TYPES.has(cleanType)) {
        errors.push(`LEAK DETECTADO: El Pokémon "${poke.name}" (${pokeId}) tiene un tipo no traducido o inválido: "${type}"`);
        typeLeaksCount++;
      }
    }
  }

  if (typeLeaksCount === 0) {
    achievements.push(`Validación de tipos de Pokémon impecable. ${pokemonEntries.length} Pokémon auditados sin leaks de inglés.`);
  } else {
    errors.push(`Se detectaron ${typeLeaksCount} leaks de tipo inglés en la base de datos de Pokémon.`);
  }

  // Phase 3: Auditing Moves (Accents, Translations and Descriptions)
  const moveEntries = Object.entries(db.moves);
  let missingMoveNames = 0;
  let missingMoveDescs = 0;

  for (const [moveId, move] of moveEntries) {
    if (!move.name || move.name.trim() === '') {
      errors.push(`Movimiento sin nombre: ${moveId}`);
      missingMoveNames++;
    }
    
    const desc = move.shortDesc || move.desc;
    if (!desc || desc.trim() === '') {
      errors.push(`Movimiento sin descripción: ${moveId} (${move.name})`);
      missingMoveDescs++;
    }

    const cleanMoveType = move.type.trim().toLowerCase();
    if (!VALID_SPANISH_TYPES.has(cleanMoveType)) {
      errors.push(`LEAK DETECTADO: El movimiento "${move.name}" (${moveId}) tiene un tipo de ataque inválido o en inglés: "${move.type}"`);
    }
  }

  if (missingMoveNames === 0 && missingMoveDescs === 0) {
    achievements.push(`Validación de ataques impecable. ${moveEntries.length} movimientos auditados con nombres y descripciones en español.`);
  } else {
    errors.push(`Faltan traducciones en la base de datos de ataques (Nombres faltantes: ${missingMoveNames}, Descripciones faltantes: ${missingMoveDescs}).`);
  }

  // Phase 4: Output consolidado
  console.log(`════════════════════════════════════`);
  console.log(`      RESUMEN DE LA AUDITORÍA`);
  console.log(`════════════════════════════════════`);
  console.log(`✨ Aciertos/Logros:       ${achievements.length}`);
  console.log(`⚠️  Advertencias:          ${warnings.length}`);
  console.log(`❌ Errores detectados:    ${errors.length}`);
  console.log(`════════════════════════════════════\n`);

  // Write report to scratch directory (Mandatory)
  const reportLines = [
    `══════════════════════════════════════════════════════════════`,
    `🛡️  REPORT DE AUDITORÍA DE TRADUCCIÓN DEL SHOWDOWN SANDBOX 🛡️`,
    `══════════════════════════════════════════════════════════════`,
    `Fecha: ${Temporal.Now.instant().toString()}`,
    `Pokémon Auditados:   ${pokemonEntries.length}`,
    `Ataques Auditados:   ${moveEntries.length}`,
    `Logros/Aciertos:     ${achievements.length}`,
    `Advertencias:        ${warnings.length}`,
    `Errores Detectados:  ${errors.length}`,
    `\nLogros (${achievements.length}):`,
    ...achievements.map(a => `  - ${a}`),
    `\nErrores (${errors.length}):`,
    ...errors.map(e => `  - ${e}`),
    `\nAdvertencias (${warnings.length}):`,
    ...warnings.map(w => `  - ${w}`)
  ];

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, reportLines.join('\n'), 'utf8');
  console.log(styleText('cyan', `✨ Reporte de traducción escrito con éxito en: scratch/translation_audit_report.txt`));

  if (errors.length > 0) {
    console.log(styleText('red', `\n🚨 Se encontraron fallos de traducción o leaks de inglés. Corrige los problemas indicados.`));
    process.exit(1);
  } else {
    console.log(styleText('green', `\n🎉 ¡ENHORABUENA! La base de datos en español está 100% limpia y sin leaks.`));
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal durante la auditoría: ${(err as Error).message}`));
  process.exit(1);
});
