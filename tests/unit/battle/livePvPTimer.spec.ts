import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper';
import { PVP_TURN_TIMEOUT_SEC, PVP_RECONNECT_WINDOW_SEC } from '@/types/battle/pvp';

import type { Mock } from 'vitest';

describe('PvPTimerManager (AFK & Reconnection Logic)', () => {
  let timer: PvPTimerManager;
  let onTurnTickMock: Mock<(seconds: number) => void>;
  let onTurnTimeoutMock: Mock<(strikes: number, isForfeit: boolean) => void>;
  let onReconnectTickMock: Mock<(seconds: number) => void>;
  let onReconnectTimeoutMock: Mock<() => void>;

  beforeEach(() => {
    onTurnTickMock = vi.fn();
    onTurnTimeoutMock = vi.fn();
    onReconnectTickMock = vi.fn();
    onReconnectTimeoutMock = vi.fn();

    timer = new PvPTimerManager({
      onTurnTick: onTurnTickMock,
      onTurnTimeout: onTurnTimeoutMock,
      onReconnectTick: onReconnectTickMock,
      onReconnectTimeout: onReconnectTimeoutMock
    });
  });

  afterEach(() => {
    timer.destroy();
  });

  it('should initialize with standard default values', () => {
    expect(timer.state.turnSecondsRemaining).toBe(PVP_TURN_TIMEOUT_SEC);
    expect(timer.state.reconnectSecondsRemaining).toBe(PVP_RECONNECT_WINDOW_SEC);
    expect(timer.state.afkStrikes).toBe(0);
    expect(timer.state.isReconnecting).toBe(false);
  });

  it('should issue Strike 1 without forfeit on first timeout', () => {
    timer.handleTurnTimeout();

    expect(timer.state.afkStrikes).toBe(1);
    expect(onTurnTimeoutMock).toHaveBeenCalledWith(1, false);
  });

  it('should issue Strike 2 and trigger forfeit on consecutive timeout', () => {
    timer.state.afkStrikes = 1;
    timer.handleTurnTimeout();

    expect(timer.state.afkStrikes).toBe(2);
    expect(onTurnTimeoutMock).toHaveBeenCalledWith(2, true);
  });

  it('should reset strikes when player makes a manual move', () => {
    timer.state.afkStrikes = 1;
    timer.resetStrikes();

    expect(timer.state.afkStrikes).toBe(0);
  });

  it('should activate reconnection state on startReconnectCountdown', () => {
    timer.startReconnectCountdown();

    expect(timer.state.isReconnecting).toBe(true);
    expect(timer.state.reconnectSecondsRemaining).toBe(PVP_RECONNECT_WINDOW_SEC);
    expect(onReconnectTickMock).toHaveBeenCalledWith(PVP_RECONNECT_WINDOW_SEC);
  });

  it('should deactivate reconnection state on stopReconnectCountdown', () => {
    timer.startReconnectCountdown();
    expect(timer.state.isReconnecting).toBe(true);

    timer.stopReconnectCountdown();
    expect(timer.state.isReconnecting).toBe(false);
  });
});
