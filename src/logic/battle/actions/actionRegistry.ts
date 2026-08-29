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

const STATUS_ACTION_MAP: Record<string, (src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn) => void> = {
  brn: (s, t, ss, ts, l) => STATUS_ACTIONS.burn?.(s, t, ss, ts, l),
  par: (s, t, ss, ts, l) => STATUS_ACTIONS.paralyze?.(s, t, ss, ts, l),
  psn: (s, t, ss, ts, l) => STATUS_ACTIONS.poison?.(s, t, ss, ts, l),
  tox: (s, t, ss, ts, l) => STATUS_ACTIONS.bad_poison?.(s, t, ss, ts, l),
  slp: (s, t, ss, ts, l) => STATUS_ACTIONS.sleep?.(s, t, ss, ts, l),
  frz: (s, t, ss, ts, l) => STATUS_ACTIONS.freeze?.(s, t, ss, ts, l),
};

function applyStatus(status: ShowdownHitEffect['status'], src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn) {
  if (status && STATUS_ACTION_MAP[status]) {
    STATUS_ACTION_MAP[status](src, tgt, srcStages, tgtStages, addLogFn);
  }
}

const VOLATILE_ACTION_MAP: Record<string, (src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn) => void> = {
  confusion: (s, t, ss, ts, l) => STATUS_ACTIONS.confuse?.(s, t, ss, ts, l),
  flinch: (s, t, ss, ts, l) => STATUS_ACTIONS.flinch?.(s, t, ss, ts, l),
  leechseed: (s, t, ss, ts, l) => HEALING_ACTIONS.leech_seed?.(s, t, ss, ts, l),
  ingrain: (s, t, ss, ts, l) => SPECIAL_ACTIONS.ingrain?.(s, t, ss, ts, l),
  focusenergy: (s, t, ss, ts, l) => SPECIAL_ACTIONS.focus_energy?.(s, t, ss, ts, l),
  mustrecharge: (s, t, ss, ts, l) => SPECIAL_ACTIONS.recharge?.(s, t, ss, ts, l),
  lockedmove: (src, _t, _ss, _ts, addLogFn) => {
    if (!src.volatileCounters) src.volatileCounters = {};
    if (!src.volatileCounters.lockedmove) {
      src.volatileCounters.lockedmove = 2 + Math.floor(Math.random() * 2);
      addLogFn(`¡${src.name} está entrando en un frenesí!`, 'log-info', src);
    }
  },
  partialtrappinglock: (_s, tgt, _ss, _ts, addLogFn) => {
    if (!tgt.volatileCounters) tgt.volatileCounters = {};
    if (!tgt.volatileCounters.partiallytrapped) {
      tgt.volatileCounters.partiallytrapped = 4 + Math.floor(Math.random() * 2);
      addLogFn(`¡${tgt.name} fue atrapado!`, 'log-info', tgt);
    }
  },
};

function applyVolatileStatus(volatileStatus: string | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn) {
  if (volatileStatus && VOLATILE_ACTION_MAP[volatileStatus]) {
    VOLATILE_ACTION_MAP[volatileStatus](src, tgt, srcStages, tgtStages, addLogFn);
  }
}

const SIDE_CONDITION_MAP: Record<string, (src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, battleCtx: BattleContext) => void> = {
  reflect: (s, t, ss, ts, l, c) => FIELD_ACTIONS.reflect?.(s, t, ss, ts, l, c),
  lightscreen: (s, t, ss, ts, l, c) => FIELD_ACTIONS.light_screen?.(s, t, ss, ts, l, c),
  safeguard: (s, t, ss, ts, l, c) => FIELD_ACTIONS.safeguard?.(s, t, ss, ts, l, c),
  spikes: (s, t, ss, ts, l, c) => FIELD_ACTIONS.spikes?.(s, t, ss, ts, l, c),
  toxicspikes: (s, t, ss, ts, l, c) => FIELD_ACTIONS.toxic_spikes?.(s, t, ss, ts, l, c),
  stealthrock: (s, t, ss, ts, l, c) => FIELD_ACTIONS.stealth_rock?.(s, t, ss, ts, l, c),
  mist: (s, t, ss, ts, l, c) => FIELD_ACTIONS.mist?.(s, t, ss, ts, l, c),
};

function applySideCondition(sideCondition: string | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, battleCtx: BattleContext) {
  if (sideCondition && SIDE_CONDITION_MAP[sideCondition]) {
    SIDE_CONDITION_MAP[sideCondition](src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  }
}

const WEATHER_ACTION_MAP: Record<string, (src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, battleCtx: BattleContext) => void> = {
  raindance: (s, t, ss, ts, l, c) => FIELD_ACTIONS.rain?.(s, t, ss, ts, l, c),
  sunnyday: (s, t, ss, ts, l, c) => FIELD_ACTIONS.sun?.(s, t, ss, ts, l, c),
  sandstorm: (s, t, ss, ts, l, c) => FIELD_ACTIONS.sandstorm?.(s, t, ss, ts, l, c),
  hail: (s, t, ss, ts, l, c) => FIELD_ACTIONS.hail?.(s, t, ss, ts, l, c),
  snowscape: (s, t, ss, ts, l, c) => FIELD_ACTIONS.hail?.(s, t, ss, ts, l, c),
};

function applyWeather(weather: string | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, battleCtx: BattleContext) {
  if (weather && WEATHER_ACTION_MAP[weather]) {
    WEATHER_ACTION_MAP[weather](src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  }
}

type MoveActionHandler = (
  src: Pokemon,
  tgt: Pokemon,
  srcStages: BattleStages,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
) => void | Promise<void>;

const MOVE_ACTION_HANDLERS: Record<string, MoveActionHandler> = {
  recover: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_50?.(s, t, ss, ts, l, c),
  slackoff: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_50?.(s, t, ss, ts, l, c),
  softboiled: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_50?.(s, t, ss, ts, l, c),
  milkdrink: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_50?.(s, t, ss, ts, l, c),
  synthesis: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_weather?.(s, t, ss, ts, l, c),
  morningsun: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_weather?.(s, t, ss, ts, l, c),
  moonlight: (s, t, ss, ts, l, c) => HEALING_ACTIONS.heal_weather?.(s, t, ss, ts, l, c),
  rest: (s, t, ss, ts, l, c) => HEALING_ACTIONS.rest?.(s, t, ss, ts, l, c),
  healbell: (s, t, ss, ts, l, c) => STATUS_ACTIONS.heal_status_party?.(s, t, ss, ts, l, c),
  aromatherapy: (s, t, ss, ts, l, c) => STATUS_ACTIONS.heal_status_party?.(s, t, ss, ts, l, c),
  roar: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.roar?.(s, t, ss, ts, l, c),
  whirlwind: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.roar?.(s, t, ss, ts, l, c),
  curse: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.curse?.(s, t, ss, ts, l, c),
  destinybond: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.destiny_bond?.(s, t, ss, ts, l, c),
  perishsong: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.perish_song?.(s, t, ss, ts, l, c),
  transform: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.transform?.(s, t, ss, ts, l, c),
  triattack: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.tri_attack?.(s, t, ss, ts, l, c),
  lockon: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.lock_on?.(s, t, ss, ts, l, c),
  mindreader: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.lock_on?.(s, t, ss, ts, l, c),
  falseswipe: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.false_swipe?.(s, t, ss, ts, l, c),
  block: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.trap?.(s, t, ss, ts, l, c),
  meanlook: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.trap?.(s, t, ss, ts, l, c),
  spiderweb: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.trap?.(s, t, ss, ts, l, c),
  endure: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.endure?.(s, t, ss, ts, l, c),
  protect: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.protect?.(s, t, ss, ts, l, c),
  detect: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.protect?.(s, t, ss, ts, l, c),
  bellydrum: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.belly_drum?.(s, t, ss, ts, l, c),
  teleport: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.teleport?.(s, t, ss, ts, l, c),
  rapidspin: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.rapid_spin?.(s, t, ss, ts, l, c),
  foresight: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.identify?.(s, t, ss, ts, l, c),
  odorsleuth: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.identify?.(s, t, ss, ts, l, c),
  swagger: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.swagger?.(s, t, ss, ts, l, c),
  disable: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.disable?.(s, t, ss, ts, l, c),
  dreameater: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.dream_eater?.(s, t, ss, ts, l, c),
  encore: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.encore?.(s, t, ss, ts, l, c),
  furycutter: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.fury_cutter?.(s, t, ss, ts, l, c),
  bind: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  wrap: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  clamp: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  firespin: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  infestation: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  magmastorm: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  sandtomb: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  snaptrap: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  thundercage: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  whirlpool: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.bind?.(s, t, ss, ts, l, c),
  rage: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.rage?.(s, t, ss, ts, l, c),
  futuresight: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.future_sight_simple?.(s, t, ss, ts, l, c),
  trick: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.trick?.(s, t, ss, ts, l, c),
  switcheroo: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.trick?.(s, t, ss, ts, l, c),
  thief: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.steal_item?.(s, t, ss, ts, l, c),
  covet: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.steal_item?.(s, t, ss, ts, l, c),
  payday: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.pay_day?.(s, t, ss, ts, l, c),
  skillswap: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.skill_swap?.(s, t, ss, ts, l, c),
  snatch: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.snatch?.(s, t, ss, ts, l, c),
  stockpile: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.stockpile?.(s, t, ss, ts, l, c),
  spitup: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.spit_up?.(s, t, ss, ts, l, c),
  grudge: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.grudge?.(s, t, ss, ts, l, c),
  charge: (s, t, ss, ts, l, c) => SPECIAL_ACTIONS.charge?.(s, t, ss, ts, l, c),
  brickbreak: (s, t, ss, ts, l, c) => FIELD_ACTIONS.break_screens?.(s, t, ss, ts, l, c),
};

async function applyMoveId(
  move: Move,
  src: Pokemon,
  tgt: Pokemon,
  srcStages: BattleStages,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
) {
  const handler = move.id ? MOVE_ACTION_HANDLERS[move.id] : undefined;
  if (handler) {
    await handler(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
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
    throw error;
  }
}
