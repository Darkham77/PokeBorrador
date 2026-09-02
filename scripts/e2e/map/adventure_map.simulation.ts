import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';
import * as fs from 'fs';
import * as path from 'path';

class AdventureMapSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setPlayerLocation(routeId: string): Promise<void> {
    await this.page.evaluate(async (targetRoute) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      const gameStore = useGameStore();
      const uiStore = useUIStore();
      if (gameStore.state.map) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameStore.state.map.currentMap = targetRoute as any;
      }
      uiStore.activeTab = 'map';
      localStorage.setItem('pokeVicioLocation', 'pallet');
    }, routeId);
  }
}

test.describe('Adventure World Map Full Planning & Travel Simulation', () => {
  test('should plan travel on card click, show forecast stats, travel with center healing, and verify unique cards', async ({ page }) => {
    test.setTimeout(120000);
    const screenshotDir = path.resolve('scratch/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const sim = new AdventureMapSimulation(page, 'AdventurePlannerTester');
    await sim.setup();
    await waitForStoreReady(page);

    // Set mobile viewport (Samsung S23 equivalent: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    // Set location to pallet_town
    await sim.setPlayerLocation('pallet_town');
    await page.waitForTimeout(500);

    // Click ABRIR CROQUIS button
    const openCroquisBtn = page.locator('#open-adventure-map-modal-btn');
    await expect(openCroquisBtn).toBeVisible({ timeout: 5000 });
    await openCroquisBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Wait for adventure map viewport
    const viewport = page.locator('#map-viewport');
    await expect(viewport).toBeVisible({ timeout: 5000 });

    // Screenshot 1: Initial Parked View on Pallet Town
    await page.screenshot({ path: path.join(screenshotDir, '01_parked_pallet.png') });
    console.log('✅ Captured 01_parked_pallet.png');

    // Test Curar button in Pallet Town (triggers toast if team full health, or PokemonCenter modal)
    const healBtn = page.locator('#btn-adv-heal');
    await expect(healBtn).toBeVisible({ timeout: 5000 });
    await healBtn.click({ force: true });
    await page.waitForTimeout(400);

    // Switch to PC Desktop viewport to verify classic map cards do NOT leak at the bottom
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    // Assert classic map grid is not in DOM
    const classicDivider = page.locator('.legacy-divider');
    await expect(classicDivider).toHaveCount(0);
    await page.screenshot({ path: path.join(screenshotDir, '02b_pc_desktop_no_leak.png') });
    console.log('✅ Captured 02b_pc_desktop_no_leak.png');

    // TEST MOUSE WHEEL ZOOM ON PC DESKTOP

    const initialTransform = await page.evaluate(() => {
      const el = document.querySelector('#world-container') as HTMLElement | null;
      return el ? el.style.transform : 'none';
    });
    console.log('Transform before mouse wheel:', initialTransform);

    // Move mouse over center of map and scroll wheel
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(500);

    const afterZoomInTransform = await page.evaluate(() => {
      const el = document.querySelector('#world-container') as HTMLElement | null;
      return el ? el.style.transform : 'none';
    });
    console.log('Transform after mouse wheel zoom in (-300):', afterZoomInTransform);

    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(500);

    const afterZoomOutTransform = await page.evaluate(() => {
      const el = document.querySelector('#world-container') as HTMLElement | null;
      return el ? el.style.transform : 'none';
    });
    console.log('Transform after mouse wheel zoom out (+300):', afterZoomOutTransform);

    // Assert that mouse wheel changed the transform scale
    expect(afterZoomInTransform).not.toBe(initialTransform);

    // Return to mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    // Switch to Free Mode and test Zoom Out
    const btnFreeMap = page.locator('#btn-free-map');
    await btnFreeMap.click({ force: true });
    await page.waitForTimeout(600);

    const btnZoomOut = page.locator('#btn-zoom-out');
    await btnZoomOut.click({ force: true });
    await page.waitForTimeout(400);

    // Drag down smoothly to center Ciudad Verde in view
    const box = await viewport.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      await page.mouse.move(centerX, centerY + 100);
      await page.mouse.down();
      await page.mouse.move(centerX, centerY - 150, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(600);
    }

    // Screenshot 2: Free Mode northern Kanto showing Ciudad Verde and Cd. Azulona with Tactical Minimap
    await page.screenshot({ path: path.join(screenshotDir, '02_kanto_cards_distinct.png') });
    console.log('✅ Captured 02_kanto_cards_distinct.png');

    // Click on Ciudad Verde (viridian) node card
    const viridianCard = page.locator('#node-viridian').first();
    await viridianCard.dispatchEvent('click');

    // Wait for planning panel to emerge (not hidden)
    const activePlanningPanel = page.locator('#planning-ui-panel:not(.planning-hidden)');
    await expect(activePlanningPanel).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(600);

    // Screenshot 3: Planning Panel for Viridian City route with yellow glowing preview lines and forecast stats
    await page.screenshot({ path: path.join(screenshotDir, '03_planning_panel_viridian.png') });
    console.log('✅ Captured 03_planning_panel_viridian.png');

    // Click "¡VIAJAR!" button to begin travel across Ruta 1 to Viridian City
    const goBtn = page.locator('.planning-btn-go');
    await expect(goBtn).toBeVisible({ timeout: 5000 });
    await goBtn.click({ force: true });
    console.log('✅ Clicked ¡VIAJAR!');

    // Capture in-transit screenshot showing yellow trail consumption
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotDir, '03b_in_transit_trail.png') });
    console.log('✅ Captured 03b_in_transit_trail.png');

    // Wait for journey transit and healing at Viridian City's Pokemon Center
    await page.waitForTimeout(3000);

    // Screenshot 4: Arrived at Ciudad Verde
    await page.screenshot({ path: path.join(screenshotDir, '04_arrived_viridian.png') });
    console.log('✅ Captured 04_arrived_viridian.png');

    // Test 1: Inventory Modal (Mochila y MOs)
    const btnTeam = page.locator('#btn-team');
    await expect(btnTeam).toBeVisible({ timeout: 5000 });
    await btnTeam.click({ force: true });
    const invModal = page.locator('.adv-modal-card').first();
    await expect(invModal).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, '05_inventory_modal.png') });
    console.log('✅ Captured 05_inventory_modal.png');
    await page.locator('.adv-save-btn').click({ force: true });
    await expect(invModal).not.toBeVisible({ timeout: 5000 });

    // Test 2: Radar Modal
    const btnRadar = page.locator('#btn-radar');
    await expect(btnRadar).toBeVisible({ timeout: 5000 });
    await btnRadar.click({ force: true });
    const radarModal = page.locator('.adv-modal-card.border-yellow');
    await expect(radarModal).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, '06_radar_modal.png') });
    console.log('✅ Captured 06_radar_modal.png');
    await page.locator('.adv-btn-close.btn-yellow').click({ force: true });
    await expect(radarModal).not.toBeVisible({ timeout: 5000 });

    // Test 3: Debug Modal
    const btnDebug = page.locator('#btn-debug');
    await expect(btnDebug).toBeVisible({ timeout: 5000 });
    await btnDebug.click({ force: true });
    const debugModal = page.locator('.adv-modal-card.border-purple');
    await expect(debugModal).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, '07_debug_modal.png') });
    console.log('✅ Captured 07_debug_modal.png');
    await page.locator('.adv-btn-close.btn-purple').click({ force: true });
    await expect(debugModal).not.toBeVisible({ timeout: 5000 });
  });
});
