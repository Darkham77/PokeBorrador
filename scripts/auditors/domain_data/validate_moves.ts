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
import { ACTIVE_GENERATION, isEnabledPokemonId } from '../../../src/data/system/constants.ts';
import { BaseAuditor } from '@francogp/auditor';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { MOVE_TRANSLATIONS_ES, type PokemonMoveId } from '../../../src/data/battle/moves.ts';

enableCompileCache();

const UTILS_FILE = path.resolve(process.cwd(), 'src/logic/pokemon/pokemonUtils.ts');
type MoveTranslationId = keyof typeof MOVE_TRANSLATIONS_ES;

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

const STATUS_EFFECT_MAP: Record<string, string> = {
  par: 'paralyze',
  brn: 'burn',
  frz: 'freeze',
  psn: 'poison',
  tox: 'poison',
  slp: 'sleep'
};

const STAT_ABBR_MAP: Record<string, string> = {
  atk: 'atk',
  def: 'def',
  spa: 'spa',
  spd: 'spd',
  spe: 'spe',
  accuracy: 'acc',
  evasion: 'eva'
};

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

interface SecondaryEffectInput {
  chance?: number;
  status?: string;
  volatileStatus?: string;
  boosts?: Partial<Record<string, number>>;
  self?: unknown;
}

function resolveBoostEffect(
  boosts: Partial<Record<string, number>>,
  isSelf: boolean,
  chance: string
): string | undefined {
  const entries = Object.entries(boosts);
  if (entries.length === 0) return undefined;
  const [stat, val] = entries[0] as [string, number];
  const localStat = STAT_ABBR_MAP[stat];
  if (!localStat) return undefined;
  const dir = val > 0 ? 'up' : 'down';
  const who = isSelf ? 'self' : 'enemy';
  const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
  return `stat_${dir}_${who}_${localStat}${stage}${chance}`;
}

function resolveSecondaryEffect(sec: SecondaryEffectInput): string | undefined {
  const chance = sec.chance !== undefined ? `_${sec.chance}` : '';
  if (sec.status) {
    const mapped = STATUS_EFFECT_MAP[sec.status];
    return mapped ? `${mapped}${chance}` : undefined;
  }
  if (sec.volatileStatus === 'flinch') return `flinch${chance}`;
  if (sec.volatileStatus === 'confusion') return `confuse${chance}`;
  if (sec.boosts) {
    return resolveBoostEffect(sec.boosts, Boolean(sec.self), chance);
  }
  return undefined;
}

function resolveSelfBoostEffect(self: { boosts?: Partial<Record<string, number>>; chance?: number }): string | undefined {
  if (!self.boosts) return undefined;
  const entries = Object.entries(self.boosts);
  if (entries.length === 0) return undefined;
  const [stat, val] = entries[0] as [string, number];
  const localStat = STAT_ABBR_MAP[stat];
  if (!localStat) return undefined;
  const dir = val > 0 ? 'up' : 'down';
  const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
  const chance = self.chance !== undefined ? `_${self.chance}` : '';
  return `stat_${dir}_self_${localStat}${stage}${chance}`;
}

export class MoveAuditor extends BaseAuditor<MoveRuleId> {
  constructor() {
    super({
      id: 'validate_moves',
      configKey: 'domain.moves',
      defaultConfig: {
        enabled: true
      },
      name: 'Pokemon Move Validator',
      description: 'Movimientos faltantes o sin paridad con Showdown',
      icon: '💥',
      family: 'domain_data',
      ruleIds: MOVE_RULES,
      packageName: 'Movimientos',
      ruleDescriptions: {
        'move-invalid-showdown': 'Movimiento no válido en Showdown',
        'move-missing-translation': 'Traducción faltante en movimiento',
        'move-missing-effect-desc': 'Descripción de efecto faltante'
      },
      requiredFiles: [UTILS_FILE],
      coverage: {
        include: [
          'src/data/battle/moves.ts',
          'src/data/battle/moves.json',
          'src/data/battle/movesData.json',
          'src/logic/pokemon/pokemonUtils.ts'
        ]
      }
    });
  }

  private validateMoveEffectDescription(
    moveId: PokemonMoveId,
    g3: ReturnType<typeof Dex.forGen>,
    registeredEffects: Set<string>
  ): void {
    const move = g3.moves.get(moveId);
    if (!move || !move.exists) return;

    let effect: string | undefined = SPECIAL_EFFECTS[moveId];
    if (!effect && move.secondaries && move.secondaries.length > 0 && move.secondaries[0]) {
      effect = resolveSecondaryEffect(move.secondaries[0]);
    }
    if (!effect && move.self) {
      effect = resolveSelfBoostEffect(move.self);
    }

    if (!effect) return;

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

  public override async runAudit(): Promise<void> {
    this.recordScanned('src/data/battle/moves.ts');
    this.recordScanned('src/data/battle/moves.json');
    this.recordScanned('src/data/battle/movesData.json');
    this.recordScanned('src/logic/pokemon/pokemonUtils.ts');
    for (const r of MOVE_RULES) {
      this.markRuleEvaluated(r);
    }

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
          severity: 'error',
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

        learnsetMoves.forEach(moveId => this.validateMoveEffectDescription(moveId as PokemonMoveId, g3, registeredEffects));
      }
    } catch { // catch-ok: optional dex data parsing error fallback
      // Ignored
    }

    this.context.setMetric('Learnset moves checked', learnsetMoves.size);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new MoveAuditor());
}
