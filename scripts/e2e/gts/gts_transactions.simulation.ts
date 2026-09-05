import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, clickResilient, type WindowWithResolver } from '../e2e_helpers.ts';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  MOCK_POKEMON_LEVEL,
  MOCK_POKEMON_HP,
  MOCK_POKEMON_STAT,
  DEFAULT_MOCK_LISTING_PRICE,
  GTS_BATCH_PUBLISH_LIMIT,
  GTS_SUITE_TIMEOUT_MS,
  INITIAL_SELLER_MONEY,
  SELLER_POKEMON_BATCH_COUNT,
  MOCK_LISTINGS_POOL_SIZE,
  INITIAL_BUYER_MONEY,
  EXPECTED_BUYER_MONEY_AFTER_PURCHASE
} from '../simulation_config.ts';
import { DatabaseSync } from 'node:sqlite';

const SIMULATION_SETUP_POKEMON_LEVEL = 5;
const E2E_EXPLORE_TAB_TIMEOUT_MS = 5000;
const E2E_PAGINATION_TIMEOUT_MS = 15000;
const E2E_MONEY_PURCHASE_TIMEOUT_MS = 20000;
const DEFAULT_MOVE_PP_COUNT = 35;
const MAX_ACTIVE_MARKET_LISTINGS_LIMIT = 10;

async function seedMockListings(dbPath: string, count: number) {
  const isPostgres = process.env.SIM_DB_DRIVER === 'postgres';
  const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew']; // no-domain: Non-domain utility collection or data structure
  const speciesTypes: Record<string, { type: string, type2?: string }> = {
    caterpie: { type: 'bug' },
    weedle: { type: 'bug', type2: 'poison' },
    pidgey: { type: 'normal', type2: 'flying' },
    rattata: { type: 'normal' },
    spearow: { type: 'normal', type2: 'flying' },
    ekans: { type: 'poison' },
    sandshrew: { type: 'ground' }
  };

  const mockItems: Array<{ uid: string; name: string; type: string; price: number; pkmn: Record<string, unknown> }> = [];
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
    mockItems.push({
      uid: mockPkmn.uid,
      name: `Vendedor_${i}`,
      type: 'pokemon',
      price: DEFAULT_MOCK_LISTING_PRICE,
      pkmn: mockPkmn
    });
  }

  if (isPostgres) {
    const { POSTGRES_URL } = await import('../../testing/postgres_test_container.js');
    const postgres = (await import('postgres')).default;
    const sql = postgres(POSTGRES_URL, { max: 1 });
    const mockSellerId = '00000000-0000-4000-8000-000000000050';
    await sql`INSERT INTO auth.users (id, email, created_at) VALUES (${mockSellerId}, 'mock_seller@local.test', NOW()) ON CONFLICT (id) DO NOTHING;`;
    await sql`INSERT INTO public.profiles (id, username, email, created_at) VALUES (${mockSellerId}, 'MockVendor', 'mock_seller@local.test', NOW()) ON CONFLICT (id) DO NOTHING;`;

    for (const item of mockItems) {
      await sql`INSERT INTO market_listings (seller_id, seller_name, listing_type, data, price, status, created_at) VALUES (${mockSellerId}, ${item.name}, ${item.type}, ${sql.json(item.pkmn as never)}, ${item.price}, 'active', NOW());`;
    }
    await sql.end();
    return;
  }

  using db = new DatabaseSync(dbPath, { readOnly: false });
  try {
    const insertStmt = db.prepare(`
      INSERT INTO market_listings (seller_id, seller_name, listing_type, data, price, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `);
    db.exec('BEGIN TRANSACTION;');
    for (let i = 0; i < mockItems.length; i++) {
      const item = mockItems[i]!;
      insertStmt.run(`seller-mock-${i}`, item.name, item.type, JSON.stringify(item.pkmn), item.price);
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
    await this.page.evaluate(
      async ({ money, pokemonCount, setupLevel }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        
        const game = useGameStore();

        const team: typeof game.state.team = [];
        const box: typeof game.state.box = [];
        const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew'] as const satisfies readonly import('../../../src/data/pokemon/pokedex.ts').PokemonSpeciesId[];
        for (let k = 0; k < pokemonCount; k++) {
          const sp = species[k % species.length]!;
          const pkmn = pokemonDebugService.generate({ id: sp, level: setupLevel });
          pkmn.nickname = `GTS_TEST_${sp.toUpperCase()}_${k}`;
          if (k === 0) {
            team.push(pkmn);
          } else {
            box.push(pkmn);
          }
        }
        game.updateState({ money, team, box, starterChosen: true });
        let saveRes = await game.save(false);
        while (!saveRes?.success) {
          await new Promise(r => window.setTimeout(r, 100));
          saveRes = await game.save(false);
        }
        console.log('[DEBUG GTS] setupUserInventory save result:', saveRes);
      },
      { money, pokemonCount, setupLevel: SIMULATION_SETUP_POKEMON_LEVEL }
    );
  }

  public async openGTS(): Promise<void> {
    await this.openModal('GlobalMarket');
  }

  public async publishNineDirectly(): Promise<void> {
    await this.page.evaluate(
      async ({ publishLimit, listingPrice }) => {
        const { useGTSStore } = await import('../../../src/stores/gts.ts');
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const gts = useGTSStore();
        const game = useGameStore();
        // MANDATORY: Ensure initial game save exists in SQLite game_saves table before RPC calls
        await game.save(false);

        const toPublish = [...game.state.box].slice(0, publishLimit);
        for (const p of toPublish) {
          if (!p) continue;
          await gts.publishListing('pokemon', p, listingPrice);
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
      },
      { publishLimit: GTS_BATCH_PUBLISH_LIMIT, listingPrice: DEFAULT_MOCK_LISTING_PRICE }
    );
  }

}

test.describe('GTS Multi-Account Transactions Simulation', () => {
  test('should allow listing limits, pagination check, and successful purchase', async ({ browser, request }) => {
    test.setTimeout(GTS_SUITE_TIMEOUT_MS);

    const sellerContext = await browser.newContext();
    const pageSeller = await sellerContext.newPage();
    await pageSeller.addInitScript(() => {
      window.__GTS_SIMULATION__ = true;
    });
    const seller = new GTSSimulationWrapper(pageSeller, 'GtsSeller');

    // 1. Login y Setup Vendedor (limpieza de estado heredada en setup())
    await seller.setup();
    await waitForStoreReady(pageSeller);
    await seller.setupUserInventory(INITIAL_SELLER_MONEY, SELLER_POKEMON_BATCH_COUNT);

    // 2. Abrir GTS
    await seller.openGTS();

    // 3. Publicar los primeros 9 Pokémon en background
    await seller.publishNineDirectly();

    // Sincronización basada en eventos: Esperar a que el loading overlay desaparezca
    await pageSeller.locator('#pv-loading-overlay').waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // Verificar que las 9 publicaciones directas se registraron antes de continuar
    const activeListingsCount = await pageSeller.evaluate(async () => {
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      return useGTSStore().activeMyListings.length;
    });
    if (activeListingsCount < GTS_BATCH_PUBLISH_LIMIT) {
      throw new Error(`[GTS TEST] publishNineDirectly sólo registró ${activeListingsCount}/${GTS_BATCH_PUBLISH_LIMIT} publicaciones. El loop de publicación falló.`);
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

    // Esperar que se limpie la selección y que el store confirme los 10 registros activos sin estar publicando
    await expect(pageSeller.locator('#gts-selection-hint')).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await pageSeller.waitForFunction(async (expectedLimit) => {
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      const store = useGTSStore();
      return !store.publishing && store.activeMyListings.length >= expectedLimit;
    }, MAX_ACTIVE_MARKET_LISTINGS_LIMIT, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const nextSelectionItem = pageSeller.locator('[id^="pokemon-select-"]').first();
    await nextSelectionItem.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await nextSelectionItem.scrollIntoViewIfNeeded();
    await clickResilient(nextSelectionItem);

    await expect(publishBtn).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await expect(publishBtn).toBeEnabled({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await priceInput.fill(String(DEFAULT_MOCK_LISTING_PRICE));
    await clickResilient(publishBtn);

    await seller.expectToast(`Límite de publicaciones alcanzado (${MAX_ACTIVE_MARKET_LISTINGS_LIMIT})`);

    // Guardar partida para exportar
    await seller.saveGameAndAwaitExport();

    // 5. Export the seller's in-memory SQLite explicitly before seeding the shared market.
    const sellerDbBytes = await pageSeller.evaluate(async () => {
      const { exportSQLiteSnapshot } = await import('../../../src/logic/db/sqliteEngine.ts');
      return exportSQLiteSnapshot();
    });
    const fs = await import('node:fs');
    fs.writeFileSync(seller.getDbPath(), Buffer.from(sellerDbBytes));

    // Inundar mercado con 50 ofertas mockeadas en la DB del servidor ANTES del setup del comprador
    await seedMockListings(seller.getDbPath(), MOCK_LISTINGS_POOL_SIZE);

    if (process.env.SIM_DB_DRIVER !== 'postgres') {
      // Sync disk changes back to Vite dev server's RAM cache so subsequent GET requests see them
      const updatedDbBuffer = fs.readFileSync(seller.getDbPath());
      await seller.syncDevDb(request, updatedDbBuffer);
    }

    // 6. Setup Comprador (Logear e inyectar inventario inicial, lo cual descargará la DB con los mocks)
    const buyerContext = await browser.newContext();
    const pageBuyer = await buyerContext.newPage();
    await pageBuyer.addInitScript(() => {
      window.__GTS_SIMULATION__ = true;
    });
    const buyer = new GTSSimulationWrapper(pageBuyer, 'GtsBuyer', seller.getSqliteKey());

    await buyer.setup();
    await waitForStoreReady(pageBuyer);
    await buyer.setupUserInventory(INITIAL_BUYER_MONEY, 1);

    // Comprador abre GTS
    await buyer.openGTS();

    // Cambiar a Explorar
    const explorarBtn = pageBuyer.locator('#gts-tab-explore').filter({ visible: true }).first();
    await explorarBtn.waitFor({ state: 'visible', timeout: E2E_EXPLORE_TAB_TIMEOUT_MS });
    await clickResilient(explorarBtn);

    // Explicitly fetch listings in buyer store to load updated market mocks
    const buyerListingCount = await pageBuyer.evaluate(async () => {
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      const gts = useGTSStore();
      await gts.fetchListings(true);
      return gts.filteredListings.length;
    });
    if (buyerListingCount <= MOCK_LISTINGS_POOL_SIZE) {
      throw new Error(`[GTS TEST] Expected seller listings plus ${MOCK_LISTINGS_POOL_SIZE} mocks, received ${buyerListingCount}.`);
    }

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
    await expect.poll(async () => {
      return pageBuyer.evaluate(() => (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.()?.state?.money);
    }, { timeout: E2E_MONEY_PURCHASE_TIMEOUT_MS }).toBe(EXPECTED_BUYER_MONEY_AFTER_PURCHASE);

    const buyerMoney = await pageBuyer.evaluate(() => {
      return (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.()?.state?.money;
    });
    expect(buyerMoney).toBe(EXPECTED_BUYER_MONEY_AFTER_PURCHASE);

    seller.finish('GTS Multi-Account Transactions Simulation');

    // Cleanup
    await seller.cleanupSimulationDb();
    await sellerContext.close();
    await buyerContext.close();
  });
});
