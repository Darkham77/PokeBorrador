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
import { requirePokemonMoveId } from '../../src/data/battle/moves.ts';
import type { PokemonType } from '../../src/data/battle/types.ts';

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
  learnset: [number, string, number][];
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

export async function generatePokemonDatabase(): Promise<void> {
  const maxDexNum = MAX_DEX_NUMS[ACTIVE_GENERATION] ?? 1025;
  const allSpecies = Dex.forGen(ACTIVE_GENERATION).species.all();
  type PokemonDbSpeciesId = keyof typeof SPECIES_METADATA;

  function isSpeciesId(id: string): id is PokemonDbSpeciesId {
    return Object.hasOwn(SPECIES_METADATA, id);
  }

  const db: Partial<Record<PokemonDbSpeciesId, CompactPokemonData>> = {}; // open-record: Generic key-value data dictionary container

  for (const species of allSpecies) {
    if (species.num <= 0 || species.num > maxDexNum) {
      continue;
    }

    const speciesId = String(toID(species.id));
    if (!isSpeciesId(speciesId)) {
      throw new Error(`[PokemonDB Generator] Missing species metadata for active Showdown species: ${speciesId}`);
    }

    const type = species.types[0]!.toLowerCase() as PokemonType;
    const type2 = species.types[1] ? (species.types[1].toLowerCase() as PokemonType) : undefined;

    const movesMap = new Map<string, number>();
    let currentId: string | undefined = speciesId;

    while (currentId) {
      const learnsetData = await Dex.forGen(ACTIVE_GENERATION).learnsets.get(currentId);
      if (learnsetData && learnsetData.learnset) {
        for (const [moveId, methods] of Object.entries(learnsetData.learnset)) {
          for (const method of methods) {
            const match = method.match(/^[1-9]L(\d+)$/);
            if (match && match[1]) {
              const level = parseInt(match[1], 10);
              if (!movesMap.has(moveId) || movesMap.get(moveId)! > level) {
                movesMap.set(moveId, level);
              }
            }
          }
        }
      }

      const speciesInfo = Dex.forGen(ACTIVE_GENERATION).species.get(currentId);
      if (speciesInfo.prevo) {
        currentId = String(toID(speciesInfo.prevo));
      } else if (speciesInfo.baseSpecies && String(toID(speciesInfo.baseSpecies)) !== currentId) {
        currentId = String(toID(speciesInfo.baseSpecies));
      } else {
        currentId = undefined;
      }
    }

    const learnset: [number, string, number][] = [];
    for (const [moveId, level] of movesMap.entries()) {
      const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId);
      if (moveData.exists && moveData.isNonstandard !== 'Past') {
        learnset.push([level, requirePokemonMoveId(moveId), moveData.pp]);
      }
    }
    if (learnset.length === 0) {
      const defaultMoveId = speciesId === 'unown' ? 'hiddenpower' : 'tackle';
      const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(defaultMoveId);
      learnset.push([1, requirePokemonMoveId(defaultMoveId), moveData.exists ? moveData.pp : 35]);
    }
    learnset.sort((a, b) => a[0] - b[0]);

    const metadata = SPECIES_METADATA[speciesId];

    db[speciesId] = {
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
      learnset
    };
  }

  const relPath = path.relative(process.cwd(), OUTPUT_FILE).replace(/\\/g, '/');
  const jsonContent = JSON.stringify(db, null, 2);

  try {
    const existing = await fs.readFile(OUTPUT_FILE, 'utf8');
    if (existing === jsonContent) {
      console.log(`📦 [PokemonDB Generator] ${relPath} está actualizado.`);
      return;
    }
  } catch {
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
