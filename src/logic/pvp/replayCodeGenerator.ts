/**
 * src/logic/pvp/replayCodeGenerator.ts
 *
 * Generates and formats canonical BattleCode identifiers (BTL-XXXX-XXXX)
 * for PVP battle replays and spectator sharing.
 */

import { requireBattleCode, type BattleCode } from '@/types/battle/pvp.ts';

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
