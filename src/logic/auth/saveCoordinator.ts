/**
 * src/logic/auth/saveCoordinator.ts
 *
 * Centralized coordinator for game save operations.
 * Enforces:
 * 1. Coalescing debounce (1.5s window) for spontaneous background updates (scheduleSave).
 * 2. Transactional batch context (withBatchSave) to silence intermediate saves in complex workflows.
 * 3. Emergency flush on browser unload (beforeunload).
 */

// audit-disable timers: Low-level persistence debounce coordinator
import { logger } from '@/logic/utils/logger';

export type SaveExecutor = () => Promise<unknown>;

export const DEFAULT_SAVE_DEBOUNCE_MS = 1500 as const;
export const CLOUD_SAVE_THROTTLE_MS = 60_000 as const;

export class SaveCoordinator {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingSaveFn: SaveExecutor | null = null;
  private batchStack: (SaveExecutor | null)[] = [];
  private batchDirty = false;
  private defaultDelayMs: number = DEFAULT_SAVE_DEBOUNCE_MS;
  private isUnloadRegistered = false;
  private timeProvider: () => number = () => Temporal.Now.instant().epochMilliseconds;

  // Tier 2: Cloud Throttling State
  private lastCloudSaveTime = 0;
  private isCloudDirty = false;
  private cloudTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCloudSaveFn: SaveExecutor | null = null;
  private cloudThrottleMs: number = CLOUD_SAVE_THROTTLE_MS;

  constructor(delayMs: number = DEFAULT_SAVE_DEBOUNCE_MS, cloudThrottleMs: number = CLOUD_SAVE_THROTTLE_MS) {
    this.defaultDelayMs = delayMs;
    this.cloudThrottleMs = cloudThrottleMs;
    this.registerUnloadHandler();
  }

  public setTimeProvider(provider: () => number): void {
    this.timeProvider = provider;
  }

  private now(): number {
    return this.timeProvider();
  }

  private registerUnloadHandler(): void {
    if (typeof window !== 'undefined' && !this.isUnloadRegistered) {
      window.addEventListener('beforeunload', () => {
        void this.flushPendingSave();
      });
      this.isUnloadRegistered = true;
    }
  }

  /**
   * Checks whether code is currently executing inside a batch save context.
   */
  public isBatchActive(): boolean {
    return this.batchStack.length > 0;
  }

  /**
   * Evaluates whether a remote cloud save is authorized given the throttle window.
   */
  public shouldExecuteCloudSave(forceRemote = false): boolean {
    if (forceRemote) return true;
    if (this.lastCloudSaveTime === 0) return true;
    return (this.now() - this.lastCloudSaveTime) >= this.cloudThrottleMs;
  }

  /**
   * Records a successful remote cloud save, updating the timestamp and clearing dirty status.
   */
  public notifyCloudSaveSuccess(): void {
    this.lastCloudSaveTime = this.now();
    this.isCloudDirty = false;
    if (this.cloudTimer) {
      clearTimeout(this.cloudTimer);
      this.cloudTimer = null;
    }
    this.pendingCloudSaveFn = null;
  }

  /**
   * Marks cloud state as dirty and schedules a trailing sync when the throttle window expires.
   */
  public markCloudDirty(cloudSaveFn: SaveExecutor): void {
    this.isCloudDirty = true;
    this.pendingCloudSaveFn = cloudSaveFn;

    if (!this.cloudTimer) {
      const elapsed = this.now() - this.lastCloudSaveTime;
      const remaining = Math.max(0, this.cloudThrottleMs - elapsed);

      this.cloudTimer = setTimeout(() => {
        this.cloudTimer = null;
        void this.flushPendingCloudSave();
      }, remaining);
    }
  }

  /**
   * Immediately flushes any pending throttled cloud save without waiting for the throttle timer.
   */
  public async flushPendingCloudSave(): Promise<void> {
    if (this.cloudTimer) {
      clearTimeout(this.cloudTimer);
      this.cloudTimer = null;
    }

    if (this.isCloudDirty && this.pendingCloudSaveFn) {
      const fn = this.pendingCloudSaveFn;
      this.pendingCloudSaveFn = null;
      try {
        await fn();
      } catch (err) {
        logger.error('SAVE', 'Failed executing flushed cloud save:', err);
      }
    }
  }

  /**
   * Schedules a debounced local save operation.
   * If inside a batch, saves are suppressed and marked dirty for single execution at batch completion.
   */
  public schedule(saveFn: SaveExecutor, delayMs?: number): void {
    if (this.isBatchActive()) {
      this.batchDirty = true;
      const topIdx = this.batchStack.length - 1;
      if (!this.batchStack[topIdx]) {
        this.batchStack[topIdx] = saveFn;
      }
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.pendingSaveFn = saveFn;
    const resolvedDelayMs = delayMs ?? this.defaultDelayMs;

    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flushPendingLocalSave();
    }, resolvedDelayMs);
  }

  /**
   * Flushes only the pending debounced local save.
   */
  private async flushPendingLocalSave(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pendingSaveFn) {
      const fn = this.pendingSaveFn;
      this.pendingSaveFn = null;
      try {
        await fn();
      } catch (err) {
        logger.error('SAVE', 'Failed executing flushed local save:', err);
      }
    }
  }

  /**
   * Immediately executes any scheduled debounced save and any pending cloud save.
   */
  public async flushPendingSave(): Promise<void> {
    await this.flushPendingLocalSave();
    await this.flushPendingCloudSave();
  }

  /**
   * Executes an asynchronous action within a transactional batch context.
   * Any intermediate calls to save or scheduleSave are silenced and flagged dirty.
   * Once the action completes (and all nested batches exit), a single atomic save is executed.
   */
  public async withBatchSave<T>(action: () => Promise<T>, finalSaveFn?: SaveExecutor): Promise<T> {
    this.batchStack.push(finalSaveFn ?? null);

    try {
      return await action();
    } finally {
      const poppedCommitter = this.batchStack.pop();
      if (this.batchStack.length === 0) {
        const needsSave = this.batchDirty || Boolean(poppedCommitter);
        this.batchDirty = false;

        if (needsSave && poppedCommitter) {
          try {
            await poppedCommitter();
          } catch (err) {
            logger.error('SAVE', 'Failed executing atomic batch completion save:', err);
          }
        }
      } else if (poppedCommitter) {
        const parentIdx = this.batchStack.length - 1;
        if (!this.batchStack[parentIdx]) {
          this.batchStack[parentIdx] = poppedCommitter;
        }
      }
    }
  }

  /**
   * Inspects whether a local debounced save timer is currently pending.
   */
  public hasPendingLocalSave(): boolean {
    return this.timer !== null;
  }

  /**
   * Inspects whether local changes are pending cloud synchronization.
   */
  public isDirty(): boolean {
    return this.isCloudDirty;
  }

  /**
   * Returns the epoch millisecond timestamp of the last successful remote cloud save.
   */
  public getLastCloudSaveTime(): number {
    return this.lastCloudSaveTime;
  }

  /**
   * Configures the cloud throttle window (ms), useful for tests.
   */
  public setCloudThrottleMs(ms: number): void {
    this.cloudThrottleMs = ms;
  }

  /**
   * Overrides last cloud save timestamp, useful for tests.
   */
  public setLastCloudSaveTime(time: number): void {
    this.lastCloudSaveTime = time;
  }

  /**
   * Resets coordinator state (useful for tests).
   */
  public reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.cloudTimer) {
      clearTimeout(this.cloudTimer);
      this.cloudTimer = null;
    }
    this.pendingSaveFn = null;
    this.pendingCloudSaveFn = null;
    this.batchStack = [];
    this.batchDirty = false;
    this.isCloudDirty = false;
    this.lastCloudSaveTime = 0;
  }
}

export const saveCoordinator = new SaveCoordinator();
