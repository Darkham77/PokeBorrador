// ============================================================
// Sack Order Calculator
// Adapted from external/pokemon-showdown-ai/src/strategy/sack-order.ts
// ============================================================

import { toID } from '@/logic/utils/strings.ts';
import type { HeuristicBattleSnapshot, SackOrderEntry, WinCondition, ThreatAssessment } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { SideID } from '@pkmn/sim';

const SACK_WEIGHT_WIN_CONDITION = 0.35;
const SACK_WEIGHT_DEFENSIVE_HP_QUALIFIER = 50;
const SACK_WEIGHT_DEFENSIVE_HIGH_HP_BONUS = 0.05;
const SACK_WEIGHT_DEFENSIVE_LOW_DAMAGE_THRESHOLD = 50;
const SACK_WEIGHT_DEFENSIVE_LOW_DAMAGE_BONUS = 0.075;
const SACK_WEIGHT_DEFENSIVE_MAX = 0.20;
const SACK_WEIGHT_SPEED_OUTSPEED_BONUS = 0.10;
const SACK_WEIGHT_SPEED_MOVE_BONUS = 0.05;
const SACK_WEIGHT_HAZARD_ACTIVE_BONUS = 0.15;
const SACK_WEIGHT_HAZARD_REMOVAL_BONUS = 0.05;
const SACK_WEIGHT_MATCHUP_MOVE_THRESHOLD = 30;
const SACK_WEIGHT_MATCHUP_BONUS_PER_POKEMON = 0.05;
const SACK_WEIGHT_MATCHUP_MAX = 0.15;

const HAZARD_REMOVAL_MOVES_LIST = [
  'rapidspin', 'defog', 'tidyup', 'courtchange', 'mortalspin',
] as const;
export const HAZARD_REMOVAL_MOVES: ReadonlySet<string> = new Set<string>(HAZARD_REMOVAL_MOVES_LIST); // runtime-set: Fast O(1) membership lookup set

const SPEED_CONTROL_MOVES_LIST = [
  'thunderwave', 'glaciate', 'icywind', 'stickyweb', 'tailwind',
  'trickroom', 'electroweb',
] as const;
const SPEED_CONTROL_MOVES: ReadonlySet<string> = new Set<string>(SPEED_CONTROL_MOVES_LIST); // runtime-set: Fast O(1) membership lookup set

type SnapshotPokemon = HeuristicBattleSnapshot['mySide']['pokemon'][number];

function calculateDefensiveUtil(
  pokemon: SnapshotPokemon,
  threats: ThreatAssessment[],
  oppAlive: SnapshotPokemon[],
  calc: HeuristicDamageCalculator,
  field: HeuristicBattleSnapshot['field']
): number {
  let defensiveUtil = pokemon.hpPercent > SACK_WEIGHT_DEFENSIVE_HP_QUALIFIER ? SACK_WEIGHT_DEFENSIVE_HIGH_HP_BONUS : 0;
  for (const threat of threats.slice(0, 2)) {
    const oppMon = oppAlive.find(o => o.name === threat.pokemon);
    if (oppMon) {
      let bestOppDmg = 0;
      for (const mv of oppMon.knownMoves) {
        try {
          bestOppDmg = Math.max(bestOppDmg, calc.calcDamage(oppMon, pokemon, mv, field).maxPercent);
        } catch { /* catch-ok: Hypothetical move exploration probe skip */ }
      }
      if (bestOppDmg < SACK_WEIGHT_DEFENSIVE_LOW_DAMAGE_THRESHOLD) defensiveUtil += SACK_WEIGHT_DEFENSIVE_LOW_DAMAGE_BONUS;
    }
  }
  return Math.min(SACK_WEIGHT_DEFENSIVE_MAX, defensiveUtil);
}

function calculateSpeedControl(
  pokemon: SnapshotPokemon,
  moveIds: string[],
  oppAlive: SnapshotPokemon[],
  calc: HeuristicDamageCalculator,
  snapshot: HeuristicBattleSnapshot,
  oppSide: SideID
): number {
  const oppFirstPoke = oppAlive[0];
  const oppFirstSpeed = oppFirstPoke !== undefined && oppAlive.length > 0
    ? calc.getEffectiveSpeed(oppFirstPoke, snapshot.field, oppSide) : 0;
  const mySpeed = calc.getEffectiveSpeed(pokemon, snapshot.field, snapshot.myPlayer);
  return (mySpeed > oppFirstSpeed ? SACK_WEIGHT_SPEED_OUTSPEED_BONUS : 0)
    + (moveIds.some((m: string) => SPEED_CONTROL_MOVES.has(m)) ? SACK_WEIGHT_SPEED_MOVE_BONUS : 0);
}

function calculateHazardValue(moveIds: string[], sideConditionsSize: number): number {
  const hasHazardRemoval = moveIds.some((m: string) => HAZARD_REMOVAL_MOVES.has(m));
  return hasHazardRemoval && sideConditionsSize > 0
    ? SACK_WEIGHT_HAZARD_ACTIVE_BONUS
    : hasHazardRemoval
      ? SACK_WEIGHT_HAZARD_REMOVAL_BONUS
      : 0;
}

function calculateMatchupScore(
  pokemon: SnapshotPokemon,
  oppAlive: SnapshotPokemon[],
  calc: HeuristicDamageCalculator,
  field: HeuristicBattleSnapshot['field']
): number {
  let matchupScore = 0;
  for (const opp of oppAlive) {
    for (const mv of pokemon.moves) {
      try {
        if (calc.calcDamage(pokemon, opp, mv.id, field).maxPercent > SACK_WEIGHT_MATCHUP_MOVE_THRESHOLD) {
          matchupScore += SACK_WEIGHT_MATCHUP_BONUS_PER_POKEMON;
          break;
        }
      } catch { /* catch-ok: Hypothetical move exploration probe skip */ }
    }
  }
  return Math.min(SACK_WEIGHT_MATCHUP_MAX, matchupScore);
}

function adjustTopWinConditionPosition(entries: SackOrderEntry[], winConditions: WinCondition[]): void {
  if (winConditions.length > 0 && entries.length > 1) {
    const topWC = winConditions[0]?.pokemon;
    const wcIdx = entries.findIndex(e => e.pokemon === topWC);
    if (wcIdx === 0) {
      const removed = entries.splice(wcIdx, 1);
      const wc = removed[0];
      if (wc !== undefined) {
        entries.splice(Math.max(entries.length - 1, 0), 0, wc);
      }
    }
  }
}

export function calculateSackOrder(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  winConditions: WinCondition[],
  threats: ThreatAssessment[],
): SackOrderEntry[] {
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  if (myAlive.length === 0) return [];

  const winCondMap = new Map<string, number>(winConditions.map(wc => [wc.pokemon, wc.score]));
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const entries: SackOrderEntry[] = [];

  for (const pokemon of myAlive) {
    const moveIds = pokemon.moves.map(m => toID(m));
    const winScore = (winCondMap.get(pokemon.name) ?? 0) * SACK_WEIGHT_WIN_CONDITION;
    const defensiveUtil = calculateDefensiveUtil(pokemon, threats, oppAlive, calc, snapshot.field);
    const speedControl = calculateSpeedControl(pokemon, moveIds, oppAlive, calc, snapshot, oppSide);
    const hazardValue = calculateHazardValue(moveIds, snapshot.mySide.sideConditions.size);
    const matchupScore = calculateMatchupScore(pokemon, oppAlive, calc, snapshot.field);

    entries.push({
      pokemon: pokemon.name,
      preservationScore: Math.min(1.0, winScore + defensiveUtil + speedControl + hazardValue + matchupScore)
    });
  }

  entries.sort((a, b) => a.preservationScore - b.preservationScore);
  adjustTopWinConditionPosition(entries, winConditions);

  return entries;
}
