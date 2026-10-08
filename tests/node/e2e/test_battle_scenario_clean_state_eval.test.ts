// test-fragmentation-ok: Isolated single-purpose regression test for battle scenario clean state eval
import { describe, it, expect, vi } from 'vitest';
import { resetSimulationToCleanState } from '../../../scripts/e2e/helpers/battleScenarioSetupHelper.ts';

import type { Page } from '@playwright/test';

describe('resetSimulationToCleanState evaluate argument parity', () => {
  it('passes initialSeedVal and replayRandomScale into page.evaluate without relying on unpassed outer Node constants', async () => {
    let capturedArg: unknown;
    let evalFnString = '';

    const mockPage = {
      evaluate: vi.fn(async (fn: Function, arg: unknown) => {
        capturedArg = arg;
        evalFnString = fn.toString();
      })
    } as unknown as Page;

    const mockQuery = vi.fn().mockResolvedValue([]);

    await resetSimulationToCleanState(mockPage, 'sqlite', 'test_user', mockQuery);

    expect(mockPage.evaluate).toHaveBeenCalledOnce();
    expect(capturedArg).toBeTypeOf('object');
    expect(capturedArg).toHaveProperty('initialSeedVal');
    expect(capturedArg).toHaveProperty('replayRandomScale');
    expect(capturedArg).toHaveProperty('simTimeScale');

    // The serialized browser function must not reference undeclared outer Node constants
    expect(evalFnString).not.toMatch(/\bINITIAL_SEED_VAL\b/);
    expect(evalFnString).not.toMatch(/\bREPLAY_RANDOM_SCALE\b/);
  });
});
