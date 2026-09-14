/**
 * scripts/auditors/domain_data/validate_abilities.ts
 * 
 * ABILITY INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates abilities assigned in POKEMON_DB against the local Showdown DB.
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { ABILITY_TRANSLATIONS_ES } from '../../../src/data/battle/abilities.ts';
import { Dex, toID } from '@pkmn/sim';
import { ENABLED_POKEMON_IDS } from '../../../src/data/system/constants.ts';

enableCompileCache();

const DATA_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
type AbilityTranslationId = keyof typeof ABILITY_TRANSLATIONS_ES;

function isEnabledPokemonId(id: string): id is (typeof ENABLED_POKEMON_IDS)[number] {
  return (ENABLED_POKEMON_IDS as readonly string[]).includes(id);
}

function hasAbilityTranslation(id: string): id is AbilityTranslationId {
  return Object.hasOwn(ABILITY_TRANSLATIONS_ES, id);
}

export type AbilityRuleId =
  | 'ability-invalid-showdown'
  | 'ability-missing-translation'
  | 'ability-empty-field';

export const ABILITY_RULES: readonly AbilityRuleId[] = [
  'ability-invalid-showdown',
  'ability-missing-translation',
  'ability-empty-field'
] as const;

export class AbilityAuditor extends BaseAuditor<AbilityRuleId> {
  constructor() {
    super({
      id: 'validate_abilities',
      name: 'Pokemon Ability Validator',
      description: 'Valida base de datos canónica y paridad de habilidades',
      family: 'domain_data',
      ruleIds: ABILITY_RULES,
      ruleDescriptions: {
        'ability-invalid-showdown': 'Habilidad no válida en Pokémon Showdown',
        'ability-missing-translation': 'Traducción al español faltante en habilidad',
        'ability-empty-field': 'Campo obligatorio vacío en habilidad'
      },
      requiredFiles: [DATA_FILE]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Extracting abilities for enabled species in POKEMON_DB...');
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

    this.filesScannedCount = gameAbilities.size;
    this.context.logStep(2, 2, `Validating ${gameAbilities.size} abilities against Dex and Spanish translations...`);

    for (const abId of Array.from(gameAbilities)) {
      const tag = `[${abId}]`;
      const ability = Dex.abilities.get(abId);

      if (!ability || !ability.exists) {
        this.addViolation({
          ruleId: 'ability-invalid-showdown',
          severity: 'error',
          file: 'src/data/battle/abilities.ts',
          line: 1,
          message: `${tag} Not a valid official ability in Dex.`,
          context: abId
        });
        continue;
      }

      if (!hasAbilityTranslation(abId)) {
        this.addViolation({
          ruleId: 'ability-missing-translation',
          severity: 'error',
          file: 'src/data/battle/abilities.ts',
          line: 1,
          message: `${tag} Missing Spanish translation registered in abilities.ts.`,
          context: abId
        });
      } else {
        const trans = ABILITY_TRANSLATIONS_ES[abId];
        if (!trans.name || trans.name.trim() === '') {
          this.addViolation({
            ruleId: 'ability-empty-field',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `${tag} Has empty Spanish name.`,
            context: `${abId}.name`
          });
        }
        if (!trans.desc || trans.desc.trim() === '') {
          this.addViolation({
            ruleId: 'ability-empty-field',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `${tag} Has empty description.`,
            context: `${abId}.desc`
          });
        }
        if (!trans.icon || trans.icon.trim() === '') {
          this.addViolation({
            ruleId: 'ability-empty-field',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `${tag} Has empty icon.`,
            context: `${abId}.icon`
          });
        }
      }
    }

    this.context.setMetric('Unique abilities validated', gameAbilities.size);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new AbilityAuditor());
}
