/**
 * scripts/validate_moves.ts
 * 
 * MOVE INTEGRITY VALIDATOR (Node.js 26+)
 * Validates integrity of MOVE_DATA against learnsets, semantic rules, and PokeAPI.
 * 
 * Usage: npm run validate:moves
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

interface PokeApiMoveListResponse {
  results: Array<{ name: string; url: string }>;
}

interface PokeApiMove {
  name: string;
  names: Array<{ name: string; language: { name: string } }>;
  meta?: {
    category?: { name: string };
  };
  effect_chance?: number;
  effect_entries: Array<{
    short_effect: string;
    language: { name: string };
  }>;
}

const DB_FILE = path.resolve(process.cwd(), 'src/data/pokemonDB.ts');
const MOVES_FILE = path.resolve(process.cwd(), 'src/data/moves.ts');
const UTILS_FILE = path.resolve(process.cwd(), 'src/logic/pokemonUtils.ts');
const CACHE_DIR = path.resolve(process.cwd(), 'scripts/.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'pokeapi_move_cache.json');

function normalizeName(name: string) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

async function getPokeApiMoves(): Promise<PokeApiMove[]> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheExists = await fs.access(CACHE_FILE).then(() => true).catch(() => false);
    
    if (cacheExists) {
      console.log(styleText('blue', "ℹ️ Cargando movimientos de PokeAPI desde la caché..."));
      return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8')) as PokeApiMove[];
    }
  } catch {
    console.log(styleText('yellow', "⚠️ No se pudo acceder a la caché de PokeAPI."));
  }

  console.log(styleText('cyan', "🌐 Obteniendo movimientos de PokeAPI (esto puede tardar unos segundos)..."));
  
  try {
    const response = await fetch('https://pokeapi.co/api/v2/move?limit=354');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const listResp = await response.json() as PokeApiMoveListResponse;
    
    const results: PokeApiMove[] = [];
    const chunkSize = 20;
    
    for (let i = 0; i < listResp.results.length; i += chunkSize) {
      const chunk = listResp.results.slice(i, i + chunkSize);
      const promises = chunk.map(async (entry: { url: string }) => {
        const res = await fetch(entry.url);
        if (!res.ok) return null;
        return res.json() as Promise<PokeApiMove>;
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter((item): item is PokeApiMove => !!item));
      process.stdout.write(`Obtenidos ${Math.min(i + chunkSize, listResp.results.length)} / ${listResp.results.length}\r`);
    }
    
    console.log(styleText('green', "\n✅ Descarga de movimientos completada."));
    await fs.writeFile(CACHE_FILE, JSON.stringify(results, null, 2));
    return results;
  } catch (error: unknown) {
    console.error(styleText('red', `\n❌ Error al conectar con PokeAPI: ${(error as Error).message}`));
    return [];
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🛡️  POKEMON MOVE VALIDATOR ---'));

  try {
    await fs.access(DB_FILE);
    await fs.access(MOVES_FILE);
  } catch (_e) {
    console.error(styleText('red', `❌ Archivos de datos no encontrados.`));
    process.exit(1);
  }

  const dbContent = await fs.readFile(DB_FILE, 'utf8');
  const movesContent = await fs.readFile(MOVES_FILE, 'utf8');

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Extract moves from learnsets
  const learnsetBlockRegex = /learnset:\s*\[([\s\S]+?)\]/g;
  const moveNameRegex = /name:\s*'([^']+)'/g;
  const learnsetMoves = new Set<string>();
  
  let blockMatch;
  while ((blockMatch = learnsetBlockRegex.exec(dbContent)) !== null) {
    const block = blockMatch[1]!;
    let nameMatch;
    while ((nameMatch = moveNameRegex.exec(block)) !== null) {
      if (nameMatch[1] !== 'Unknown') learnsetMoves.add(nameMatch[1]!);
    }
  }

  // 2. Extract defined moves from MOVE_DATA
  const definedMoves = new Map<string, { line: number, content: string }>();
  const movesLines = movesContent.split('\n');
  
  movesLines.forEach((line, index) => {
    const match = line.match(/'([^']+)':\s*\{/);
    if (match) {
      const name = match[1]!;
      if (definedMoves.has(name)) {
        errors.push(`[${name}] Duplicado en MOVE_DATA (Línea ${index + 1}).`);
      }
      definedMoves.set(name, { line: index + 1, content: line });
    }
  });

  console.log(`📊 Movimientos en learnsets: ${learnsetMoves.size}`);
  console.log(`📚 Movimientos definidos en MOVE_DATA: ${definedMoves.size}\n`);

  const apiMoves = await getPokeApiMoves();

  // 3. Structural & Semantic Validation
  learnsetMoves.forEach(move => {
    if (!definedMoves.has(move)) {
      errors.push(`[${move}] Aparece en un learnset pero NO está definido en MOVE_DATA.`);
    }
  });

  definedMoves.forEach((data, name) => {
    const { content, line } = data;
    const tag = `[${name} (Línea ${line})]`;

    // Status moves with power > 0
    if (content.includes("cat: 'status'") && content.match(/power:\s*([1-9]\d*)/)) {
      errors.push(`${tag} Movimiento de estado con potencia mayor a 0.`);
    }

    // Specific move checks
    if (name === 'Furia Dragón' && !content.includes('fixedDmg: 40')) {
      errors.push(`${tag} Falta 'fixedDmg: 40'.`);
    }
    if (name === 'Súper Colmillo' && !content.includes('halfHP: true')) {
      errors.push(`${tag} Falta 'halfHP: true'.`);
    }
    if (name === 'Esfuerzo' && !content.includes('endeavor: true')) {
      errors.push(`${tag} Falta 'endeavor: true'.`);
    }

    // Schema enforcement
    const boolProps = ['halfHP', 'ohko', 'selfKO', 'endeavor'];
    boolProps.forEach(prop => {
      if (content.includes(`effect: '${prop}'`)) {
        errors.push(`${tag} Usa "effect: '${prop}'" en lugar del esquema requerido "${prop}: true".`);
      }
    });

    if (content.includes("effect: 'fixedDmg'")) {
      errors.push(`${tag} Usa "effect: 'fixedDmg'" en lugar de "fixedDmg: X".`);
    }

    // PokeAPI Semantic Sync
    if (apiMoves.length > 0) {
      const norm = normalizeName(name);
      const apiMove = apiMoves.find((m: PokeApiMove) => m.names.some((n: { name: string; language: { name: string } }) => n.language.name === 'es' && normalizeName(n.name) === norm));
      
      if (apiMove) {
        const apiCat = apiMove.meta?.category?.name || '';
        const apiChance = apiMove.effect_chance;
        const apiEffectEntries = apiMove.effect_entries.find((e: { language: { name: string } }) => e.language.name === 'en')?.short_effect || '';
        
        // Check for missing effects based on category
        if (apiCat && apiCat !== 'damage' && !content.includes('effect:') && !content.match(/(ohko|drain|recoil|endeavor|halfHP|fixedDmg):/)) {
          if (!content.includes("cat: 'status'")) {
            warnings.push(`${tag} Podría faltar lógica de efecto (Categoría PokeAPI: '${apiCat}').`);
          }
        }

        // Check for effect chance mismatch
        if (apiChance && content.includes('effect:')) {
          const ourChanceMatch = content.match(/_(\d+)'/);
          const ourChance = ourChanceMatch ? parseInt(ourChanceMatch[1]!) : 100;
          if (ourChance !== apiChance) {
            warnings.push(`${tag} Discrepancia en probabilidad de efecto: PokeAPI ${apiChance}% vs Local ${ourChance}%.`);
          }
        }

        // Check for flinch
        if (apiEffectEntries.toLowerCase().includes('flinch') && !content.includes('flinch')) {
          warnings.push(`${tag} PokeAPI menciona 'flinch', pero no se detectó en la definición local.`);
        }
      }
    }
  });

  // 4. UI Description Parity
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

      definedMoves.forEach((data, name) => {
        const eMatch = data.content.match(/effect:\s*'([^']+)'/);
        if (eMatch) {
          const effectName = eMatch[1]!;
          if (!registeredEffects.has(effectName)) {
            warnings.push(`[${name}] Usa el efecto '${effectName}' pero no tiene descripción en pokemonUtils.ts.`);
          }
        }
      });
    }
  } catch (_e) {
    warnings.push(`No se pudo validar pokemonUtils.ts para descripciones de efectos.`);
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`    REPORTE DE INTEGRIDAD DE MOVIMIENTOS`);
  console.log(`════════════════════════════════════\n`);

  if (warnings.length) {
    console.log(styleText('yellow', `⚠️  ADVERTENCIAS (${warnings.length}):`));
    warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  if (errors.length) {
    console.log(styleText('red', `❌ ERRORES (${errors.length}):`));
    errors.forEach(e => console.log(`   ${e}`));
    console.log('\n' + styleText('red', 'Corrige estos errores en src/data/moves.ts.'));
    process.exit(1);
  } else {
    console.log(styleText('green', '✅ Todos los movimientos pasaron la validación de integridad.'));
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
