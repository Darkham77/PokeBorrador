import { type Page } from '@playwright/test';
import { loginE2ETestUser, waitForStoreReady, flushE2ELogs } from './e2e_helpers.ts';

const SIMULATION_VIEWPORT_WIDTH_PX = 1600;
const SIMULATION_VIEWPORT_HEIGHT_PX = 900;
const DEFAULT_CLICK_TIMEOUT_MS = 5000;

export abstract class BaseE2ESimulation {
  protected page: Page;
  protected username: string;
  protected sqliteKey: string;
  protected logBuffer: string[];
  protected startTime: number = Temporal.Now.instant().epochMilliseconds;

  constructor(page: Page, username: string, logBuffer?: string[], sqliteKey?: string) {
    this.page = page;
    this.username = username;
    this.sqliteKey = sqliteKey || `sim_db_${username.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`; // string-ok
    this.logBuffer = logBuffer || [];
  }

  /**
   * Obtiene la clave única de base de datos SQLite de esta simulación
   */
  public getSqliteKey(): string {
    return this.sqliteKey;
  }

  /**
   * Obtiene la ruta física absoluta de la base de datos de esta simulación
   */
  public getDbPath(): string {
    const cleanKey = this.sqliteKey.replace(/[^a-z0-9_]/g, '');
    const normalizedKey = cleanKey.startsWith('sim_') ? cleanKey : `sim_${cleanKey}`;
    return `database/temp/simulations/${normalizedKey}.db`;
  }

  /**
   * Sincroniza deterministamente un Buffer binario de SQLite hacia la memoria RAM del Vite Dev Server
   */
  public async syncDevDb(request: unknown, dbBuffer: Buffer): Promise<void> {
    const playwrightRequest = request as { post: (url: string, opts: unknown) => Promise<unknown> };
    await playwrightRequest.post('/api/dev-export-db', {
      headers: { 'Content-Type': 'application/octet-stream', 'x-db-key': this.sqliteKey },
      data: dbBuffer
    });
  }

  /**
   * Ejecuta el setup de sesión y realiza el login determinista con selección de inicial automático
   */
  public async setup(): Promise<void> {
    this.startTime = Temporal.Now.instant().epochMilliseconds;
    await this.page.setViewportSize({ width: SIMULATION_VIEWPORT_WIDTH_PX, height: SIMULATION_VIEWPORT_HEIGHT_PX });
    await loginE2ETestUser(this.page, this.username, this.logBuffer, this.sqliteKey);
    // Wait for Pinia stores to be fully ready before any page.evaluate() call.
    await waitForStoreReady(this.page);
  }

  /**
   * Finaliza la simulación volcando el logBuffer acumulado en RAM al archivo de log
   * y emitiendo una línea limpia de progreso explícito en el terminal.
   */
  public finish(testName: string, status: 'passed' | 'failed' = 'passed'): void {
    const durationMs = Temporal.Now.instant().epochMilliseconds - this.startTime;
    flushE2ELogs(this.logBuffer, testName, status, durationMs);
  }

  /** Persists the local game database; cross-context tests sync it explicitly through syncDevDb. */
  public async saveGameAndAwaitExport(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../src/stores/game.ts');
      await useGameStore().saveGame();
    });
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
  protected async clickElement(selector: string, timeout = DEFAULT_CLICK_TIMEOUT_MS): Promise<void> {
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

  /**
   * Cierra un modal del juego directamente utilizando el ModalStore en el cliente
   */
  public async closeModal(modalName: string): Promise<void> {
    await this.page.evaluate(async (name) => {
      const { useModalStore } = await import('../../src/stores/modals.ts');
      useModalStore().close(name);
    }, modalName);
  }
}
