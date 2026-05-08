/**
 * scripts/validate_abilities.ts
 * 
 * ABILITY INTEGRITY VALIDATOR (Node.js 26+)
 * Validates integrity of POKEMON_ABILITIES and ABILITY_DATA against PokeAPI.
 * 
 * Usage: npm run validate:abilities
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

const DATA_FILE = path.resolve(process.cwd(), 'src/data/abilities.ts');
const CACHE_DIR = path.resolve(process.cwd(), 'scripts/.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'pokeapi_ability_cache.json');

async function getPokeApiAbilities() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheExists = await fs.access(CACHE_FILE).then(() => true).catch(() => false);
    
    if (cacheExists) {
      console.log(styleText('blue', "ℹ️ Cargando habilidades de PokeAPI desde la caché..."));
      return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    }
  } catch (e) {
    // Silently fail and fetch if cache error
  }

  console.log(styleText('cyan', "🌐 Obteniendo habilidades de PokeAPI (esto puede tardar unos segundos)..."));
  
  try {
    const response = await fetch('https://pokeapi.co/api/v2/ability?limit=350');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const listResp: any = await response.json();
    
    const results: any[] = [];
    const chunkSize = 20;
    
    for (let i = 0; i < listResp.results.length; i += chunkSize) {
      const chunk = listResp.results.slice(i, i + chunkSize);
      const promises = chunk.map(async (entry: any) => {
        const res = await fetch(entry.url);
        if (!res.ok) return null;
        return res.json();
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter(Boolean));
      process.stdout.write(`Obtenidas ${Math.min(i + chunkSize, listResp.results.length)} / ${listResp.results.length}\r`);
    }
    
    console.log(styleText('green', "\n✅ Descarga de habilidades completada."));
    await fs.writeFile(CACHE_FILE, JSON.stringify(results, null, 2));
    return results;
  } catch (error: any) {
    console.error(styleText('red', `\n❌ Error al conectar con PokeAPI: ${error.message}`));
    console.log(styleText('yellow', "⚠️ Continuando validación solo con datos locales..."));
    return [];
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🛡️  POKEMON ABILITY VALIDATOR ---'));

  try {
    await fs.access(DATA_FILE);
  } catch {
    console.error(styleText('red', `❌ Archivo no encontrado: ${DATA_FILE}`));
    process.exit(1);
  }

  const content = await fs.readFile(DATA_FILE, 'utf8');

  // 1. Extract ABILITY_DATA (descriptions)
  const abilityData: Record<string, string> = {};
  const dataBlockMatch = content.match(/export const ABILITY_DATA = {([\s\S]+?)\n};/);
  if (dataBlockMatch) {
    const block = dataBlockMatch[1];
    const entryRegex = /'([^']+)':\s*{\s*desc:\s*'([^']+)'\s*}/g;
    let m;
    while ((m = entryRegex.exec(block)) !== null) {
      abilityData[m[1]!] = m[2]!;
    }
  }

  // 2. Extract POKEMON_ABILITIES (assignments)
  const gameAbilities = new Set<string>();
  const assignmentBlockMatch = content.match(/export const POKEMON_ABILITIES = {([\s\S]+?)\n};/);
  if (assignmentBlockMatch) {
    const block = assignmentBlockMatch[1];
    const listRegex = /\[([^\]]+)\]/g;
    let m;
    while ((m = listRegex.exec(block)) !== null) {
      const names = m[1]!.match(/'([^']+)'/g);
      if (names) {
        names.forEach(n => gameAbilities.add(n.replace(/'/g, '')));
      }
    }
  }

  console.log(`📦 Habilidades únicas detectadas en el código: ${gameAbilities.size}`);
  console.log(`📝 Habilidades con descripción en ABILITY_DATA: ${Object.keys(abilityData).length}\n`);

  const apiAbilities = await getPokeApiAbilities();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Map Spanish names to API entries
  const translatedMap: Record<string, any> = {};
  apiAbilities.forEach((ab: any) => {
    const esNameObj = ab.names.find((n: any) => n.language.name === 'es');
    if (esNameObj) {
      const cleaned = esNameObj.name.trim();
      translatedMap[cleaned] = ab;
      translatedMap[cleaned.toLowerCase()] = ab;
    }
  });

  const customMapping: Record<string, string> = {
    'Cura natural': 'natural-cure',
    'Gran encanto': 'cute-charm'
  };

  for (const abName of gameAbilities) {
    const tag = `[${abName}]`;
    
    // Check if it has a description
    if (!abilityData[abName]) {
      errors.push(`${tag} Falta descripción en ABILITY_DATA.`);
    }

    if (apiAbilities.length > 0) {
      let apiEntry = translatedMap[abName];
      if (!apiEntry && customMapping[abName]) {
        apiEntry = apiAbilities.find((a: any) => a.name === customMapping[abName]);
      }
      if (!apiEntry) {
        apiEntry = apiAbilities.find((a: any) => a.names.some((n: any) => n.language.name === 'es' && n.name.toLowerCase() === abName.toLowerCase()));
      }

      if (!apiEntry) {
        warnings.push(`${tag} No se encontró coincidencia en PokeAPI. Revisa si el nombre es correcto.`);
      } else {
        // Basic check: Does the official text mention something critical we missed?
        // (This is mostly for manual review, but we can log discrepancies)
        const esFlavor = apiEntry.flavor_text_entries.find((f: any) => f.language.name === 'es');
        if (!esFlavor) {
          warnings.push(`${tag} No tiene texto oficial en español en PokeAPI.`);
        }
      }
    }
  }

  // Check for orphan descriptions
  Object.keys(abilityData).forEach(name => {
    if (!gameAbilities.has(name)) {
      warnings.push(`[${name}] Definida en ABILITY_DATA pero no asignada a ningún Pokémon.`);
    }
  });

  console.log(`\n════════════════════════════════════`);
  console.log(`    REPORTE DE INTEGRIDAD DE HABILIDADES`);
  console.log(`════════════════════════════════════\n`);

  if (warnings.length) {
    console.log(styleText('yellow', `⚠️  ADVERTENCIAS (${warnings.length}):`));
    warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  if (errors.length) {
    console.log(styleText('red', `❌ ERRORES (${errors.length}):`));
    errors.forEach(e => console.log(`   ${e}`));
    console.log('\n' + styleText('red', 'Corrige estos errores para asegurar la estabilidad del motor de batalla.'));
    process.exit(1);
  } else {
    console.log(styleText('green', '✅ Todas las habilidades pasaron la validación de integridad.'));
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
