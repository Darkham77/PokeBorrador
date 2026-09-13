import { describe, it, expect, vi } from 'vitest';
import { type Locator } from '@playwright/test';
import { clickResilient } from '../../../scripts/e2e/helpers/e2eLogger.ts';

describe('clickResilient timeout resilience reproduction', () => {
  it('should pass explicit timeout options to locator.evaluate and allow adequate initial click budget', async () => {
    const capturedOptions: { click: { timeout?: number; force?: boolean }[]; evaluate?: { timeout?: number } } = {
      click: []
    };

    const mockLocator = {
      click: vi.fn().mockImplementation(async (opts: { timeout?: number; force?: boolean }) => {
        capturedOptions.click.push(opts);
        throw new Error('TimeoutError: locator.click: Timeout exceeded.');
      }),
      evaluate: vi.fn().mockImplementation(async (_fn: unknown, _arg: unknown, opts: { timeout?: number }) => {
        capturedOptions.evaluate = opts;
        return undefined;
      })
    } as unknown as Locator;

    await clickResilient(mockLocator, { timeout: 5000 });

    // Expect initial click not to be throttled to a fragile 500ms
    expect(capturedOptions.click[0]?.timeout).toBeGreaterThanOrEqual(2000);

    // Expect fallback evaluate to receive an explicit timeout option so it never hangs indefinitely
    expect(capturedOptions.evaluate).toBeDefined();
    expect(capturedOptions.evaluate?.timeout).toBeGreaterThan(0);
    expect((capturedOptions.evaluate?.timeout ?? 0)).toBeLessThanOrEqual(5000);
  });
});
