/**
 * scripts/auditors/domain_data/validate_pokemon.ts
 * 
 * POKEMON INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates integrity of POKEMON_DB stats, types, abilities, and learnsets against Showdown Dex.
 * 
 * Usage: npm run validate:pokemon
 */

import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

// Importar bases de datos locales
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS } from '../../../src/data/system/constants.ts';
import type { PokemonBaseData } from '../../../src/types/system/database.ts';

enableCompileCache();

const DB_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

function isEnabledPokemonId(id: string): id is (typeof ENABLED_POKEMON_IDS)[number] {
  return (ENABLED_POKEMON_IDS as readonly string[]).includes(id); // no-domain: Non-domain utility collection or data structure
}

async function main() {
  const validator = setupValidation({
    title: 'POKEMON INTEGRITY VALIDATOR',
    requiredFiles: [DB_FILE]
  });

  await validator.checkFiles();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  validator.logStep(1, 2, 'Validando estadísticas y tipos base contra Showdown Dex...');
  let count = 0;
  // Validar cada Pokémon contra el Dex oficial de Showdown
  for (const [coreId, corePoke] of Object.entries(POKEMON_DB) as Array<[string, PokemonBaseData]>) {
    if (!isEnabledPokemonId(coreId)) continue;
    count++;
    const tag = `[${corePoke.name} (${coreId})]`;
    const species = Dex.forGen(ACTIVE_GENERATION).species.get(coreId);

    if (!species || !species.exists) {
      errors.push(`${tag} No existe en el Dex oficial de Showdown.`);
      continue;
    }

    // A. Validar estadísticas base
    for (const stat of STAT_KEYS) {
      const coreVal = corePoke[stat];
      const sdVal = species.baseStats[stat];
      if (coreVal !== sdVal) {
        errors.push(`${tag} Discrepancia en stat '${stat.toUpperCase()}': Juego ${coreVal} vs Showdown ${sdVal}.`);
      }
    }

    // B. Validar tipos
    const coreTypes: string[] = []; // no-domain: Non-domain utility collection or data structure
    if (corePoke.type) coreTypes.push(corePoke.type);
    const type2 = (corePoke as { type2?: string }).type2;
    if (type2) coreTypes.push(type2);

    const sdTypes = species.types.map(t => t.toLowerCase());
    const coreTypesStr = coreTypes.slice().sort().join(',');
    const sdTypesStr = sdTypes.slice().sort().join(',');

    if (coreTypesStr !== sdTypesStr) {
      errors.push(`${tag} Discrepancia en tipos: Juego [${coreTypesStr}] vs Showdown [${sdTypesStr}].`);
    }

    // C. Validar movimientos del learnset
    if (corePoke.learnset && Array.isArray(corePoke.learnset)) {
      for (const moveEntry of corePoke.learnset) {
        const moveId = toID(moveEntry.id);
        const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId);

        if (!moveData || !moveData.exists) {
          errors.push(`${tag} El movimiento '${moveEntry.id}' no existe en el Dex de Showdown.`);
        }
      }
    } else {
      errors.push(`${tag} Falta o es inválida la propiedad 'learnset'.`);
    }
  }

  await validator.finish(
    {
      'Pokémon habilitados validados': count
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
