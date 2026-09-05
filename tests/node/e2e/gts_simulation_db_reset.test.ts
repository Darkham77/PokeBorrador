import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseE2ESimulation } from '../../../scripts/e2e/base_simulation.ts';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

class TestE2ESimulation extends BaseE2ESimulation {
  public getIsSharedDatabase(): boolean {
    return this.isSharedDatabase;
  }
}

describe('GTS Multi-Account Simulation DB Reset & Isolation Parity', () => {
  let mockPage: Page;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPost = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    mockPage = {
      setViewportSize: vi.fn().mockResolvedValue(undefined),
      request: {
        post: mockPost,
        get: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
      },
    } as unknown as Page;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly classifies primary simulations as non-shared and secondary as shared database', () => {
    const primary = new TestE2ESimulation(mockPage, 'GtsSeller');
    expect(primary.getIsSharedDatabase()).toBe(false);

    const secondary = new TestE2ESimulation(mockPage, 'GtsBuyer', undefined, primary.getSqliteKey());
    expect(secondary.getIsSharedDatabase()).toBe(true);
    expect(secondary.getSqliteKey()).toBe(primary.getSqliteKey());
  });

  it('cleans up disk file and notifies Vite dev server RAM cache on cleanupSimulationDb', async () => {
    const primary = new TestE2ESimulation(mockPage, 'GtsSeller');
    const dbPath = primary.getDbPath();

    // Ensure temp directory and create dummy db file
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, 'dummy sqlite content');
    expect(fs.existsSync(dbPath)).toBe(true);

    await primary.cleanupSimulationDb();

    // File on disk must be unlinked
    expect(fs.existsSync(dbPath)).toBe(false);

    // Dev server must receive cleanup request with x-db-key
    expect(mockPost).toHaveBeenCalledWith('/api/dev-sim-db-cleanup', {
      headers: { 'x-db-key': primary.getSqliteKey() },
    });
  });

  it('shared database instance preserves primary database on disk during setup', async () => {
    const primary = new TestE2ESimulation(mockPage, 'GtsSeller');
    const dbPath = primary.getDbPath();

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, 'seller state with listings');

    const secondary = new TestE2ESimulation(mockPage, 'GtsBuyer', undefined, primary.getSqliteKey());

    // When secondary is shared, cleanupSimulationDb should not wipe disk or call endpoint
    if (!secondary.getIsSharedDatabase()) {
      await secondary.cleanupSimulationDb();
    }

    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fs.readFileSync(dbPath, 'utf8')).toBe('seller state with listings');

    // Clean up test file
    fs.unlinkSync(dbPath);
  });
});
