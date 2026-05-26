import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Dex } from '@pkmn/sim';
import { extractGen3Logic, type ShowdownLocalDB } from './extract_logic.ts';
import { downloadAllSprites } from './fetch_sprites.ts';
import { ABILITY_DATA } from '../../../src/data/abilities.ts';
import { POKEMON_DB } from '../../../src/data/pokemonDB.ts';

// Rutas de salida para los datos lógicos
const DATA_DIR = path.resolve('showdown/sandbox_db/data');
const JSON_OUTPUT_PATH = path.join(DATA_DIR, 'showdown_db.json');
const JSON_ES_OUTPUT_PATH = path.join(DATA_DIR, 'showdown_db_es.json');

// Mapeo estático de tipos elementales
const TYPE_TRANSLATIONS: Record<string, string> = {
  'Normal': 'Normal',
  'Fire': 'Fuego',
  'Water': 'Agua',
  'Grass': 'Planta',
  'Electric': 'Eléctrico',
  'Ice': 'Hielo',
  'Fighting': 'Lucha',
  'Poison': 'Veneno',
  'Ground': 'Tierra',
  'Flying': 'Volador',
  'Psychic': 'Psíquico',
  'Bug': 'Bicho',
  'Rock': 'Roca',
  'Ghost': 'Fantasma',
  'Dragon': 'Dragón',
  'Steel': 'Acero',
  'Dark': 'Siniestro'
};

// Diccionario estático de habilidades de Gen 1-3
const ABILITY_MANUAL_MAP: Record<string, string> = {
  overgrow: 'Espesura',
  chlorophyll: 'Clorofila',
  blaze: 'Mar llamas',
  solarpower: 'Poder Solar',
  torrent: 'Torrente',
  raindish: 'Lluvia Ligera',
  keeneye: 'Vista lince',
  innerfocus: 'Foco interno',
  intimidate: 'Intimidación',
  shedskin: 'Mudar',
  static: 'Electricidad estática',
  lightningrod: 'Pararrayos',
  sturdy: 'Robustez',
  runaway: 'Fuga',
  guts: 'Agallas',
  shielddust: 'Polvo escudo',
  naturalcure: 'Cura Natural',
  effectspore: 'Efecto Espora',
  sandveil: 'Velo arena',
  soundproof: 'Insonorizar',
  flashfire: 'Absorbe Fuego',
  waterabsorb: 'Absorbe Agua',
  limber: 'Flexibilidad',
  owntempo: 'Despiste',
  magnetpull: 'Imán',
  synchronize: 'Sincronía',
  clearbody: 'Cuerpo Puro',
  levitate: 'Levitación',
  rockhead: 'Cabeza Roca',
  insomnia: 'Insomnio',
  hypercutter: 'Corte Fuerte',
  earlybird: 'Madrugar',
  swarm: 'Enjambre',
  flamebody: 'Cuerpo Llama',
  trace: 'Rastro',
  immunity: 'Inmunidad',
  pressure: 'Presión',
  poisonpoint: 'Punto tóxico',
  roughskin: 'Piel Tosca',
  wonderguard: 'Superguarda',
  drizzle: 'Llovizna',
  drought: 'Sequía',
  sandstream: 'Chorro Arena',
  arenatrap: 'Trampa Arena',
  shadowtag: 'Sombra Trampa',
  speedboost: 'Impulso',
  oblivious: 'Despiste',
  cloudnine: 'Aclimatación',
  airlock: 'Bucle Aire',
  shellarmor: 'Caparazón',
  battlearmor: 'Armadura Batalla',
  voltabsorb: 'Absorbe Voltio',
  colorchange: 'Cambio Color',
  compoundeyes: 'Ojo Compuesto',
  cutecharm: 'Gran Encanto',
  hugepower: 'Potencia',
  purepower: 'Energía Pura',
  liquidooze: 'Viscosidad',
  serenegrace: 'Dicha',
  swiftswim: 'Nado rápido',
  thickfat: 'Sebo',
  pickup: 'Recogida',
  truant: 'Ausente',
  hustle: 'Entusiasmo',
  marvelscale: 'Escama Especial',
  forecast: 'Predicción',
  minus: 'Menos',
  plus: 'Más',
  stickyhold: 'Viscosidad',
  stench: 'Hedor',
  suctioncups: 'Ventosas',
  whitesmoke: 'Humo Blanco',
  vitalspirit: 'Espíritu Vital'
};

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

  // Asegurar la existencia del directorio de datos
  await fs.mkdir(DATA_DIR, { recursive: true });

  // 4. Escribir archivo de base de datos original (Inglés)
  await fs.writeFile(JSON_OUTPUT_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`\n💾 Base de datos original (EN) guardada exitosamente en:\n   ${JSON_OUTPUT_PATH}`);

  // 5. Cargar diccionarios de traducción de movimientos
  console.log('\n📖 Cargando diccionarios de traducción para generar la versión en español...');
  const TRANSLATIONS_PATH = path.join(DATA_DIR, 'move_translations.json');
  const DESCRIPTIONS_PATH = path.join(DATA_DIR, 'move_descriptions.json');

  let moveTranslations: Record<string, string> = {};
  let moveDescriptions: Record<string, string> = {};

  try {
    const transRaw = await fs.readFile(TRANSLATIONS_PATH, 'utf-8');
    moveTranslations = JSON.parse(transRaw);
  } catch (_e) {
    console.warn('⚠️ No se pudo cargar move_translations.json, se usarán fallbacks.');
  }

  try {
    const descRaw = await fs.readFile(DESCRIPTIONS_PATH, 'utf-8');
    moveDescriptions = JSON.parse(descRaw);
  } catch (_e) {
    console.warn('⚠️ No se pudo cargar move_descriptions.json, se usarán fallbacks.');
  }

  // 6. Generar clon profundo traducido al español
  console.log('🔄 Traduciendo lógica al español...');
  const dbEs: ShowdownLocalDB = JSON.parse(JSON.stringify(db));

  // A. Traducir Habilidades
  for (const abiId of Object.keys(dbEs.abilities)) {
    const abi = dbEs.abilities[abiId];
    if (abi) {
      const manualName = ABILITY_MANUAL_MAP[abiId.toLowerCase()];
      if (manualName) {
        abi.name = manualName;
        const data = (ABILITY_DATA as Record<string, { desc: string }>)[manualName];
        if (data) {
          abi.desc = data.desc;
          abi.shortDesc = data.desc;
        }
      } else {
        const found = Object.entries(ABILITY_DATA).find(([k]) => k.toLowerCase() === abi.name.toLowerCase());
        if (found) {
          abi.name = found[0];
          abi.desc = found[1].desc;
          abi.shortDesc = found[1].desc;
        }
      }
    }
  }

  // B. Traducir Movimientos
  for (const moveId of Object.keys(dbEs.moves)) {
    const move = dbEs.moves[moveId];
    if (move) {
      move.name = moveTranslations[moveId.toLowerCase()] || move.name;
      move.shortDesc = moveDescriptions[moveId.toLowerCase()] || move.shortDesc;
      if (move.desc) {
        move.desc = moveDescriptions[moveId.toLowerCase()] || move.desc;
      }
      move.type = TYPE_TRANSLATIONS[move.type] || move.type;
    }
  }

  // C. Traducir Pokémon (nombres, tipos y referencias a habilidades)
  for (const pokeId of Object.keys(dbEs.pokemon)) {
    const poke = dbEs.pokemon[pokeId];
    if (poke) {
      // Traducir nombre
      const localPoke = (POKEMON_DB as Record<string, { name: string }>)[pokeId.toLowerCase()];
      if (localPoke) {
        poke.name = localPoke.name;
      }

      // Traducir tipos
      poke.types = poke.types.map(t => TYPE_TRANSLATIONS[t] || t);

      // Traducir referencias de habilidades del Pokémon (sus IDs)
      poke.abilities = poke.abilities.map(aId => {
        const manualName = ABILITY_MANUAL_MAP[aId.toLowerCase()];
        return manualName || aId;
      });
    }
  }

  // 7. Escribir archivo de base de datos traducido (Español)
  await fs.writeFile(JSON_ES_OUTPUT_PATH, JSON.stringify(dbEs, null, 2), 'utf-8');
  console.log(`💾 Base de datos traducida (ES) guardada exitosamente en:\n   ${JSON_ES_OUTPUT_PATH}`);
  console.log('🏁 [Clonador Showdown] Proceso finalizado con éxito.');
}

main().catch((err) => {
  console.error('❌ Error fatal en el proceso del Clonador:', err);
  process.exit(1);
});
