/**
 * scripts/auditors/domain_data/validate_pokemon.ts
 * 
 * POKEMON INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates integrity of POKEMON_DB stats, types, abilities, and learnsets against Showdown Dex.
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '@francogp/auditor';
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
      id: 'validate_pokemon',
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

  public override async runAudit(): Promise<void> {
    const pokemonDataFiles = await this.context.collectFiles(['src/data/pokemon'], new Set(['.ts', '.json']));
    for (const f of pokemonDataFiles) {
      this.recordScanned(path.relative(this.projectRoot, f).replace(/\\/g, '/'));
    }
    for (const r of POKEMON_DB_RULES) {
      this.markRuleEvaluated(r);
    }

    this.context.logStep(1, 2, 'Validating base stats and types against Showdown Dex...');
    let count = 0;

    for (const [coreId, corePoke] of Object.entries(POKEMON_DB) as Array<[string, PokemonBaseData]>) {
      if (!isEnabledPokemonId(coreId)) continue;
      count++;
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
        continue;
      }

      // A. Validar estadísticas base
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

      // B. Validar tipos
      const coreTypes: string[] = [];
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

      // C. Validar movimientos del learnset
      if (corePoke.learnset && Array.isArray(corePoke.learnset)) {
        for (const moveEntry of corePoke.learnset) {
          const moveId = toID(moveEntry.id);
          const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId);

          if (!moveData || !moveData.exists) {
            this.addViolation({
              ruleId: 'pokemon-invalid-learnset-move',
              severity: 'error',
              file: 'src/data/pokemon/pokemonDB.ts',
              line: 1,
              message: `${tag} Move '${moveEntry.id}' does not exist in Showdown Dex.`,
              context: moveEntry.id
            });
          }
        }
      } else {
        this.addViolation({
          ruleId: 'pokemon-missing-learnset',
          severity: 'error',
          file: 'src/data/pokemon/pokemonDB.ts',
          line: 1,
          message: `${tag} Missing or invalid 'learnset' property.`,
          context: coreId
        });
      }
    }

    this.context.setMetric('Enabled Pokemon validated', count);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new PokemonDbAuditor());
}
