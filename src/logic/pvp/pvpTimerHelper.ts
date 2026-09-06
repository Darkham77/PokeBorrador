import { gsap } from 'gsap';
import {
  PVP_TURN_TIMEOUT_SEC,
  PVP_AFK_MAX_STRIKES,
  PVP_RECONNECT_WINDOW_SEC
} from '@/types/battle/pvp';

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

  public state: PvPTimerState = {
    turnSecondsRemaining: PVP_TURN_TIMEOUT_SEC,
    reconnectSecondsRemaining: PVP_RECONNECT_WINDOW_SEC,
    afkStrikes: 0,
    isReconnecting: false
  };

  constructor(private callbacks: PvPTimerCallbacks = {}) {}

  /**
   * Starts or restarts the 45-second turn timer.
   */
  startTurnTimer(): void {
    this.stopTurnTimer();
    this.state.turnSecondsRemaining = PVP_TURN_TIMEOUT_SEC;
    this.callbacks.onTurnTick?.(PVP_TURN_TIMEOUT_SEC);

    const proxy = { sec: PVP_TURN_TIMEOUT_SEC };
    this.turnTween = gsap.to(proxy, {
      sec: 0,
      duration: PVP_TURN_TIMEOUT_SEC,
      ease: 'none',
      onUpdate: () => {
        const remaining = Math.ceil(proxy.sec);
        this.state.turnSecondsRemaining = remaining;
        this.callbacks.onTurnTick?.(remaining);
      },
      onComplete: () => {
        this.handleTurnTimeout();
      }
    });
  }

  /**
   * Stops the active turn timer.
   */
  stopTurnTimer(): void {
    if (this.turnTween) {
      this.turnTween.kill();
      this.turnTween = null;
    }
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
    this.state.reconnectSecondsRemaining = PVP_RECONNECT_WINDOW_SEC;
    this.callbacks.onReconnectTick?.(PVP_RECONNECT_WINDOW_SEC);

    const proxy = { sec: PVP_RECONNECT_WINDOW_SEC };
    this.reconnectTween = gsap.to(proxy, {
      sec: 0,
      duration: PVP_RECONNECT_WINDOW_SEC,
      ease: 'none',
      onUpdate: () => {
        const remaining = Math.ceil(proxy.sec);
        this.state.reconnectSecondsRemaining = remaining;
        this.callbacks.onReconnectTick?.(remaining);
      },
      onComplete: () => {
        this.callbacks.onReconnectTimeout?.();
      }
    });
  }

  /**
   * Stops the reconnection countdown and restores regular combat state.
   */
  stopReconnectCountdown(): void {
    if (this.reconnectTween) {
      this.reconnectTween.kill();
      this.reconnectTween = null;
    }
    this.state.isReconnecting = false;
  }

  /**
   * Destroys all active timers and clears state.
   */
  destroy(): void {
    this.stopTurnTimer();
    this.stopReconnectCountdown();
  }
}
