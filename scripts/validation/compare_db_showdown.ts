import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Importar dinámicamente las bases de datos de Poké Vicio
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';
import { POKEMON_ABILITIES } from '../../src/data/battle/abilities.ts';
import { MOVE_DATA } from '../../src/data/battle/moves.ts';

const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');
const REPORT_OUTPUT_PATH = path.resolve(process.cwd(), 'scratch/db_comparison_detailed_report.md');

// Diccionario de traducción de tipos del Core (inglés) a Showdown ES (español)
const TYPE_MAP: Record<string, string> = {
  'grass': 'Planta',
  'poison': 'Veneno',
  'fire': 'Fuego',
  'flying': 'Volador',
  'water': 'Agua',
  'bug': 'Bicho',
  'normal': 'Normal',
  'electric': 'Eléctrico',
  'ground': 'Tierra',
  'fairy': 'Hada',
  'dark': 'Siniestro',
  'fighting': 'Lucha',
  'steel': 'Acero',
  'ice': 'Hielo',
  'ghost': 'Fantasma',
  'rock': 'Roca',
  'psychic': 'Psíquico',
  'dragon': 'Dragón'
};

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log(styleText('bold', '\n--- 📊 INICIANDO COMPARADOR DE BASES DE DATOS ---'));

  // 1. Cargar la base de datos de Showdown traducida
  let showdownDB: any;
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData);
  } catch (error) {
    console.error(styleText('red', `❌ No se pudo cargar el archivo de Showdown en ${SHOWDOWN_DB_PATH}: ${(error as Error).message}`));
    process.exit(1);
  }

  const reportLines: string[] = [];
  reportLines.push('# Reporte Detallado de Comparación de Bases de Datos');
  reportLines.push(`*Generado el: ${new Date().toISOString()}*\n`);
  reportLines.push('Este reporte compara los Pokémon, habilidades y movimientos del juego core frente a la extracción de Pokémon Showdown (Gen 3).\n');

  // Contadores
  let totalPokemonCore = 0;
  let matchingPokemon = 0;
  let unmatchedPokemon = 0;
  let statsDiscrepancies = 0;
  let typeDiscrepancies = 0;
  let abilityDiscrepancies = 0;
  let moveStatsDiscrepancies = 0;
  let missingMovesInShowdown = 0;

  const pokemonDiffsTable: string[] = [];
  pokemonDiffsTable.push('## 1. Comparación de Pokémon y Estadísticas');
  pokemonDiffsTable.push('| Pokémon | Atributo | Valor Juego | Valor Showdown | Tipo Discrepancia |');
  pokemonDiffsTable.push('| :--- | :--- | :--- | :--- | :--- |');

  const normalizedShowdownPoke = new Map<string, any>();
  for (const key of Object.keys(showdownDB.pokemon)) {
    normalizedShowdownPoke.set(normalizeId(key), showdownDB.pokemon[key]);
  }

  // Comparar Pokémon uno por uno
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

    // Comparar Estadísticas Base
    const statsKeys: Array<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    for (const stat of statsKeys) {
      const coreVal = (corePoke as any)[stat];
      const sdVal = sdPoke.baseStats[stat];
      if (coreVal !== sdVal) {
        statsDiscrepancies++;
        pokemonDiffsTable.push(`| ${corePoke.name} | Stat: ${stat.toUpperCase()} | ${coreVal} | ${sdVal} | Diferencia de Stat |`);
      }
    }

    // Comparar Tipos
    const coreTypes: string[] = [];
    if (corePoke.type) coreTypes.push(TYPE_MAP[corePoke.type] || corePoke.type);
    if ((corePoke as any).type2) coreTypes.push(TYPE_MAP[(corePoke as any).type2] || (corePoke as any).type2);

    const sdTypes = sdPoke.types || [];
    const coreTypesStr = coreTypes.slice().sort().join(', ');
    const sdTypesStr = sdTypes.slice().sort().join(', ');

    if (coreTypesStr !== sdTypesStr) {
      typeDiscrepancies++;
      pokemonDiffsTable.push(`| ${corePoke.name} | Tipos | [${coreTypesStr}] | [${sdTypesStr}] | Diferencia de Tipos |`);
    }

    // Comparar Habilidades
    const coreAbilities = (POKEMON_ABILITIES as Record<string, string[]>)[coreId] || [];
    const sdAbilities = sdPoke.abilities || [];
    const coreAbiStr = coreAbilities.slice().sort().join(', ');
    const sdAbiStr = sdAbilities.slice().sort().join(', ');

    if (coreAbiStr !== sdAbiStr) {
      abilityDiscrepancies++;
      pokemonDiffsTable.push(`| ${corePoke.name} | Habilidades | [${coreAbiStr}] | [${sdAbiStr}] | Diferencia de Habilidades |`);
    }
  }

  // Comparar Movimientos uno por uno
  const moveDiffsTable: string[] = [];
  moveDiffsTable.push('\n## 2. Comparación de Movimientos');
  moveDiffsTable.push('| Movimiento | Propiedad | Valor Juego | Valor Showdown |');
  moveDiffsTable.push('| :--- | :--- | :--- | :--- |');

  const normalizedShowdownMoves = new Map<string, any>();
  for (const key of Object.keys(showdownDB.moves)) {
    normalizedShowdownMoves.set(normalizeId(key), showdownDB.moves[key]);
  }

  for (const [moveId, coreMove] of Object.entries(MOVE_DATA)) {
    const normMoveId = normalizeId(moveId);
    const sdMove = normalizedShowdownMoves.get(normMoveId);

    if (!sdMove) {
      missingMovesInShowdown++;
      moveDiffsTable.push(`| **${coreMove.name}** (${moveId}) | - | Existe | No existe en Showdown |`);
      continue;
    }

    // Comparar Potencia
    const corePower = coreMove.power;
    const sdPower = sdMove.basePower;
    if (corePower !== sdPower) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | Potencia | ${corePower} | ${sdPower} |`);
    }

    // Comparar Accuracy
    const coreAcc = coreMove.acc;
    // Showdown accuracy can be true (always hits, mapped to 1000 or similar in game)
    const sdAcc = sdMove.accuracy === true ? 1000 : sdMove.accuracy;
    if (coreAcc !== sdAcc) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | Precisión | ${coreAcc} | ${sdMove.accuracy} |`);
    }

    // Comparar PP
    const corePP = coreMove.pp;
    const sdPP = sdMove.pp;
    if (corePP !== sdPP) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | PP | ${corePP} | ${sdPP} |`);
    }

    // Comparar Prioridad
    const corePriority = coreMove.priority || 0;
    const sdPriority = sdMove.priority || 0;
    if (corePriority !== sdPriority) {
      moveStatsDiscrepancies++;
      moveDiffsTable.push(`| ${coreMove.name} (${moveId}) | Prioridad | ${corePriority} | ${sdPriority} |`);
    }
  }

  // Añadir al reporte final
  reportLines.push('## Resumen Estadístico');
  reportLines.push(`- **Total Pokémon en el Juego**: ${totalPokemonCore}`);
  reportLines.push(`- **Pokémon coincidentes con Showdown**: ${matchingPokemon}`);
  reportLines.push(`- **Pokémon no encontrados en Showdown**: ${unmatchedPokemon}`);
  reportLines.push(`- **Discrepancias de Estadísticas Base encontradas**: ${statsDiscrepancies}`);
  reportLines.push(`- **Discrepancias de Tipo encontradas**: ${typeDiscrepancies}`);
  reportLines.push(`- **Discrepancias de Habilidades encontradas**: ${abilityDiscrepancies}`);
  reportLines.push(`- **Movimientos en el Juego**: ${Object.keys(MOVE_DATA).length}`);
  reportLines.push(`- **Movimientos del Juego ausentes en Showdown**: ${missingMovesInShowdown}`);
  reportLines.push(`- **Movimientos con discrepancias de stats (Potencia/Precisión/PP/Prioridad)**: ${moveStatsDiscrepancies}`);
  reportLines.push('\n---\n');

  reportLines.push(...pokemonDiffsTable);
  reportLines.push(...moveDiffsTable);

  // Asegurar que la carpeta de destino exista
  await fs.mkdir(path.dirname(REPORT_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(REPORT_OUTPUT_PATH, reportLines.join('\n'), 'utf8');

  console.log(styleText('green', `\n✅ Reporte generado con éxito en: ${REPORT_OUTPUT_PATH}`));
  console.log(`- Pokémon core analizados: ${totalPokemonCore}`);
  console.log(`- Discrepancias encontradas en stats: ${statsDiscrepancies}, tipos: ${typeDiscrepancies}, habilidades: ${abilityDiscrepancies}`);
  console.log(`- Discrepancias de stats en movimientos: ${moveStatsDiscrepancies}`);
}

main().catch((err) => {
  console.error(styleText('red', `❌ Error inesperado: ${(err as Error).stack}`));
  process.exit(1);
});
