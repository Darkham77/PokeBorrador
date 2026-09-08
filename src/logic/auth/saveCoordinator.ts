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

export class SaveCoordinator {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingSaveFn: SaveExecutor | null = null;
  private batchStack: (SaveExecutor | null)[] = [];
  private batchDirty = false;
  private defaultDelayMs: number = DEFAULT_SAVE_DEBOUNCE_MS;
  private isUnloadRegistered = false;

  constructor(delayMs: number = DEFAULT_SAVE_DEBOUNCE_MS) {
    this.defaultDelayMs = delayMs;
    this.registerUnloadHandler();
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
   * Schedules a debounced save operation.
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
      void this.flushPendingSave();
    }, resolvedDelayMs);
  }

  /**
   * Immediately executes any scheduled debounced save without waiting for the timer.
   */
  public async flushPendingSave(): Promise<void> {
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
        logger.error('SAVE', 'Failed executing flushed save:', err);
      }
    }
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
   * Resets coordinator state (useful for tests).
   */
  public reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingSaveFn = null;
    this.batchStack = [];
    this.batchDirty = false;
  }
}

export const saveCoordinator = new SaveCoordinator();
