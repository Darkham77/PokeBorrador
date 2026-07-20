import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, type WindowWithResolver } from '../e2e_helpers.ts';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

function seedMockListings(count: number) {
  const dbPath = path.resolve('database/temp/imported.db');
  using db = new DatabaseSync(dbPath);
  try {
    const insertStmt = db.prepare(`
      INSERT INTO market_listings (seller_id, seller_name, listing_type, data, price, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `);

    const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew'];
    
    db.exec('BEGIN TRANSACTION;');
    for (let i = 0; i < count; i++) {
      const sp = species[i % species.length]!;
      const mockPkmn = {
        uid: `${sp}-mock-${i}`,
        id: sp,
        name: sp.charAt(0).toUpperCase() + sp.slice(1),
        level: 5,
        hp: 20,
        maxHp: 20,
        atk: 10,
        def: 10,
        spa: 10,
        spd: 10,
        spe: 10,
        status: '',
        moves: [{ name: 'Placaje', pp: 35, maxPP: 35 }],
        nickname: `MOCK_${sp.toUpperCase()}_${i}`
      };

      insertStmt.run(
        `seller-mock-${i}`,
        `Vendedor_${i}`,
        'pokemon',
        JSON.stringify(mockPkmn),
        1000
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
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupUserInventory(money: number, pokemonCount: number): Promise<void> {
    await this.page.evaluate(async ({ money, pokemonCount }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const game = useGameStore();
      game.state.money = money;

      const box: typeof game.state.box = [];
      const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew'];
      for (let k = 0; k < pokemonCount; k++) {
        const sp = species[k % species.length]!;
        const pkmn = pokemonDebugService.generate({ id: sp, level: 5 });
        pkmn.nickname = `GTS_TEST_${sp.toUpperCase()}_${k}`;
        box.push(pkmn);
      }
      game.state.box = box;
      await game.saveGame();
    }, { money, pokemonCount });

    await this.page.reload();
    await this.page.locator('button.map-btn').filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 15000 });
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

      const toPublish = [...game.state.box].slice(0, 9);
      for (const p of toPublish) {
        await gts.publishListing('pokemon', p, 1000);
      }
    });
  }

  public async saveGameAndAwaitExport(): Promise<void> {
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

  test('should allow listing limits, pagination check, and successful purchase', async ({ browser }) => {
    test.setTimeout(90000);

    const sellerContext = await browser.newContext();
    const pageSeller = await sellerContext.newPage();
    const sellerName = `SELLER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const seller = new GTSSimulationWrapper(pageSeller, sellerName);

    // 1. Login y Setup Vendedor (15 Pokémon en banca)
    await seller.setup();
    await waitForStoreReady(pageSeller);
    await seller.setupUserInventory(100, 15);

    // 2. Abrir GTS
    await seller.openGTS();

    // 3. Publicar los primeros 9 Pokémon en background
    await seller.publishNineDirectly();

    // Esperar a que el loading overlay desaparezca
    await pageSeller.locator('.loading-overlay-fixed').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    // Cambiar a pestaña PUBLICAR
    const publicarBtn = pageSeller.locator('.cat-btn:has-text("PUBLICAR")').filter({ visible: true }).first();
    await publicarBtn.waitFor({ state: 'visible', timeout: 5000 });
    await publicarBtn.click();

    // Publicar el 10º Pokémon por UI para alcanzar el límite
    const selectionItem = pageSeller.locator('.selection-list .list-item').first();
    await selectionItem.waitFor({ state: 'visible', timeout: 5000 });
    await selectionItem.click();

    const priceInput = pageSeller.locator('input.price-input[type="number"]').first();
    await priceInput.waitFor({ state: 'visible', timeout: 5000 });
    await priceInput.fill('1000');

    const publishBtn = pageSeller.locator('button:has-text("PUBLICAR OFERTA")').first();
    await publishBtn.click();

    // Esperar que se limpie la selección (10/10 alcanzados)
    await expect(pageSeller.locator('.selection-hint')).toBeVisible({ timeout: 10000 });

    // 4. Intentar publicar el 11º y verificar Toast de rechazo
    await selectionItem.click();
    await priceInput.fill('1000');
    await publishBtn.click();

    const toast = pageSeller.locator('.toast-item').first();
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    await expect(toast).toContainText('Límite de publicaciones alcanzado (10)');

    // Guardar partida para exportar
    await seller.saveGameAndAwaitExport();

    // 5. Inundar mercado con 50 ofertas mockeadas en la DB del servidor ANTES del setup del comprador
    seedMockListings(50);



    // 6. Setup Comprador (Logear e inyectar inventario inicial, lo cual descargará la DB con los mocks)
    const buyerContext = await browser.newContext();
    const pageBuyer = await buyerContext.newPage();
    const buyerName = `BUYER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const buyer = new GTSSimulationWrapper(pageBuyer, buyerName);

    await buyer.setup();
    await waitForStoreReady(pageBuyer);
    await buyer.setupUserInventory(10000, 1);

    // Comprador abre GTS
    await buyer.openGTS();

    // Cambiar a Explorar
    const explorarBtn = pageBuyer.locator('.cat-btn:has-text("EXPLORAR")').filter({ visible: true }).first();
    await explorarBtn.waitFor({ state: 'visible', timeout: 5000 });
    await explorarBtn.click();

    // Verificar paginación
    const pagination = pageBuyer.locator('.gts-pagination').first();
    await pagination.waitFor({ state: 'visible', timeout: 10000 });
    await expect(pagination).toContainText('PÁGINA 1 DE 2');

    const nextBtn = pagination.locator('.next-page-btn');
    await expect(nextBtn).toBeEnabled();
    
    const prevBtn = pagination.locator('.prev-page-btn');
    await expect(prevBtn).toBeDisabled();

    await nextBtn.click();
    await expect(pagination).toContainText('PÁGINA 2 DE 2');
    await expect(nextBtn).toBeDisabled();
    await expect(prevBtn).toBeEnabled();

    await prevBtn.click();
    await expect(pagination).toContainText('PÁGINA 1 DE 2');

    // Comprar el primer Pokémon disponible
    const targetListing = pageBuyer.locator('.market-item-wrapper').first();
    const buyBtn = targetListing.locator('button:has-text("COMPRAR")');
    await buyBtn.click();

    // Esperar a procesar compra (saldos actualizados)
    await pageBuyer.waitForFunction(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      return store?.state?.money === 9000;
    }, undefined, { timeout: 20000 });

    const buyerMoney = await pageBuyer.evaluate(() => {
      return (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.()?.state?.money;
    });
    expect(buyerMoney).toBe(9000);

    // Cleanup
    await sellerContext.close();
    await buyerContext.close();
  });
});
