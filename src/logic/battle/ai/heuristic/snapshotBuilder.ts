// ============================================================
// Snapshot Builder — adapts BattleContext → HeuristicBattleSnapshot
// Reads playerRequest / enemyRequest + activeBattle from BattleContext
// Zero-Fallback: throws if critical state is unavailable
// ============================================================

import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import type { Pokemon, PokemonStatus } from '@/types/pokemon/pokemon';
import type { HeuristicBattleSnapshot, HeuristicPokemonState, HeuristicSideState, HeuristicFieldState } from './types.ts';

function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

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

function buildSide(
  id: 'p1' | 'p2',
  team: Pokemon[],
  stages: BattleStages,
  activePoke: Pokemon | null | undefined,
  sideConditionsRaw: Record<string, { turns: number; [key: string]: unknown }> | undefined,
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
  raw: Record<string, { turns: number; [key: string]: unknown }> | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!raw) return map;
  for (const [key, val] of Object.entries(raw)) {
    map.set(toId(key), typeof val === 'object' && val !== null ? (val.turns ?? 1) : 1);
  }
  return map;
}

function buildPokemonState(p: Pokemon, active: boolean, stages: BattleStages): HeuristicPokemonState {
  const fainted = p.hp <= 0;

  // heldItem is the canonical field — never read the deprecated `item`
  const heldItem = p.heldItem ?? '';

  return {
    name: p.nickname || p.name,
    species: toId(p.id ?? (() => { throw new Error(`[snapshotBuilder] Pokemon missing id: ${p.name}`); })()),
    level: p.level,
    hp: p.hp,
    maxHp: p.maxHp,
    hpPercent: p.maxHp > 0 ? (p.hp / p.maxHp) * 100 : 0,
    status: p.status as PokemonStatus,
    active,
    fainted,
    stats: {
      hp: p.maxHp,
      atk: p.atk,
      def: p.def,
      spa: p.spa,
      spd: p.spd,
      spe: p.spe,
    },
    moves: p.moves.filter(Boolean).map(m => toId(m!.id || m!.name)),
    // For the enemy, all moves are "revealed" in our game (trainer has fixed team)
    // knownMoves tracks what the engine has seen — start with all known moves
    knownMoves: p.moves.filter(Boolean).map(m => toId(m!.id || m!.name)),
    ability: toId(p.ability ?? ''),
    knownAbility: p.ability ? toId(p.ability) : null,
    item: heldItem ? toId(heldItem) : '',
    knownItem: heldItem ? toId(heldItem) : null,
    // If item field is empty and not fainted, the item may have been consumed (e.g., berry)
    itemConsumed: !heldItem && !fainted && active,
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

function buildVolatiles(p: Pokemon): Set<string> {
  const v = new Set<string>();
  if (p.confused) v.add('confusion');
  if (p.substitute) v.add('substitute');
  if (p.focusEnergy) v.add('focusenergy');
  if (p.protect || p.detect) v.add('protect');
  if (p.ingrain) v.add('ingrain');
  if (p.seeded) v.add('leechseed');
  if (p.mustRecharge) v.add('mustrecharge');
  if (p.tauntTurns) v.add('taunt');
  if (p.encoreTurns) v.add('encore');
  if (p.trapped) v.add('trapped');
  // Choice lock detection: if heldItem is a choice item, treat as choicelock when active
  if (p.heldItem && ['choiceband', 'choicescarf', 'choicespecs'].includes(toId(p.heldItem))) {
    v.add('choicelock');
  }
  return v;
}

function buildField(battle: BattleState): HeuristicFieldState {
  const weather = battle.weather?.type ? toId(battle.weather.type) : null;
  return {
    weather: weather || null,
    terrain: null, // The project does not currently model terrain — extend when added
    trickRoom: false, // Extend when trick room is tracked in BattleState
    tailwind: { p1: 0, p2: 0 }, // Extend when tailwind is tracked in sideConditions
  };
}

// Re-export type for external use
export type { HeuristicBattleSnapshot };
