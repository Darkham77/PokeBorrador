/**
 * scripts/auditors/domain_data/validate_moves.ts
 * 
 * MOVE INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates learnset moves against Gen 3 Showdown Dex and local Spanish translations.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS } from '../../../src/data/system/constants.ts';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { MOVE_TRANSLATIONS_ES } from '../../../src/data/battle/moves.ts';

enableCompileCache();

const UTILS_FILE = path.resolve(process.cwd(), 'src/logic/pokemon/pokemonUtils.ts');
type MoveTranslationId = keyof typeof MOVE_TRANSLATIONS_ES;

function isEnabledPokemonId(id: string): id is (typeof ENABLED_POKEMON_IDS)[number] {
  return (ENABLED_POKEMON_IDS as readonly string[]).includes(id);
}

function hasMoveTranslation(id: string): id is MoveTranslationId {
  return Object.hasOwn(MOVE_TRANSLATIONS_ES, id);
}

export type MoveRuleId =
  | 'move-invalid-showdown'
  | 'move-missing-translation'
  | 'move-missing-effect-desc';

export const MOVE_RULES: readonly MoveRuleId[] = [
  'move-invalid-showdown',
  'move-missing-translation',
  'move-missing-effect-desc'
] as const;

export class MoveAuditor extends BaseAuditor<MoveRuleId> {
  constructor() {
    super({
      id: 'validate_moves',
      name: 'Pokemon Move Validator',
      description: 'Movimientos faltantes o sin paridad con Showdown',
      family: 'domain_data',
      ruleIds: MOVE_RULES,
      ruleDescriptions: {
        'move-invalid-showdown': 'Movimiento no válido en Pokémon Showdown',
        'move-missing-translation': 'Traducción al español faltante en movimiento',
        'move-missing-effect-desc': 'Descripción de efecto faltante en movimiento'
      },
      requiredFiles: [UTILS_FILE]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Extracting unique learnset moves from POKEMON_DB...');
    const learnsetMoves = new Set<string>();
    for (const [pokeId, poke] of Object.entries(POKEMON_DB)) {
      if (!isEnabledPokemonId(pokeId)) continue;
      if (poke.learnset && Array.isArray(poke.learnset)) {
        poke.learnset.forEach((m: { id: string }) => {
          if (m.id && m.id !== 'Unknown') {
            learnsetMoves.add(toID(m.id));
          }
        });
      }
    }

    this.filesScannedCount = learnsetMoves.size;
    this.context.logStep(2, 2, `Validating ${learnsetMoves.size} moves against Gen ${ACTIVE_GENERATION} Dex and translations...`);

    const g3 = Dex.forGen(ACTIVE_GENERATION);

    learnsetMoves.forEach(moveId => {
      const move = g3.moves.get(moveId);
      const tag = `[${moveId}]`;

      if (!move || !move.exists) {
        this.addViolation({
          ruleId: 'move-invalid-showdown',
          severity: 'error',
          file: 'src/data/pokemon/pokemonDB.ts',
          line: 1,
          message: `${tag} Present in learnset but does NOT exist in Showdown Gen 3 Dex.`,
          context: moveId
        });
        return;
      }

      if (!hasMoveTranslation(moveId)) {
        this.addViolation({
          ruleId: 'move-missing-translation',
          severity: 'warning',
          file: 'src/data/battle/moves.ts',
          line: 1,
          message: `${tag} Missing official Spanish translation in moves.ts.`,
          context: moveId
        });
      }
    });

    try {
      const utilsContent = await fs.readFile(UTILS_FILE, 'utf8');
      const effectsMatch = utilsContent.match(/const effects:.* = {([\s\S]+?)};/);
      if (effectsMatch) {
        const registeredEffects = new Set<string>();
        const keyRegex = /'([^']+)':/g;
        let k;
        while ((k = keyRegex.exec(effectsMatch[1]!)) !== null) {
          registeredEffects.add(k[1]!);
        }

        const SPECIAL_EFFECTS: Record<string, string> = {
          metronome: 'metronome',
          mirror_move: 'mirror_move',
          sandstorm: 'sandstorm',
          rain_dance: 'rain_dance',
          sunny_day: 'sunny_day',
          hail: 'hail',
          spikes: 'spikes',
          destiny_bond: 'destiny_bond',
          grudge: 'grudge',
          yawn: 'yawn',
          rest: 'rest',
          recover: 'heal_50',
          slack_off: 'heal_50',
          soft_boiled: 'heal_50',
          synthesis: 'heal_50',
          milk_drink: 'heal_50',
          heal_bell: 'heal_bell',
          fury_cutter: 'fury_cutter',
          rapid_spin: 'rapid_spin',
          brick_break: 'brick_break',
          focus_punch: 'focus_punch',
          spit_up: 'spit_up',
          stockpile: 'stockpile',
          dream_eater: 'dream_eater',
          teleport: 'teleport',
          covet: 'covet',
          rage: 'rage',
          future_sight: 'future_sight',
          psych_up: 'psych_up',
          charge: 'charge',
          curse: 'curse',
          flail: 'hp_scale',
          reversal: 'hp_scale',
          water_spout: 'hp_scale_high',
          snore: 'flinch_30',
          hyper_beam: 'recharge',
        };

        learnsetMoves.forEach(moveId => {
          const move = g3.moves.get(moveId);
          if (!move || !move.exists) return;

          let effect: string | undefined = SPECIAL_EFFECTS[moveId];

          if (!effect && move.secondaries && move.secondaries.length > 0) {
            const sec = move.secondaries[0];
            if (sec) {
              const chance = sec.chance !== undefined ? `_${sec.chance}` : '';
              if (sec.status) {
                const map: Record<string, string> = { par: 'paralyze', brn: 'burn', frz: 'freeze', psn: 'poison', tox: 'poison', slp: 'sleep' };
                if (map[sec.status]) effect = `${map[sec.status]}${chance}`;
              } else if (sec.volatileStatus === 'flinch') {
                effect = `flinch${chance}`;
              } else if (sec.volatileStatus === 'confusion') {
                effect = `confuse${chance}`;
              } else if (sec.boosts) {
                const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
                const entries = Object.entries(sec.boosts);
                if (entries.length > 0) {
                  const [stat, val] = entries[0] as [string, number];
                  const localStat = statMap[stat];
                  if (localStat) {
                    const dir = val > 0 ? 'up' : 'down';
                    const who = sec.self ? 'self' : 'enemy';
                    const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
                    effect = `stat_${dir}_${who}_${localStat}${stage}${chance}`;
                  }
                }
              }
            }
          }

          if (!effect && move.self && move.self.boosts) {
            const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
            const entries = Object.entries(move.self.boosts);
            if (entries.length > 0) {
              const [stat, val] = entries[0] as [string, number];
              const localStat = statMap[stat];
              if (localStat) {
                const dir = val > 0 ? 'up' : 'down';
                const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
                const chance = move.self.chance !== undefined ? `_${move.self.chance}` : '';
                effect = `stat_${dir}_self_${localStat}${stage}${chance}`;
              }
            }
          }

          if (effect) {
            let effectBase = effect;
            if (/_(\d+)$/.test(effect) && !effect.startsWith('heal_') && !effect.includes('self_atk_2')) {
              effectBase = effect.replace(/_\d+$/, '');
            }
            if (!registeredEffects.has(effect) && !registeredEffects.has(effectBase)) {
              this.addViolation({
                ruleId: 'move-missing-effect-desc',
                severity: 'error',
                file: 'src/logic/pokemon/pokemonUtils.ts',
                line: 1,
                message: `[${moveId}] Uses effect '${effect}' but has no description in pokemonUtils.ts.`,
                context: effect
              });
            }
          }
        });
      }
    } catch {
      // Ignored
    }

    this.context.setMetric('Learnset moves checked', learnsetMoves.size);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new MoveAuditor());
}
