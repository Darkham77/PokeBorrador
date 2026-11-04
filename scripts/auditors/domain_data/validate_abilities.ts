import { enableCompileCache } from 'node:module';
/**
 * scripts/auditors/domain_data/validate_abilities.ts
 *
 * ABILITY INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates abilities assigned in POKEMON_DB against the local Showdown DB.
 */
import path from 'node:path';

import { BaseAuditor, createRuleCapabilities } from '@francogp/auditor';
import { Dex, toID, type ID } from '@pkmn/sim';

import { ABILITY_TRANSLATIONS_ES, isAbilityId } from '../../../src/data/battle/abilities.ts';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { isEnabledPokemonId } from '../../../src/data/system/constants.ts';

enableCompileCache();

const DATA_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');

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
  public constructor() {
    super({
      ruleCapabilities: createRuleCapabilities(ABILITY_RULES, {
        speed: 'heavy',
        phase: 'normal',
        md: false,
        ast: false,
        changedOnly: false,
        critical: false
      }),
      ruleFixers: {},
      id: 'validate_abilities',
      configKey: 'domain.abilities',
      defaultConfig: {
        enabled: true
      },
      criticalConfig: {},
      name: 'Pokemon Ability Validator',
      description: 'Valida base de datos canónica y paridad de habilidades',
      icon: '✨',
      family: 'domain_data',
      ruleIds: ABILITY_RULES,
      packageName: 'Habilidades',
      usesThirdPartyTool: false,
      requiredPermissions: [],
      ruleDescriptions: {
        'ability-invalid-showdown': 'Habilidad no válida en Showdown',
        'ability-missing-translation': 'Traducción faltante en habilidad',
        'ability-empty-field': 'Campo obligatorio vacío en habilidad'
      },
      ruleRemediations: {
        'ability-invalid-showdown': 'Use a valid Pokémon Showdown ability ID or remove from DB',
        'ability-missing-translation': 'Add Spanish translation in src/data/battle/abilities.ts',
        'ability-empty-field': 'Fill required name/description fields in abilities.ts'
      },
      remediationPhase: 'contracts',
      requiredFiles: [DATA_FILE],
      coverage: {
        include: [
          'src/data/battle/abilities.ts',
          'src/data/battle/abilities.json',
          'src/data/pokemon/pokemonDB.ts'
        ]
      }
    });
  }

  private extractGameAbilities(): Set<ID> {
    const gameAbilities = new Set<ID>();
    for (const pokeId of Object.keys(POKEMON_DB)) {
      if (!isEnabledPokemonId(pokeId)) continue;
      const species = Dex.species.get(pokeId);
      if (species && species.exists) {
        Object.values(species.abilities).forEach((abiName) => {
          gameAbilities.add(toID(abiName));
        });
      }
    }
    return gameAbilities;
  }

  public override async runAudit(): Promise<void> {
    this.recordScanned('src/data/battle/abilities.ts');
    this.recordScanned('src/data/battle/abilities.json');

    let gameAbilities: Set<ID> = new Set();
    let abilitiesList: ID[] = [];

    this.runSubAuditorSync('ability-invalid-showdown', () => {
      gameAbilities = this.extractGameAbilities();
      abilitiesList = Array.from(gameAbilities);
      for (const abId of abilitiesList) {
        const ability = Dex.abilities.get(abId);
        if (!ability || !ability.exists) {
          this.addViolation({
            ruleId: 'ability-invalid-showdown',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `[${abId}] Not a valid official ability in Dex.`,
            context: abId
          });
        }
      }
    });

    this.runSubAuditorSync('ability-missing-translation', () => {
      for (const abId of abilitiesList) {
        if (!isAbilityId(abId)) {
          this.addViolation({
            ruleId: 'ability-missing-translation',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `[${abId}] Missing Spanish translation registered in abilities.ts.`,
            context: abId
          });
        }
      }
    });

    this.runSubAuditorSync('ability-empty-field', () => {
      const transMap: Record<string, { name?: string; desc?: string; icon?: string }> =
        ABILITY_TRANSLATIONS_ES;
      for (const abId of abilitiesList) {
        if (!isAbilityId(abId)) continue;
        const trans = transMap[abId];
        if (!trans) continue;
        if (!trans.name?.trim()) {
          this.addViolation({
            ruleId: 'ability-empty-field',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `[${abId}] Has empty Spanish name.`,
            context: `${abId}.name`
          });
        }
        if (!trans.desc?.trim()) {
          this.addViolation({
            ruleId: 'ability-empty-field',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `[${abId}] Has empty description.`,
            context: `${abId}.desc`
          });
        }
        if (!trans.icon || trans.icon.trim() === '') {
          this.addViolation({
            ruleId: 'ability-empty-field',
            severity: 'error',
            file: 'src/data/battle/abilities.ts',
            line: 1,
            message: `[${abId}] Has empty icon.`,
            context: `${abId}.icon`
          });
        }
      }
    });

    this.context.setMetric('Unique abilities validated', gameAbilities.size);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
await BaseAuditor.runCliIfMain(import.meta.url, new AbilityAuditor());
