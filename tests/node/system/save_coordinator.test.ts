import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveCoordinator } from '../../../src/logic/auth/saveCoordinator.ts';

describe('SaveCoordinator Architecture Suite', () => {
  let coordinator: SaveCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    coordinator = new SaveCoordinator(1500);
    coordinator.setTimeProvider(Date.now);
  });

  it('coalesces multiple rapid save requests into a single debounced save', async () => {
    const saveMock = vi.fn().mockResolvedValue(true);

    coordinator.schedule(saveMock, 1500);
    coordinator.schedule(saveMock, 1500);
    coordinator.schedule(saveMock, 1500);

    expect(saveMock).not.toHaveBeenCalled();

    // Advance 1000ms (still within 1500ms window)
    vi.advanceTimersByTime(1000);
    expect(saveMock).not.toHaveBeenCalled();

    // Advance past 1500ms
    vi.advanceTimersByTime(600);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('flushes pending save immediately on flushPendingSave()', async () => {
    const saveMock = vi.fn().mockResolvedValue(true);

    coordinator.schedule(saveMock, 1500);
    expect(saveMock).not.toHaveBeenCalled();

    await coordinator.flushPendingSave();
    expect(saveMock).toHaveBeenCalledTimes(1);

    // Advancing timers afterwards should NOT trigger a second save
    vi.advanceTimersByTime(2000);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('suppresses saves within withBatchSave and executes single save at batch exit', async () => {
    const finalSaveMock = vi.fn().mockResolvedValue(true);
    const intermediateSaveMock = vi.fn().mockResolvedValue(true);

    await coordinator.withBatchSave(async () => {
      expect(coordinator.isBatchActive()).toBe(true);

      // Trigger multiple intermediate saves inside the batch
      coordinator.schedule(intermediateSaveMock, 1500);
      coordinator.schedule(intermediateSaveMock, 1500);

      // Intermediate saves must not have executed
      expect(intermediateSaveMock).not.toHaveBeenCalled();
      expect(finalSaveMock).not.toHaveBeenCalled();
    }, finalSaveMock);

    expect(coordinator.isBatchActive()).toBe(false);
    // Intermediate mock was silenced
    expect(intermediateSaveMock).not.toHaveBeenCalled();
    // Final save mock was executed exactly once upon batch exit
    expect(finalSaveMock).toHaveBeenCalledTimes(1);
  });

  it('handles nested withBatchSave without early saves until root batch completes', async () => {
    const rootSaveMock = vi.fn().mockResolvedValue(true);
    const innerSaveMock = vi.fn().mockResolvedValue(true);

    await coordinator.withBatchSave(async () => {
      coordinator.schedule(innerSaveMock, 1500);

      await coordinator.withBatchSave(async () => {
        coordinator.schedule(innerSaveMock, 1500);
      });

      // Still inside root batch: neither inner nor root save should have run
      expect(rootSaveMock).not.toHaveBeenCalled();
    }, rootSaveMock);

    expect(coordinator.isBatchActive()).toBe(false);
    expect(rootSaveMock).toHaveBeenCalledTimes(1);
  });

  describe('Tier 2 Cloud Throttling Suite (The 60-Second Principle)', () => {
    it('authorizes initial cloud save on fresh session', () => {
      expect(coordinator.shouldExecuteCloudSave()).toBe(true);
      expect(coordinator.shouldExecuteCloudSave(false)).toBe(true);
    });

    it('throttles cloud saves within the 60-second window', () => {
      coordinator.notifyCloudSaveSuccess();
      expect(coordinator.isDirty()).toBe(false);

      // Immediately afterwards: should be throttled
      expect(coordinator.shouldExecuteCloudSave(false)).toBe(false);

      // Advance 30 seconds: still throttled
      vi.advanceTimersByTime(30_000);
      expect(coordinator.shouldExecuteCloudSave(false)).toBe(false);

      // Advance past 60 seconds: authorized again
      vi.advanceTimersByTime(30_001);
      expect(coordinator.shouldExecuteCloudSave(false)).toBe(true);
    });

    it('bypasses 60s throttle immediately when forceRemote is true', () => {
      coordinator.notifyCloudSaveSuccess();
      expect(coordinator.shouldExecuteCloudSave(false)).toBe(false);

      // forceRemote bypasses throttle
      expect(coordinator.shouldExecuteCloudSave(true)).toBe(true);
    });

    it('marks cloud state dirty and executes trailing sync after remaining throttle time', async () => {
      coordinator.notifyCloudSaveSuccess();
      const trailingCloudSaveMock = vi.fn().mockResolvedValue(true);

      // Mark dirty 10 seconds into the 60s window
      vi.advanceTimersByTime(10_000);
      coordinator.markCloudDirty(trailingCloudSaveMock);

      expect(coordinator.isDirty()).toBe(true);
      expect(trailingCloudSaveMock).not.toHaveBeenCalled();

      // Advance 49 seconds (total 59s elapsed): still waiting
      vi.advanceTimersByTime(49_000);
      expect(trailingCloudSaveMock).not.toHaveBeenCalled();
      expect(coordinator.isDirty()).toBe(true);

      // Advance 2 seconds (total 61s elapsed): trailing cloud save executes!
      vi.advanceTimersByTime(2000);
      expect(trailingCloudSaveMock).toHaveBeenCalledTimes(1);
    });

    it('flushes pending dirty cloud save immediately on flushPendingSave()', async () => {
      coordinator.notifyCloudSaveSuccess();
      const trailingCloudSaveMock = vi.fn().mockResolvedValue(true);

      vi.advanceTimersByTime(5000);
      coordinator.markCloudDirty(trailingCloudSaveMock);
      expect(coordinator.isDirty()).toBe(true);

      // Emergency flush (e.g. beforeunload / logout)
      await coordinator.flushPendingSave();

      expect(trailingCloudSaveMock).toHaveBeenCalledTimes(1);

      // Advancing timer afterwards should NOT call it again
      vi.advanceTimersByTime(60_000);
      expect(trailingCloudSaveMock).toHaveBeenCalledTimes(1);
    });
  });
});
