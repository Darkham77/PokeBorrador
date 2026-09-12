import { isAllowedRankGap } from '@/logic/pvp/rankedEngine.ts';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';
import { logger } from '@/logic/utils/logger.ts';
import type { ShowdownPlayerRequest } from '@/types/battle/battle.ts';
import type { PvPAction } from '@/types/battle/pvp.ts';
import type { DBRouter } from '@/logic/db/dbRouter.ts';
import { evaluatePokemonForSeason } from '@/logic/pvp/seasonTeamFilter.ts';
import { deserializePokemonTeam } from '@/logic/auth/saveSerializer.ts';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { GenderId } from '@/types/system/game';

export interface PassiveTeamCandidate {
  user_id: string;
  elo_rating: number;
  team_data: string | unknown[];
  is_active?: boolean;
  trainer_name?: string;
  player_class?: string;
}

/**
 * Computes the next action for an offline passive enemy using Showdown request state.
 */
export function computePassiveEnemyChoice(p2Req: ShowdownPlayerRequest | undefined): PvPAction | null {
  if (p2Req?.forceSwitch?.[0]) {
    const sidePoke = p2Req.side?.pokemon || [];
    const benchIndex = sidePoke.findIndex(p => !p.active && !p.condition?.endsWith('fnt'));
    if (benchIndex !== -1) {
      return { type: 'switch', switchIndex: benchIndex, choiceString: `switch ${benchIndex + 1}` };
    }
    return null;
  }

  const activeMoves = p2Req?.active?.[0]?.moves || [];
  const validMoves = activeMoves.filter(m => !m.disabled);
  if (validMoves.length > 0 && validMoves[0]) {
    const move = validMoves[0];
    const moveIdx = activeMoves.indexOf(move);
    return { type: 'move', moveIndex: moveIdx, choiceString: `move ${moveIdx + 1}` };
  }

  return { type: 'move', moveIndex: 0, choiceString: 'move 1' };
}

/**
 * Selects a suitable passive defense opponent from a list of candidates
 * based on ELO proximity and allowed rank tier gap.
 */
export function selectPassiveOpponent(
  candidates: PassiveTeamCandidate[],
  myElo: number,
  myUserUid: string,
  topPoolSize: number = 3,
  maxTierGap: number = 1
): PassiveTeamCandidate | null {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const eligible = candidates.filter((c) => {
    if (!c || !c.user_id) return false;
    if (c.user_id === myUserUid) return false;
    return isAllowedRankGap(myElo, c.elo_rating, maxTierGap);
  });

  if (eligible.length === 0) {
    return null;
  }

  // Sort by closest distance to myElo
  const sorted = [...eligible].sort((a, b) => {
    const distA = Math.abs(a.elo_rating - myElo);
    const distB = Math.abs(b.elo_rating - myElo);
    return distA - distB;
  });

  // Pick from the top pool for deterministic fairness with slight variance
  const pool = sorted.slice(0, Math.max(1, Math.min(topPoolSize, sorted.length)));
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? pool[0] ?? null;
}

/**
 * Parses and deserializes a team snapshot from the passive_teams database table,
 * reusing the canonical 1:1 save deserialization format.
 */
export function parsePassiveTeamSnapshot(rawTeamData: unknown): Pokemon[] {
  return deserializePokemonTeam(rawTeamData);
}

export interface PassiveFallbackResult {
  opponentId: string;
  opponentName: string;
  opponentElo: number;
  enemyTeam: Pokemon[];
  opponentClass?: PlayerClassId;
  opponentGender?: GenderId;
}

/**
 * Executes query and candidate selection for fallback to passive defense.
 */
export async function executePassiveMatchmakingFallback(params: {
  db: DBRouter | null;
  userUid: string;
  myElo: number;
  seasonRules?: Record<string, unknown> | null;
  notify: (msg: string, icon?: string) => void;
}): Promise<PassiveFallbackResult | null> {
  const { db, userUid, myElo, seasonRules, notify } = params;
  if (!db || !userUid) return null;

  try {
    const res = await db
      .from('passive_teams')
      .select('*')
      .eq('is_active', true);
    const candidates = (res?.data || []) as PassiveTeamCandidate[];

    // Filter candidates by current active season rules, validity, and prune stale/corrupted teams
    const validCandidates: PassiveTeamCandidate[] = [];
    for (const candidate of candidates) {
      if (!candidate || !candidate.team_data) continue;
      const team = parsePassiveTeamSnapshot(candidate.team_data);
      if (team.length === 0) continue;

      // Validate that every combatant has required battle properties (species id, ability, valid moves)
      const hasCorruptPokemon = team.some(p => !p.id || !p.ability || !Array.isArray(p.moves) || p.moves.length === 0);
      if (hasCorruptPokemon) {
        if (candidate.user_id) {
          void db.from('passive_teams').update({ is_active: false }).eq('user_id', candidate.user_id);
        }
        continue;
      }

      if (seasonRules) {
        const hasIneligible = team.some(p => !evaluatePokemonForSeason(p, seasonRules).eligible);
        if (hasIneligible) {
          if (candidate.user_id) {
            void db.from('passive_teams').update({ is_active: false }).eq('user_id', candidate.user_id);
          }
          continue;
        }
      }
      validCandidates.push(candidate);
    }

    const selected = selectPassiveOpponent(validCandidates, myElo, userUid);
    if (!selected) {
      notify('No hay jugadores disponibles en la arena ranked en este momento. Por favor, intenta más tarde.', '🛡️');
      return null;
    }

    const enemyTeam = parsePassiveTeamSnapshot(selected.team_data);
    if (enemyTeam.length === 0) {
      notify('Error al cargar la alineación del rival pasivo.', '⚠️');
      return null;
    }

    let defenderName = 'Entrenador Pasivo';
    let defenderClass: PlayerClassId | undefined;
    let defenderGender: GenderId | undefined;
    try {
      const profileRes = await db
        .from('profiles')
        .select('username, player_class, gender')
        .eq('id', selected.user_id)
        .maybeSingle();
      const profile = profileRes?.data as {
        username?: string;
        player_class?: PlayerClassId;
        gender?: GenderId;
      } | null;
      if (profile?.username) {
        defenderName = profile.username;
      }
      if (profile?.player_class) {
        defenderClass = profile.player_class;
      }
      if (profile?.gender) {
        defenderGender = profile.gender;
      }
    } catch {
      // Keep default
    }

    const opponentElo = selected.elo_rating || 1000;
    return {
      opponentId: selected.user_id,
      opponentName: defenderName,
      opponentElo,
      enemyTeam,
      opponentClass: defenderClass,
      opponentGender: defenderGender
    };
  } catch (err) {
    logger.error('PassiveMatchmaking', `Error in executePassiveMatchmakingFallback: ${(err as Error).message}`);
    notify('Error al iniciar batalla pasiva.', '⚠️');
    return null;
  }
}
