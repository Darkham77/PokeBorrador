import { test, expect } from '@playwright/test';
import { setupE2ESession, loginTestUser } from '../e2e_helpers.ts';

test.describe('Breeding & Hatching E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    const testUser = `TEST_BREED_${Date.now()}`;
    await loginTestUser(page, testUser);
  });

  test('should breed Ditto and Bulbasaur, generate an egg, and hatch it', async ({ page }) => {
    // 1. Setup inicial de Pokémon compatibles y dinero en el navegador
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      
      // Asegurar suficiente dinero
      gameStore.state.money = 20000;

      // Crear Ditto y Bulbasaur compatibles
      const ditto = pokemonDebugService.generate({ id: 'ditto', level: 50 });
      ditto.vigor = 10;
      ditto.maxVigor = 10;
      
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 50 });
      bulbasaur.vigor = 10;
      bulbasaur.maxVigor = 10;

      // Dejar a ditto en el equipo y a bulbasaur en la banca
      gameStore.state.team = [ditto];
      gameStore.state.box = [bulbasaur];
      await gameStore.saveGame();
    });

    await page.reload();
    const mapaBtn = page.locator('button:has-text("MAPA")').first();
    await mapaBtn.waitFor({ state: 'visible', timeout: 15000 });

    // 2. Depositar Pokémon en guardería e iniciar ciclo de huevo en el store
    await page.evaluate(async () => {
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');

      const breedingStore = useBreedingStore();
      const gameStore = useGameStore();

      const p1 = gameStore.state.team[0];
      const p2 = gameStore.state.box[0];
      if (!p1 || !p2) throw new Error('Parents not found in state');

      // Forzar que estén depositados en la guardería
      p1.inDaycare = true;
      p1.daycareSlot = 0;
      // deposited_at hace 24 horas para que el Huevo esté listo inmediatamente
      const past = Temporal.Now.instant().subtract({ hours: 24 }).toString();
      p1.daycareDepositedAt = past;

      p2.inDaycare = true;
      p2.daycareSlot = 1;
      p2.daycareDepositedAt = past;

      breedingStore.slots[0] = { pokemon: p1, slotIndex: 0, deposited_at: past };
      breedingStore.slots[1] = { pokemon: p2, slotIndex: 1, deposited_at: past };

      // Limpiar equipo para que no falle el daycare (necesita al menos 1 Pokémon en el equipo)
      // Generamos un Caterpie para dejar en el equipo activo
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const activePoke = pokemonDebugService.generate({ id: 'caterpie', level: 5 });
      gameStore.state.team = [activePoke];
      gameStore.state.box = [p1, p2];

      await gameStore.saveGame();
      await breedingStore.loadDaycare();
    });

    // 3. Generar y reclamar el huevo en la interfaz del Daycare
    await page.evaluate(async () => {
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const breedingStore = useBreedingStore();
      // Forzar generación del huevo evaluando el tiempo
      const storeObj = breedingStore as unknown as Record<string, () => Promise<void>>;
      if (storeObj.checkAndGenerateEgg) {
        await storeObj.checkAndGenerateEgg();
      }
    });

    // Abrir Guardería (Daycare) desde el Market
    await page.click('button:has-text("MARKET")');
    await page.click('button:has-text("LOCAL")');

    // Cambiar a pestaña Guardería si existe, o buscar el botón de Guardería/Breeding en el modal
    const daycareTab = page.locator('button:has-text("GUARDERÍA"), button:has-text("DAYCARE")').first();
    await daycareTab.waitFor({ state: 'visible', timeout: 5000 });
    await daycareTab.click();

    // Reclamar el huevo disponible en la interfaz
    const claimBtn = page.locator('button:has-text("RECLAMAR HUEVO"), button:has-text("RECLAMAR (")').first();
    await claimBtn.waitFor({ state: 'visible', timeout: 5000 });
    await claimBtn.click();

    // 4. Forzar que el Huevo esté listo para eclosionar y eclosionarlo
    await page.evaluate(() => {
      interface MockGameStore {
        state: {
          eggs: { steps: number; ready: boolean }[];
        };
      }
      const win = window as unknown as Record<string, () => MockGameStore>;
      const getStore = win.useGameStore;
      const gameStore = getStore ? getStore() : null;
      if (gameStore && gameStore.state.eggs && gameStore.state.eggs.length > 0) {
        // Poner los pasos a 0 y marcarlo como listo
        const firstEgg = gameStore.state.eggs[0];
        if (firstEgg) {
          firstEgg.steps = 0;
          firstEgg.ready = true;
        }
      }
    });

    // Cerrar el modal para volver al overworld/mapa
    await page.click('button:has-text("CERRAR"), .base-modal-close-btn');

    // Comprobar que en el HUD o pantalla principal aparezca el botón de eclosionar
    const hatchBtn = page.locator('button:has-text("ECLOSIONAR"), .egg-hatch-trigger').first();
    await hatchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await hatchBtn.click();

    // Confirmar eclosión en el modal de eclosión
    const confirmHatch = page.locator('button:has-text("¡SÍ!"), button:has-text("ECLOSIONAR")').first();
    await confirmHatch.waitFor({ state: 'visible', timeout: 5000 });
    await confirmHatch.click();

    // Esperar a que la eclosión termine (desaparece el modal de eclosión y vuelve a ser visible el botón de mapa)
    const mapBtn = page.locator('button:has-text("MAPA")').first();
    await expect(mapBtn).toBeVisible({ timeout: 15000 });

    // 5. Verificar que el Pokémon nacido esté en el box/equipo del jugador
    const hasNewborn = await page.evaluate(() => {
      interface TargetPoke {
        level: number;
        id: string;
      }
      interface MockGameStore {
        state: {
          team: (TargetPoke | null)[];
          box: (TargetPoke | null)[];
        };
      }
      const win = window as unknown as Record<string, () => MockGameStore>;
      const getStore = win.useGameStore;
      if (!getStore) return false;
      const gameStore = getStore();
      const allPokemon = [...gameStore.state.team, ...gameStore.state.box];
      return allPokemon.some((p: TargetPoke | null) => p && p.level === 1 && p.id === 'bulbasaur');
    });
    expect(hasNewborn).toBe(true);
  });
});
