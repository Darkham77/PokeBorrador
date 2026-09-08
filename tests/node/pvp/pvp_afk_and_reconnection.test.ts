import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  determineLegalAutoPick,
  saveActivePvPSession,
  getActivePvPSession,
  clearActivePvPSession,
  PVP_ACTIVE_MATCH_STORAGE_KEY
} from '@/logic/pvp/pvpReconnectHelper';
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';

describe('PvP AFK Timeout & Reconnection Helpers', () => {
  describe('determineLegalAutoPick', () => {
    it('selects first living bench Pokémon when forced switch is active', () => {
      const request: ShowdownPlayerRequest = {
        forceSwitch: [true],
        side: {
          pokemon: [
            { ident: 'p1: Gengar', details: '', condition: '0 fnt', active: true },
            { ident: 'p1: Snorlax', details: '', condition: '100/100', active: false },
            { ident: 'p1: Alakazam', details: '', condition: '100/100', active: false }
          ]
        }
      };

      const pick = determineLegalAutoPick(request);
      expect(pick.type).toBe('switch');
      expect(pick.switchIndex).toBe(1); // Snorlax is at index 1
      expect(pick.choiceString).toBe('switch 2');
    });

    it('skips fainted bench Pokémon on forced switch', () => {
      const request: ShowdownPlayerRequest = {
        forceSwitch: [true],
        side: {
          pokemon: [
            { ident: 'p1: Gengar', details: '', condition: '0 fnt', active: true },
            { ident: 'p1: Snorlax', details: '', condition: '0 fnt', active: false },
            { ident: 'p1: Alakazam', details: '', condition: '50/100', active: false }
          ]
        }
      };

      const pick = determineLegalAutoPick(request);
      expect(pick.type).toBe('switch');
      expect(pick.switchIndex).toBe(2); // Alakazam is at index 2
      expect(pick.choiceString).toBe('switch 3');
    });

    it('selects first legal move with PP > 0 and not disabled in normal turns', () => {
      const request: ShowdownPlayerRequest = {
        active: [
          {
            moves: [
              { move: 'Tackle', disabled: false, pp: 35 },
              { move: 'Thunderbolt', disabled: false, pp: 15 }
            ]
          }
        ]
      };

      const pick = determineLegalAutoPick(request);
      expect(pick.type).toBe('move');
      expect(pick.moveIndex).toBe(0);
      expect(pick.choiceString).toBe('move 1');
    });

    it('skips disabled or 0-PP moves to select a valid legal move', () => {
      const request: ShowdownPlayerRequest = {
        active: [
          {
            moves: [
              { move: 'Hyper Beam', disabled: true, pp: 0 },
              { move: 'Thunder Wave', disabled: false, pp: 0 },
              { move: 'Surf', disabled: false, pp: 15 }
            ]
          }
        ]
      };

      const pick = determineLegalAutoPick(request);
      expect(pick.type).toBe('move');
      expect(pick.moveIndex).toBe(2); // Surf is at index 2
      expect(pick.choiceString).toBe('move 3');
    });

    it('falls back safely to default move 1 if request is undefined', () => {
      const pick = determineLegalAutoPick(undefined);
      expect(pick.type).toBe('move');
      expect(pick.moveIndex).toBe(0);
      expect(pick.choiceString).toBe('move 1');
    });
  });

  describe('PvPTimerManager 2-Strike Lifecycle', () => {
    it('triggers Strike 1 on first turn timeout (isForfeit: false)', () => {
      let timeoutStrikes = 0;
      let timeoutForfeit = false;

      const timer = new PvPTimerManager({
        onTurnTimeout: (strikes, isForfeit) => {
          timeoutStrikes = strikes;
          timeoutForfeit = isForfeit;
        }
      });

      expect(timer.state.afkStrikes).toBe(0);

      // Trigger first timeout
      timer.handleTurnTimeout();
      expect(timer.state.afkStrikes).toBe(1);
      expect(timeoutStrikes).toBe(1);
      expect(timeoutForfeit).toBe(false);

      timer.destroy();
    });

    it('triggers Strike 2 and automatic forfeit on consecutive timeout', () => {
      let timeoutStrikes = 0;
      let timeoutForfeit = false;

      const timer = new PvPTimerManager({
        onTurnTimeout: (strikes, isForfeit) => {
          timeoutStrikes = strikes;
          timeoutForfeit = isForfeit;
        }
      });

      // Strike 1
      timer.handleTurnTimeout();
      expect(timeoutForfeit).toBe(false);

      // Strike 2
      timer.handleTurnTimeout();
      expect(timer.state.afkStrikes).toBe(2);
      expect(timeoutStrikes).toBe(2);
      expect(timeoutForfeit).toBe(true);

      timer.destroy();
    });

    it('resets strikes to 0 when player acts manually', () => {
      const timer = new PvPTimerManager();
      timer.handleTurnTimeout(); // Strike 1
      expect(timer.state.afkStrikes).toBe(1);

      timer.resetStrikes();
      expect(timer.state.afkStrikes).toBe(0);

      // Subsequent timeout is Strike 1 again, NOT Strike 2
      timer.handleTurnTimeout();
      expect(timer.state.afkStrikes).toBe(1);

      timer.destroy();
    });
  });

  describe('pvpReconnectHelper Session Storage Persistence', () => {
    // Mock browser sessionStorage in Node test environment
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
      for (const key of Object.keys(mockStorage)) {
        delete mockStorage[key];
      }

      vi.stubGlobal('sessionStorage', {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; }
      });
      vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
    });

    it('persists and retrieves active session when within 60s window', () => {
      saveActivePvPSession({
        matchId: 'match-12345',
        isHost: true,
        opponentId: 'opp-67890',
        opponentName: 'Ash',
        isRanked: true,
        turnCount: 3
      });

      const session = getActivePvPSession();
      expect(session).not.toBeNull();
      expect(session?.matchId).toBe('match-12345');
      expect(session?.isHost).toBe(true);
      expect(session?.opponentName).toBe('Ash');
    });

    it('cleans up and returns null if session is older than 60 seconds', () => {
      const expiredTimestamp = Temporal.Now.instant().epochMilliseconds - 65000; // 65 seconds ago
      mockStorage[PVP_ACTIVE_MATCH_STORAGE_KEY] = JSON.stringify({
        matchId: 'match-expired',
        isHost: false,
        opponentId: 'opp-1',
        opponentName: 'Gary',
        timestamp: expiredTimestamp
      });

      const session = getActivePvPSession();
      expect(session).toBeNull();
      // Storage should be cleared
      expect(mockStorage[PVP_ACTIVE_MATCH_STORAGE_KEY]).toBeUndefined();
    });

    it('clears active session explicitly on battle end', () => {
      saveActivePvPSession({
        matchId: 'match-to-clear',
        isHost: true,
        opponentId: 'opp-2',
        opponentName: 'Red'
      });

      expect(getActivePvPSession()).not.toBeNull();
      clearActivePvPSession();
      expect(getActivePvPSession()).toBeNull();
    });
  });
});
