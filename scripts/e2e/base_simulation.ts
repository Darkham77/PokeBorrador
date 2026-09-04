import { type Page, expect } from '@playwright/test';
import { loginE2ETestUser, waitForStoreReady, flushE2ELogs } from './e2e_helpers.ts';
import { MAX_PER_ACTION_TIMEOUT_MS, MS_TO_SECONDS_DIVISOR } from './simulation_config.ts';

const SIMULATION_VIEWPORT_WIDTH_PX = 1600;
const SIMULATION_VIEWPORT_HEIGHT_PX = 900;
const DEFAULT_CLICK_TIMEOUT_MS = 5000;

export type SimulationDbDriver = 'sqlite' | 'postgres';

export interface SimulationOptions {
  driver?: SimulationDbDriver;
  sqliteKey?: string;
  logBuffer?: string[];
}

export abstract class BaseE2ESimulation {
  protected page: Page;
  protected username: string;
  protected sqliteKey: string;
  protected logBuffer: string[];
  protected driver: SimulationDbDriver;
  protected startTime: number = Temporal.Now.instant().epochMilliseconds;

  constructor(
    page: Page,
    username: string,
    logBufferOrOptions?: string[] | SimulationOptions,
    sqliteKey?: string,
    options?: SimulationOptions
  ) {
    this.page = page;
    this.username = username;

    let resolvedOptions: SimulationOptions | undefined;
    let resolvedBuffer: string[] | undefined;

    if (logBufferOrOptions && !Array.isArray(logBufferOrOptions)) {
      resolvedOptions = logBufferOrOptions;
      resolvedBuffer = resolvedOptions.logBuffer;
      sqliteKey = resolvedOptions.sqliteKey || sqliteKey;
    } else {
      resolvedBuffer = logBufferOrOptions;
      resolvedOptions = options;
    }

    this.driver = resolvedOptions?.driver ||
      (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER === 'postgres' ? 'postgres' : 'sqlite');
    this.sqliteKey = sqliteKey || resolvedOptions?.sqliteKey || `sim_db_${username.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`; // string-ok: Internal string formatting or DOM token identifier
    this.logBuffer = resolvedBuffer || resolvedOptions?.logBuffer || [];
  }

  /**
   * Obtiene el driver de base de datos configurado para esta simulación ('sqlite' | 'postgres')
   */
  public getDriver(): SimulationDbDriver {
    return this.driver;
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
   * Ejecuta consultas directas de verificación post-test, abstrayendo si la base subyacente
   * es SQLite en memoria o PostgreSQL en Docker vía postgres.js.
   */
  public async queryTestDb<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (this.driver === 'postgres') {
      const postgres = (await import('postgres')).default;
      const dbUrl = process.env.TEST_POSTGRES_URL || 'postgres://postgres:postgres@localhost:54329/postgres';
      const client = postgres(dbUrl, { max: 1, onnotice: () => {} });
      try {
        let transformedSql = sql;
        let pIndex = 1;
        transformedSql = transformedSql.replace(/\?/g, () => `$${pIndex++}`);
        const sanitizedParams = (params || []).map((p: unknown) => {
          if (typeof p === 'string' && (p.startsWith('{') || p.startsWith('['))) {
            try {
              return JSON.parse(p);
            } catch {
              return p;
            }
          }
          return p;
        });
        const rows = await client.unsafe<T[]>(transformedSql, sanitizedParams as never);
        return rows;
      } finally {
        await client.end();
      }
    }

    // SQLite Mode
    const dbPath = this.getDbPath();
    const fs = await import('node:fs');
    if (fs.existsSync(dbPath)) {
      const { DatabaseSync } = await import('node:sqlite');
      using db = new DatabaseSync(dbPath);
      const stmt = db.prepare(sql);
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        return stmt.all(...(params as (string | number | bigint | null)[])) as T[];
      }
      stmt.run(...(params as (string | number | bigint | null)[]));
      return [] as T[];
    }

    // Fallback if db is purely in browser memory: evaluate in browser
    return await this.page.evaluate(async ({ query, args }) => {
      const { queryLocal } = await import('../../src/logic/db/sqliteEngine.ts');
      return await queryLocal(query, args) as T[];
    }, { query: sql, args: params });
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
   * Carga una fixture de base de datos SQLite (.db) de forma universal para ambos motores:
   * - En SQLite: sincroniza el Buffer binario a través del puente dev /api/dev-export-db.
   * - En PostgreSQL: lee los datos de guardado del SQLite y los inserta en la tabla game_saves de PostgreSQL.
   */
  public async loadDatabaseFixture(fixturePath: string, request?: unknown): Promise<void> {
    const fs = await import('node:fs');
    if (!fs.existsSync(fixturePath)) {
      throw new Error(`[E2E] Base de datos fixture no encontrada en: ${fixturePath}`);
    }

    if (this.driver === 'postgres') {
      const { DatabaseSync } = await import('node:sqlite');
      using fixtureDb = new DatabaseSync(fixturePath, { readOnly: true });
      let saveDataJson: string | null = null;
      const targetKey = this.username.toLowerCase();
      let stmt = fixtureDb.prepare("SELECT save_data FROM game_saves WHERE user_id = ? OR user_id = ? LIMIT 1");
      let row = stmt.get(`local_${targetKey}`, targetKey) as { save_data: string } | undefined;
      if (!row) {
        stmt = fixtureDb.prepare("SELECT save_data FROM game_saves WHERE json_extract(save_data, '$.trainer') = ? LIMIT 1");
        row = stmt.get(targetKey) as { save_data: string } | undefined;
      }
      if (!row) {
        stmt = fixtureDb.prepare("SELECT save_data FROM game_saves LIMIT 1");
        row = stmt.get() as { save_data: string } | undefined;
      }
      if (row && row.save_data) {
        saveDataJson = typeof row.save_data === 'string' ? row.save_data : JSON.stringify(row.save_data);
      }

      if (saveDataJson) {
        const { createHash } = await import('node:crypto');
        const hash = createHash('sha256').update(this.username).digest('hex');
        const deterministicUuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
        const userEmail = `${this.username.toLowerCase().replace(/[^a-z0-9_]/g, '')}@test.local`;
        
        await this.queryTestDb(`INSERT INTO auth.users (id, email, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING;`, [deterministicUuid, userEmail]);
        await this.queryTestDb(`INSERT INTO public.profiles (id, username, email, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;`, [deterministicUuid, this.username, userEmail]);
        await this.queryTestDb(`INSERT INTO public.game_saves (user_id, save_data, last_save_id, updated_at) VALUES ($1, $2, gen_random_uuid(), NOW()) ON CONFLICT (user_id) DO UPDATE SET save_data = EXCLUDED.save_data, updated_at = NOW();`, [deterministicUuid, saveDataJson]);
      }
      return;
    }

    // SQLite mode: sync binary via dev server bridge
    const dbBuffer = fs.readFileSync(fixturePath);
    await this.syncDevDb(request, dbBuffer);
  }

  /**
   * Realiza una aserción semántica robusta sobre el contenido de un toast/notificación,
   * filtrando por texto para ser inmune al orden o colisiones de toasts anteriores.
   */
  public async expectToast(text: string, timeout = MAX_PER_ACTION_TIMEOUT_MS): Promise<void> {
    const toast = this.page.locator('[id^="toast-item-"]').filter({ hasText: text });
    try {
      await toast.waitFor({ state: 'visible', timeout });
      await expect(toast).toContainText(text);
    } catch (domErr: unknown) {
      const foundInHistory = await this.page.evaluate(async (targetText) => {
        const { useGameStore } = await import('../../src/stores/game.ts');
        const history = useGameStore().state.notificationHistory || [];
        return history.some(n => n.message?.includes(targetText));
      }, text);
      if (foundInHistory) return;
      throw domErr;
    }
  }

  /**
   * Ejecuta el setup de sesión y realiza el login determinista con selección de inicial automático
   */
  public async setup(): Promise<void> {
    this.startTime = Temporal.Now.instant().epochMilliseconds;
    await this.page.setViewportSize({ width: SIMULATION_VIEWPORT_WIDTH_PX, height: SIMULATION_VIEWPORT_HEIGHT_PX });

    // Pre-test State Reset by Inheritance
    if (this.driver === 'sqlite') {
      const dbPath = this.getDbPath();
      const fs = await import('node:fs');
      if (fs.existsSync(dbPath)) {
        try { fs.unlinkSync(dbPath); } catch { /* ignore non-existent db */ }
      }
    } else {
      try {
        await this.queryTestDb(`DELETE FROM market_listings WHERE seller_name = $1 OR seller_name LIKE $2`, [this.username, `${this.username}%`]);
        await this.queryTestDb(`DELETE FROM claim_queue WHERE user_id IN (SELECT id FROM profiles WHERE username = $1)`, [this.username]);
        await this.queryTestDb(`DELETE FROM competition_entries WHERE player_name = $1 OR player_name LIKE $2`, [this.username, `${this.username}%`]);
      } catch { /* ignore if tables empty or not initialized */ }
    }

    await loginE2ETestUser(this.page, this.username, this.logBuffer, this.sqliteKey, this.driver);
    // Wait for Pinia stores to be fully ready before any page.evaluate() call.
    await waitForStoreReady(this.page);
    console.log(`▶️ [${this.driver.toUpperCase()}] [SIM:START] [${this.username}] Escenario listo.`);
  }

  /**
   * Finaliza la simulación volcando el logBuffer acumulado en RAM al archivo de log
   * y emitiendo una línea limpia de progreso explícito en el terminal.
   */
  public finish(testName: string, status: 'passed' | 'failed' = 'passed'): void {
    const durationMs = Temporal.Now.instant().epochMilliseconds - this.startTime;
    const durationSec = (durationMs / MS_TO_SECONDS_DIVISOR).toFixed(1);
    const icon = status === 'passed' ? '✅' : '❌';
    console.log(`${icon} [${this.driver.toUpperCase()}] [SIM:DONE] [${this.username}] ${testName} (${durationSec}s)`);
    flushE2ELogs(this.logBuffer, testName, status, durationMs);
  }

  /**
   * Añade una entrada de log al buffer en memoria de la simulación.
   */
  public addLog(msg: string): void {
    this.logBuffer.push(msg);
  }

  /**
   * Obtiene una copia o referencia del logBuffer acumulado.
   */
  public getLogBuffer(): string[] {
    return this.logBuffer;
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
  public async reloadAndSync(timeoutMs?: number): Promise<void> {
    await this.page.reload();
    await waitForStoreReady(this.page, timeoutMs);
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
