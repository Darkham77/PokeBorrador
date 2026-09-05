import { test, expect } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../e2e_constants.ts';

/**
 * REPRODUCTION PLAYWRIGHT SIMULATION TEMPLATE (Tier 3)
 *
 * Location: scripts/e2e/<family>/reproduce_<slug>.simulation.ts
 *
 * Applicable ONLY when the bug affects:
 * - UI components, dialogs, or modal transitions.
 * - GSAP animations, camera, or event-driven interaction readiness.
 * - Visual combat choreography or switch menus.
 * - Persistence requiring genuine page reloads (F5).
 *
 * Inviolable Laws:
 * 1. Passive Joystick: Test only reacts to typed public events and official UI.
 * 2. 100% ID-Based Locators: Only locator('#<id>') or data-pokemon-uid attributes.
 * 3. Strict 10s Action Timeout: MAX_PER_ACTION_TIMEOUT_MS = 10000. Never inflate!
 * 4. Zero Artificial Timers: No waitForTimeout(), sleep(), or retry loops.
 */

test.describe('Reproduction Simulation: [UI/Interaction Bug Title]', () => {
  test('reproduces and validates UI interaction flow', async ({ page }) => {
    const sim = new BaseE2ESimulation(page);
    await sim.setup();

    // 1. Arm public event listener BEFORE triggering action
    const readyEventPromise = page.evaluate(() => {
      return new Promise<void>((resolve) => {
        window.addEventListener('battle-ready-for-input', () => resolve(), { once: true });
      });
    });

    // 2. Interact exclusively via visible official UI controls by #id
    const startButton = page.locator('#start-adventure-btn');
    await expect(startButton).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await startButton.click();

    // 3. Await typed public event
    await readyEventPromise;

    // 4. Assert UI post-condition by #id
    const modalWindow = page.locator('#game-modal-content');
    await expect(modalWindow).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await sim.finish();
  });
});
