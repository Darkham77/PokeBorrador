/**
 * tests/node/battle/pp_softlock.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests the PP soft-lock prevention logic for multi-turn locked moves
 * (Thrash / Outrage / Petal Dance / Thrash-effect moves, and lockedmove volatile).
 *
 * Official rule (Gen 4+):
 *   - PP is ONLY deducted on the FIRST turn of a locked move sequence.
 *   - Subsequent auto-repeated turns do NOT consume additional PP.
 *   - If PP reaches 0 while the Pokémon is still locked, it finishes the
 *     sequence normally without error (no soft-lock).
 *   - After the cycle ends and the Pokémon gets confused, the 0-PP move
 *     is simply unselectable in the UI (correct behavior, not a soft-lock).
 *
 * Also documents the UI-level bug that was fixed:
 *   - BattleMoveSlot.vue was unconditionally disabling buttons when pp<=0,
 *     even when the Pokémon is locked. The fix adds the isLocked check so
 *     the button stays enabled for locked-move execution.
 *
 * This file tests the pure decision logic mirrored from battleTurn.ts:
 *   const isLocked = !!(volatileCounters['lockedmove'] > 0) || !!(thrashTurns > 0)
 *   if (!isStruggle && !isLocked) { if (!move || move.pp <= 0) return; }
 *   if (move && move.pp > 0 && !isLocked) { move.pp-- }
 *
 * And the UI logic mirrored from BattleMoveSlot.vue (after fix):
 *   const isLocked = isLockedMove || isThrashLocked
 *   if (!isLocked && props.move.pp <= 0) return true  // disable
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Pure helpers (mirror of battleTurn.ts decision logic) ──────────────────

interface MockMove {
  id: string;
  pp: number;
  effect?: string;
}

interface MockPokemon {
  moves: MockMove[];
  thrashTurns?: number;
  volatileCounters?: Record<string, number>;
  lastMove?: MockMove | null;
}

/**
 * Mirrors the isLocked determination from battleTurn.ts lines 42.
 */
function isLocked(p: MockPokemon): boolean {
  return !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0) ||
         !!(p.thrashTurns && p.thrashTurns > 0);
}

/**
 * Mirrors the PP gate from battleTurn.ts lines 46–51.
 * Returns false if the turn should be ABORTED (not locked, and pp <= 0).
 */
function shouldAbortTurn(p: MockPokemon, moveIndex: number): boolean {
  if (moveIndex === -1) return false; // struggle never aborts
  const locked = isLocked(p);
  if (locked) return false; // locked moves always proceed
  const move = p.moves[moveIndex];
  return !move || move.pp <= 0;
}

/**
 * Mirrors the PP deduction from battleTurn.ts lines 67–69.
 * Deducts PP only if the move has PP remaining AND the Pokémon is NOT locked.
 */
function deductPP(p: MockPokemon, moveIndex: number): void {
  const locked = isLocked(p);
  if (moveIndex === -1) return; // struggle
  const move = p.moves[moveIndex];
  if (move && move.pp > 0 && !locked) {
    move.pp--;
  }
}

/**
 * Mirrors the UI isDisabled logic from BattleMoveSlot.vue (after fix):
 * Returns true when the button should be disabled.
 */
function isUiDisabled(p: MockPokemon, moveIndex: number): boolean {
  const move = p.moves[moveIndex];
  if (!move) return true;
  const lockedMove = !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0);
  const thrashLocked = !!(p.thrashTurns && p.thrashTurns > 0);
  const locked = lockedMove || thrashLocked;
  // Block 0-PP only when not locked
  if (!locked && move.pp <= 0) return true;
  // Locked: only the forced move is clickable
  if (lockedMove && p.lastMove && move.id !== p.lastMove.id) return true;
  return false;
}

/**
 * Simulates specialActions['thrash']: sets thrashTurns on the first turn.
 */
function applyThrashEffect(p: MockPokemon): void {
  if (!p.thrashTurns) {
    p.thrashTurns = 2; // deterministic: minimum duration
  }
}

/**
 * Simulates specialActions['locked_move']: sets lockedmove volatile on the first turn.
 */
function applyLockedMoveEffect(p: MockPokemon): void {
  if (!p.volatileCounters) p.volatileCounters = {};
  if (!p.volatileCounters['lockedmove']) {
    p.volatileCounters['lockedmove'] = 2; // deterministic: minimum duration
  }
}

/**
 * Simulates battleStatus.ts line 132–138: decrements thrashTurns at end of turn.
 * Returns true if confusion was applied (cycle ended).
 */
function tickThrash(p: MockPokemon): boolean {
  if ((p.thrashTurns ?? 0) > 0) {
    p.thrashTurns = (p.thrashTurns ?? 0) - 1;
    if (p.thrashTurns <= 0) {
      return true; // confusion would be applied here
    }
  }
  return false;
}

/**
 * Simulates battleStatus.ts for lockedmove: decrements counter.
 */
function tickLockedMove(p: MockPokemon): boolean {
  if (!p.volatileCounters) return false;
  const c = p.volatileCounters['lockedmove'] ?? 0;
  if (c > 0) {
    p.volatileCounters['lockedmove'] = c - 1;
    if (p.volatileCounters['lockedmove'] <= 0) {
      delete p.volatileCounters['lockedmove'];
      return true; // cycle ended, confusion applied
    }
  }
  return false;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PP Soft-lock Prevention – Thrash / Locked-move Mechanics', () => {

  // ── Thrash PP logic (engine layer) ──────────────────────────────────────

  describe('Thrash (effect: thrash) – PP deduction rules', () => {

    it('Turn 1: PP IS deducted when thrashTurns is 0 (not yet locked)', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 10 }],
        thrashTurns: 0,
      };
      const move = p.moves[0];
      assert.ok(move);
      assert.strictEqual(isLocked(p), false, 'Should NOT be locked before first turn');
      assert.strictEqual(shouldAbortTurn(p, 0), false);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 9, 'PP should decrease from 10 to 9 on turn 1');
      // Simulate specialActions effect: set thrashTurns
      applyThrashEffect(p);
      assert.strictEqual(p.thrashTurns, 2);
    });

    it('Turn 2+: PP is NOT deducted when thrashTurns > 0 (locked)', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 9 }],
        thrashTurns: 2,
      };
      const move = p.moves[0];
      assert.ok(move);
      assert.strictEqual(isLocked(p), true, 'Should be locked on turn 2');
      assert.strictEqual(shouldAbortTurn(p, 0), false, 'Locked turns should never abort');
      deductPP(p, 0);
      assert.strictEqual(move.pp, 9, 'PP should NOT decrease during locked turns');
    });

    it('No soft-lock: Move executes normally even with 0 PP when locked', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 0 }], // PP already exhausted
        thrashTurns: 1,                    // Still has 1 turn remaining
      };
      const move = p.moves[0];
      assert.ok(move);
      assert.strictEqual(isLocked(p), true, 'Should still be locked');
      // The critical check: even with pp=0, the move should NOT be aborted
      assert.strictEqual(shouldAbortTurn(p, 0), false, 'MUST NOT abort when locked, even at 0 PP');
      // PP should not go negative
      deductPP(p, 0);
      assert.strictEqual(move.pp, 0, 'PP should remain at 0, not go negative');
    });

    it('After cycle ends: 0 PP move is unselectable (blocked) when player has control', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 0 }],
        thrashTurns: 0, // cycle just ended, confusion applied by battleStatus
      };
      assert.strictEqual(isLocked(p), false, 'Should NOT be locked after cycle ends');
      // This is the correct behavior: blocked because pp=0, NOT a soft-lock
      assert.strictEqual(shouldAbortTurn(p, 0), true, 'Should block selection of 0-PP move after cycle');
    });

    it('Full 3-turn Thrash cycle: only deducts PP once', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 5 }],
        thrashTurns: 0,
      };
      const move = p.moves[0];
      assert.ok(move);

      // Turn 1: select move, not yet locked → PP deducted, then effect sets thrashTurns
      assert.strictEqual(shouldAbortTurn(p, 0), false);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 4);
      applyThrashEffect(p);
      p.thrashTurns = 3; // override to 3-turn cycle
      tickThrash(p); // end-of-turn decrement → thrashTurns = 2

      // Turn 2: forced, locked → NO PP deduction
      assert.strictEqual(isLocked(p), true);
      assert.strictEqual(shouldAbortTurn(p, 0), false);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 4, 'PP unchanged on turn 2');
      tickThrash(p); // thrashTurns = 1

      // Turn 3: still forced, locked → NO PP deduction
      assert.strictEqual(isLocked(p), true);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 4, 'PP unchanged on turn 3');
      const confused = tickThrash(p); // thrashTurns = 0 → cycle ends
      assert.strictEqual(confused, true, 'Confusion should trigger at cycle end');
      assert.strictEqual(p.thrashTurns, 0);

      // After cycle: player has control, move has PP=4 (usable again next battle)
      assert.strictEqual(isLocked(p), false);
      assert.strictEqual(shouldAbortTurn(p, 0), false, 'PP=4 so move is selectable');
    });

    it('Full cycle when PP hits 0 on turn 1: subsequent turns still execute (no soft-lock)', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 1 }], // Only 1 PP left
        thrashTurns: 0,
      };
      const move = p.moves[0];
      assert.ok(move);

      // Turn 1: deduct last PP
      deductPP(p, 0);
      assert.strictEqual(move.pp, 0, 'Last PP consumed on turn 1');
      applyThrashEffect(p);
      p.thrashTurns = 2;
      tickThrash(p); // thrashTurns = 1

      // Turn 2: PP=0, but locked → no soft-lock!
      assert.strictEqual(move.pp, 0);
      assert.strictEqual(isLocked(p), true);
      assert.strictEqual(shouldAbortTurn(p, 0), false, 'CRITICAL: must NOT abort at 0 PP when locked');
      deductPP(p, 0);
      assert.strictEqual(move.pp, 0, 'PP stays at 0 (no deduction when locked)');
      const confused = tickThrash(p); // cycle ends
      assert.strictEqual(confused, true);
    });
  });

  // ── UI layer: isDisabled logic (BattleMoveSlot.vue after fix) ──────────

  describe('UI isDisabled – buttons enabled during locked cycles', () => {

    it('Button ENABLED at 0 PP when thrashTurns > 0', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 0 }],
        thrashTurns: 1,
      };
      // Bug was: isDisabled returned true unconditionally at pp=0
      // Fixed: skip pp check when locked
      assert.strictEqual(isUiDisabled(p, 0), false, 'Button must NOT be disabled when locked at 0 PP');
    });

    it('Button DISABLED at 0 PP when NOT locked (correct behavior)', () => {
      const p: MockPokemon = {
        moves: [{ id: 'thrash', pp: 0 }],
        thrashTurns: 0,
      };
      assert.strictEqual(isUiDisabled(p, 0), true, 'Button must be disabled when pp=0 and not locked');
    });

    it('Button ENABLED at 0 PP with lockedmove volatile', () => {
      const p: MockPokemon = {
        moves: [{ id: 'outrage', pp: 0 }],
        volatileCounters: { lockedmove: 1 },
        lastMove: { id: 'outrage', pp: 0 },
      };
      assert.strictEqual(isUiDisabled(p, 0), false, 'Button must NOT be disabled for forced lockedmove at 0 PP');
    });

    it('Button DISABLED for non-forced moves when locked (only forced move is clickable)', () => {
      const p: MockPokemon = {
        moves: [{ id: 'outrage', pp: 0 }, { id: 'splash', pp: 5 }],
        volatileCounters: { lockedmove: 1 },
        lastMove: { id: 'outrage', pp: 0 },
      };
      // splash is NOT the forced move → should be disabled
      assert.strictEqual(isUiDisabled(p, 1), true, 'Non-forced move must be disabled when locked');
      // outrage IS the forced move → enabled even at 0 PP
      assert.strictEqual(isUiDisabled(p, 0), false, 'Forced move must be enabled when locked');
    });
  });

  // ── lockedmove volatile (e.g. Outrage via Showdown bridge) ───────────────

  describe('lockedmove volatile – PP deduction rules', () => {

    it('Turn 1: PP deducted when no lockedmove volatile is set', () => {
      const p: MockPokemon = {
        moves: [{ id: 'outrage', pp: 8 }],
        volatileCounters: {},
      };
      const move = p.moves[0];
      assert.ok(move);
      assert.strictEqual(isLocked(p), false);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 7);
      applyLockedMoveEffect(p);
      assert.strictEqual(p.volatileCounters!['lockedmove'], 2);
    });

    it('Turn 2+: PP NOT deducted when lockedmove volatile > 0', () => {
      const p: MockPokemon = {
        moves: [{ id: 'outrage', pp: 7 }],
        volatileCounters: { lockedmove: 2 },
      };
      const move = p.moves[0];
      assert.ok(move);
      assert.strictEqual(isLocked(p), true);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 7, 'PP must not change during locked turns');
    });

    it('0 PP with active lockedmove volatile: executes without abort', () => {
      const p: MockPokemon = {
        moves: [{ id: 'outrage', pp: 0 }],
        volatileCounters: { lockedmove: 1 },
      };
      assert.strictEqual(shouldAbortTurn(p, 0), false, 'Must NOT abort at 0 PP when locked');
    });

    it('lockedmove volatile cleared after cycle: 0-PP move blocked (correct, not soft-lock)', () => {
      const p: MockPokemon = {
        moves: [{ id: 'outrage', pp: 0 }],
        volatileCounters: { lockedmove: 1 },
      };
      const cycleEnded = tickLockedMove(p); // counter → 0, volatile deleted
      assert.strictEqual(cycleEnded, true);
      assert.strictEqual(p.volatileCounters!['lockedmove'], undefined);
      assert.strictEqual(isLocked(p), false);
      // 0-PP move correctly blocked when player has control
      assert.strictEqual(shouldAbortTurn(p, 0), true);
    });
  });

  // ── Struggle fallback ─────────────────────────────────────────────────────

  describe('Struggle fallback (moveIndex = -1)', () => {

    it('Struggle is never aborted regardless of PP or lock state', () => {
      const p: MockPokemon = { moves: [{ id: 'splash', pp: 0 }] };
      // moveIndex = -1 signals struggle
      assert.strictEqual(shouldAbortTurn(p, -1), false, 'Struggle always executes');
    });

    it('Struggle deducts no PP', () => {
      const p: MockPokemon = { moves: [{ id: 'splash', pp: 0 }] };
      const move = p.moves[0];
      assert.ok(move);
      deductPP(p, -1);
      assert.strictEqual(move.pp, 0, 'Struggle must not touch PP');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('Edge cases', () => {

    it('PP does not go negative when deducted at pp=1', () => {
      const p: MockPokemon = { moves: [{ id: 'splash', pp: 1 }] };
      const move = p.moves[0];
      assert.ok(move);
      deductPP(p, 0);
      assert.strictEqual(move.pp, 0);
    });

    it('PP does not go below 0 when deducted at pp=0 (non-locked, guard in deductPP)', () => {
      // This path is normally blocked by shouldAbortTurn, but deductPP itself is safe
      const p: MockPokemon = { moves: [{ id: 'splash', pp: 0 }] };
      const move = p.moves[0];
      assert.ok(move);
      deductPP(p, 0); // pp=0 → condition `move.pp > 0` is false → no deduction
      assert.strictEqual(move.pp, 0, 'PP must not go negative');
    });

    it('thrashTurns=undefined is treated as falsy (not locked)', () => {
      const p: MockPokemon = { moves: [{ id: 'thrash', pp: 5 }] };
      // thrashTurns not set at all
      assert.strictEqual(isLocked(p), false);
    });

    it('thrashTurns=0 is treated as falsy (not locked)', () => {
      const p: MockPokemon = { moves: [{ id: 'thrash', pp: 5 }], thrashTurns: 0 };
      assert.strictEqual(isLocked(p), false);
    });

    it('lockedmove=0 is treated as falsy (not locked)', () => {
      const p: MockPokemon = { moves: [{ id: 'outrage', pp: 5 }], volatileCounters: { lockedmove: 0 } };
      assert.strictEqual(isLocked(p), false);
    });
  });
});
