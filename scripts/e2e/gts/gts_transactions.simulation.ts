import { test, expect, Page } from '@playwright/test';
import { setupE2ESession, loginTestUser } from '../e2e_helpers.ts';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

function seedMockListings(count: number) {
  const dbPath = path.resolve('database/temp/imported.db');
  const db = new DatabaseSync(dbPath);
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
    db.close();
  }
}

async function loginAndSetupUser(page: Page, username: string, initialMoney: number, pokemonCount: number) {
  // 1. Inyectar configuraciones
  await setupE2ESession(page);

  // 2. Navegar y logear
  await loginTestUser(page, username);

  // 3. Modificar dinero y equipo en el navegador usando evaluate
  await page.evaluate(async ({ money, pokemonCount }) => {
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
    
    const game = useGameStore();
    game.state.money = money;

    // Agregar N Pokémon en la box (el starter ya fue elegido por loginTestUser y está en el team)
    const box: unknown[] = [];
    const species = ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'ekans', 'sandshrew'];
    for (let k = 0; k < pokemonCount; k++) {
      const sp = species[k % species.length]!;
      const pkmn = pokemonDebugService.generate({ id: sp, level: 5 });
      pkmn.nickname = `GTS_TEST_${sp.toUpperCase()}_${k}`;
      box.push(pkmn);
    }
    game.state.box = box;
    
    await game.saveGame();
  }, { money: initialMoney, pokemonCount });

  // Recargar la página para asegurar la correcta persistencia
  await page.reload();
  await page.locator('button.map-btn').filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('GTS Multi-Account Transactions Simulation', () => {
  test.beforeEach(async ({ request }) => {
    // Limpiar base de datos temporal del servidor antes de cada test para asegurar estado limpio
    await request.post('/api/dev-import-db-cleanup');
  });

  test('should allow listing limits, pagination check, and successful purchase', async ({ browser }) => {
    // Incrementar el timeout de Playwright para este test complejo
    test.setTimeout(90000);

    const sellerContext = await browser.newContext();
    const pageSeller = await sellerContext.newPage();
    const sellerName = `SELLER_${Temporal.Now.instant().epochMilliseconds.toString()}`;

    // 1. Setup Vendedor (Dinero: 100, con 15 Pokémon en la Banca para publicar)
    await loginAndSetupUser(pageSeller, sellerName, 100, 15);

    // 2. Vendedor abre GTS
    await pageSeller.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().open('GlobalMarket');
    });

    // 3. Vendedor publica 10 Pokémon usando la interfaz/store para alcanzar el límite máximo
    await pageSeller.evaluate(async () => {
      const { useGTSStore } = await import('../../../src/stores/gts.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gts = useGTSStore();
      const game = useGameStore();

      // Publicar los primeros 9 directamente desde la box
      const toPublish = [...game.state.box].slice(0, 9);
      for (const p of toPublish) {
        await gts.publishListing('pokemon', p, 1000);
      }
    });

    // Cambiar a pestaña de publicación
    await pageSeller.locator('.cat-btn:has-text("PUBLICAR")').filter({ visible: true }).first().click();

    // Publicar el 10º Pokémon usando la UI para alcanzar el límite exacto de 10
    const selectionItem = pageSeller.locator('.selection-list .list-item').first();
    await selectionItem.waitFor({ state: 'visible', timeout: 5000 });
    await selectionItem.click();

    const priceInput = pageSeller.locator('input.price-input[type="number"]').first();
    await priceInput.waitFor({ state: 'visible', timeout: 5000 });
    await priceInput.fill('1000');

    const publishBtn = pageSeller.locator('button:has-text("PUBLICAR OFERTA")').first();
    await publishBtn.click();

    // Esperar que se limpie la selección (10/10 publicaciones alcanzadas)
    await expect(pageSeller.locator('.selection-hint')).toBeVisible({ timeout: 10000 });

    // 4. Intentar publicar el 11º Pokémon y verificar el rechazo por Toast informando el por qué
    await selectionItem.click();
    await priceInput.fill('1000');
    await publishBtn.click();

    // Verificar el Toast de error informando el límite de 10 publicaciones
    const toast = pageSeller.locator('.toast-item').first();
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    await expect(toast).toContainText('Límite de publicaciones alcanzado (10)');

    // Sincronizar los 10 publicados del vendedor 1 al servidor Vite
    await pageSeller.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      await useGameStore().saveGame();
    });
    await pageSeller.waitForTimeout(1500);

    // 5. Para inundar el mercado con más de 50 elementos, insertamos directamente 50 ofertas en la DB local compartida
    // usando la API directa de sqlite en Node.js, para evitar abrir múltiples navegadores lentos y propensos a HMR.
    seedMockListings(50);

    // 6. Setup Comprador
    const buyerContext = await browser.newContext();
    const pageBuyer = await buyerContext.newPage();
    const buyerName = `BUYER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginAndSetupUser(pageBuyer, buyerName, 10000, 1);

    // Comprador abre GTS
    await pageBuyer.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().open('GlobalMarket');
    });

    // Cambiar a pestaña Explorar
    await pageBuyer.locator('.cat-btn:has-text("EXPLORAR")').filter({ visible: true }).first().click();

    // 7. Verificar paginación del comprador (con 60 ofertas totales: 10 del vendedor + 50 mockeadas)
    const pagination = pageBuyer.locator('.gts-pagination').first();
    await pagination.waitFor({ state: 'visible', timeout: 10000 });
    await expect(pagination).toContainText('PÁGINA 1 DE 2');

    // Botón de Siguiente página
    const nextBtn = pagination.locator('.next-page-btn');
    await expect(nextBtn).toBeEnabled();
    
    // Botón de Anterior debería estar deshabilitado
    const prevBtn = pagination.locator('.prev-page-btn');
    await expect(prevBtn).toBeDisabled();

    // Hacer click en Siguiente página
    await nextBtn.click();
    await expect(pagination).toContainText('PÁGINA 2 DE 2');
    await expect(nextBtn).toBeDisabled();
    await expect(prevBtn).toBeEnabled();

    // Volver a la página 1
    await prevBtn.click();
    await expect(pagination).toContainText('PÁGINA 1 DE 2');

    // 8. Comprar un Pokémon en la página 1
    const targetListing = pageBuyer.locator('.market-item-wrapper').first();
    const buyBtn = targetListing.locator('button:has-text("COMPRAR")');
    await buyBtn.click();

    // Esperar a que se procese la compra
    await pageBuyer.waitForTimeout(2000);

    // 9. Verificar saldos del comprador (10,000 - 1,000 = 9,000 Pokédólares)
    const buyerMoney = await pageBuyer.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.money;
    });
    expect(buyerMoney).toBe(9000);

    // Limpieza
    await sellerContext.close();
    await buyerContext.close();
  });
});
