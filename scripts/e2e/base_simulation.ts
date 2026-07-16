import { type Page } from '@playwright/test';
import { setupE2ESession, loginE2ETestUser, waitForStoreReady } from './e2e_helpers.ts';

export abstract class BaseE2ESimulation {
  protected page: Page;
  protected username: string;

  constructor(page: Page, username: string) {
    this.page = page;
    this.username = username;
  }

  /**
   * Ejecuta el setup de sesión y realiza el login determinista con selección de inicial automático
   */
  public async setup(): Promise<void> {
    await setupE2ESession(this.page);
    await loginE2ETestUser(this.page, this.username);
    // Wait for Pinia stores to be fully ready before any page.evaluate() call.
    // loginE2ETestUser only waits for mapaBtn to be attached — the Vue router
    // may still be mid-transition, causing "Execution context was destroyed".
    await waitForStoreReady(this.page);
  }

  /**
   * Recarga la página y espera a que los stores vuelvan a estar sincronizados y listos
   */
  public async reloadAndSync(): Promise<void> {
    await this.page.reload();
    await waitForStoreReady(this.page);
  }

  /**
   * Espera a que un selector del DOM esté visible y realiza click resilientemente
   */
  protected async clickElement(selector: string, timeout = 5000): Promise<void> {
    const locator = this.page.locator(selector).filter({ visible: true }).first();
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click();
  }

  /**
   * Abre un modal del juego directamente utilizando el ModalStore en el cliente
   */
  public async openModal(modalName: string): Promise<void> {
    await this.page.evaluate(async (name) => {
      const { useModalStore } = await import('../../src/stores/modals.ts');
      useModalStore().open(name);
    }, modalName);
  }
}
