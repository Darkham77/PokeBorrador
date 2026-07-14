import { test, expect, Page, Locator } from '@playwright/test';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, waitForWaitInput, type WindowWithResolver } from '../e2e_helpers.ts';

async function getBattleStoreState(page: Page) {
  return await page.evaluate(async () => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const store = useBattleStore();
    if (!store.state) return null;
    return {
      playerHp: store.state.player?.hp ?? 0,
      playerMaxHp: store.state.player?.maxHp ?? 0,
      playerStatus: store.state.player?.status ?? null,
      playerTeam: store.state.playerTeam?.map((p) => ({
        uid: p?.uid ?? '',
        name: p?.name ?? '',
        hp: p?.hp ?? 0,
        maxHp: p?.maxHp ?? 0,
        status: p?.status ?? null
      })) ?? []
    };
  });
}

// Clickea un elemento y espera que la FSM vuelva a un estado de input (event-driven, sin timers)
async function clickAndWaitForInput(page: Page, locator: Locator) {
  await locator.click();
  await waitForWaitInput(page);
}

test.describe('Regresión de Curación en Combate (Playwright)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupE2ESession(page);
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[WORKER') || txt.includes('[SYNC-TEAM') || txt.includes('Received') || txt.includes('p1Hps') || txt.includes('fainted') || txt.includes('revivir') || txt.includes('TEST')) {
        console.log(`[BROWSER] ${txt}`);
      }
    });
    const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    await loginTestUser(page, `HealingUser_${safeTitle}`);
  });

  test('debería curar HP del activo y de la banca sin revertirse tras el ataque enemigo', async ({ page }) => {
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Configurar inventario inicial
      gameStore.state.inventory = {
        potion: 2,
        superpotion: 2
      };

      // Bulbasaur activo (dañado, 5/20 HP)
      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.hp = 5;

      // Charmander en la banca (dañado, 10/19 HP)
      const charmander = debugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 10;

      gameStore.state.team = [bulbasaur, charmander];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      // Iniciar batalla contra un Rattata de nivel 5
      const rattata = debugService.generate({ id: 'rattata', level: 5 });
      const win = window as unknown as { __VITE_DEBUG__: { battleSeed: number[] } };
      win.__VITE_DEBUG__ = win.__VITE_DEBUG__ || { battleSeed: [] };
      win.__VITE_DEBUG__.battleSeed = [1, 2, 3, 4];
      await battleStore.startBattle(rattata, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // --- CASO 1: Curar al activo (Bulbasaur) con Poción ---
    // Registrar el HP inicial del Bulbasaur activo
    const stateBefore = await getBattleStoreState(page);
    expect(stateBefore?.playerHp).toBe(5);

    // Forzar al Pikachu enemigo a usar Tackle/Placaje para daño predecible
    await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
        window.__VITE_DEBUG__.nextEnemyChoice = 'move tackle';
      }
    });

    // Abrir mochila rápida y clickear Poción
    const potionCard = page.locator('.quick-item-card[data-item-id="potion"]:not(.is-disabled)').first();
    await potionCard.waitFor({ state: 'visible', timeout: 5000 });
    await potionCard.click();

    // Seleccionar a Bulbasaur en el modal
    const targetBulbasaur = page.locator('.list-item:has(.name:has-text("Bulbasaur")), button:has-text("Bulbasaur")').first();
    await targetBulbasaur.waitFor({ state: 'visible', timeout: 5000 });
    await clickAndWaitForInput(page, targetBulbasaur);

    // Verificar que el HP final de Bulbasaur en la UI es mayor a 5 (se curó de los 5 iniciales)
    const stateAfter = await getBattleStoreState(page);
    console.log(`[TEST-HP] Bulbasaur HP después de la curación y el ataque: ${stateAfter?.playerHp}`);
    expect(stateAfter?.playerHp).toBeGreaterThan(5);

    // --- CASO 2: Curar al de la banca (Charmander) con Súper Poción ---
    // Verificar que Charmander en la banca tiene 10/19 HP
    const activeCharmanderBefore = stateAfter?.playerTeam.find(p => p.name === 'Charmander');
    expect(activeCharmanderBefore?.hp).toBe(10);

    // Forzar al Pikachu enemigo a usar Tackle/Placaje
    await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
        window.__VITE_DEBUG__.nextEnemyChoice = 'move tackle';
      }
    });

    // Abrir mochila rápida (o inventario general si no está expuesta en mochila rápida para banca)
    const superPotionCard = page.locator('.quick-item-card[data-item-id="superpotion"]:not(.is-disabled)').first(); // Debería haber una superpocion
    await superPotionCard.click();

    // Seleccionar a Charmander en el modal
    const targetCharmander = page.locator('.list-item:has(.name:has-text("Charmander")), button:has-text("Charmander")').first();
    await targetCharmander.waitFor({ state: 'visible', timeout: 5000 });
    await clickAndWaitForInput(page, targetCharmander);

    // Verificar que Charmander en la banca se curó al máximo (19) o al menos aumentó su vida considerablemente
    const stateAfterBench = await getBattleStoreState(page);
    const activeCharmanderAfter = stateAfterBench?.playerTeam.find(p => p.name === 'Charmander');
    console.log(`[TEST-HP] Charmander (Banca) HP después de curación: ${activeCharmanderAfter?.hp}`);
    expect(activeCharmanderAfter?.hp).toBeGreaterThan(10);
    // Verificar que Bulbasaur activo retiene la curación y tiene más de 5 HP (el ataque enemigo pudo haber golpeado o fallado)
    expect(stateAfterBench?.playerHp).toBeGreaterThan(5);
  });

  test('debería curar estados alterados del activo y de la banca', async ({ page }) => {
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = {
        antidote: 2,
        burnheal: 2
      };

      // Squirtle activo (envenenado)
      const squirtle = debugService.generate({ id: 'squirtle', level: 5 });
      squirtle.status = 'psn';

      // Bulbasaur en la banca (quemado)
      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.status = 'brn';

      gameStore.state.team = [squirtle, bulbasaur];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      const rattata = debugService.generate({ id: 'rattata', level: 5 });
      await battleStore.startBattle(rattata, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // --- CURAR ESTADO DEL ACTIVO (Squirtle) con Antídoto ---
    const stateBefore = await getBattleStoreState(page);
    expect(stateBefore?.playerStatus).toBe('psn');

    const antidoteCard = page.locator('.quick-item-card[data-item-id="antidote"]:not(.is-disabled)').first();
    await antidoteCard.waitFor({ state: 'visible', timeout: 5000 });
    await antidoteCard.click();

    const targetSquirtle = page.locator('.list-item:has(.name:has-text("Squirtle")), button:has-text("Squirtle")').first();
    await clickAndWaitForInput(page, targetSquirtle);

    // Confirmar que Squirtle ya no está envenenado
    const stateAfter = await getBattleStoreState(page);
    expect(stateAfter?.playerStatus).toBeNull();

    // --- CURAR ESTADO DE LA BANCA (Bulbasaur) con Cura Quemadura ---
    const bulbasaurBefore = stateAfter?.playerTeam.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurBefore?.status).toBe('brn');

    const burnHealCard = page.locator('.quick-item-card[data-item-id="burnheal"]:not(.is-disabled)').first();
    await burnHealCard.click();

    const targetBulbasaur = page.locator('.list-item:has(.name:has-text("Bulbasaur")), button:has-text("Bulbasaur")').first();
    await clickAndWaitForInput(page, targetBulbasaur);

    // Confirmar que Bulbasaur ya no está quemado
    const stateAfterBench = await getBattleStoreState(page);
    const bulbasaurAfter = stateAfterBench?.playerTeam.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurAfter?.status).toBeNull();
  });

  test('debería revivir a un Pokémon debilitado en la banca y permitir cambiarlo a batalla', async ({ page }) => {
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = {
        revive: 2
      };

      // Bulbasaur activo
      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });

      // Charmander en la banca (debilitado, 0 HP)
      const charmander = debugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0;

      gameStore.state.team = [bulbasaur, charmander];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      const rattata = debugService.generate({ id: 'rattata', level: 5 });
      await battleStore.startBattle(rattata, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // --- REVIVIR A CHARMANDER ---
    const stateBefore = await getBattleStoreState(page);
    const charmanderBefore = stateBefore?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderBefore?.hp).toBe(0);

    const reviveCard = page.locator('.quick-item-card[data-item-id="revive"]:not(.is-disabled)').first();
    await reviveCard.waitFor({ state: 'visible', timeout: 5000 });
    await reviveCard.click();

    const targetCharmander = page.locator('.list-item:has(.name:has-text("Charmander")), button:has-text("Charmander")').first();
    await clickAndWaitForInput(page, targetCharmander);

    // Verificar que Charmander fue revivido (HP mayor a 0)
    const stateAfterRevive = await getBattleStoreState(page);
    const charmanderAfter = stateAfterRevive?.playerTeam.find(p => p.name === 'Charmander');
    console.log(`[TEST-REVIVE] Charmander HP tras revivir: ${charmanderAfter?.hp}`);
    expect(charmanderAfter?.hp).toBeGreaterThan(0);

    // Clickear el botón de Cambio/Pokeball en los controles de batalla
    const pokemonTabBtn = page.locator('button:has-text("CAMBIAR"), .pokemon-tab-btn').first();
    await pokemonTabBtn.click();

    // Clickear en Charmander en el menú de switch para cambiarlo
    const switchCharmanderBtn = page.locator('.list-item:has-text("Charmander"), button:has-text("Charmander")').first();
    await switchCharmanderBtn.waitFor({ state: 'visible', timeout: 5000 });
    await clickAndWaitForInput(page, switchCharmanderBtn);

    // Verificar que el Pokémon activo ahora es Charmander (su HP es el HP activo y su nombre coincide)
    const currentActiveName = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.().state?.player?.name ?? '';
    });
    console.log(`[TEST-SWITCH] Pokémon activo final tras cambio: ${currentActiveName}`);
    expect(currentActiveName.toLowerCase()).toContain('charmander');
  });
});
