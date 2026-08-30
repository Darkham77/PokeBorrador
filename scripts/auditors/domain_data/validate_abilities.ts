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
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { ABILITY_TRANSLATIONS_ES } from '../../../src/data/battle/abilities.ts';
import { Dex, toID } from '@pkmn/sim';
import { ENABLED_POKEMON_IDS } from '../../../src/data/system/constants.ts';

enableCompileCache();

const DATA_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
type AbilityTranslationId = keyof typeof ABILITY_TRANSLATIONS_ES;

function isEnabledPokemonId(id: string): id is (typeof ENABLED_POKEMON_IDS)[number] {
  return (ENABLED_POKEMON_IDS as readonly string[]).includes(id); // no-domain
}

function hasAbilityTranslation(id: string): id is AbilityTranslationId {
  return Object.hasOwn(ABILITY_TRANSLATIONS_ES, id);
}

async function main() {
  const validator = setupValidation({
    title: 'POKEMON ABILITY VALIDATOR',
    requiredFiles: [DATA_FILE]
  });

  await validator.checkFiles();

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain

  validator.logStep(1, 2, 'Extrayendo habilidades de especies habilitadas en POKEMON_DB...');
  // Extraer habilidades del POKEMON_DB de especies habilitadas
  const gameAbilities = new Set<string>();
  for (const pokeId of Object.keys(POKEMON_DB)) {
    if (!isEnabledPokemonId(pokeId)) continue;
    const species = Dex.species.get(pokeId);
    if (species && species.exists) {
      Object.values(species.abilities).forEach(abiName => {
        gameAbilities.add(toID(abiName));
      });
    }
  }

  validator.logStep(2, 2, `Validando ${gameAbilities.size} habilidades contra Dex y traducciones en español...`);

  for (const abId of Array.from(gameAbilities)) {
    const tag = `[${abId}]`;
    const ability = Dex.abilities.get(abId);

    if (!ability || !ability.exists) {
      errors.push(`${tag} No es una habilidad oficial válida en el Dex.`);
      continue;
    }

    // Verificar si tiene traducción en el archivo local exportado
    if (!hasAbilityTranslation(abId)) {
      errors.push(`${tag} No tiene traducción al español registrada en abilities.ts.`);
    } else {
      const trans = ABILITY_TRANSLATIONS_ES[abId];
      if (!trans.name || trans.name.trim() === '') {
        errors.push(`${tag} Tiene un nombre en español vacío en abilities.json.`);
      }
      if (!trans.desc || trans.desc.trim() === '') {
        errors.push(`${tag} Tiene una descripción vacía en abilities.json.`);
      }
      if (!trans.icon || trans.icon.trim() === '') {
        errors.push(`${tag} Tiene un icono vacío en abilities.json.`);
      }
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
