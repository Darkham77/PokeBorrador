/**
 * src/logic/pvp/replayCodeGenerator.ts
 *
 * Generates and formats canonical BattleCode identifiers (BTL-XXXX-XXXX)
 * for PVP battle replays and spectator sharing.
 */

import {
  requireBattleCode,
  type BattleCode,
  type BattleReplayRecord,
  type ReplayCombatantSummary,
  type ReplayChoiceStep
} from '@/types/battle/pvp.ts';
import { isSeasonalThemeId } from '@/data/system/rankedData.ts';
import type { SideID } from '@pkmn/sim';

const BATTLE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PART_LENGTH = 4;

export function generateBattleCode(): BattleCode {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < PART_LENGTH; i++) {
    part1 += BATTLE_CODE_CHARS.charAt(Math.floor(Math.random() * BATTLE_CODE_CHARS.length));
    part2 += BATTLE_CODE_CHARS.charAt(Math.floor(Math.random() * BATTLE_CODE_CHARS.length));
  }
  return requireBattleCode(`BTL-${part1}-${part2}`);
}

export function formatBattleCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, ''); // domain-ok: Open dynamic text input normalization
  if (!cleaned.startsWith('BTL')) {
    if (cleaned.length <= PART_LENGTH) return cleaned;
    if (cleaned.length <= PART_LENGTH * 2) {
      return `${cleaned.slice(0, PART_LENGTH)}-${cleaned.slice(PART_LENGTH)}`;
    }
    return `${cleaned.slice(0, PART_LENGTH)}-${cleaned.slice(PART_LENGTH, PART_LENGTH * 2)}`;
  }

  const afterBtl = cleaned.slice(3);
  if (afterBtl.length <= PART_LENGTH) return `BTL-${afterBtl}`;
  return `BTL-${afterBtl.slice(0, PART_LENGTH)}-${afterBtl.slice(PART_LENGTH, PART_LENGTH * 2)}`;
}

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function parseBattleReplayRecord(data: unknown): BattleReplayRecord {
  const raw = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  const defaultCombatant: ReplayCombatantSummary = {
    userId: '',
    username: '',
    tier: 'bronce',
    elo: 1000,
    team: []
  };
  return {
    id: String(raw.id || ''),
    battleCode: requireBattleCode(String(raw.battle_code || raw.battleCode || 'BTL-0000-0000')),
    seasonId: String(raw.season_id || raw.seasonId || ''),
    themeId: isSeasonalThemeId(raw.theme_id) ? raw.theme_id : (isSeasonalThemeId(raw.themeId) ? raw.themeId : 'masters_allstars'),
    p1: parseJsonSafe(raw.p1_data, (raw.p1 as ReplayCombatantSummary) || defaultCombatant),
    p2: parseJsonSafe(raw.p2_data, (raw.p2 as ReplayCombatantSummary) || defaultCombatant),
    turnsCount: Number(raw.turns_count ?? raw.turnsCount ?? 0),
    winnerSide: (String(raw.winner_side || raw.winnerSide || 'p1') as SideID),
    choiceStream: parseJsonSafe(raw.choice_stream, (raw.choiceStream as ReplayChoiceStep[]) || []),
    initialSeed: parseJsonSafe(raw.initial_seed, (raw.initialSeed as [number, number, number, number]) || [0, 0, 0, 0]),
    isTop10Archived: Boolean(raw.is_top10_archived ?? raw.isTop10Archived),
    viewsCount: Number(raw.views_count ?? raw.viewsCount ?? 0),
    createdAt: String(raw.created_at || raw.createdAt || '')
  };
}
