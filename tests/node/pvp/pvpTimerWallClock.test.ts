import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper';
import { PVP_TURN_TIMEOUT_SEC, PVP_AFK_MAX_STRIKES, PVP_RECONNECT_WINDOW_SEC } from '@/types/battle/pvp';

describe('PvPTimerManager Wall-Clock & Tab-Minimization Immunity - Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Temporal.Now, 'instant').mockImplementation(() => 
      Temporal.Instant.fromEpochMilliseconds(Date.now())
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initializes with full turn seconds and 0 AFK strikes', () => {
    const timer = new PvPTimerManager();
    expect(timer.state.turnSecondsRemaining).toBe(PVP_TURN_TIMEOUT_SEC);
    expect(timer.state.afkStrikes).toBe(0);
    expect(timer.state.isReconnecting).toBe(false);
    timer.destroy();
  });

  it('updates countdown via wall-clock checkWallClockTick even when requestAnimationFrame is frozen/throttled', () => {
    const onTick = vi.fn();
    const onTimeout = vi.fn();
    const timer = new PvPTimerManager({ onTurnTick: onTick, onTurnTimeout: onTimeout });

    timer.startTurnTimer();
    expect(onTick).toHaveBeenCalledWith(PVP_TURN_TIMEOUT_SEC);

    // Simulate browser window minimized for 20 seconds where rAF completely froze
    vi.advanceTimersByTime(20000);

    // When the background interval or visibilitychange fires:
    timer.checkWallClockTick();

    expect(timer.state.turnSecondsRemaining).toBe(PVP_TURN_TIMEOUT_SEC - 20);
    expect(onTick).toHaveBeenCalledWith(PVP_TURN_TIMEOUT_SEC - 20);
    expect(onTimeout).not.toHaveBeenCalled();

    timer.destroy();
  });

  it('triggers strike 1 auto-action immediately when wall-clock time passes 45s while tab is minimized', () => {
    const onTick = vi.fn();
    const onTimeout = vi.fn();
    const timer = new PvPTimerManager({ onTurnTick: onTick, onTurnTimeout: onTimeout });

    timer.startTurnTimer();

    // Player minimizes window for 50 seconds (longer than turn timeout)
    vi.advanceTimersByTime(50000);

    // visibilitychange or background interval triggers checkWallClockTick
    timer.checkWallClockTick();

    expect(timer.state.turnSecondsRemaining).toBe(0);
    expect(timer.state.afkStrikes).toBe(1);
    expect(onTimeout).toHaveBeenCalledWith(1, false); // Strike 1: not forfeit, triggers auto-pick

    timer.destroy();
  });

  it('triggers forfeit on strike 2 timeout', () => {
    const onTimeout = vi.fn();
    const timer = new PvPTimerManager({ onTurnTimeout: onTimeout });

    timer.state.afkStrikes = 1;
    timer.startTurnTimer();

    vi.advanceTimersByTime(46000);
    timer.checkWallClockTick();

    expect(timer.state.afkStrikes).toBe(PVP_AFK_MAX_STRIKES);
    expect(onTimeout).toHaveBeenCalledWith(PVP_AFK_MAX_STRIKES, true); // Strike 2: forfeit

    timer.destroy();
  });

  it('manages 60-second reconnection window with wall-clock precision', () => {
    const onRecTick = vi.fn();
    const onRecTimeout = vi.fn();
    const timer = new PvPTimerManager({ onReconnectTick: onRecTick, onReconnectTimeout: onRecTimeout });

    timer.startReconnectCountdown();
    expect(timer.state.isReconnecting).toBe(true);
    expect(timer.state.reconnectSecondsRemaining).toBe(PVP_RECONNECT_WINDOW_SEC);

    // Advance 30s
    vi.advanceTimersByTime(30000);
    timer.checkWallClockTick();

    expect(timer.state.reconnectSecondsRemaining).toBe(30);

    // Advance 35s more (total 65s)
    vi.advanceTimersByTime(35000);
    timer.checkWallClockTick();

    expect(timer.state.reconnectSecondsRemaining).toBe(0);
    expect(onRecTimeout).toHaveBeenCalled();

    timer.destroy();
  });
});
