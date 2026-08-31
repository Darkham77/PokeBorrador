import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Importar dinámicamente las bases de datos de Poké Vicio
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';
import { pokemonDataProvider } from '../../src/logic/providers/pokemonDataProvider.ts';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';

const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');
const REPORT_OUTPUT_PATH = path.resolve(process.cwd(), 'scratch/db_comparison_detailed_report.md');

// Diccionario de traducción de tipos del Core (inglés) a Showdown ES (español)
const TYPE_MAP: Record<string, string> = {
  grass: 'Planta',
  poison: 'Veneno',
  fire: 'Fuego',
  flying: 'Volador',
  water: 'Agua',
  bug: 'Bicho',
  normal: 'Normal',
  electric: 'Eléctrico',
  ground: 'Tierra',
  fairy: 'Hada',
  dark: 'Siniestro',
  fighting: 'Lucha',
  steel: 'Acero',
  ice: 'Hielo',
  ghost: 'Fantasma',
  rock: 'Roca',
  psychic: 'Psíquico',
  dragon: 'Dragón'
};

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

interface ShowdownPokeSpec {
  baseStats: Record<string, number>;
  types?: string[];
  abilities?: string[];
}

interface ShowdownMoveSpec {
  basePower?: number;
  accuracy?: number | boolean;
  pp?: number;
  priority?: number;
}

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, ''); // string-ok
}

type CorePokemonEntry = NonNullable<(typeof POKEMON_DB)[keyof typeof POKEMON_DB]>;

function comparePokemonStats(
  corePoke: CorePokemonEntry,
  sdPoke: ShowdownPokeSpec,
  pokemonDiffsTable: string[]
): number {
  let discrepancies = 0;
  for (const stat of STAT_KEYS) {
    const coreVal = Reflect.get(corePoke, stat);
    const sdVal = sdPoke.baseStats[stat];
    if (coreVal !== sdVal) {
      discrepancies++;
      pokemonDiffsTable.push(`| ${corePoke.name} | Stat: ${stat.toUpperCase()} | ${coreVal} | ${sdVal} | Diferencia de Stat |`);
    }
  }
  return discrepancies;
}

function comparePokemonTypes(
  corePoke: CorePokemonEntry,
  sdPoke: ShowdownPokeSpec,
  pokemonDiffsTable: string[]
): number {
  const coreTypes: string[] = []; // no-domain
  if (corePoke.type) coreTypes.push(TYPE_MAP[corePoke.type] || corePoke.type);
  const type2 = Reflect.get(corePoke, 'type2') as string | undefined;
  if (type2) coreTypes.push(TYPE_MAP[type2] || type2);

  const sdTypes = sdPoke.types || [];
  const coreTypesStr = coreTypes.slice().sort().join(', ');
  const sdTypesStr = sdTypes.slice().sort().join(', ');

  if (coreTypesStr !== sdTypesStr) {
    pokemonDiffsTable.push(`| ${corePoke.name} | Tipos | [${coreTypesStr}] | [${sdTypesStr}] | Diferencia de Tipos |`);
    return 1;
  }
  return 0;
}

function comparePokemonAbilities(
  coreId: string,
  coreName: string,
  sdPoke: ShowdownPokeSpec,
  pokemonDiffsTable: string[]
): number {
  const coreAbilities = pokemonDataProvider.getSpeciesAbilities(coreId);
  const sdAbilities = sdPoke.abilities || [];
  const coreAbiStr = coreAbilities.slice().sort().map(a => toID(a)).join(', ');
  const sdAbiStr = sdAbilities.slice().sort().map((a: string) => toID(a)).join(', ');

  if (coreAbiStr !== sdAbiStr) {
    pokemonDiffsTable.push(`| ${coreName} | Habilidades | [${coreAbiStr}] | [${sdAbiStr}] | Diferencia de Habilidades |`);
    return 1;
  }
  return 0;
}

function comparePokemonSpecies(normalizedShowdownPoke: Map<string, ShowdownPokeSpec>) {
  const pokemonDiffsTable: string[] = [ // no-domain
    '## 1. Comparación de Pokémon y Estadísticas',
    '| Pokémon | Atributo | Valor Juego | Valor Showdown | Tipo Discrepancia |',
    '| :--- | :--- | :--- | :--- | :--- |'
  ];

  let totalPokemonCore = 0;
  let matchingPokemon = 0;
  let unmatchedPokemon = 0;
  let statsDiscrepancies = 0;
  let typeDiscrepancies = 0;
  let abilityDiscrepancies = 0;

  for (const [coreId, corePoke] of Object.entries(POKEMON_DB)) {
    totalPokemonCore++;
    const normId = normalizeId(coreId);
    const sdPoke = normalizedShowdownPoke.get(normId);

    if (!sdPoke) {
      unmatchedPokemon++;
      pokemonDiffsTable.push(`| **${corePoke.name}** (${coreId}) | - | Existe | No existe en Showdown | **Pokémon Faltante** |`);
      continue;
    }

    matchingPokemon++;
    statsDiscrepancies += comparePokemonStats(corePoke, sdPoke, pokemonDiffsTable);
    typeDiscrepancies += comparePokemonTypes(corePoke, sdPoke, pokemonDiffsTable);
    abilityDiscrepancies += comparePokemonAbilities(coreId, corePoke.name, sdPoke, pokemonDiffsTable);
  }

  return {
    totalPokemonCore,
    matchingPokemon,
    unmatchedPokemon,
    statsDiscrepancies,
    typeDiscrepancies,
    abilityDiscrepancies,
    pokemonDiffsTable
  };
}

function compareMoves(normalizedShowdownMoves: Map<string, ShowdownMoveSpec>) {
  const moveDiffsTable: string[] = [ // no-domain
    '\n## 2. Comparación de Movimientos',
    '| Movimiento | Propiedad | Valor Juego | Valor Showdown |',
    '| :--- | :--- | :--- | :--- |'
  ];

  let moveStatsDiscrepancies = 0;
  let missingMovesInShowdown = 0;
  const allGen3Moves = Dex.forGen(ACTIVE_GENERATION).moves.all().filter(m => m.exists);

  for (const move of allGen3Moves) {
    const moveId = move.id;
    const coreMove = pokemonDataProvider.getMoveData(moveId);
    if (!coreMove) continue;

    const normMoveId = normalizeId(moveId);
    const sdMove = normalizedShowdownMoves.get(normMoveId);

    if (!sdMove) {
      missingMovesInShowdown++;
      moveDiffsTable.push(`| **${coreMove.name}** (${moveId}) | - | Existe | No existe en Showdown |`);
      continue;
    }

    if (coreMove.power !== sdMove.basePower) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | Potencia | ${coreMove.power} | ${sdMove.basePower} |`);
    }

    const sdAcc = sdMove.accuracy === true ? 1000 : sdMove.accuracy;
    if (coreMove.acc !== sdAcc) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | Precisión | ${coreMove.acc} | ${sdMove.accuracy} |`);
    }

    if (coreMove.pp !== sdMove.pp) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | PP | ${coreMove.pp} | ${sdMove.pp} |`);
    }

    const corePriority = coreMove.priority || 0;
    const sdPriority = sdMove.priority || 0;
    if (corePriority !== sdPriority) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | Prioridad | ${corePriority} | ${sdPriority} |`);
    }
  }

  return {
    allGen3MovesCount: allGen3Moves.length,
    moveStatsDiscrepancies,
    missingMovesInShowdown,
    moveDiffsTable
  };
}

async function main() {
  console.log(styleText('bold', '\n--- 📊 INICIANDO COMPARADOR DE BASES DE DATOS ---'));

  let showdownDB: { pokemon: Record<string, ShowdownPokeSpec>; moves: Record<string, ShowdownMoveSpec> };
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData) as typeof showdownDB;
  } catch (error) {
    console.error(styleText('red', `❌ No se pudo cargar el archivo de Showdown en ${SHOWDOWN_DB_PATH}: ${(error as Error).message}`));
    process.exit(1);
  }

  const normalizedShowdownPoke = new Map<string, ShowdownPokeSpec>();
  for (const key of Object.keys(showdownDB.pokemon)) {
    normalizedShowdownPoke.set(normalizeId(key), showdownDB.pokemon[key] as ShowdownPokeSpec);
  }

  const normalizedShowdownMoves = new Map<string, ShowdownMoveSpec>();
  for (const key of Object.keys(showdownDB.moves)) {
    normalizedShowdownMoves.set(normalizeId(key), showdownDB.moves[key] as ShowdownMoveSpec);
  }

  const pokeResults = comparePokemonSpecies(normalizedShowdownPoke);
  const moveResults = compareMoves(normalizedShowdownMoves);

  const reportLines: string[] = [ // no-domain
    '# Reporte Detallado de Comparación de Bases de Datos',
    `*Generado el: ${new Date().toISOString()}*\n`,
    'Este reporte compara los Pokémon, habilidades y movimientos del juego core frente a la extracción de Pokémon Showdown (Gen 3).\n',
    '## Resumen Estadístico',
    `- **Total Pokémon en el Juego**: ${pokeResults.totalPokemonCore}`,
    `- **Pokémon coincidentes con Showdown**: ${pokeResults.matchingPokemon}`,
    `- **Pokémon no encontrados en Showdown**: ${pokeResults.unmatchedPokemon}`,
    `- **Discrepancias de Estadísticas Base encontradas**: ${pokeResults.statsDiscrepancies}`,
    `- **Discrepancias de Tipo encontradas**: ${pokeResults.typeDiscrepancies}`,
    `- **Discrepancias de Habilidades encontradas**: ${pokeResults.abilityDiscrepancies}`,
    `- **Movimientos en el Juego**: ${moveResults.allGen3MovesCount}`,
    `- **Movimientos del Juego ausentes en Showdown**: ${moveResults.missingMovesInShowdown}`,
    `- **Movimientos con discrepancias de stats (Potencia/Precisión/PP/Prioridad)**: ${moveResults.moveStatsDiscrepancies}`,
    '\n---\n',
    ...pokeResults.pokemonDiffsTable,
    ...moveResults.moveDiffsTable
  ];

  await fs.mkdir(path.dirname(REPORT_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(REPORT_OUTPUT_PATH, reportLines.join('\n'), 'utf8');

  console.log(styleText('green', `\n✅ Reporte generado con éxito en: ${REPORT_OUTPUT_PATH}`));
  console.log(`- Pokémon core analizados: ${pokeResults.totalPokemonCore}`);
  console.log(`- Discrepancias encontradas en stats: ${pokeResults.statsDiscrepancies}, tipos: ${pokeResults.typeDiscrepancies}, habilidades: ${pokeResults.abilityDiscrepancies}`);
  console.log(`- Discrepancias de stats en movimientos: ${moveResults.moveStatsDiscrepancies}`);
}

main().catch((err) => {
  console.error(styleText('red', `❌ Error inesperado: ${(err as Error).stack}`));
  process.exit(1);
});
