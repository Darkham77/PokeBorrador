/**
 * scripts/data/generate_pokemon_db.ts
 * 
 * Generador estático en tiempo de build para src/data/pokemon/pokemonDB.json.
 * 
 * BENEFICIO:
 * Ejecuta las consultas de Showdown Dex y resolución de learnsets en Node.js
 * una sola vez en build/dev, eliminando @pkmn/sim del hilo principal del navegador
 * y reduciendo game-data-pokemon de 6.6 MB a ~350 KB.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';
import { toID } from '../../src/logic/utils/strings.ts';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';
import { SPECIES_METADATA } from '../../src/data/pokemon/speciesMetadata.ts';
import { requirePokemonMoveId, type PokemonMoveId } from '../../src/data/battle/moves.ts';
import type { PokemonType } from '../../src/data/battle/types.ts';
import type { GenderName } from '@pkmn/types';

export interface CompactPokemonData {
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  type: PokemonType;
  type2?: PokemonType;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  catchRate: number;
  abilities?: string[]; // domain-ok: Open dynamic text or non-domain string payload
  gender?: GenderName | number;
  height?: number;
  weight?: number;
  learnset: [number, string, number][];
  compatMoves?: string[]; // domain-ok: Open dynamic text or non-domain string payload
}


const MAX_DEX_NUMS: Record<number, number> = {
  1: 151,
  2: 251,
  3: 386,
  4: 493,
  5: 649,
  6: 721,
  7: 809,
  8: 898,
  9: 1025,
};

const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.json');

type PokemonDbSpeciesId = keyof typeof SPECIES_METADATA;

function isSpeciesId(id: string): id is PokemonDbSpeciesId {
  return Object.hasOwn(SPECIES_METADATA, id);
}

interface ResolvedLearnsetResult {
  readonly learnset: [number, string, number][];
  readonly compatMoves: PokemonMoveId[];
}

function parseMethodFlags(methods: readonly string[]): { minLevel: number; hasCompat: boolean; hasLevelUp: boolean } {
  let minLevel = Infinity;
  let hasCompat = false;
  let hasLevelUp = false;
  for (const method of methods) {
    const match = method.match(/^[1-9]L(\d+)$/);
    if (match && match[1]) {
      const level = parseInt(match[1], 10);
      hasLevelUp = true;
      if (level < minLevel) minLevel = level;
    } else if (/^\d*[METSVD]/.test(method)) {
      hasCompat = true;
    }
  }
  return { minLevel, hasCompat, hasLevelUp };
}

function recordLearnsetMove(
  rawMoveKey: string, // domain-ok: Raw Showdown dex learnset dictionary key
  methods: readonly string[],
  movesMap: Map<string, number>,
  compatMovesSet: Set<PokemonMoveId>
): void {
  const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(rawMoveKey) || Dex.moves.get(rawMoveKey);
  if (!moveData?.exists) return;

  const canonicalMoveId = requirePokemonMoveId(rawMoveKey);
  if (moveData.isNonstandard === 'Past') {
    compatMovesSet.add(canonicalMoveId);
    return;
  }

  const { minLevel, hasCompat, hasLevelUp } = parseMethodFlags(methods);
  const currentMin = movesMap.get(rawMoveKey);
  if (hasLevelUp && minLevel !== Infinity && (currentMin === undefined || currentMin > minLevel)) {
    movesMap.set(rawMoveKey, minLevel);
  }
  if (hasCompat) {
    compatMovesSet.add(canonicalMoveId);
  }
}

function resolveNextSpeciesAncestor(speciesSlug: string): string | undefined {
  const speciesInfo = Dex.forGen(ACTIVE_GENERATION).species.get(speciesSlug);
  if (speciesInfo.prevo) return String(toID(speciesInfo.prevo));
  if (speciesInfo.baseSpecies && String(toID(speciesInfo.baseSpecies)) !== speciesSlug) {
    return String(toID(speciesInfo.baseSpecies));
  }
  return undefined;
}

async function collectSpeciesLearnsetRaw(
  speciesSlug: string, // domain-ok: Showdown dynamic species slug or evolution ancestor
  movesMap: Map<string, number>,
  compatMovesSet: Set<PokemonMoveId>
): Promise<string | undefined> {
  const learnsetData = await Dex.forGen(ACTIVE_GENERATION).learnsets.get(speciesSlug);
  if (learnsetData?.learnset) {
    for (const [moveId, methods] of Object.entries(learnsetData.learnset)) {
      recordLearnsetMove(moveId, methods, movesMap, compatMovesSet);
    }
  }
  return resolveNextSpeciesAncestor(speciesSlug);
}

async function resolveSpeciesLearnset(speciesId: PokemonDbSpeciesId): Promise<ResolvedLearnsetResult> {
  const movesMap = new Map<string, number>();
  const compatMovesSet = new Set<PokemonMoveId>();
  let currentSlug: string | undefined = speciesId;

  while (currentSlug) {
    currentSlug = await collectSpeciesLearnsetRaw(currentSlug, movesMap, compatMovesSet);
  }

  const learnset: [number, string, number][] = [];
  for (const [moveId, level] of movesMap.entries()) {
    const canonicalMoveId = requirePokemonMoveId(moveId);
    const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId) || Dex.moves.get(moveId);
    if (moveData?.exists) {
      learnset.push([level, canonicalMoveId, moveData.pp || 35]);
    }
  }
  if (learnset.length === 0) {
    const defaultMoveId = speciesId === 'unown' ? 'hiddenpower' : 'tackle';
    const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(defaultMoveId) || Dex.moves.get(defaultMoveId);
    learnset.push([1, requirePokemonMoveId(defaultMoveId), moveData?.exists ? moveData.pp : 35]);
  }
  learnset.sort((a, b) => a[0] - b[0]);
  return { learnset, compatMoves: Array.from(compatMovesSet) };
}

type ShowdownSpecies = ReturnType<ReturnType<typeof Dex.forGen>['species']['all']>[number];

function buildCompactPokemonData(
  species: ShowdownSpecies,
  metadata: (typeof SPECIES_METADATA)[PokemonDbSpeciesId],
  learnsetResult: ResolvedLearnsetResult
): CompactPokemonData {
  const type = species.types[0]!.toLowerCase() as PokemonType;
  const type2 = species.types[1] ? (species.types[1].toLowerCase() as PokemonType) : undefined;
  const abilities = Object.values(species.abilities).map(a => toID(a));
  const gender = species.gender || (species.genderRatio ? species.genderRatio.M : 0.5);
  const height = (species.heightm && species.heightm > 0) ? species.heightm : 0.1;
  const weight = (species.weightkg && species.weightkg > 0) ? species.weightkg : 0.1;

  return {
    name: species.name,
    type,
    type2,
    hp: species.baseStats.hp,
    atk: species.baseStats.atk,
    def: species.baseStats.def,
    spa: species.baseStats.spa,
    spd: species.baseStats.spd,
    spe: species.baseStats.spe,
    catchRate: metadata.catchRate,
    abilities,
    gender,
    height,
    weight,
    learnset: learnsetResult.learnset,
    compatMoves: learnsetResult.compatMoves
  };
}

export async function generatePokemonDatabase(): Promise<void> {
  const maxDexNum = MAX_DEX_NUMS[ACTIVE_GENERATION] ?? 1025;
  const allSpecies = Dex.forGen(ACTIVE_GENERATION).species.all();
  const db: Partial<Record<PokemonDbSpeciesId, CompactPokemonData>> = {};

  for (const species of allSpecies) {
    if (species.num <= 0 || species.num > maxDexNum) continue;

    const speciesId = String(toID(species.id));
    if (!isSpeciesId(speciesId)) {
      throw new Error(`[PokemonDB Generator] Missing species metadata for active Showdown species: ${speciesId}`);
    }

    const learnsetResult = await resolveSpeciesLearnset(speciesId);
    const metadata = SPECIES_METADATA[speciesId];
    db[speciesId] = buildCompactPokemonData(species, metadata, learnsetResult);
  }

  const relPath = path.relative(process.cwd(), OUTPUT_FILE).replace(/\\/g, '/');
  const jsonContent = JSON.stringify(db, null, 2);

  try {
    const existing = await fs.readFile(OUTPUT_FILE, 'utf8');
    if (existing === jsonContent) {
      console.log(`📦 [PokemonDB Generator] ${relPath} está actualizado.`);
      return;
    }
  } catch { // catch-ok: file does not exist yet, proceed with writing
    // File doesn't exist yet, proceed with writing
  }

  await fs.writeFile(OUTPUT_FILE, jsonContent, 'utf8');
  const speciesCount = Object.keys(db).length;
  const sizeKb = (Buffer.byteLength(jsonContent, 'utf8') / 1024).toFixed(1);
  console.log(`⚡ [PokemonDB Generator] Generado ${relPath} (${speciesCount} especies, ${sizeKb} kB).`);
}

// Allow direct execution from CLI
if (process.argv[1]?.endsWith('generate_pokemon_db.ts')) {
  generatePokemonDatabase().catch(err => {
    console.error('❌ [PokemonDB Generator] Error fatal:', err);
    process.exit(1);
  });
}
