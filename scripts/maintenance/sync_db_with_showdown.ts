import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Importar bases de datos originales del juego
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';
import { POKEMON_ABILITIES, ABILITY_DATA } from '../../src/data/battle/abilities.ts';
import { MOVE_DATA } from '../../src/data/battle/moves.ts';

const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');
const POKEMON_DB_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
const MOVES_FILE = path.resolve(process.cwd(), 'src/data/battle/moves.ts');
const ABILITIES_FILE = path.resolve(process.cwd(), 'src/data/battle/abilities.ts');

const REVERSE_TYPE_MAP: Record<string, string> = {
  'Planta': 'grass',
  'Veneno': 'poison',
  'Fuego': 'fire',
  'Volador': 'flying',
  'Agua': 'water',
  'Bicho': 'bug',
  'Normal': 'normal',
  'Eléctrico': 'electric',
  'Tierra': 'ground',
  'Hada': 'fairy',
  'Siniestro': 'dark',
  'Lucha': 'fighting',
  'Acero': 'steel',
  'Hielo': 'ice',
  'Fantasma': 'ghost',
  'Roca': 'rock',
  'Psíquico': 'psychic',
  'Dragón': 'dragon'
};

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log(styleText('bold', '\n--- 🔄 INICIANDO ACCIÓN DE SINCRONIZACIÓN ---'));

  // 1. Cargar base de datos de Showdown
  let showdownDB: any;
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData);
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando base de datos de Showdown: ${(error as Error).message}`));
    process.exit(1);
  }

  // Mapeos normalizados de Showdown
  const sdPokemonMap = new Map<string, any>();
  for (const [key, val] of Object.entries(showdownDB.pokemon)) {
    sdPokemonMap.set(normalizeId(key), val);
  }

  const sdMovesMap = new Map<string, any>();
  for (const [key, val] of Object.entries(showdownDB.moves)) {
    sdMovesMap.set(normalizeId(key), val);
  }

  // 2. Modificar Pokémon DB en memoria
  const updatedPokemonDb = JSON.parse(JSON.stringify(POKEMON_DB));
  let pokeUpdatedCount = 0;

  for (const [coreId, corePoke] of Object.entries(updatedPokemonDb) as [string, any][]) {
    const normId = normalizeId(coreId);
    const sdPoke = sdPokemonMap.get(normId);

    if (sdPoke) {
      // Sincronizar estadísticas
      corePoke.hp = sdPoke.baseStats.hp;
      corePoke.atk = sdPoke.baseStats.atk;
      corePoke.def = sdPoke.baseStats.def;
      corePoke.spa = sdPoke.baseStats.spa;
      corePoke.spd = sdPoke.baseStats.spd;
      corePoke.spe = sdPoke.baseStats.spe;

      // Sincronizar tipos
      if (sdPoke.types && sdPoke.types[0]) {
        const typeEng = REVERSE_TYPE_MAP[sdPoke.types[0]];
        if (typeEng) {
          corePoke.type = typeEng;
        }
      }
      if (sdPoke.types && sdPoke.types[1]) {
        const type2Eng = REVERSE_TYPE_MAP[sdPoke.types[1]];
        if (type2Eng) {
          corePoke.type2 = type2Eng;
        } else {
          delete corePoke.type2;
        }
      } else {
        delete corePoke.type2;
      }

      // Sincronizar PP de learnset
      if (corePoke.learnset && Array.isArray(corePoke.learnset)) {
        for (const learnMove of corePoke.learnset) {
          const sdMove = sdMovesMap.get(normalizeId(learnMove.id));
          if (sdMove) {
            learnMove.pp = sdMove.pp;
          }
        }
      }
      pokeUpdatedCount++;
    }
  }

  // 3. Modificar Moves DB en memoria
  const updatedMoveData = JSON.parse(JSON.stringify(MOVE_DATA));
  let moveUpdatedCount = 0;

  for (const [moveId, coreMove] of Object.entries(updatedMoveData) as [string, any][]) {
    const sdMove = sdMovesMap.get(normalizeId(moveId));
    if (sdMove) {
      coreMove.power = sdMove.basePower;
      coreMove.acc = sdMove.accuracy === true ? 1000 : sdMove.accuracy;
      coreMove.pp = sdMove.pp;
      
      if (sdMove.priority !== undefined && sdMove.priority !== 0) {
        coreMove.priority = sdMove.priority;
      } else {
        delete coreMove.priority;
      }
      
      const catLower = sdMove.category?.toLowerCase();
      if (catLower) {
        coreMove.cat = catLower;
      }

      if (sdMove.type) {
        const typeEng = REVERSE_TYPE_MAP[sdMove.type];
        if (typeEng) {
          coreMove.type = typeEng;
        }
      }
      moveUpdatedCount++;
    }
  }

  // 4. Modificar Habilidades (Abilities DB) en memoria
  const updatedPokemonAbilities = JSON.parse(JSON.stringify(POKEMON_ABILITIES)) as Record<string, string[]>;
  const mutableAbilityData = JSON.parse(JSON.stringify(ABILITY_DATA)) as Record<string, { desc: string }>;
  let abilitiesUpdatedCount = 0;

  for (const coreId of Object.keys(POKEMON_DB)) {
    const normId = normalizeId(coreId);
    const sdPoke = sdPokemonMap.get(normId);

    if (sdPoke && sdPoke.abilities && sdPoke.abilities.length > 0) {
      // Usar solo la primera habilidad oficial de Showdown Gen 3
      const officialAbilityName = sdPoke.abilities[0];
      
      // Asegurar que exista en ABILITY_DATA
      if (!mutableAbilityData[officialAbilityName]) {
        console.log(styleText('yellow', `⚠️ Habilidad oficial '${officialAbilityName}' no existe en ABILITY_DATA. Añadiendo descripción por defecto.`));
        mutableAbilityData[officialAbilityName] = { desc: `• Habilidad oficial de ${sdPoke.name} en Gen 3.` };
      }

      updatedPokemonAbilities[coreId] = [officialAbilityName];
      abilitiesUpdatedCount++;
    }
  }

  // 5. Serializar y escribir archivos de vuelta
  
  // Escribir pokemonDB.ts
  const serializedPokemonDB = `export const POKEMON_DB = ${JSON.stringify(updatedPokemonDb, null, 2)};\n`;
  await fs.writeFile(POKEMON_DB_FILE, serializedPokemonDB, 'utf8');
  console.log(styleText('green', `✅ Guardado pokemonDB.ts (${pokeUpdatedCount} Pokémon sincronizados).`));

  // Escribir moves.ts
  const serializedMoves = `import type { MoveBaseData } from '@/types/system/database';\n\nexport const MOVE_DATA: Record<string, MoveBaseData> = ${JSON.stringify(updatedMoveData, null, 2)};\n`;
  await fs.writeFile(MOVES_FILE, serializedMoves, 'utf8');
  console.log(styleText('green', `✅ Guardado moves.ts (${moveUpdatedCount} movimientos sincronizados).`));

  // Escribir abilities.ts
  const serializedAbilities = `export const ABILITY_DATA = ${JSON.stringify(mutableAbilityData, null, 2)};\n\nexport const POKEMON_ABILITIES = ${JSON.stringify(updatedPokemonAbilities, null, 2)};\n`;
  await fs.writeFile(ABILITIES_FILE, serializedAbilities, 'utf8');
  console.log(styleText('green', `✅ Guardado abilities.ts (${abilitiesUpdatedCount} Pokémon sincronizados a 1 sola habilidad).`));

  console.log(styleText('bold', styleText('green', '\n🎉 ¡Sincronización de base de datos finalizada con éxito!')));
}

main().catch((err) => {
  console.error(styleText('red', `❌ Error inesperado: ${(err as Error).stack}`));
  process.exit(1);
});
