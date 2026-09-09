import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';

export class UpdateLifecycleSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async notifyOutdatedClient(client: string, server: string): Promise<void> {
    await this.page.evaluate(async ({ c, s }) => {
      const { useUpdateStore } = await import('../../../src/stores/update.ts');
      useUpdateStore().notifyOutdatedClient({ client: c, server: s });
    }, { c: client, s: server });
  }

  public async notifyDbIncompatible(client: string, server: string, db: string): Promise<void> {
    await this.page.evaluate(async ({ c, s, d }) => {
      const { useUpdateStore } = await import('../../../src/stores/update.ts');
      useUpdateStore().notifyDbIncompatible({ client: c, server: s, db: d });
    }, { c: client, s: server, d: db });
  }

  public async notifyOutdatedServer(client: string, server: string): Promise<void> {
    await this.page.evaluate(async ({ c, s }) => {
      const { useUpdateStore } = await import('../../../src/stores/update.ts');
      useUpdateStore().notifyOutdatedServer({ client: c, server: s });
    }, { c: client, s: server });
  }

  public async emitPwaNeedRefresh(): Promise<void> {
    await this.page.evaluate(async () => {
      const { gameBus } = await import('../../../src/logic/events/gameBus.ts');
      gameBus.emit('PWA_NEED_REFRESH');
    });
  }

  public async notifyChunkLoadError(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useUpdateStore } = await import('../../../src/stores/update.ts');
      useUpdateStore().notifyChunkLoadError(new Error('Failed to fetch dynamically imported module'));
    });
  }

  public async isUserLoggedIn(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      const { useAuthStore } = await import('../../../src/stores/auth.ts');
      return Boolean(useAuthStore().user);
    });
  }

  public async getSessionStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => sessionStorage.getItem(k), key);
  }
}

test.describe('System Update Lifecycle & Version Compatibility Simulation', () => {
  test('should display update overlay when client is outdated, log out on click, and navigate to /login', async ({ page }) => {
    const sim = new UpdateLifecycleSimulation(page, 'UpdateTestUser1');

    await sim.setup();
    await waitForStoreReady(page);

    await sim.notifyOutdatedClient('v0.4.0', 'v0.5.0');

    const updateBtn = page.locator('#app-loading-overlay-update-btn');
    await updateBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await updateBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.waitForURL(url => url.pathname.endsWith('/login'), { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    expect(page.url()).toContain('/login');
    const isUserLoggedIn = await sim.isUserLoggedIn();
    expect(isUserLoggedIn).toBe(false);

    const localTab = page.locator('#server-tab-local');
    await expect(localTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });

  test('should display database lock overlay when db is incompatible and exit cleanly to /login', async ({ page }) => {
    const sim = new UpdateLifecycleSimulation(page, 'UpdateTestUser2');

    await sim.setup();
    await waitForStoreReady(page);

    await sim.notifyDbIncompatible('20240416000001', '20260417200000', '20260417200000');

    const logoutBtn = page.locator('#version-lock-logout-btn');
    await logoutBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await logoutBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.waitForURL(url => url.pathname.endsWith('/login'), { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    expect(page.url()).toContain('/login');
    const isUserLoggedIn = await sim.isUserLoggedIn();
    expect(isUserLoggedIn).toBe(false);

    const localTab = page.locator('#server-tab-local');
    await expect(localTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });

  test('should display server lock overlay when server is outdated and exit cleanly to /login', async ({ page }) => {
    const sim = new UpdateLifecycleSimulation(page, 'UpdateTestUser3');

    await sim.setup();
    await waitForStoreReady(page);

    await sim.notifyOutdatedServer('v2.0.0', 'v1.0.0');

    const logoutBtn = page.locator('#version-lock-logout-btn');
    await logoutBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await logoutBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.waitForURL(url => url.pathname.endsWith('/login'), { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    expect(page.url()).toContain('/login');
    const isUserLoggedIn = await sim.isUserLoggedIn();
    expect(isUserLoggedIn).toBe(false);

    const localTab = page.locator('#server-tab-local');
    await expect(localTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });

  test('should handle live Service Worker update during gameplay and cleanly redirect to /login', async ({ page }) => {
    const sim = new UpdateLifecycleSimulation(page, 'UpdateTestUser4');

    await sim.setup();
    await waitForStoreReady(page);

    await sim.emitPwaNeedRefresh();

    const updateBtn = page.locator('#app-loading-overlay-update-btn');
    await updateBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await updateBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.waitForURL(url => url.pathname.endsWith('/login'), { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    expect(page.url()).toContain('/login');
    const isUserLoggedIn = await sim.isUserLoggedIn();
    expect(isUserLoggedIn).toBe(false);

    const localTab = page.locator('#server-tab-local');
    await expect(localTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });

  test('should display update overlay when chunk load error occurs and navigate cleanly to /login', async ({ page }) => {
    const sim = new UpdateLifecycleSimulation(page, 'UpdateTestUser5');

    await sim.setup();
    await waitForStoreReady(page);

    await sim.notifyChunkLoadError();

    const updateBtn = page.locator('#app-loading-overlay-update-btn');
    await updateBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await updateBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.waitForURL(url => url.pathname.endsWith('/login'), { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    expect(page.url()).toContain('/login');
    const isUserLoggedIn = await sim.isUserLoggedIn();
    expect(isUserLoggedIn).toBe(false);

    const localTab = page.locator('#server-tab-local');
    await expect(localTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });

  test('should allow executing update from login screen via update button without loop', async ({ page }) => {
    await page.goto('/login');

    // Wait for the login screen to be active
    const localTab = page.locator('#server-tab-local');
    await localTab.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // Trigger update notification on login page
    await page.evaluate(async () => {
      const { useUpdateStore } = await import('../../../src/stores/update.ts');
      useUpdateStore().notifyOutdatedClient({ client: 'v0.4.0', server: 'v0.5.0' });
    });

    const updateBtn = page.locator('#login-pwa-update-btn');
    await updateBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await updateBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // After clicking update, page performs cache-busting reload and remains on /login
    await page.waitForURL(url => url.pathname.endsWith('/login'), { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    expect(page.url()).toContain('/login');
    await expect(localTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });
});
