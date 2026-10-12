/**
 * scripts/auditors/domain_data/validate_pokemon.ts
 * 
 * POKEMON INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates integrity of POKEMON_DB stats, types, abilities, and learnsets against Showdown Dex.
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, normalizePosixPath , createRuleCapabilities} from '@francogp/auditor';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, isEnabledPokemonId } from '../../../src/data/system/constants.ts';
import type { PokemonBaseData } from '../../../src/types/system/database.ts';

enableCompileCache();

const DB_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

export type PokemonDbRuleId =
  | 'pokemon-invalid-species'
  | 'pokemon-base-stat-mismatch'
  | 'pokemon-type-mismatch'
  | 'pokemon-invalid-learnset-move'
  | 'pokemon-missing-learnset';

export const POKEMON_DB_RULES: readonly PokemonDbRuleId[] = [
  'pokemon-invalid-species',
  'pokemon-base-stat-mismatch',
  'pokemon-type-mismatch',
  'pokemon-invalid-learnset-move',
  'pokemon-missing-learnset'
] as const;

export class PokemonDbAuditor extends BaseAuditor<PokemonDbRuleId> {
  constructor() {
    super({
      ruleCapabilities: createRuleCapabilities(POKEMON_DB_RULES, {
        fix: false,
        fixPriority: false,
        lint: false,
        md: false,
        ast: false,
        changedSince: false,
        heavy: false,
        requiresBuild: false,
        postRun: false
      }),
      id: 'validate_pokemon',
      configKey: 'domain.pokemon',
      defaultConfig: {
        enabled: true
      },
      criticalConfig: {},
      name: 'Pokemon DB Integrity Validator',
      description: 'Especies no válidas, stats erróneos o learnsets rotos',
      icon: '🐾',
      family: 'domain_data',
      ruleIds: POKEMON_DB_RULES,
      packageName: 'Pokémon',
      ruleDescriptions: {
        'pokemon-invalid-species': 'Especie no válida en catálogo',
        'pokemon-base-stat-mismatch': 'Discrepancia en stats base',
        'pokemon-type-mismatch': 'Discrepancia de tipos elementales',
        'pokemon-invalid-learnset-move': 'Movimiento inválido en learnset',
        'pokemon-missing-learnset': 'Learnset vacío o no definido'
      },
      requiredFiles: [DB_FILE],
      coverage: {
        include: ['src/data/pokemon/**/*.{ts,json}']
      }
    });
  }

  private validateBaseStats(corePoke: PokemonBaseData, species: { baseStats: Record<string, number> }, tag: string): void {
    for (const stat of STAT_KEYS) {
      const coreVal = corePoke[stat];
      const sdVal = species.baseStats[stat];
      if (coreVal !== sdVal) {
        this.addViolation({
          ruleId: 'pokemon-base-stat-mismatch',
          severity: 'error',
          file: 'src/data/pokemon/pokemonDB.ts',
          line: 1,
          message: `${tag} Stat mismatch in '${stat.toUpperCase()}': Game ${coreVal} vs Showdown ${sdVal}.`,
          context: `${stat}: ${coreVal} != ${sdVal}`
        });
      }
    }
  }

  private validateTypes(corePoke: PokemonBaseData, species: { types: string[] }, tag: string): void {
    const coreTypes: string[] = []; // no-domain: Non-domain utility collection or data structure
    if (corePoke.type) coreTypes.push(corePoke.type);
    const type2 = (corePoke as { type2?: string }).type2;
    if (type2) coreTypes.push(type2);

    const sdTypes = species.types.map(t => t.toLowerCase());
    const coreTypesStr = coreTypes.slice().sort().join(',');
    const sdTypesStr = sdTypes.slice().sort().join(',');

    if (coreTypesStr !== sdTypesStr) {
      this.addViolation({
        ruleId: 'pokemon-type-mismatch',
        severity: 'error',
        file: 'src/data/pokemon/pokemonDB.ts',
        line: 1,
        message: `${tag} Type mismatch: Game [${coreTypesStr}] vs Showdown [${sdTypesStr}].`,
        context: `${coreTypesStr} != ${sdTypesStr}`
      });
    }
  }

  public override async runAudit(): Promise<void> {
    const pokemonDataFiles = await this.context.collectFiles(['src/data/pokemon'], new Set(['.ts', '.json']));
    for (const f of pokemonDataFiles) {
      this.recordScanned(normalizePosixPath(path.relative(this.projectRoot, f)));
    }

    type ShowdownSpecies = ReturnType<ReturnType<typeof Dex.forGen>['species']['get']>;
    const validSpeciesMap = new Map<string, ShowdownSpecies>();
    let enabledPokemon: Array<[string, PokemonBaseData]> = [];

    this.runSubAuditorSync('pokemon-invalid-species', () => {
      enabledPokemon = (Object.entries(POKEMON_DB) as Array<[string, PokemonBaseData]>)
        .filter(([id]) => isEnabledPokemonId(id));

      for (const [coreId, corePoke] of enabledPokemon) {
        const tag = `[${corePoke.name} (${coreId})]`;
        const species = Dex.forGen(ACTIVE_GENERATION).species.get(coreId);
        if (!species || !species.exists) {
          this.addViolation({
            ruleId: 'pokemon-invalid-species',
            severity: 'error',
            file: 'src/data/pokemon/pokemonDB.ts',
            line: 1,
            message: `${tag} Does not exist in official Showdown Dex.`,
            context: coreId
          });
        } else {
          validSpeciesMap.set(coreId, species);
        }
      }
    });

    this.runSubAuditorSync('pokemon-base-stat-mismatch', () => {
      for (const [coreId, corePoke] of enabledPokemon) {
        const species = validSpeciesMap.get(coreId);
        if (!species) continue;
        this.validateBaseStats(corePoke, species as { baseStats: Record<string, number> }, `[${corePoke.name} (${coreId})]`);
      }
    });

    this.runSubAuditorSync('pokemon-type-mismatch', () => {
      for (const [coreId, corePoke] of enabledPokemon) {
        const species = validSpeciesMap.get(coreId);
        if (!species) continue;
        this.validateTypes(corePoke, species as { types: string[] }, `[${corePoke.name} (${coreId})]`);
      }
    });

    this.runSubAuditorSync('pokemon-missing-learnset', () => {
      for (const [coreId, corePoke] of enabledPokemon) {
        if (!corePoke.learnset || !Array.isArray(corePoke.learnset)) {
          this.addViolation({
            ruleId: 'pokemon-missing-learnset',
            severity: 'error',
            file: 'src/data/pokemon/pokemonDB.ts',
            line: 1,
            message: `[${corePoke.name} (${coreId})] Missing or invalid 'learnset' property.`,
            context: coreId
          });
        }
      }
    });

    this.runSubAuditorSync('pokemon-invalid-learnset-move', () => {
      const gDex = Dex.forGen(ACTIVE_GENERATION);
      for (const [coreId, corePoke] of enabledPokemon) {
        if (!corePoke.learnset || !Array.isArray(corePoke.learnset)) continue;
        for (const moveEntry of corePoke.learnset) {
          const moveId = toID(moveEntry.id);
          const moveData = gDex.moves.get(moveId);
          if (!moveData || !moveData.exists) {
            this.addViolation({
              ruleId: 'pokemon-invalid-learnset-move',
              severity: 'error',
              file: 'src/data/pokemon/pokemonDB.ts',
              line: 1,
              message: `[${corePoke.name} (${coreId})] Move '${moveEntry.id}' does not exist in Showdown Dex.`,
              context: moveEntry.id
            });
          }
        }
      }
    });

    this.context.setMetric('Enabled Pokemon validated', enabledPokemon.length);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new PokemonDbAuditor());
}
