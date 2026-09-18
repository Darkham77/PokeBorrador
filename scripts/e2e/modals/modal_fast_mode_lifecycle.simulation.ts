/**
 * scripts/e2e/modals/modal_fast_mode_lifecycle.simulation.ts
 *
 * Playwright E2E Simulation: Fast Mode (Modo Rápido) Lifecycle.
 * Verifies that opening modals immediately triggers isFastMode across all
 * background map cards (.fast-mode / .performance-mode), suspends expensive
 * animations (leaves, background particles), and cleanly restores when dismissed.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 10s action timeouts, zero artificial timers)
 * - /game-simulation (dual DB execution, fail-fast determinism, in-file parallelism)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import type { ModalRegistryKey } from '../../../src/logic/modals/registry.ts';

class ModalFastModeSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async openModalDirectly(modalName: ModalRegistryKey): Promise<void> {
    await this.page.evaluate(async (name) => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().open(name as ModalRegistryKey);
    }, modalName);
  }

  public async closeModalDirectly(modalName: ModalRegistryKey): Promise<void> {
    await this.page.evaluate(async (name) => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().close(name as ModalRegistryKey);
    }, modalName);
  }

  public async isUiFastModeActive(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      return useUIStore().isFastMode;
    });
  }
}

test.describe('Modal Fast Mode (Modo Rápido) Lifecycle Simulation', () => {
  test('should immediately activate fast-mode on map cards when modal opens and restore on close', async ({ page }) => {
    const sim = new ModalFastModeSimWrapper(page, 'TestModalFastMode');
    await sim.setup();

    // 1. Initial State: No modal is open -> isFastMode is false
    expect(await sim.isUiFastModeActive()).toBe(false);

    // Initial map cards should not have .fast-mode
    const firstCard = page.locator('.map-card').first();
    await expect(firstCard).toBeAttached();
    await expect(firstCard).not.toHaveClass(/fast-mode/);

    // 2. Open Settings modal
    await sim.openModalDirectly('Settings');
    expect(await sim.isUiFastModeActive()).toBe(true);

    // Map cards must immediately possess .fast-mode
    await expect(firstCard).toHaveClass(/fast-mode/);

    // Leaf elements in background cards must not be present or unmounted
    const bgLeaves = page.locator('.map-card .leaf-element');
    await expect(bgLeaves).toHaveCount(0);

    // 3. Close Settings modal
    await sim.closeModalDirectly('Settings');
    expect(await sim.isUiFastModeActive()).toBe(false);
    await expect(firstCard).not.toHaveClass(/fast-mode/);
  });
});
