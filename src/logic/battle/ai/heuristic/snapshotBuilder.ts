// ============================================================
// Snapshot Builder — adapts BattleContext → HeuristicBattleSnapshot
// Reads playerRequest / enemyRequest + activeBattle from BattleContext
// Zero-Fallback: throws if critical state is unavailable
// ============================================================

import { toID } from '@pkmn/sim';
import type { BattleContext } from '@/types/battle/battleContext';
import { BATTLE_CONDITION_KEYS, type BattleState, type BattleStages, type BattleTimedCondition } from '@/types/battle/battle';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import { requireItemId } from '@/data/inventory/items';
import { requireAbilityId } from '@/data/battle/abilities';
import type { HeuristicBattleSnapshot, HeuristicPokemonState, HeuristicSideState, HeuristicFieldState, HeuristicVolatileKey, HeuristicPokemonMove } from './types.ts';

/**
 * Builds a HeuristicBattleSnapshot from the live BattleContext.
 * Throws explicitly if critical state (playerRequest / enemyRequest / activePokemon) is missing.
 */
export function buildSnapshot(store: BattleContext): HeuristicBattleSnapshot {
  const battle = store.activeBattle.value;
  if (!battle) throw new Error('[SnapshotBuilder] activeBattle is null — cannot build snapshot');

  const { playerRequest, enemyRequest } = battle;
  if (!playerRequest) throw new Error('[SnapshotBuilder] playerRequest is null on decision turn — is this turn 1 before INIT_BATTLE_SUCCESS?');
  if (!enemyRequest) throw new Error('[SnapshotBuilder] enemyRequest is null on decision turn');

  const playerTeam = battle.playerTeam ?? [];
  const enemyTeam = battle.enemyTeam ?? [];
  const playerStages = store.playerStages.value;
  const enemyStages = store.enemyStages.value;
  const turn = battle.turnCount ?? 0;

  const mySide = buildSide('p2', enemyTeam, enemyStages, battle.enemy, battle.enemySideConditions);
  const opponentSide = buildSide('p1', playerTeam, playerStages, battle.player, battle.playerSideConditions);

  const field = buildField(battle);

  return { turn, myPlayer: 'p2', mySide, opponentSide, field };
}

// ──────────────────────────────────────────
// Side builder
// ──────────────────────────────────────────

import type { SideID } from '@pkmn/sim';

function buildSide(
  id: SideID,
  team: Pokemon[],
  stages: BattleStages,
  activePoke: Pokemon | null | undefined,
  sideConditionsRaw: Partial<Record<(typeof BATTLE_CONDITION_KEYS)[number], BattleTimedCondition>> | undefined,
): HeuristicSideState {
  const sideConditions = buildSideConditions(sideConditionsRaw);
  const activeName = activePoke?.name ?? '';

  const pokemon: HeuristicPokemonState[] = team
    .filter((p): p is Pokemon => !!p)
    .map(p => buildPokemonState(p, p.name === activeName, stages));

  const activePokemon = pokemon.find(p => p.active) ?? null;

  return { id, pokemon, activePokemon, sideConditions };
}

function buildSideConditions(
  raw: Partial<Record<(typeof BATTLE_CONDITION_KEYS)[number], BattleTimedCondition>> | undefined,
): Map<(typeof BATTLE_CONDITION_KEYS)[number], number> {
  const map = new Map<(typeof BATTLE_CONDITION_KEYS)[number], number>();
  if (!raw) return map;
  for (const key of BATTLE_CONDITION_KEYS) {
    const val = raw[key];
    if (val) map.set(key, val.turns);
  }
  return map;
}

function buildPokemonState(p: Pokemon, active: boolean, stages: BattleStages): HeuristicPokemonState {
  // AI-1 Fix: Check explicit fainted flag or hp === 0 when maxHp > 0.
  // Unrevealed enemy Pokemon with maxHp === 0 should NOT be marked as fainted!
  const fainted = p.fainted || (p.maxHp > 0 && p.hp <= 0);

  // heldItem or item (fallback for compatibility across test fixtures)
  const rawItem = p.heldItem || p.item;
  const heldItem = rawItem ? requireItemId(rawItem) : ''; // domain-ok
  const validMoves = (p.moves || []).filter((m): m is Move => Boolean(m));
  const moveInfos: HeuristicPokemonMove[] = validMoves.map(m => {
    const id = toID(m.id);
    return {
      id,
      name: m.name,
      type: m.type || 'normal',
      category: m.cat || 'physical',
      basePower: m.power || 0,
      accuracy: m.acc || 100,
      pp: m.pp,
      maxpp: m.maxPP,
      target: 'normal',
    };
  });
  const moveIds = moveInfos.map(m => m.id);

  return {
    name: p.nickname || p.name,
    species: toID(p.id ?? (() => { throw new Error(`[snapshotBuilder] Pokemon missing id: ${p.name}`); })()),
    level: p.level,
    hp: p.hp,
    maxhp: p.maxHp,
    hpPercent: p.maxHp > 0 ? (p.hp / p.maxHp) * 100 : 100, // AI-1 Fix: default 100% for unrevealed
    status: p.status ?? null,
    active,
    fainted,
    types: [p.type, ...(p.type2 ? [p.type2] : [])],
    baseStats: {
      hp: p.maxHp,
      atk: p.atk,
      def: p.def,
      spa: p.spa,
      spd: p.spd,
      spe: p.spe,
    },
    stats: {
      hp: p.maxHp,
      atk: p.atk,
      def: p.def,
      spa: p.spa,
      spd: p.spd,
      spe: p.spe,
    },
    moves: moveInfos,
    knownMoves: moveIds,
    // AI-12 Fix: prefer current ability over baseAbility if present
    ability: p.ability ? requireAbilityId(p.ability) : '', // domain-ok
    knownAbility: p.ability ? requireAbilityId(p.ability) : null,
    item: heldItem,
    knownItem: heldItem || null,
    // AI-11 Fix: itemConsumed should only be true if explicitly lost via volatile/log
    itemConsumed: Boolean(p.volatileCounters?.['itemconsumed'] || p.volatileCounters?.['enditem']),
    boosts: {
      atk: active ? (stages.atk ?? 0) : 0,
      def: active ? (stages.def ?? 0) : 0,
      spa: active ? (stages.spa ?? 0) : 0,
      spd: active ? (stages.spd ?? 0) : 0,
      spe: active ? (stages.spe ?? 0) : 0,
      accuracy: active ? (stages.acc ?? 0) : 0,
      evasion: active ? (stages.eva ?? 0) : 0,
    },
    volatiles: buildVolatiles(p),
  };
}

function buildVolatiles(p: Pokemon): Set<HeuristicVolatileKey> {
  const v = new Set<HeuristicVolatileKey>();
  if (p.confused) v.add('confusion');
  if (p.substitute) v.add('substitute');
  if (p.focusEnergy) v.add('focusenergy');
  if (p.protect || p.detect) v.add('protect');
  if (p.ingrain) v.add('ingrain');
  if (p.seeded) v.add('leechseed');
  if (p.mustRecharge) v.add('mustrecharge');
  if (p.tauntTurns) v.add('taunt');
  if (p.encoreTurns) v.add('encore');
  // AI-4 Fix: check trapped and maybeTrapped
  if (p.trapped || p.volatileCounters?.['maybetrapped'] || p.volatileCounters?.['trapped']) v.add('trapped');
  // AI-9 Fix: only mark choicelock if explicitly tracked in volatileCounters from move execution
  if (p.volatileCounters?.['choicelock']) {
    v.add('choicelock');
  }
  return v;
}

function buildField(battle: BattleState): HeuristicFieldState {
  const weather = battle.weather?.type ? toID(battle.weather.type) : null;
  return {
    weather: weather || null,
    terrain: null, // The project does not currently model terrain — extend when added
    trickRoom: false, // Extend when trick room is tracked in BattleState
    tailwind: { p1: 0, p2: 0 }, // Extend when tailwind is tracked in sideConditions
  };
}

// Re-export type for external use
export type { HeuristicBattleSnapshot };
