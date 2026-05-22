import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Dex } from '@pkmn/sim';
import { extractGen3Logic, type ShowdownLocalDB } from './extract_logic.ts';
import { downloadAllSprites } from './fetch_sprites.ts';

// Rutas de salida para los datos lógicos
const DATA_DIR = path.resolve('showdown/sandbox_db/data');
const JSON_OUTPUT_PATH = path.join(DATA_DIR, 'showdown_db.json');

async function main() {
  console.log('🚀 [Clonador Showdown] Iniciando extracción de base de datos Gen 3...');

  // 1. Extraer Lógica Gen 3 (movimientos, habilidades, Pokémon Gen 1-3)
  const db: ShowdownLocalDB = extractGen3Logic();
  console.log(`📊 Datos lógicos de Gen 3 extraídos correctamente:`);
  console.log(`   - Habilidades: ${Object.keys(db.abilities).length}`);
  console.log(`   - Movimientos: ${Object.keys(db.moves).length}`);
  console.log(`   - Pokémon: ${Object.keys(db.pokemon).length}`);

  // Leer argumentos de consola (ej: --limit=10)
  let limit: number | null = null;
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  if (limitArg) {
    const parts = limitArg.split('=');
    const valStr = parts[1];
    if (valStr) {
      limit = parseInt(valStr, 10);
      console.log(`⚠️ Limitando descargas de sprites a los primeros ${limit} Pokémon para pruebas rápidas.`);
    }
  }

  // 2. Obtener IDs de TODOS los Pokémon (Gen 1-9) para descargar sprites completos
  // isNonstandard puede ser: null (estándar), 'Past' (Dexit), 'CAP', 'LGPE', 'Unobtainable', etc.
  // Incluimos null y 'Past' para cubrir todos los Pokémon reales de la franquicia.
  const fullDex = Dex.forGen(9);
  let allPokemonIds = fullDex.species.all()
    .filter(s => s.isNonstandard === null || s.isNonstandard === 'Past')
    .map(s => s.id);

  if (limit !== null && !isNaN(limit)) {
    allPokemonIds = allPokemonIds.slice(0, limit);
  }

  console.log(`\n🌍 Descargando sprites para ${allPokemonIds.length} Pokémon (Gen 1-9)...`);

  // 3. Descargar Sprites y Sonidos para todas las generaciones
  try {
    const spriteMap = await downloadAllSprites(allPokemonIds, 5, 50);

    // Integrar mapeo de sprites en el JSON solo para los Pokémon del DB Gen 3
    for (const id of Object.keys(db.pokemon)) {
      const poke = db.pokemon[id];
      const sprites = spriteMap[id];
      if (poke && sprites) {
        poke.sprites = {
          front: sprites.front,
          frontAnimated: sprites.frontAnimated,
          back: sprites.back,
          backAnimated: sprites.backAnimated,
          frontShiny: sprites.frontShiny,
          frontShinyAnimated: sprites.frontShinyAnimated,
          backShiny: sprites.backShiny,
          backShinyAnimated: sprites.backShinyAnimated,
          cry: sprites.cry,
        };
      }
    }
  } catch (err) {
    console.error('❌ Error al descargar los sprites y sonidos:', err);
  }

  // Si aplicamos un límite, recortamos el JSON lógico para base de datos de pruebas compacta
  if (limit !== null && !isNaN(limit)) {
    const limitedPokemon: typeof db.pokemon = {};
    const gen3Ids = Object.keys(db.pokemon).slice(0, limit);
    for (const id of gen3Ids) {
      const poke = db.pokemon[id];
      if (poke) {
        limitedPokemon[id] = poke;
      }
    }
    db.pokemon = limitedPokemon;
  }

  // 4. Escribir archivo de base de datos
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(JSON_OUTPUT_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`\n💾 Base de datos local guardada exitosamente en:\n   ${JSON_OUTPUT_PATH}`);
  console.log('🏁 [Clonador Showdown] Proceso finalizado.');
}

main().catch((err) => {
  console.error('❌ Error fatal en el proceso del Clonador:', err);
  process.exit(1);
});
