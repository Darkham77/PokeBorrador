// fallow-ignore-file security-sink
/**
 * scripts/validation/validate_abilities.ts
 * 
 * ABILITY INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates abilities assigned in POKEMON_DB against the local Showdown DB.
 * 
 * Usage: npm run validate:abilities
 */

import path from 'node:path';
import { styleText } from 'node:util';
import { setupValidation } from '../lib/validationBase.ts';
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';
import { ABILITY_TRANSLATIONS_ES } from '../../src/data/battle/abilities.ts';
import { Dex, toID } from '@pkmn/sim';
import { ENABLED_POKEMON_IDS } from '../../src/data/system/constants.ts';

const DATA_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');

async function main() {
  const validator = setupValidation({
    title: 'POKEMON ABILITY VALIDATOR',
    requiredFiles: [DATA_FILE]
  });

  await validator.checkFiles();

  const errors: string[] = [];
  const warnings: string[] = [];

  // Extraer habilidades del POKEMON_DB de especies habilitadas
  const gameAbilities = new Set<string>();
  for (const pokeId of Object.keys(POKEMON_DB)) {
    if (!ENABLED_POKEMON_IDS.has(pokeId)) continue;
    const species = Dex.species.get(pokeId);
    if (species && species.exists) {
      Object.values(species.abilities).forEach(abiName => {
        gameAbilities.add(toID(abiName));
      });
    }
  }

  console.log(`📦 Habilidades únicas detectadas en especies del POKEMON_DB: ${gameAbilities.size}\n`);

  for (const abId of Array.from(gameAbilities)) {
    const tag = `[${abId}]`;
    const ability = Dex.abilities.get(abId);

    if (!ability || !ability.exists) {
      errors.push(`${tag} No es una habilidad oficial válida en el Dex.`);
      continue;
    }

    // Verificar si tiene traducción en el archivo local exportado
    if (!ABILITY_TRANSLATIONS_ES[abId]) {
      errors.push(`${tag} No tiene traducción al español registrada en abilities.ts.`);
    }
  }

  await validator.finish(
    {
      'Habilidades únicas validadas': gameAbilities.size
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
