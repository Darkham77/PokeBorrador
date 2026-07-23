// ============================================================
// Sack Order Calculator
// Adapted from external/pokemon-showdown-ai/src/strategy/sack-order.ts
// ============================================================

import type { HeuristicBattleSnapshot, SackOrderEntry, WinCondition, ThreatAssessment } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';

function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HAZARD_REMOVAL_MOVES = new Set([
  'rapidspin', 'defog', 'tidyup', 'courtchange', 'mortalspin',
]);

const SPEED_CONTROL_MOVES = new Set([
  'thunderwave', 'glaciate', 'icywind', 'stickyweb', 'tailwind',
  'trickroom', 'electroweb',
]);

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
    const moveIds = pokemon.moves.map(toId);

    // Win condition potential
    const winScore = (winCondMap.get(pokemon.name) ?? 0) * 0.35;

    // Defensive utility
    let defensiveUtil = pokemon.hpPercent > 50 ? 0.05 : 0;
    for (const threat of threats.slice(0, 2)) {
      const oppMon = oppAlive.find(o => o.name === threat.pokemon);
      if (oppMon) {
        let bestOppDmg = 0;
        for (const mv of oppMon.knownMoves) {
          try { bestOppDmg = Math.max(bestOppDmg, calc.calcDamage(oppMon, pokemon, mv, snapshot.field).maxPercent); } catch { /* skip */ }
        }
        if (bestOppDmg < 50) defensiveUtil += 0.075;
      }
    }
    defensiveUtil = Math.min(0.20, defensiveUtil);

    // Speed control value
    const oppFirstPoke = oppAlive[0];
    const oppFirstSpeed = oppFirstPoke !== undefined && oppAlive.length > 0
      ? calc.getEffectiveSpeed(oppFirstPoke, snapshot.field, oppSide) : 0;
    const mySpeed = calc.getEffectiveSpeed(pokemon, snapshot.field, snapshot.myPlayer);
    const speedControl = (mySpeed > oppFirstSpeed ? 0.10 : 0) + (moveIds.some(m => SPEED_CONTROL_MOVES.has(m)) ? 0.05 : 0);

    // Hazard removal value
    const hasHazardRemoval = moveIds.some(m => HAZARD_REMOVAL_MOVES.has(m));
    const hazardValue = hasHazardRemoval && snapshot.mySide.sideConditions.size > 0 ? 0.15 : hasHazardRemoval ? 0.05 : 0;

    // Matchup usefulness
    let matchupScore = 0;
    for (const opp of oppAlive) {
      for (const mv of pokemon.moves) {
        try {
          if (calc.calcDamage(pokemon, opp, mv, snapshot.field).maxPercent > 30) { matchupScore += 0.05; break; }
        } catch { /* skip */ }
      }
    }
    matchupScore = Math.min(0.15, matchupScore);

    entries.push({ pokemon: pokemon.name, preservationScore: Math.min(1.0, winScore + defensiveUtil + speedControl + hazardValue + matchupScore) });
  }

  entries.sort((a, b) => a.preservationScore - b.preservationScore);

  // Guard: the top win condition must not be first in sack order unless it's the last Pokémon
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

  return entries;
}
