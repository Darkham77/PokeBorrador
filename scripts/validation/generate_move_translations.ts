/**
 * scripts/generate_move_translations.ts
 * 
 * MOVE TRANSLATION GENERATOR (Node.js 26+ Native)
 * Fetches spanish translations from PokeAPI and generates a static translation JSON map.
 * 
 * Usage: node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. --allow-net=pokeapi.co scripts/generate_move_translations.ts
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
  flavor_text_entries?: Array<{
    flavor_text: string;
    language: { name: string };
    version_group: { name: string };
  }>;
}

const SHOWDOWN_DB_FILE = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db.json');
const OUTPUT_FILE = path.resolve(process.cwd(), 'showdown/sandbox_db/data/move_translations.json');
const OUTPUT_DESC_FILE = path.resolve(process.cwd(), 'showdown/sandbox_db/data/move_descriptions.json');
const CACHE_DIR = path.resolve(process.cwd(), 'scripts/.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'pokeapi_move_cache.json');

async function getPokeApiMoves(): Promise<PokeApiMove[]> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheExists = await fs.access(CACHE_FILE).then(() => true).catch(() => false);
    
    if (cacheExists) {
      console.log(styleText('blue', "ℹ️ Cargando movimientos de PokeAPI desde la caché..."));
      const content = await fs.readFile(CACHE_FILE, 'utf8');
      return JSON.parse(content) as PokeApiMove[];
    }
  } catch {
    console.log(styleText('yellow', "⚠️ No se pudo acceder a la caché de PokeAPI. Descargando de nuevo..."));
  }

  console.log(styleText('cyan', "🌐 Conectando con PokeAPI para descargar nombres en español (Gen 3)..."));
  
  try {
    // Gen 3 abarca los primeros 354 movimientos de la franquicia
    const response = await fetch('https://pokeapi.co/api/v2/move?limit=354');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const listResp = await response.json() as PokeApiMoveListResponse;
    
    const results: PokeApiMove[] = [];
    const chunkSize = 20;
    
    for (let i = 0; i < listResp.results.length; i += chunkSize) {
      const chunk = listResp.results.slice(i, i + chunkSize);
      const promises = chunk.map(async (entry) => {
        const res = await fetch(entry.url);
        if (!res.ok) return null;
        return res.json() as Promise<PokeApiMove>;
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter((item): item is PokeApiMove => !!item));
      process.stdout.write(`Obtenidos ${Math.min(i + chunkSize, listResp.results.length)} / ${listResp.results.length}\r`);
    }
    
    console.log(styleText('green', "\n✅ Descarga de PokeAPI completada con éxito."));
    await fs.writeFile(CACHE_FILE, JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    console.error(styleText('red', `\n❌ Error al conectar con PokeAPI: ${(error as Error).message}`));
    return [];
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🔤 GENERADOR DE TRADUCCIONES Y DESCRIPCIONES DE MOVIMIENTOS ---'));

  try {
    await fs.access(SHOWDOWN_DB_FILE);
  } catch {
    console.error(styleText('red', `❌ No se encontró el archivo de base de datos de Showdown: ${SHOWDOWN_DB_FILE}`));
    process.exit(1);
  }

  const showdownDbRaw = await fs.readFile(SHOWDOWN_DB_FILE, 'utf8');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showdownDb = JSON.parse(showdownDbRaw) as any;
  const showdownMoves = Object.keys(showdownDb.moves || {});

  console.log(`📊 Movimientos detectados en Showdown Sandbox: ${showdownMoves.length}`);

  const apiMoves = await getPokeApiMoves();
  if (apiMoves.length === 0) {
    console.error(styleText('red', '❌ No se pudieron obtener datos de PokeAPI. Abortando.'));
    process.exit(1);
  }

  // Mapas de traducción y descripción
  const translations: Record<string, string> = {};
  const descriptions: Record<string, string> = {};

  // Mapeamos las traducciones usando normalización de nombres
  for (const move of apiMoves) {
    // Normalizar ID de PokeAPI eliminando guiones medios para coincidir con Showdown (ej. dragon-rage -> dragonrage)
    const showdownId = move.name.replace(/-/g, '').toLowerCase();
    
    // Obtener traducción en español
    const spanishNameEntry = move.names.find(n => n.language.name === 'es');
    if (spanishNameEntry) {
      translations[showdownId] = spanishNameEntry.name;
    }

    // Obtener descripción en español
    if (move.flavor_text_entries && move.flavor_text_entries.length > 0) {
      const spanishDescEntries = move.flavor_text_entries.filter(e => e.language.name === 'es');
      if (spanishDescEntries.length > 0) {
        // Tomamos la descripción más reciente/moderna (última en la lista)
        const lastEntry = spanishDescEntries[spanishDescEntries.length - 1];
        if (lastEntry) {
          const rawDesc = lastEntry.flavor_text;
          // Limpiamos saltos de página y de línea de PokeAPI
          const cleanDesc = rawDesc.replace(/[\n\f\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          descriptions[showdownId] = cleanDesc;
        }
      }
    }
  }

  // Agregamos traducciones especiales manuales que pueden variar en formato o traducción oficial
  const customOverrides: Record<string, string> = {
    'doubleedge': 'Doble Filo',
    'extremespeed': 'Velocidad Extrema',
    'selfdestruct': 'Autodestrucción',
    'willowisp': 'Fuego Fatuo',
    'sandtomb': 'Bucle Arena',
    'poisonfang': 'Colmillo Veneno',
    'meteorpunch': 'Puño Meteoro',
    'softboiled': 'Amortiguador',
    'smellingsalts': 'Estímulo',
    'hijumpkick': 'Patada Salto Alta',
    'featherdance': 'Danza Pluma',
    'vicegrip': 'Agarre',
    'sonicboom': 'Onda Sónica',
    'bubblebeam': 'Rayo Burbuja',
    'solarbeam': 'Rayo Solar',
    'poisonpowder': 'Polvo Veneno',
    'stunspore': 'Paralizador',
    'sleeppowder': 'Somnífera',
    'dragonrage': 'Furia Dragón',
    'superfang': 'Súper Colmillo',
    'dynamicpunch': 'Puño Dinámico',
    'ancientpower': 'Poder Pasado'
  };

  for (const [id, name] of Object.entries(customOverrides)) {
    translations[id] = name;
  }

  // Agregamos descripciones manuales en español si faltan o son mejores
  const customDescOverrides: Record<string, string> = {
    'grudge': 'Si el usuario se debilita, el ataque usado por el rival pierde todos sus PP.',
    'spite': 'Resta de 2 a 5 PP del último movimiento utilizado por el rival.',
    'snatch': 'Roba el efecto de cualquier movimiento curativo o de mejora de características del rival.',
    'recycle': 'Recupera un objeto consumible equipado para volver a usarlo.'
  };

  for (const [id, desc] of Object.entries(customDescOverrides)) {
    descriptions[id] = desc;
  }

  // Validamos si nos falta algún movimiento de Showdown sin traducir
  let missingCount = 0;
  let missingDescCount = 0;
  for (const moveId of showdownMoves) {
    if (!translations[moveId]) {
      // Intentar una coincidencia aproximada o formateo
      const formattedId = moveId.replace(/[^a-z0-9]/g, '');
      if (translations[formattedId]) {
        translations[moveId] = translations[formattedId]!;
      } else {
        missingCount++;
        // Colocar como fallback el nombre en inglés formateado de Showdown
        const showdownMove = showdownDb.moves[moveId];
        translations[moveId] = showdownMove ? showdownMove.name : moveId;
      }
    }

    if (!descriptions[moveId]) {
      const formattedId = moveId.replace(/[^a-z0-9]/g, '');
      if (descriptions[formattedId]) {
        descriptions[moveId] = descriptions[formattedId]!;
      } else {
        missingDescCount++;
        // Colocar como fallback el shortDesc de Showdown en inglés (saneado)
        const showdownMove = showdownDb.moves[moveId];
        const rawDesc = showdownMove ? (showdownMove.shortDesc || showdownMove.desc || '') : '';
        descriptions[moveId] = rawDesc.replace(/[\n\f\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // Guardar archivo final de traducción
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(translations, null, 2), 'utf-8');
  
  // Guardar archivo final de descripciones
  await fs.writeFile(OUTPUT_DESC_FILE, JSON.stringify(descriptions, null, 2), 'utf-8');
  
  console.log(styleText('green', `\n💾 Archivo de traducciones guardado exitosamente en: \n   ${OUTPUT_FILE}`));
  console.log(styleText('green', `💾 Archivo de descripciones guardado exitosamente en: \n   ${OUTPUT_DESC_FILE}`));
  console.log(`✅ Nombres traducidos con éxito. Sin traducción (con fallback en inglés): ${missingCount}`);
  console.log(`✅ Descripciones localizadas con éxito. Sin descripción (con fallback en inglés): ${missingDescCount}`);
  console.log('🏁 Proceso finalizado.\n');
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
