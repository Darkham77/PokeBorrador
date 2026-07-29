import { SHOWDOWN_BOOST_STAT_KEYS } from '@/types/pokemon/pokemon';
import type { Pokemon, Move, MoveEffectBoosts, ShowdownBoostStatKey, ShowdownHitEffect, ShowdownSecondaryEffect } from '@/types/pokemon/pokemon';
import type { BattleStages, LogFn } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import { STATUS_ACTIONS } from './statusActions.ts';
import { HEALING_ACTIONS } from './healingActions.ts';
import { FIELD_ACTIONS } from './fieldActions.ts';
import { SPECIAL_ACTIONS } from './specialActions.ts';
import { logger } from '@/logic/utils/logger';

type StageKey = keyof Pick<BattleStages, 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva'>;

function toStageKey(stat: ShowdownBoostStatKey): StageKey {
  switch (stat) {
    case 'accuracy':
      return 'acc';
    case 'evasion':
      return 'eva';
    default:
      return stat;
  }
}

function applyBoosts(
  boosts: MoveEffectBoosts | undefined,
  targetStages: BattleStages,
  target: Pokemon,
  addLogFn: LogFn
) {
  if (!boosts) return;
  for (const rawStat of SHOWDOWN_BOOST_STAT_KEYS) {
    const amount = boosts[rawStat];
    if (!amount) continue;
    const stat = toStageKey(rawStat);
    targetStages[stat] = Math.max(-6, Math.min(6, (targetStages[stat] || 0) + amount));
    addLogFn(`¡Las estadísticas de ${target.name} cambiaron!`, 'log-info', target);
  }
}

function applyStatus(status: ShowdownHitEffect['status'], src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn) {
  switch (status) {
    case 'brn':
      STATUS_ACTIONS.burn?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'par':
      STATUS_ACTIONS.paralyze?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'psn':
      STATUS_ACTIONS.poison?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'tox':
      STATUS_ACTIONS.bad_poison?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'slp':
      STATUS_ACTIONS.sleep?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'frz':
      STATUS_ACTIONS.freeze?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
  }
}

function applyVolatileStatus(volatileStatus: string | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn) {
  switch (volatileStatus) {
    case 'confusion':
      STATUS_ACTIONS.confuse?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'flinch':
      STATUS_ACTIONS.flinch?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'leechseed':
      HEALING_ACTIONS.leech_seed?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'ingrain':
      SPECIAL_ACTIONS.ingrain?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'focusenergy':
      SPECIAL_ACTIONS.focus_energy?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'mustrecharge':
      SPECIAL_ACTIONS.recharge?.(src, tgt, srcStages, tgtStages, addLogFn);
      return;
    case 'lockedmove':
      if (!src.volatileCounters) src.volatileCounters = {};
      if (!src.volatileCounters.lockedmove) {
        src.volatileCounters.lockedmove = 2 + Math.floor(Math.random() * 2);
        addLogFn(`¡${src.name} está entrando en un frenesí!`, 'log-info', src);
      }
      return;
    case 'partialtrappinglock':
      if (!tgt.volatileCounters) tgt.volatileCounters = {};
      if (!tgt.volatileCounters.partiallytrapped) {
        tgt.volatileCounters.partiallytrapped = 4 + Math.floor(Math.random() * 2);
        addLogFn(`¡${tgt.name} fue atrapado!`, 'log-info', tgt);
      }
      return;
  }
}

function applySideCondition(sideCondition: string | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, battleCtx: BattleContext) {
  switch (sideCondition) {
    case 'reflect':
      FIELD_ACTIONS.reflect?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'lightscreen':
      FIELD_ACTIONS.light_screen?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'safeguard':
      FIELD_ACTIONS.safeguard?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'spikes':
      FIELD_ACTIONS.spikes?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'toxicspikes':
      FIELD_ACTIONS.toxic_spikes?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'stealthrock':
      FIELD_ACTIONS.stealth_rock?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'mist':
      FIELD_ACTIONS.mist?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
  }
}

function applyWeather(weather: string | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, battleCtx: BattleContext) {
  switch (weather) {
    case 'raindance':
      FIELD_ACTIONS.rain?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'sunnyday':
      FIELD_ACTIONS.sun?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'sandstorm':
      FIELD_ACTIONS.sandstorm?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'hail':
    case 'snowscape':
      FIELD_ACTIONS.hail?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
  }
}

async function applyMoveId(
  move: Move,
  src: Pokemon,
  tgt: Pokemon,
  srcStages: BattleStages,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
) {
  switch (move.id) {
    case 'recover':
    case 'slackoff':
    case 'softboiled':
    case 'milkdrink':
      HEALING_ACTIONS.heal_50?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'synthesis':
    case 'morningsun':
    case 'moonlight':
      HEALING_ACTIONS.heal_weather?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'rest':
      HEALING_ACTIONS.rest?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'healbell':
    case 'aromatherapy':
      STATUS_ACTIONS.heal_status_party?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'roar':
    case 'whirlwind':
      await SPECIAL_ACTIONS.roar?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'curse':
      SPECIAL_ACTIONS.curse?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'destinybond':
      SPECIAL_ACTIONS.destiny_bond?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'perishsong':
      SPECIAL_ACTIONS.perish_song?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'transform':
      SPECIAL_ACTIONS.transform?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'triattack':
      SPECIAL_ACTIONS.tri_attack?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'lockon':
    case 'mindreader':
      SPECIAL_ACTIONS.lock_on?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'falseswipe':
      SPECIAL_ACTIONS.false_swipe?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'block':
    case 'meanlook':
    case 'spiderweb':
      SPECIAL_ACTIONS.trap?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'endure':
      SPECIAL_ACTIONS.endure?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'protect':
    case 'detect':
      SPECIAL_ACTIONS.protect?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'bellydrum':
      SPECIAL_ACTIONS.belly_drum?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'teleport':
      await SPECIAL_ACTIONS.teleport?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'rapidspin':
      SPECIAL_ACTIONS.rapid_spin?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'foresight':
    case 'odorsleuth':
      SPECIAL_ACTIONS.identify?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'swagger':
      SPECIAL_ACTIONS.swagger?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'disable':
      SPECIAL_ACTIONS.disable?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'dreameater':
      SPECIAL_ACTIONS.dream_eater?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'encore':
      SPECIAL_ACTIONS.encore?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'furycutter':
      SPECIAL_ACTIONS.fury_cutter?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'bind':
    case 'wrap':
    case 'clamp':
    case 'firespin':
    case 'infestation':
    case 'magmastorm':
    case 'sandtomb':
    case 'snaptrap':
    case 'thundercage':
    case 'whirlpool':
      SPECIAL_ACTIONS.bind?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'rage':
      SPECIAL_ACTIONS.rage?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'futuresight':
      SPECIAL_ACTIONS.future_sight_simple?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'trick':
    case 'switcheroo':
      SPECIAL_ACTIONS.trick?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'thief':
    case 'covet':
      SPECIAL_ACTIONS.steal_item?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'payday':
      SPECIAL_ACTIONS.pay_day?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'skillswap':
      SPECIAL_ACTIONS.skill_swap?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'snatch':
      SPECIAL_ACTIONS.snatch?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'stockpile':
      SPECIAL_ACTIONS.stockpile?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'spitup':
      SPECIAL_ACTIONS.spit_up?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'grudge':
      SPECIAL_ACTIONS.grudge?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'charge':
      SPECIAL_ACTIONS.charge?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
    case 'brickbreak':
      FIELD_ACTIONS.break_screens?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      return;
  }
}

async function applyHitEffect(
  effect: ShowdownHitEffect | ShowdownSecondaryEffect,
  src: Pokemon,
  tgt: Pokemon,
  srcStages: BattleStages,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext,
  isSelf = false
) {
  const effectTarget = isSelf ? src : tgt;
  const effectStages = isSelf ? srcStages : tgtStages;
  applyStatus(effect.status, src, effectTarget, srcStages, effectStages, addLogFn);
  applyVolatileStatus(effect.volatileStatus, src, effectTarget, srcStages, effectStages, addLogFn);
  applyBoosts(effect.boosts, effectStages, effectTarget, addLogFn);
  applySideCondition(effect.sideCondition, src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  applyWeather(effect.weather, src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  if ('self' in effect && effect.self) {
    await applyHitEffect(effect.self, src, tgt, srcStages, tgtStages, addLogFn, battleCtx, true);
  }
}

export async function dispatchMoveEffect(
  move: Move,
  src: Pokemon,
  tgt: Pokemon,
  srcStages: BattleStages,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
) {
  try {
    await applyMoveId(move, src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
    await applyHitEffect(move, src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
    if (move.self) {
      await applyHitEffect(move.self, src, tgt, srcStages, tgtStages, addLogFn, battleCtx, true);
    }
    const secondaries = move.secondaries ?? (move.secondary ? [move.secondary] : []);
    for (const secondary of secondaries) {
      const chance = secondary.chance ?? 100;
      if (tgt.ability === 'shielddust' && chance < 100) {
        addLogFn(`¡El Polvo escudo de ${tgt.name} evitó los efectos secundarios!`, 'log-info', tgt);
        continue;
      }
      if (Math.random() * 100 <= chance) {
        await applyHitEffect(secondary, src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
      }
    }
  } catch (error) {
    if (!move.id) throw new Error(`[ActionRegistry] Move without canonical id: ${move.name}`);
    logger.error('ActionRegistry', `Error executing ${move.id}: ${(error as Error).message}`);
  }
}
