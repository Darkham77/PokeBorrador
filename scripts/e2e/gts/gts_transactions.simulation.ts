import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, clickResilient, type WindowWithResolver } from '../e2e_helpers.ts';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  MOCK_POKEMON_LEVEL,
  MOCK_POKEMON_HP,
  MOCK_POKEMON_STAT,
  DEFAULT_MOCK_LISTING_PRICE,
  GTS_BATCH_PUBLISH_COUNT_9,
  GTS_SUITE_TIMEOUT_MS,
  INITIAL_SELLER_MONEY,
  SELLER_POKEMON_COUNT_12,
  MOCK_LISTINGS_COUNT_50,
  INITIAL_BUYER_MONEY,
  EXPECTED_BUYER_MONEY_AFTER_PURCHASE
} from '../simulation_config.ts';
import { DatabaseSync } from 'node:sqlite';

const SIMULATION_SETUP_POKEMON_LEVEL = 5;
const SIMULATION_ACTIVE_LISTINGS_MIN_COUNT = 9;
const E2E_EXPLORE_TAB_TIMEOUT_MS = 5000;
const E2E_PAGINATION_TIMEOUT_MS = 15000;
const E2E_MONEY_PURCHASE_TIMEOUT_MS = 20000;
const DEFAULT_MOVE_PP_COUNT = 35;
const MAX_ACTIVE_MARKET_LISTINGS_LIMIT = 10;

function seedMockListings(dbPath: string, count: number) {
  using db = new DatabaseSync(dbPath, { readOnly: false });
  try {
    const insertStmt = db.prepare(`
      INSERT INTO market_listings (seller_id, seller_name, listing_type, data, price, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `);

    const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew'];
    const speciesTypes: Record<string, { type: string, type2?: string }> = {
      caterpie: { type: 'bug' },
      weedle: { type: 'bug', type2: 'poison' },
      pidgey: { type: 'normal', type2: 'flying' },
      rattata: { type: 'normal' },
      spearow: { type: 'normal', type2: 'flying' },
      ekans: { type: 'poison' },
      sandshrew: { type: 'ground' }
    };
    
    db.exec('BEGIN TRANSACTION;');
    for (let i = 0; i < count; i++) {
      const sp = species[i % species.length]!;
      const typeInfo = speciesTypes[sp] || { type: 'normal' };
      const mockPkmn = {
        uid: `${sp}-mock-${i}`,
        id: sp,
        name: sp.charAt(0).toUpperCase() + sp.slice(1),
        level: MOCK_POKEMON_LEVEL,
        type: typeInfo.type,
        type2: typeInfo.type2,
        hp: MOCK_POKEMON_HP,
        maxHp: MOCK_POKEMON_HP,
        atk: MOCK_POKEMON_STAT,
        def: MOCK_POKEMON_STAT,
        spa: MOCK_POKEMON_STAT,
        spd: MOCK_POKEMON_STAT,
        spe: MOCK_POKEMON_STAT,
        status: '',
        moves: [{ name: 'Placaje', pp: DEFAULT_MOVE_PP_COUNT, maxPP: DEFAULT_MOVE_PP_COUNT }],
        nickname: `MOCK_${sp.toUpperCase()}_${i}`
      };

      insertStmt.run(
        `seller-mock-${i}`,
        `Vendedor_${i}`,
        'pokemon',
        JSON.stringify(mockPkmn),
        DEFAULT_MOCK_LISTING_PRICE
      );
    }
    db.exec('COMMIT;');
  } finally {
    try {
      db.close();
    } catch (_e: unknown) { /* expected */ }
  }
}

class GTSSimulationWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string, sqliteKey?: string) {
    super(page, username, undefined, sqliteKey);
  }

  public async setupUserInventory(money: number, pokemonCount: number): Promise<void> {
    await this.page.evaluate(async ({ money, pokemonCount }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const game = useGameStore();
      game.state.money = money;

      const team: typeof game.state.team = [];
      const box: typeof game.state.box = [];
      const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew'];
      for (let k = 0; k < pokemonCount; k++) {
        const sp = species[k % species.length]!;
        const pkmn = pokemonDebugService.generate({ id: sp, level: SIMULATION_SETUP_POKEMON_LEVEL_5 });
        pkmn.nickname = `GTS_TEST_${sp.toUpperCase()}_${k}`;
        if (k === 0) {
          team.push(pkmn);
        } else {
          box.push(pkmn);
        }
      }
      game.state.team = team;
      game.state.box = box;
      game.state.starterChosen = true;
      await game.saveGame();
    }, { money, pokemonCount });

    await this.reloadAndSync();
  }

  public async openGTS(): Promise<void> {
    await this.openModal('GlobalMarket');
  }

  public async publishNineDirectly(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gts = useGTSStore();
      const game = useGameStore();
      // MANDATORY: Ensure initial game save exists in SQLite game_saves table before RPC calls
      await game.save(false);

      const toPublish = [...game.state.box].slice(0, GTS_BATCH_PUBLISH_COUNT_9);
      for (const p of toPublish) {
        await gts.publishListing('pokemon', p, DEFAULT_MOCK_LISTING_PRICE);
      }

      // Force-refresh myListings directly from DB for this active seller
      const { useAuthStore } = await import('../../../src/stores/auth.ts');
      const auth = useAuthStore();
      const currentUserId = auth.user?.id || 'local_seller';
      const { data } = await game.db
        .from('market_listings')
        .select('*')
        .eq('seller_id', currentUserId)
        .neq('status', 'sold')
        .order('created_at', { ascending: false }) as { data: typeof gts.myListings | null };
      if (data) gts.myListings = data;
    });
  }

  public override async saveGameAndAwaitExport(): Promise<void> {
    const exportPromise = this.page.waitForResponse(response => 
      response.url().includes('/api/dev-export-db') && response.status() === 200
    );
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      await useGameStore().saveGame();
    });
    await exportPromise;
  }
}

test.describe('GTS Multi-Account Transactions Simulation', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/dev-import-db-cleanup');
  });

  test('should allow listing limits, pagination check, and successful purchase', async ({ browser, request }) => {
    test.setTimeout(GTS_SUITE_TIMEOUT_MS);

    const sellerContext = await browser.newContext();
    const pageSeller = await sellerContext.newPage();
    await pageSeller.addInitScript(() => {
      window.__GTS_SIMULATION__ = true;
    });
    const sellerName = `SELLER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const seller = new GTSSimulationWrapper(pageSeller, sellerName);

    // 1. Login y Setup Vendedor (12 Pokémon en banca: 9 se publican directo, 1 via UI, quedan 2 disponibles para el intento del 11º)
    await seller.setup();
    await waitForStoreReady(pageSeller);
    await seller.setupUserInventory(INITIAL_SELLER_MONEY, SELLER_POKEMON_COUNT_12);

    // 2. Abrir GTS
    await seller.openGTS();

    // 3. Publicar los primeros 9 Pokémon en background
    await seller.publishNineDirectly();

    // Sincronización basada en eventos: Esperar a que finalicen las operaciones de red/RPC y el store
    await pageSeller.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      const storeObj = store as unknown as Record<string, { isLoading?: boolean }>;
      return store && !store.isProcessing && !storeObj.loadingStore?.isLoading;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => {});

    // Esperar a que el loading overlay desaparezca
    await pageSeller.locator('#pv-loading-overlay').waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => {});

    // Verificar que las 9 publicaciones directas se registraron antes de continuar
    const activeListingsCount = await pageSeller.evaluate(async () => {
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      return useGTSStore().activeMyListings.length;
    });
    if (activeListingsCount < GTS_BATCH_PUBLISH_COUNT_9) {
      throw new Error(`[GTS TEST] publishNineDirectly sólo registró ${activeListingsCount}/${GTS_BATCH_PUBLISH_COUNT_9} publicaciones. El loop de publicación falló.`);
    }

    // Cambiar a pestaña PUBLICAR
    const publicarBtn = pageSeller.locator('#gts-tab-publish').filter({ visible: true }).first();
    await publicarBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(publicarBtn);

    // Publicar el 10º Pokémon por UI para alcanzar el límite
    const selectionItem = pageSeller.locator('[id^="pokemon-select-"]').first();
    await selectionItem.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(selectionItem);

    const priceInput = pageSeller.locator('#gts-price-input').first();
    await priceInput.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await priceInput.fill(String(DEFAULT_MOCK_LISTING_PRICE));

    const publishBtn = pageSeller.locator('#gts-publish-offer-btn').first();
    await clickResilient(publishBtn);

    // Esperar que se limpie la selección (10/10 alcanzados)
    await expect(pageSeller.locator('#gts-selection-hint')).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 4. Intentar publicar el 11º y verificar Toast de rechazo
    // Esperar que el store deje de procesar y la lista reactiva se repopule
    await pageSeller.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return resolver && !resolver.isProcessing;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => { void 0; });

    const nextSelectionItem = pageSeller.locator('[id^="pokemon-select-"]').first();
    await nextSelectionItem.waitFor({ state: 'visible', timeout: E2E_SEARCH_LONG_TIMEOUT_MS });
    await nextSelectionItem.scrollIntoViewIfNeeded();
    await clickResilient(nextSelectionItem);
    await priceInput.fill(String(DEFAULT_MOCK_LISTING_PRICE));
    await clickResilient(publishBtn);

    const toast = pageSeller.locator('[id^="toast-item-"]').first();
    await toast.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await expect(toast).toContainText(`Límite de publicaciones alcanzado (${MAX_ACTIVE_MARKET_LISTINGS_LIMIT})`);

    // Guardar partida para exportar
    await seller.saveGameAndAwaitExport();

    // 5. Inundar mercado con 50 ofertas mockeadas en la DB del servidor ANTES del setup del comprador
    seedMockListings(seller.getDbPath(), MOCK_LISTINGS_COUNT_50);

    // Sync disk changes back to Vite dev server's RAM cache so subsequent GET requests see them
    const fs = await import('node:fs');
    const updatedDbBuffer = fs.readFileSync(seller.getDbPath());
    await seller.syncDevDb(request, updatedDbBuffer);

    // 6. Setup Comprador (Logear e inyectar inventario inicial, lo cual descargará la DB con los mocks)
    const buyerContext = await browser.newContext();
    const pageBuyer = await buyerContext.newPage();
    await pageBuyer.addInitScript(() => {
      window.__GTS_SIMULATION__ = true;
    });
    const buyerName = `BUYER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const buyer = new GTSSimulationWrapper(pageBuyer, buyerName, seller.getSqliteKey());

    await buyer.setup();
    await waitForStoreReady(pageBuyer);
    await buyer.setupUserInventory(INITIAL_BUYER_MONEY, 1);
    await buyer.reloadAndSync();

    // Comprador abre GTS
    await buyer.openGTS();

    // Cambiar a Explorar
    const explorarBtn = pageBuyer.locator('#gts-tab-explore').filter({ visible: true }).first();
    await explorarBtn.waitFor({ state: 'visible', timeout: E2E_EXPLORE_TAB_TIMEOUT_MS });
    await clickResilient(explorarBtn);

    // Explicitly fetch listings in buyer store to load updated market mocks
    await pageBuyer.evaluate(async () => {
      const { initSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      await initSQLite({ forceReload: true });
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      await useGTSStore().fetchListings();
    });

    // Verificar paginación por ID único
    const pagination = pageBuyer.locator('#gts-explorer-pagination').first();
    await pagination.waitFor({ state: 'visible', timeout: E2E_PAGINATION_TIMEOUT_MS });
    await expect(pagination).toContainText('PÁGINA 1 DE 2');

    const nextBtn = pageBuyer.locator('#gts-explorer-next-btn').first();
    await expect(nextBtn).toBeEnabled();
    
    const prevBtn = pageBuyer.locator('#gts-explorer-prev-btn').first();
    await expect(prevBtn).toBeDisabled();

    await clickResilient(nextBtn);
    await expect(pagination).toContainText('PÁGINA 2 DE 2');
    await expect(nextBtn).toBeDisabled();
    await expect(prevBtn).toBeEnabled();

    await clickResilient(prevBtn);
    await expect(pagination).toContainText('PÁGINA 1 DE 2');

    // Comprar el primer Pokémon disponible
    const targetListing = pageBuyer.locator('[id^="market-item-wrapper-"]').first();
    const buyBtn = targetListing.locator('[id^="gts-buy-btn-"]').first();
    await clickResilient(buyBtn);

    // Esperar a procesar compra (saldos actualizados)
    await pageBuyer.waitForFunction((expectedMoney) => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      return store?.state?.money === expectedMoney;
    }, EXPECTED_BUYER_MONEY_AFTER_PURCHASE, { timeout: E2E_MONEY_PURCHASE_TIMEOUT_MS });

    const buyerMoney = await pageBuyer.evaluate(() => {
      return (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.()?.state?.money;
    });
    expect(buyerMoney).toBe(EXPECTED_BUYER_MONEY_AFTER_PURCHASE);

    seller.finish('GTS Multi-Account Transactions Simulation');

    // Cleanup
    await sellerContext.close();
    await buyerContext.close();
  });
});
