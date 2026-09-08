/**
 * src/logic/pvp/pvpReconnectHelper.ts
 *
 * PvP In-Combat Reconnection and AFK Auto-Pick Helper.
 * Manages sessionStorage persistence for seamless F5 rehydration within 60s,
 * and determines deterministic legal actions on AFK Strike 1 (moves or forced switches).
 */

import type { ShowdownPlayerRequest } from '@/types/battle/battle';
import type { PvPAction } from '@/types/battle/pvp';
import { PVP_RECONNECT_WINDOW_SEC } from '@/types/battle/pvp';
import type { Pokemon } from '@/types/pokemon/pokemon';

export const PVP_ACTIVE_MATCH_STORAGE_KEY = 'pvp_active_match';

export interface PvPActiveSession {
  readonly matchId: string;
  readonly isHost: boolean;
  readonly opponentId: string | null;
  readonly opponentName: string;
  readonly isRanked?: boolean;
  readonly turnCount?: number;
  readonly timestamp: number;
}

/**
 * Persists an active PvP session into sessionStorage with timestamp.
 */
export function saveActivePvPSession(session: Omit<PvPActiveSession, 'timestamp'>): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const payload: PvPActiveSession = {
      ...session,
      timestamp: Temporal.Now.instant().epochMilliseconds
    };
    window.sessionStorage.setItem(PVP_ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('[pvpReconnectHelper] Failed to save active PvP session:', err);
  }
}

/**
 * Clears any active PvP session from sessionStorage.
 */
export function clearActivePvPSession(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(PVP_ACTIVE_MATCH_STORAGE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Retrieves the active PvP session if present and not expired (< 60s).
 * If expired, cleans up storage and returns null.
 */
export function getActivePvPSession(): PvPActiveSession | null { // result-ok: Operation result wrapper payload
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(PVP_ACTIVE_MATCH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PvPActiveSession;
    if (!parsed || !parsed.matchId || typeof parsed.timestamp !== 'number') {
      clearActivePvPSession();
      return null;
    }

    const elapsedMs = Temporal.Now.instant().epochMilliseconds - parsed.timestamp;
    const maxWindowMs = PVP_RECONNECT_WINDOW_SEC * 1000;

    if (elapsedMs > maxWindowMs) {
      clearActivePvPSession();
      return null;
    }

    return parsed;
  } catch {
    clearActivePvPSession();
    return null;
  }
}

/**
 * Selects a deterministic legal action for Strike 1 AFK auto-pick:
 * - If forced switch: selects the first healthy bench Pokémon.
 * - If normal move: selects the first move that is neither disabled nor 0 PP.
 */
export function determineLegalAutoPick(
  request?: ShowdownPlayerRequest,
  playerTeam?: readonly (Pokemon | null)[]
): PvPAction {
  // 1. Forced Switch Scenario
  if (request?.forceSwitch?.[0]) {
    if (request.side?.pokemon && request.side.pokemon.length > 0) {
      const benchIndex = request.side.pokemon.findIndex(
        (p) => !p.active && !p.condition.includes('fnt')
      );
      if (benchIndex !== -1) {
        return {
          type: 'switch',
          switchIndex: benchIndex,
          choiceString: `switch ${benchIndex + 1}`
        };
      }
    }

    if (playerTeam && playerTeam.length > 0) {
      const benchIndex = playerTeam.findIndex(
        (p, idx) => idx > 0 && p && p.hp > 0 && !p.fainted
      );
      if (benchIndex !== -1) {
        return {
          type: 'switch',
          switchIndex: benchIndex,
          choiceString: `switch ${benchIndex + 1}`
        };
      }
    }

    return {
      type: 'switch',
      switchIndex: 1,
      choiceString: 'switch 2'
    };
  }

  // 2. Normal Move Selection
  const activeMoves = request?.active?.[0]?.moves;
  if (Array.isArray(activeMoves) && activeMoves.length > 0) {
    const validIdx = activeMoves.findIndex((m) => !m.disabled && m.pp !== 0);
    if (validIdx !== -1) {
      return {
        type: 'move',
        moveIndex: validIdx,
        choiceString: `move ${validIdx + 1}`
      };
    }
  }

  // Fallback default
  return {
    type: 'move',
    moveIndex: 0,
    choiceString: 'move 1'
  };
}
