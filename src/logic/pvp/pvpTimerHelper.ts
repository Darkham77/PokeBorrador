import { gsap } from 'gsap';
import { createWallClockInterval, clearWallClockInterval, type WallClockTimerId } from '@/logic/utils/timeUtils';
import {
  PVP_TURN_TIMEOUT_SEC,
  PVP_AFK_MAX_STRIKES,
  PVP_RECONNECT_WINDOW_SEC
} from '@/types/battle/pvp';

const MS_PER_SECOND = 1000;

export interface PvPTimerState {
  turnSecondsRemaining: number;
  reconnectSecondsRemaining: number;
  afkStrikes: number;
  isReconnecting: boolean;
}

export interface PvPTimerCallbacks {
  onTurnTick?: (seconds: number) => void;
  onTurnTimeout?: (strikes: number, isForfeit: boolean) => void;
  onReconnectTick?: (seconds: number) => void;
  onReconnectTimeout?: () => void;
}

export class PvPTimerManager {
  private turnTween: gsap.core.Tween | null = null;
  private reconnectTween: gsap.core.Tween | null = null;
  private backgroundTickerId: WallClockTimerId | null = null;
  private turnEndTime = 0;
  private reconnectEndTime = 0;
  private boundVisibilityHandler: (() => void) | null = null;

  public state: PvPTimerState = {
    turnSecondsRemaining: PVP_TURN_TIMEOUT_SEC,
    reconnectSecondsRemaining: PVP_RECONNECT_WINDOW_SEC,
    afkStrikes: 0,
    isReconnecting: false
  };

  constructor(private callbacks: PvPTimerCallbacks = {}) {
    this.setupVisibilityListeners();
  }

  private setupVisibilityListeners(): void {
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      this.boundVisibilityHandler = () => this.checkWallClockTick();
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
      window.addEventListener('focus', this.boundVisibilityHandler);
    }
  }

  private ensureBackgroundTicker(): void {
    if (!this.backgroundTickerId && (this.turnEndTime > 0 || this.reconnectEndTime > 0)) {
      this.backgroundTickerId = createWallClockInterval(() => {
        this.checkWallClockTick();
      }, MS_PER_SECOND);
    }
  }

  private stopBackgroundTickerIfIdle(): void {
    if (this.turnEndTime <= 0 && this.reconnectEndTime <= 0 && this.backgroundTickerId) {
      clearWallClockInterval(this.backgroundTickerId);
      this.backgroundTickerId = null;
    }
  }

  /**
   * Evaluates wall-clock time remaining against end timestamps.
   * Guarantees deterministic countdown even when background tab throttles requestAnimationFrame.
   */
  public checkWallClockTick(): void {
    const now = Temporal.Now.instant().epochMilliseconds;

    if (this.turnEndTime > 0) {
      const remaining = Math.max(0, Math.ceil((this.turnEndTime - now) / MS_PER_SECOND));
      if (remaining !== this.state.turnSecondsRemaining) {
        this.state.turnSecondsRemaining = remaining;
        this.callbacks.onTurnTick?.(remaining);
      }
      if (remaining <= 0) {
        this.stopTurnTimer();
        this.handleTurnTimeout();
      }
    }

    if (this.reconnectEndTime > 0) {
      const remaining = Math.max(0, Math.ceil((this.reconnectEndTime - now) / 1000));
      if (remaining !== this.state.reconnectSecondsRemaining) {
        this.state.reconnectSecondsRemaining = remaining;
        this.callbacks.onReconnectTick?.(remaining);
      }
      if (remaining <= 0) {
        this.stopReconnectCountdown();
        this.callbacks.onReconnectTimeout?.();
      }
    }
  }

  /**
   * Starts or restarts the 45-second turn timer.
   */
  startTurnTimer(): void {
    this.stopTurnTimer();
    this.turnEndTime = Temporal.Now.instant().epochMilliseconds + PVP_TURN_TIMEOUT_SEC * MS_PER_SECOND;
    this.state.turnSecondsRemaining = PVP_TURN_TIMEOUT_SEC;
    this.callbacks.onTurnTick?.(PVP_TURN_TIMEOUT_SEC);
    this.ensureBackgroundTicker();

    const proxy = { sec: PVP_TURN_TIMEOUT_SEC };
    this.turnTween = gsap.to(proxy, {
      sec: 0,
      duration: PVP_TURN_TIMEOUT_SEC,
      ease: 'none',
      onUpdate: () => {
        this.checkWallClockTick();
      },
      onComplete: () => {
        this.checkWallClockTick();
      }
    });
  }

  /**
   * Stops the active turn timer.
   */
  stopTurnTimer(): void {
    this.turnEndTime = 0;
    if (this.turnTween) {
      this.turnTween.kill();
      this.turnTween = null;
    }
    this.stopBackgroundTickerIfIdle();
  }

  /**
   * Called when a player makes a manual move to clear their AFK strikes.
   */
  resetStrikes(): void {
    this.state.afkStrikes = 0;
  }

  /**
   * Handles timeout logic when turn seconds reach 0.
   */
  handleTurnTimeout(): void {
    if (this.state.afkStrikes === 0) {
      this.state.afkStrikes = 1;
      this.callbacks.onTurnTimeout?.(1, false);
    } else {
      this.state.afkStrikes = PVP_AFK_MAX_STRIKES;
      this.callbacks.onTurnTimeout?.(PVP_AFK_MAX_STRIKES, true);
    }
  }

  /**
   * Starts the 60-second reconnection window countdown.
   */
  startReconnectCountdown(): void {
    this.stopTurnTimer();
    this.stopReconnectCountdown();
    this.state.isReconnecting = true;
    this.reconnectEndTime = Temporal.Now.instant().epochMilliseconds + PVP_RECONNECT_WINDOW_SEC * MS_PER_SECOND;
    this.state.reconnectSecondsRemaining = PVP_RECONNECT_WINDOW_SEC;
    this.callbacks.onReconnectTick?.(PVP_RECONNECT_WINDOW_SEC);
    this.ensureBackgroundTicker();

    const proxy = { sec: PVP_RECONNECT_WINDOW_SEC };
    this.reconnectTween = gsap.to(proxy, {
      sec: 0,
      duration: PVP_RECONNECT_WINDOW_SEC,
      ease: 'none',
      onUpdate: () => {
        this.checkWallClockTick();
      },
      onComplete: () => {
        this.checkWallClockTick();
      }
    });
  }

  /**
   * Stops the reconnection countdown and restores regular combat state.
   */
  stopReconnectCountdown(): void {
    this.reconnectEndTime = 0;
    if (this.reconnectTween) {
      this.reconnectTween.kill();
      this.reconnectTween = null;
    }
    this.state.isReconnecting = false;
    this.stopBackgroundTickerIfIdle();
  }

  /**
   * Destroys all active timers, event listeners, and clears state.
   */
  destroy(): void {
    this.stopTurnTimer();
    this.stopReconnectCountdown();
    if (this.boundVisibilityHandler) {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', this.boundVisibilityHandler);
      }
      this.boundVisibilityHandler = null;
    }
    if (this.backgroundTickerId) {
      clearWallClockInterval(this.backgroundTickerId);
      this.backgroundTickerId = null;
    }
  }
}
