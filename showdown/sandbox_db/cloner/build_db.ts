import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { extractGen3Logic, type ShowdownLocalDB } from './extract_logic.ts';
import { downloadAllSprites } from './fetch_sprites.ts';

// Rutas de salida para los datos lógicos
const DATA_DIR = path.resolve('showdown/sandbox_db/data');
const JSON_OUTPUT_PATH = path.join(DATA_DIR, 'showdown_db.json');

async function main() {
  console.log('🚀 [Clonador Showdown] Iniciando extracción de base de datos Gen 3...');

  // 1. Extraer Lógica
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

  // Filtrar IDs para descargas de sprites
  let pokemonIds = Object.keys(db.pokemon);
  if (limit !== null && !isNaN(limit)) {
    pokemonIds = pokemonIds.slice(0, limit);
  }

  // 2. Descargar Sprites y Sonidos
  try {
    const spriteMap = await downloadAllSprites(pokemonIds, 5, 50);

    // Integrar mapeo de sprites y sonidos en el JSON final de Pokémon
    for (const id of pokemonIds) {
      const poke = db.pokemon[id];
      const sprites = spriteMap[id];
      if (poke && sprites) {
        // Añadimos la propiedad de assets locales al Pokémon
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

  // Si aplicamos un límite, recortamos el JSON lógico para que sea una base de datos de pruebas compacta
  if (limit !== null && !isNaN(limit)) {
    const limitedPokemon: typeof db.pokemon = {};
    for (const id of pokemonIds) {
      const poke = db.pokemon[id];
      if (poke) {
        limitedPokemon[id] = poke;
      }
    }
    db.pokemon = limitedPokemon;
  }

  // 3. Escribir archivo de base de datos
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(JSON_OUTPUT_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`\n💾 Base de datos local guardada exitosamente en:\n   ${JSON_OUTPUT_PATH}`);
  console.log('🏁 [Clonador Showdown] Proceso finalizado.');
}

main().catch((err) => {
  console.error('❌ Error fatal en el proceso del Clonador:', err);
  process.exit(1);
});
