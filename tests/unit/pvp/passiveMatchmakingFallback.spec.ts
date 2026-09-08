import { describe, it, expect } from 'vitest';
import {
  selectPassiveOpponent,
  parsePassiveTeamSnapshot,
  computePassiveEnemyChoice,
  type PassiveTeamCandidate
} from '@/logic/pvp/passiveMatchmakingHelper';

describe('passiveMatchmakingHelper', () => {
  describe('selectPassiveOpponent', () => {
    const mockCandidates: PassiveTeamCandidate[] = [
      { user_id: 'user_1', elo_rating: 1050, team_data: JSON.stringify([{ id: 'pikachu', name: 'Pikachu', level: 50 }]) },
      { user_id: 'user_2', elo_rating: 1250, team_data: JSON.stringify([{ id: 'charizard', name: 'Charizard', level: 50 }]) },
      { user_id: 'user_3', elo_rating: 1800, team_data: JSON.stringify([{ id: 'blastoise', name: 'Blastoise', level: 50 }]) },
      { user_id: 'user_4', elo_rating: 3500, team_data: JSON.stringify([{ id: 'mewtwo', name: 'Mewtwo', level: 100 }]) },
      { user_id: 'self_user', elo_rating: 1000, team_data: JSON.stringify([{ id: 'bulbasaur', name: 'Bulbasaur', level: 50 }]) }
    ];

    it('excludes self from candidate selection', () => {
      const selected = selectPassiveOpponent(mockCandidates, 1000, 'self_user');
      expect(selected).not.toBeNull();
      expect(selected?.user_id).not.toBe('self_user');
    });

    it('picks candidates within the allowed rank tier gap (maxGap = 1)', () => {
      // My ELO is 1000 (Bronce). Allowed tiers: Bronce (0-1199) and Plata (1200-1599).
      // user_3 is Oro (1800) -> gap = 2 (denied).
      // user_4 is Maestro (3500) -> gap = 5 (denied).
      const selected = selectPassiveOpponent(mockCandidates, 1000, 'self_user');
      expect(selected).not.toBeNull();
      expect(['user_1', 'user_2']).toContain(selected?.user_id);
    });

    it('prefers candidates closest in ELO distance', () => {
      // My ELO is 1020. user_1 is 1050 (distance 30), user_2 is 1250 (distance 230).
      const selected = selectPassiveOpponent(mockCandidates, 1020, 'self_user', 1);
      expect(selected?.user_id).toBe('user_1');
    });

    it('returns null if no candidates are available or eligible', () => {
      const emptySelected = selectPassiveOpponent([], 1000, 'self_user');
      expect(emptySelected).toBeNull();

      const onlyFarCandidates: PassiveTeamCandidate[] = [
        { user_id: 'master_1', elo_rating: 3500, team_data: '[]' }
      ];
      const farSelected = selectPassiveOpponent(onlyFarCandidates, 1000, 'self_user');
      expect(farSelected).toBeNull();
    });
  });

  describe('parsePassiveTeamSnapshot', () => {
    it('deserializes JSON string into hydrated battle-ready Pokemon array', () => {
      const rawSnapshot = JSON.stringify([
        { id: 'pikachu', name: 'Pikachu', level: 50, maxHp: 120, hp: 10, type: 'electric' },
        { id: 'raichu', name: 'Raichu', level: 50, maxHp: 150, hp: 0, type: 'electric' }
      ]);

      const team = parsePassiveTeamSnapshot(rawSnapshot);
      expect(team).toHaveLength(2);
      // All Pokemon should enter combat fully restored to maxHp and status-free
      expect(team[0]?.hp).toBe(120);
      expect(team[0]?.status).toBe('');
      expect(team[1]?.hp).toBe(150);
      expect(team[1]?.status).toBe('');
    });

    it('handles already parsed arrays gracefully', () => {
      const arraySnapshot = [
        { id: 'eevee', name: 'Eevee', level: 25, maxHp: 80, hp: 80, type: 'normal' }
      ];

      const team = parsePassiveTeamSnapshot(arraySnapshot);
      expect(team).toHaveLength(1);
      expect(team[0]?.id).toBe('eevee');
    });

    it('returns empty array on invalid JSON or null input', () => {
      expect(parsePassiveTeamSnapshot(null)).toEqual([]);
      expect(parsePassiveTeamSnapshot('invalid json')).toEqual([]);
    });
  });

  describe('computePassiveEnemyChoice', () => {
    it('chooses the first available non-disabled attack move for normal turns', () => {
      const p2Req = {
        active: [
          {
            moves: [
              { move: 'Tackle', id: 'tackle', pp: 0, maxpp: 35, disabled: true },
              { move: 'Thunderbolt', id: 'thunderbolt', pp: 15, maxpp: 15, disabled: false }
            ]
          }
        ]
      };

      const choice = computePassiveEnemyChoice(p2Req as any);
      expect(choice).not.toBeNull();
      expect(choice?.type).toBe('move');
      expect(choice?.moveIndex).toBe(1);
      expect(choice?.choiceString).toBe('move 2');
    });

    it('chooses the first valid non-fainted bench Pokemon for forced switch turns', () => {
      const p2Req = {
        forceSwitch: [true],
        side: {
          pokemon: [
            { ident: 'p2: Pikachu', active: true, condition: '0 fnt', fainted: true },
            { ident: 'p2: Charizard', active: false, condition: '100/100', fainted: false }
          ]
        }
      };

      const choice = computePassiveEnemyChoice(p2Req as any);
      expect(choice).not.toBeNull();
      expect(choice?.type).toBe('switch');
      expect(choice?.switchIndex).toBe(1);
      expect(choice?.choiceString).toBe('switch 2');
    });

    it('falls back to move 1 or null when request is undefined or no moves available', () => {
      expect(computePassiveEnemyChoice(undefined)).toEqual({ type: 'move', moveIndex: 0, choiceString: 'move 1' });
      expect(computePassiveEnemyChoice({ forceSwitch: [true], side: { pokemon: [] } } as any)).toBeNull();
    });
  });
});
