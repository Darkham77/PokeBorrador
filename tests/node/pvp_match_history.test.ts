import { describe, it, expect } from 'vitest';
import { 
  appendPersonalMatchHistory, 
  MAX_PERSONAL_MATCH_HISTORY, 
  type PersonalPvPMatchSummary,
  requireBattleCode 
} from '@/types/battle/pvp';

describe('Personal Match History Logic', () => {
  const createMockMatch = (idx: number, result: 'victory' | 'defeat' = 'victory'): PersonalPvPMatchSummary => ({
    id: `match_${idx}`,
    battleCode: requireBattleCode(`BTL-TEST-${String(idx).padStart(3, '0')}`),
    opponentId: `opp_${idx}`,
    opponentName: `Trainer ${idx}`,
    opponentAvatar: '/assets/avatars/red.png',
    format: '3v3',
    isRanked: true,
    result,
    deltaElo: result === 'victory' ? 16 : -14,
    turnsCount: 8,
    timestamp: new Date().toISOString()
  });

  it('appends a match to an empty history', () => {
    const match = createMockMatch(1);
    const history = appendPersonalMatchHistory(undefined, match);
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe('match_1');
  });

  it('prepends new matches at the beginning (LIFO)', () => {
    let history: PersonalPvPMatchSummary[] = [];
    history = appendPersonalMatchHistory(history, createMockMatch(1));
    history = appendPersonalMatchHistory(history, createMockMatch(2));

    expect(history).toHaveLength(2);
    expect(history[0]!.id).toBe('match_2');
    expect(history[1]!.id).toBe('match_1');
  });

  it('caps history at MAX_PERSONAL_MATCH_HISTORY (20 items)', () => {
    let history: PersonalPvPMatchSummary[] = [];
    for (let i = 1; i <= 25; i++) {
      history = appendPersonalMatchHistory(history, createMockMatch(i));
    }

    expect(history).toHaveLength(MAX_PERSONAL_MATCH_HISTORY);
    expect(history[0]!.id).toBe('match_25');
    expect(history[MAX_PERSONAL_MATCH_HISTORY - 1]!.id).toBe('match_6');
  });

  it('deduplicates when appending a match with identical battleCode or id', () => {
    let history: PersonalPvPMatchSummary[] = [];
    const match1 = createMockMatch(1);
    history = appendPersonalMatchHistory(history, match1);
    history = appendPersonalMatchHistory(history, createMockMatch(2));
    history = appendPersonalMatchHistory(history, match1); // Re-append match1

    expect(history).toHaveLength(2);
    expect(history[0]!.id).toBe('match_1');
    expect(history[1]!.id).toBe('match_2');
  });
});
