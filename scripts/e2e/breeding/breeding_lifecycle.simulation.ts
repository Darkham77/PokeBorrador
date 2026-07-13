import { test, expect } from '@playwright/test';
import { setupE2ESession, loginTestUser } from '../e2e_helpers.ts';
import { useGameStore } from '../../../src/stores/game';
import { useBreedingStore } from '../../../src/stores/breeding';

type GameStoreType = ReturnType<typeof useGameStore>;
type BreedingStoreType = ReturnType<typeof useBreedingStore>;

test.describe('Breeding & Hatching Lifecycle Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    const testUser = `TEST_BREED_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginTestUser(page, testUser);
  });

  test('should breed Ditto and Bulbasaur, generate an egg, and hatch it', async ({ page }) => {
    // 1. Setup inicial de Pokémon compatibles y dinero en el navegador
    await page.evaluate(async () => {
      const { useAuthStore } = await import('../../../src/stores/auth.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const authStore = useAuthStore();
      console.warn('DEBUG-TEST-AUTH', 'User in authStore at start:', authStore.user);
 
      const resolver = (window as unknown as { __VITE_DEBUG_GAME_STORE_RESOLVER__?: () => GameStoreType }).__VITE_DEBUG_GAME_STORE_RESOLVER__;
      let gameStore = resolver?.() as GameStoreType | undefined;
      
      // Esperar a que el store esté listo y cargado en el navegador
      for (let i = 0; i < 50; i++) {
        if (gameStore?.isReady && gameStore?.state) break;
        await new Promise(r => setTimeout(r, 100));
        gameStore = resolver?.() as GameStoreType | undefined;
      }
      
      if (!gameStore?.state) throw new Error('gameStore state not ready through resolver');
      console.warn('DEBUG-TEST-AUTH', 'User in authStore after load:', authStore.user);
      
      // Asegurar suficiente dinero
      gameStore.state.money = 20000;
 
      // Crear Ditto y Bulbasaur compatibles
      const ditto = pokemonDebugService.generate({ id: 'ditto', level: 50 });
      ditto.vigor = 10;
      ditto.maxVigor = 10;
      
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 50 });
      bulbasaur.vigor = 10;
      bulbasaur.maxVigor = 10;
 
      // Inicializar starter de forma oficial en el store para asegurar que starterChosen sea true en el flujo
      await gameStore.chooseStarter('bulbasaur');
 
      // Esperar a que se estabilice el estado y los guardados programados de chooseStarter
      await new Promise(r => setTimeout(r, 500));
 
      // Dejar a ditto en el equipo y a bulbasaur en la banca para el test
      gameStore.state.team = [ditto];
      gameStore.state.box = [bulbasaur];
      
      const res = await gameStore.saveGame();
      if (!res.success) {
        throw new Error(`Guardado de preparación fallido: ${res.error}`);
      }
    });
 
    await page.reload();
    const mapaBtn = page.locator('button.map-btn').filter({ visible: true }).first();
    await mapaBtn.waitFor({ state: 'visible', timeout: 15000 });
 
    // 2. Depositar Pokémon en guardería e iniciar ciclo de huevo en el store
    await page.evaluate(async () => {
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      
      const resolver = (window as unknown as { __VITE_DEBUG_GAME_STORE_RESOLVER__?: () => GameStoreType }).__VITE_DEBUG_GAME_STORE_RESOLVER__;
      let gameStore = resolver?.() as GameStoreType | undefined;
      
      // Esperar a que el store esté listo y tenga los Pokémon cargados desde SQLite tras el reload
      for (let i = 0; i < 50; i++) {
        if (gameStore?.isReady && gameStore?.state?.team && gameStore.state.team.length > 0) break;
        await new Promise(r => setTimeout(r, 100));
        gameStore = resolver?.() as GameStoreType | undefined;
      }
 
      if (!gameStore?.state) throw new Error('gameStore not resolved post-reload');
      
      const breedingStore = useBreedingStore();
 
      const p1 = gameStore.state.team[0];
      const p2 = gameStore.state.box[0];
      if (!p1 || !p2) throw new Error(`Parents not found in state (team size: ${gameStore.state.team.length}, box size: ${gameStore.state.box.length})`);

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
      const breedingStore = (window as unknown as { __VITE_DEBUG_BREEDING_STORE_RESOLVER__?: () => BreedingStoreType }).__VITE_DEBUG_BREEDING_STORE_RESOLVER__?.();
      if (breedingStore?.checkAndGenerateEgg) {
        await breedingStore.checkAndGenerateEgg();
      }
    });

    // Abrir Guardería (Daycare) haciendo click en CRIANZA en el HUD inferior
    await page.locator('button:has-text("CRIANZA")').filter({ visible: true }).first().click();
 
    // Recoger el huevo disponible en el Almacén de Huevos (EggWarehouse)
    const eggCard = page.locator('div.egg-card').first();
    await eggCard.waitFor({ state: 'visible', timeout: 5000 });
    await eggCard.click();
    
    // Aceptar la confirmación de recogida
    const confirmBtn = page.locator('button:has-text("ACEPTAR")').filter({ visible: true }).first();
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();

    // 4. Forzar que el Huevo esté listo para eclosionar y eclosionarlo
    await page.evaluate(async () => {
      const resolver = (window as unknown as { __VITE_DEBUG_GAME_STORE_RESOLVER__?: () => GameStoreType }).__VITE_DEBUG_GAME_STORE_RESOLVER__;
      let gameStore = resolver?.() as GameStoreType | undefined;
      
      // Esperar a que el huevo sea agregado al estado de la mochila
      for (let i = 0; i < 50; i++) {
        if (gameStore?.state?.eggs && gameStore.state.eggs.length > 0) break;
        await new Promise(r => setTimeout(r, 100));
        gameStore = resolver?.() as GameStoreType | undefined;
      }
      
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
    await page.locator('.modal-close-btn, .modal-close-btn-floating').filter({ visible: true }).first().click();

    // Comprobar que en el HUD o pantalla principal aparezca el botón de eclosionar
    const hatchBtn = page.locator('button:has-text("ECLOSIONAR"), .egg-hatch-trigger').first();
    await hatchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await hatchBtn.click();

    // Confirmar eclosión en el modal de eclosión
    const confirmHatch = page.locator('button:has-text("¡SÍ!"), button:has-text("ECLOSIONAR")').first();
    await confirmHatch.waitFor({ state: 'visible', timeout: 5000 });
    await confirmHatch.click();

    // Esperar a que la eclosión termine (desaparece el modal de eclosión y vuelve a ser visible el botón de mapa)
    const mapBtn = page.locator('button.map-btn').filter({ visible: true }).first();
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
