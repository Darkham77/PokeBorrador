// ============================================================
// Heuristic Decision Engine — 9-layer rule-based AI
// Adapted from external/pokemon-showdown-ai/src/heuristics/engine.ts
// BattleState dependency removed — uses snapshot + isTrapped flag
// ============================================================

import { toID } from '@pkmn/sim';
import type {
  HeuristicBattleSnapshot,
  HeuristicPokemonState,
  HeuristicMoveInfo,
  HeuristicDecision,
  DamageMatchup,
  StrategicState,
} from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';

const HAZARD_REMOVAL_MOVES = ['rapidspin', 'defog', 'tidyup', 'courtchange', 'mortalspin'] as const;

const SETUP_MOVES = [
  'swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance',
  'shellsmash', 'bulkup', 'bellydrum', 'coil', 'shiftgear', 'workup',
] as const;

const HAZARD_MOVES = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'] as const;

const PIVOT_MOVES = ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport'] as const;

/** Full 9-layer heuristic decision. Returns null if no layer fires confidently. */
export function heuristicDecision(
  snapshot: HeuristicBattleSnapshot,
  matchup: DamageMatchup,
  strategic: StrategicState,
  availableMoves: HeuristicMoveInfo[],
  switchOptions: HeuristicPokemonState[],
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  isTrapped: boolean,
): HeuristicDecision | null {
  const myActive = snapshot.mySide.activePokemon;
  const oppActive = snapshot.opponentSide.activePokemon;
  if (!myActive || !oppActive) return null;

  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const mySpeed = calc.getEffectiveSpeed(myActive, snapshot.field, snapshot.myPlayer);
  const oppSpeed = calc.getEffectiveSpeed(oppActive, snapshot.field, oppSide);
  const iOutspeed = mySpeed > oppSpeed;

  // ═══════════════════════════════════════
  // 3. Priority KO (always first — bypasses speed)
  // ═══════════════════════════════════════
  const priorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > 0);
  if (priorityKO) {
    const oppPriorityKO = matchup.oppAttacking.find(d => d.isOHKO && d.priority > 0);
    const oppOutprioritizes = oppPriorityKO !== undefined && (
      oppPriorityKO.priority > priorityKO.priority ||
      (oppPriorityKO.priority === priorityKO.priority && oppSpeed > mySpeed)
    );
    if (!oppOutprioritizes) {
      const moveIdx = findMoveIndex(availableMoves, priorityKO.move);
      if (moveIdx !== -1) {
        return {
          type: 'move', moveId: priorityKO.move, moveIndex: moveIdx + 1,
          source: 'heuristic', confidence: 0.93,
          reasoning: `Priority KO on ${oppActive.name} at ${oppActive.hpPercent.toFixed(0)}%`,
        };
      }
    }
  }

  // ═══════════════════════════════════════
  // 4. Guaranteed OHKO (with speed awareness)
  // ═══════════════════════════════════════
  const guaranteedKO = matchup.myAttacking.find(d => d.isOHKO);
  if (guaranteedKO) {
    const theyCanKOFirst = !iOutspeed && matchup.oppAttacking.some(d => d.isOHKO);
    if (!theyCanKOFirst) {
      const moveIdx = findMoveIndex(availableMoves, guaranteedKO.move);
      if (moveIdx !== -1) {
        return {
          type: 'move', moveId: guaranteedKO.move, moveIndex: moveIdx + 1,
          source: 'heuristic', confidence: 0.95,
          reasoning: `Guaranteed OHKO with ${guaranteedKO.move} (${guaranteedKO.minPercent.toFixed(0)}-${guaranteedKO.maxPercent.toFixed(0)}%)`,
        };
      }
    } else if (priorityKO) {
      const moveIdx = findMoveIndex(availableMoves, priorityKO.move);
      if (moveIdx !== -1) {
        return {
          type: 'move', moveId: priorityKO.move, moveIndex: moveIdx + 1,
          source: 'heuristic', confidence: 0.88,
          reasoning: 'Priority KO — opponent outspeeds and threatens KO',
        };
      }
    }
  }

  // ═══════════════════════════════════════
  // 5. About to be KO'd — priority or switch
  // ═══════════════════════════════════════
  const theyCanKO = matchup.oppAttacking.find(d => d.isOHKO);
  if (theyCanKO) {
    const ourPriorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > 0);
    if (ourPriorityKO !== undefined) {
      const moveIdx = findMoveIndex(availableMoves, ourPriorityKO.move);
      if (moveIdx !== -1) {
        return {
          type: 'move', moveId: ourPriorityKO.move, moveIndex: moveIdx + 1,
          source: 'heuristic', confidence: 0.88,
          reasoning: 'Priority KO before we go down',
        };
      }
    }
    const isWinCondition = strategic.winConditions.length > 0 &&
      strategic.winConditions[0]?.pokemon === myActive.name &&
      (strategic.winConditions[0]?.score ?? 0) > 0.5;
    if (isWinCondition && switchOptions.length > 0 && !isTrapped) {
      return pickBestSwitch(snapshot, switchOptions, strategic, calc, inference, oppActive);
    }
  }

  // ═══════════════════════════════════════
  // 6a. Hazard removal — only when hazards threaten win conditions
  // ═══════════════════════════════════════
  if (snapshot.mySide.sideConditions.size > 0) {
    const removalMove = availableMoves.find(m => (HAZARD_REMOVAL_MOVES as readonly string[]).includes(toID(m.id)));
    if (removalMove && myActive.hpPercent > 40 && !guaranteedKO) {
      if (hazardsThreatenTeam(snapshot, strategic)) {
        const moveIdx = findMoveIndex(availableMoves, removalMove.id);
        if (moveIdx !== -1) {
          return {
            type: 'move', moveId: removalMove.id, moveIndex: moveIdx + 1,
            source: 'heuristic', confidence: 0.75,
            reasoning: 'Remove hazards threatening win condition',
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 6b. Set up hazards when safe
  // ═══════════════════════════════════════
  if (!snapshot.opponentSide.sideConditions.has('stealthrock') && myActive.hpPercent > 60) {
    const hazardMove = availableMoves.find(m => (HAZARD_MOVES as readonly string[]).includes(toID(m.id)));
    if (hazardMove) {
      const worstOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
      if (worstOppDmg < 50) {
        const moveIdx = findMoveIndex(availableMoves, hazardMove.id);
        if (moveIdx !== -1) {
          return {
            type: 'move', moveId: hazardMove.id, moveIndex: moveIdx + 1,
            source: 'heuristic', confidence: 0.70,
            reasoning: 'Set up hazards',
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 7. Setup opportunity
  // ═══════════════════════════════════════
  const setupMove = availableMoves.find(m => (SETUP_MOVES as readonly string[]).includes(toID(m.id)));
  if (setupMove && myActive.hpPercent > 60) {
    const worstOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
    const isWinCond = strategic.winConditions.length > 0 &&
      strategic.winConditions[0]?.pokemon === myActive.name;
    const oppLocked = oppActive.volatiles.has('choicelock') || oppActive.volatiles.has('mustrecharge');
    const oppCantThreaten = worstOppDmg < 45;
    const oppLowHp = oppActive.hpPercent < 25;
    const isSafe = oppCantThreaten || oppLocked || (iOutspeed && oppLowHp);
    if (isSafe && isWinCond) {
      const moveIdx = findMoveIndex(availableMoves, setupMove.id);
      if (moveIdx !== -1) {
        const reason = oppLocked ? 'opponent locked' : oppLowHp ? 'opponent likely switching' : 'opponent can\'t threaten';
        return {
          type: 'move', moveId: setupMove.id, moveIndex: moveIdx + 1,
          source: 'heuristic', confidence: 0.80,
          reasoning: `Safe setup: ${reason}`,
        };
      }
    }
  }

  // ═══════════════════════════════════════
  // 8a. Pivot — U-turn / Volt Switch when matchup is unfavorable
  // ═══════════════════════════════════════
  if (!isTrapped && switchOptions.length > 0) {
    const pivotMove = availableMoves.find(m => (PIVOT_MOVES as readonly string[]).includes(toID(m.id)));
    if (pivotMove) {
      const bestOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
      const bestMyDmg = matchup.myAttacking[0]?.maxPercent ?? 0;
      if (bestOppDmg > 35 && bestMyDmg < 40 && myActive.hpPercent > 30) {
        const moveIdx = findMoveIndex(availableMoves, pivotMove.id);
        if (moveIdx !== -1) {
          return {
            type: 'move', moveId: pivotMove.id, moveIndex: moveIdx + 1,
            source: 'heuristic', confidence: 0.72,
            reasoning: `Pivot with ${pivotMove.id} — unfavorable matchup`,
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 8b. Best available move (high-damage matchup)
  // ═══════════════════════════════════════
  if (matchup.myAttacking.length > 0) {
    const bestMove = matchup.myAttacking[0];
    if (bestMove !== undefined && bestMove.maxPercent > 40) {
      const moveIdx = findMoveIndex(availableMoves, bestMove.move);
      if (moveIdx !== -1) {
        const shouldSwitch = !isTrapped && shouldConsiderSwitching(matchup, strategic, switchOptions, snapshot.mySide.activePokemon);
        if (!shouldSwitch) {
          return {
            type: 'move', moveId: bestMove.move, moveIndex: moveIdx + 1,
            source: 'heuristic', confidence: 0.70,
            reasoning: `Best damage: ${bestMove.move} (${bestMove.minPercent.toFixed(0)}-${bestMove.maxPercent.toFixed(0)}%)`,
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 9. Bad matchup — switch out
  // ═══════════════════════════════════════
  if (!isTrapped && switchOptions.length > 0) {
    const bestOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
    const bestMyDmg = matchup.myAttacking[0]?.maxPercent ?? 0;
    if (bestOppDmg > 50 && bestMyDmg < 25) {
      const sw = pickBestSwitch(snapshot, switchOptions, strategic, calc, inference, oppActive);
      if (sw) return sw;
    }
  }

  return null; // No confident heuristic fired
}

// ────────────────────────────────────────
// Switch scorer (used by layers 5, 9)
// ────────────────────────────────────────

export function pickBestSwitch(
  snapshot: HeuristicBattleSnapshot,
  options: HeuristicPokemonState[],
  strategic: StrategicState,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  oppActive: HeuristicPokemonState,
): HeuristicDecision | null {
  if (options.length === 0) return null;

  const scored = options.map(pokemon => {
    let score = 0;
    const oppMoves = [...oppActive.knownMoves];
    for (const { move } of inference.getLikelyUnrevealed(oppActive.species, 0.3)) oppMoves.push(move);

    let worstDmg = 0;
    for (const mv of oppMoves) {
      try { worstDmg = Math.max(worstDmg, calc.calcDamage(oppActive, pokemon, mv, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    score += (100 - worstDmg) / 100 * 0.40;

    let bestMyDmg = 0;
    for (const mv of pokemon.moves) {
      try { bestMyDmg = Math.max(bestMyDmg, calc.calcDamage(pokemon, oppActive, mv, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    score += (bestMyDmg / 100) * 0.25;

    const sackEntry = strategic.sackOrder.find(s => s.pokemon === pokemon.name);
    score += (1 - (sackEntry?.preservationScore ?? 0.5)) * 0.15;
    score += (pokemon.hpPercent / 100) * 0.20;

    return { pokemon, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  const switchTeamIndex = snapshot.mySide.pokemon.findIndex(p => p.species === best.pokemon.species);

  return {
    type: 'switch',
    switchTeamIndex: switchTeamIndex >= 0 ? switchTeamIndex : 0,
    source: 'heuristic',
    confidence: 0.75,
    reasoning: `Best switch-in: ${best.pokemon.name} (score ${best.score.toFixed(2)})`,
  };
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function findMoveIndex(moves: HeuristicMoveInfo[], moveId: string): number {
  return moves.findIndex(m => toID(m.id) === toID(moveId) && !m.disabled && m.pp > 0);
}

function hazardsThreatenTeam(snapshot: HeuristicBattleSnapshot, strategic: StrategicState): boolean {
  const hazards = snapshot.mySide.sideConditions;
  if (hazards.size === 0) return false;
  const hasRocks = hazards.has('stealthrock');
  const spikeLayers = hazards.get('spikes') ?? 0;
  const tSpikeLayers = hazards.get('toxicspikes') ?? 0;
  const bench = snapshot.mySide.pokemon.filter(p => !p.fainted && !p.active);
  if (bench.length === 0) return false;

  const topWC = strategic.winConditions[0];
  if (topWC) {
    const wcPoke = bench.find(p => p.name === topWC.pokemon);
    if (wcPoke && wcPoke.hpPercent - ((hasRocks ? 12.5 : 0) + spikeLayers * 8.3) < 60) return true;
  }

  let threatened = 0;
  for (const p of bench) {
    if ((hasRocks ? 12.5 : 0) + spikeLayers * 8.3 > 10 && p.hpPercent < 70) threatened++;
  }
  if (threatened >= 2) return true;
  if (tSpikeLayers > 0 && bench.filter(p => p.status === null).length >= 2) return true;
  return false;
}

function shouldConsiderSwitching(
  matchup: DamageMatchup,
  strategic: StrategicState,
  switchOptions: HeuristicPokemonState[],
  myActive: HeuristicPokemonState | null,
): boolean {
  if (switchOptions.length === 0 || !myActive) return false;
  const bestOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
  const bestMyDmg = matchup.myAttacking[0]?.maxPercent ?? 0;
  if (bestMyDmg > 50 && bestOppDmg < 60) return false;
  if (myActive.boosts.atk > 0 || myActive.boosts.spa > 0 || myActive.boosts.spe > 0) return false;
  if (bestOppDmg > 55 && bestMyDmg < 30) return true;
   
  void strategic; // available for future extensions
  return false;
}
