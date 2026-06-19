/**
 * scripts/validation/validate_moves.ts
 * 
 * MOVE INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates integrity of MOVE_DATA against learnsets, semantic rules, and local Showdown DB.
 * 
 * Usage: npm run validate:moves
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Importar bases de datos locales
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';
import { MOVE_DATA } from '../../src/data/battle/moves.ts';

const UTILS_FILE = path.resolve(process.cwd(), 'src/logic/pokemonUtils.ts');
const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');

function normalizeName(name: string) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n--- 🛡️  POKEMON MOVE VALIDATOR (OFFLINE) ---'));

  // 1. Cargar bases de datos
  let showdownDB: any;
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData);
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando base de datos de Showdown: ${(error as Error).message}`));
    process.exit(1);
  }

  const sdMovesMap = new Map<string, any>();
  for (const [key, val] of Object.entries(showdownDB.moves)) {
    sdMovesMap.set(normalizeName(key), val);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // 2. Extraer movimientos de los learnsets
  const learnsetMoves = new Set<string>();
  for (const poke of Object.values(POKEMON_DB) as any[]) {
    if (poke.learnset && Array.isArray(poke.learnset)) {
      poke.learnset.forEach((m: any) => {
        if (m.id !== 'Unknown') {
          learnsetMoves.add(m.id);
        }
      });
    }
  }

  console.log(`📊 Movimientos en learnsets: ${learnsetMoves.size}`);
  console.log(`📚 Movimientos definidos en MOVE_DATA: ${Object.keys(MOVE_DATA).length}\n`);

  // 3. Validar consistencia estructural
  learnsetMoves.forEach(move => {
    if (!MOVE_DATA[move]) {
      errors.push(`[${move}] Aparece en un learnset pero NO está definido en MOVE_DATA.`);
    }
  });

  // 4. Validar semántica de movimientos locales contra Showdown
  for (const [moveId, coreMove] of Object.entries(MOVE_DATA)) {
    const tag = `[${moveId} (${coreMove.name})]`;

    // Regla de consistencia: Movimientos de estado con potencia > 0 son errores
    if (coreMove.cat === 'status' && coreMove.power > 0) {
      errors.push(`${tag} Movimiento de estado con potencia mayor a 0.`);
    }

    // Comprobaciones semánticas específicas
    if (moveId === 'dragon_rage' && coreMove.fixedDmg !== 40) {
      errors.push(`${tag} Falta o es incorrecto 'fixedDmg: 40'.`);
    }
    if (moveId === 'super_colmillo' && !coreMove.halfHP) {
      errors.push(`${tag} Falta 'halfHP: true'.`);
    }
    if (moveId === 'endeavor' && !coreMove.endeavor) {
      errors.push(`${tag} Falta 'endeavor: true'.`);
    }

    // Validar propiedades contra Showdown
    const sdMove = sdMovesMap.get(normalizeName(moveId));
    if (sdMove) {
      // Validar categoría
      const sdCatLower = sdMove.category?.toLowerCase();
      if (sdCatLower && coreMove.cat !== sdCatLower) {
        warnings.push(`${tag} Discrepancia de categoría: Juego '${coreMove.cat}' vs Showdown '${sdCatLower}'.`);
      }

      // Validar estadísticas (Power, Accuracy, PP)
      if (coreMove.power !== sdMove.basePower) {
        warnings.push(`${tag} Potencia diferente: Juego ${coreMove.power} vs Showdown ${sdMove.basePower}.`);
      }

      const sdAcc = sdMove.accuracy === true ? 1000 : sdMove.accuracy;
      if (coreMove.acc !== sdAcc) {
        warnings.push(`${tag} Precisión diferente: Juego ${coreMove.acc} vs Showdown ${sdMove.accuracy}.`);
      }

      if (coreMove.pp !== sdMove.pp) {
        warnings.push(`${tag} PP diferente: Juego ${coreMove.pp} vs Showdown ${sdMove.pp}.`);
      }

      const sdPriority = sdMove.priority || 0;
      const corePriority = coreMove.priority || 0;
      if (corePriority !== sdPriority) {
        warnings.push(`${tag} Prioridad diferente: Juego ${corePriority} vs Showdown ${sdPriority}.`);
      }
    } else {
      // Movimientos custom/nuevos que no existen en el standard de Showdown
      warnings.push(`${tag} Movimiento personalizado (no oficial en Showdown Gen 3).`);
    }
  }

  // 5. Validar descripciones de efectos en UI
  try {
    const utilsContent = await fs.readFile(UTILS_FILE, 'utf8');
    const effectsMatch = utilsContent.match(/const effects:.* = {([\s\S]+?)};/);
    if (effectsMatch) {
      const registeredEffects = new Set<string>();
      const keyRegex = /'([^']+)':/g;
      let k;
      while ((k = keyRegex.exec(effectsMatch[1]!)) !== null) {
        registeredEffects.add(k[1]!);
      }

      for (const [moveId, coreMove] of Object.entries(MOVE_DATA)) {
        if (coreMove.effect && !registeredEffects.has(coreMove.effect)) {
          warnings.push(`[${moveId}] Usa el efecto '${coreMove.effect}' pero no tiene descripción en pokemonUtils.ts.`);
        }
      }
    }
  } catch (_e) {
    warnings.push(`No se pudo validar pokemonUtils.ts para descripciones de efectos.`);
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`    REPORTE DE INTEGRIDAD DE MOVIMIENTOS`);
  console.log(`════════════════════════════════════`);
  console.log(`📊 Movimientos en learnsets:          ${learnsetMoves.size}`);
  console.log(`📚 Movimientos definidos:             ${Object.keys(MOVE_DATA).length}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- REPORTE DE INTEGRIDAD DE MOVIMIENTOS ---`,
      `Movimientos en learnsets:          ${learnsetMoves.size}`,
      `Movimientos definidos:             ${Object.keys(MOVE_DATA).length}`,
      `\nErrores (${errors.length}):`,
      ...errors.map(e => `  - ${e}`),
      `\nAdvertencias (${warnings.length}):`,
      ...warnings.map(w => `  - ${w}`)
    ];
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }

  if (values.summary) {
    console.log(styleText('cyan', `\n[INFO] Modo resumen activo: ${errors.length} errores, ${warnings.length} advertencias.`));
  } else {
    if (warnings.length) {
      console.log(styleText('yellow', `⚠️  ADVERTENCIAS (${warnings.length}):`));
      const limit = 30;
      warnings.slice(0, limit).forEach(w => console.log(`   ${w}`));
      if (warnings.length > limit) {
        console.log(styleText('cyan', `   ... y ${warnings.length - limit} advertencias más (usa -o para ver todas)`));
      }
      console.log('');
    }

    if (errors.length) {
      console.log(styleText('red', `❌ ERRORES (${errors.length}):`));
      const limit = 30;
      errors.slice(0, limit).forEach(e => console.log(`   ${e}`));
      if (errors.length > limit) {
        console.log(styleText('cyan', `   ... y ${errors.length - limit} errores más (usa -o para ver todos)`));
      }
      console.log('\n' + styleText('red', 'Corrige estos errores en src/data/battle/moves.ts.'));
    } else {
      console.log(styleText('green', '✅ Todos los movimientos pasaron la validación de integridad.'));
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
