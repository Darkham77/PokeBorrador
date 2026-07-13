import { test, expect, Page } from '@playwright/test';
import { setupE2ESession, loginTestUser } from '../e2e_helpers.ts';

async function loginAndSetupUser(page: Page, username: string, initialMoney: number, giveTestPokemon: boolean) {
  // 1. Inyectar configuraciones
  await setupE2ESession(page);

  // 2. Navegar y logear
  await loginTestUser(page, username);

  // 3. Modificar dinero y equipo en el navegador usando evaluate
  await page.evaluate(async ({ money, givePkmn }) => {
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
    
    const game = useGameStore();
    game.state.money = money;

    if (givePkmn) {
      // Necesitamos un Pokémon extra en la banca (box) para vender, ya que no nos permite vender nuestro último Pokémon del equipo (Save Shield / Regla de negocio)
      const pkmn = pokemonDebugService.generate({ id: 'caterpie', level: 5 });
      pkmn.nickname = 'GTS_TEST_CATERPIE';
      game.state.box = [pkmn];
    }
    
    game.state.starterChosen = true;
    await game.saveGame();
  }, { money: initialMoney, givePkmn: giveTestPokemon });

  // Recargar la página para asegurar la correcta lectura de los datos de la base de datos SQLite recién persistida
  await page.reload();
  await page.locator('button.map-btn').first().waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('GTS Multi-Account Transactions Simulation', () => {
  test('should allow a seller to list a Pokemon and a buyer to purchase it', async ({ browser }) => {
    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();

    const pageSeller = await sellerContext.newPage();
    const pageBuyer = await buyerContext.newPage();

    const sellerName = `SELLER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const buyerName = `BUYER_${Temporal.Now.instant().epochMilliseconds.toString()}`;

    // 1. Setup Vendedor (Dinero: 100, con Caterpie en la Banca)
    await loginAndSetupUser(pageSeller, sellerName, 100, true);

    // 2. Setup Comprador (Dinero: 10,000, sin Caterpie en la Banca)
    await loginAndSetupUser(pageBuyer, buyerName, 10000, false);

    // 3. Vendedor publica el Caterpie en el GTS por 5,000 Pokédólares
    await pageSeller.click('button:has-text("MARKET")');
    await pageSeller.click('button:has-text("GLOBAL")');

    // Cambiar a pestaña de publicación
    await pageSeller.click('.cat-btn:has-text("PUBLICAR")');

    // Seleccionar Caterpie de la lista
    const caterpieCard = pageSeller.locator('.selection-list .list-item:has-text("GTS_TEST_CATERPIE")').first();
    await caterpieCard.waitFor({ state: 'visible', timeout: 5000 });
    await caterpieCard.click();

    // Establecer precio
    const priceInput = pageSeller.locator('input.price-input[type="number"]').first();
    await priceInput.waitFor({ state: 'visible', timeout: 5000 });
    await priceInput.fill('5000');

    // Confirmar publicación
    const publishBtn = pageSeller.locator('button:has-text("PUBLICAR OFERTA")').first();
    await publishBtn.click();

    // Esperar a que el panel de publicación se limpie (retorna a la sugerencia inicial "👈")
    const hint = pageSeller.locator('.selection-hint');
    await expect(hint).toBeVisible({ timeout: 10000 });

    // 4. Comprador busca y adquiere el Pokémon
    await pageBuyer.click('button:has-text("MARKET")');
    await pageBuyer.click('button:has-text("GLOBAL")');

    // Cambiar a pestaña Explorar (debería ser la activa por defecto, pero forzamos por seguridad)
    await pageBuyer.click('.cat-btn:has-text("EXPLORAR")');

    // Buscar al Caterpie en las ofertas globales
    const targetListing = pageBuyer.locator('.market-item-wrapper:has-text("GTS_TEST_CATERPIE")').first();
    await targetListing.waitFor({ state: 'visible', timeout: 10000 });

    // Clickear "COMPRAR" en la tarjeta correspondiente
    const buyBtn = targetListing.locator('button:has-text("COMPRAR")');
    await buyBtn.click();

    // Verificar que el Caterpie ya no aparezca en la lista de ofertas (fue comprado)
    await expect(targetListing).not.toBeVisible({ timeout: 10000 });

    // 5. Verificar saldos del comprador (10,000 - 5,000 = 5,000 Pokédólares)
    const buyerMoney = await pageBuyer.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.money;
    });
    expect(buyerMoney).toBe(5000);

    // 6. Verificar que el comprador tenga al Caterpie en su PC (box)
    const hasBoughtPokemon = await pageBuyer.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.box.some((p) => p?.nickname === 'GTS_TEST_CATERPIE');
    });
    expect(hasBoughtPokemon).toBe(true);

    // 7. Verificar que el vendedor haya recibido los fondos (100 iniciales + 5,000 de venta - 5% comisión = 4,850 Pokédólares)
    // Para asegurar que el store de SQLite del vendedor reciba la actualización sincrónica en offline mode, recargamos la página del vendedor
    await pageSeller.reload();
    const mapBtn = pageSeller.locator('button.map-btn').first();
    await mapBtn.waitFor({ state: 'visible', timeout: 15000 });

    const sellerMoney = await pageSeller.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.money;
    });
    // Comisión es 5% de 5000 = 250. Neto recibido = 4750. Dinero final = 100 + 4750 = 4850.
    expect(sellerMoney).toBe(4850);

    // Limpieza
    await sellerContext.close();
    await buyerContext.close();
  });
});
