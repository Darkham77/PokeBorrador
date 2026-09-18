import type { BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

export interface CombatReplayTeamMember {
  id: string;
  level: number;
  ability?: string;
  moves: string[];
  gender?: string | null;
  hp: number;
  maxHp: number;
  stats: {
    hp: number;
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
  };
}

export interface CombatReplayPayload {
  seed: number[];
  p1Team: CombatReplayTeamMember[];
  p2Team: CombatReplayTeamMember[];
  history: unknown[];
  logs: string[];
}

function serializeReplayTeam(team?: readonly Pokemon[] | null): CombatReplayTeamMember[] {
  if (!team) return [];
  return team.map((p: Pokemon) => ({
    id: p.id,
    level: p.level,
    ability: p.ability,
    moves: p.moves.map((m: { id?: string } | null) => m?.id || ''),
    gender: p.gender,
    hp: p.hp,
    maxHp: p.maxHp,
    stats: { hp: p.maxHp, atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe }
  }));
}

/**
 * Serializes the active battle state into a canonical combat replay payload
 * suitable for fuzzer reproduction tests and clipboard export.
 */
export function buildCombatReplayPayload(active: BattleState): CombatReplayPayload {
  return {
    seed: active.seed || [],
    p1Team: serializeReplayTeam(active.playerTeam),
    p2Team: serializeReplayTeam(active.enemyTeam),
    history: active.battleHistory || [],
    logs: active.rawShowdownLogs || []
  };
}
