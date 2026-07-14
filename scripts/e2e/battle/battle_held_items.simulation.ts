import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loginE2ETestUser, confirmAndStartBattle, waitForWaitInput, type WindowWithResolver, type CertifiedTestBatch } from '../e2e_helpers.ts';

async function executeSingleTurn(page: Page) {
  await waitForWaitInput(page);
  // Clickeamos el primer movimiento disponible
  const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
  await activeMoveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await activeMoveBtn.click();
}

test.describe('E2E Held Items Verification', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(360000);
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[SYNC') || txt.includes('[WORKER') || txt.includes('[TEST') || txt.includes('error') || txt.includes('Error')) {
        console.log(`[BROWSER] ${txt}`);
      }
    });
    await loginE2ETestUser(page, 'TestPlayerItems');
  });

  test('should apply passive healing from Leftovers at the end of a turn', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const snorlax = pokemonDebugService.generate({
        id: 'snorlax',
        level: 50,
        heldItem: 'leftovers',
        moves: ['substitute', 'growl']
      });

      const caterpie = pokemonDebugService.generate({
        id: 'caterpie',
        level: 5,
        moves: ['splash']
      });

      useGameStore().state.team = [snorlax];
      await useBattleStore().startBattle(caterpie, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // Turno 1: Usar Substitute (primer movimiento) para consumir 25% de la HP máxima
    const firstMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
    await firstMoveBtn.click();
    
    // Esperar al Turno 2
    await waitForWaitInput(page);

    // Obtener HP al inicio del Turno 2 (después de curarse el primer 1/16 con Leftovers)
    const midHp = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.().state?.player?.hp ?? 100;
    });

    // Turno 2: Usar Growl (segundo movimiento) para pasar de turno de forma segura sin consumir más HP
    const secondMoveBtn = page.locator('.move-card-vicio:not([disabled])').nth(1);
    await secondMoveBtn.click();

    // Esperar al final del Turno 2 (la FSM volverá a WAIT_INPUT o la batalla terminará)
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentSubState === 'WAIT_INPUT' || !!store.state?.over;
    }, undefined, { timeout: 10000 }).catch(() => {});

    // Obtener HP final
    const finalHp = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.().state?.player?.hp ?? 100;
    });

    // Leftovers debió haber curado un 1/16 extra al final del Turno 2
    expect(finalHp).toBeGreaterThan(midHp);
  });

  test('should apply Life Orb recoil damage after attacking', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const mew = pokemonDebugService.generate({
        id: 'mew',
        level: 50,
        heldItem: 'lifeorb',
        moves: ['psychic']
      });
      const blissey = pokemonDebugService.generate({
        id: 'blissey',
        level: 50,
        moves: ['softboiled']
      });

      useGameStore().state.team = [mew];
      await useBattleStore().startBattle(blissey, { locationId: 'route1', enemyTeam: [blissey] });
    });

    await confirmAndStartBattle(page);
    await executeSingleTurn(page);
    await waitForWaitInput(page);

    const playerHpInfo = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const player = resolver?.().state?.player;
      return { hp: player?.hp ?? 0, maxHp: player?.maxHp ?? 1 };
    });

    // Mew debería haber recibido 10% de daño por la Life Orb (recoil)
    expect(playerHpInfo.hp).toBeLessThan(playerHpInfo.maxHp);
  });

  test('should activate Focus Sash on a fatal blow and survive with 1 HP', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      // Limpiar clima global residual de otros tests
      useMapStore().setGlobalWeather('clear');

      // Un Sunkern frágil con Focus Sash y habilidad inofensiva
      const sunkern = pokemonDebugService.generate({
        id: 'sunkern',
        level: 5,
        ability: 'chlorophyll',
        heldItem: 'focussash',
        moves: ['tackle']
      });
      // Un Mewtwo nivel 100 que asestará un golpe fatal
      const mewtwo = pokemonDebugService.generate({
        id: 'mewtwo',
        level: 100,
        moves: ['psystrike', 'psychic']
      });

      useGameStore().state.team = [sunkern];
      await useBattleStore().startBattle(mewtwo, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await executeSingleTurn(page);
    await waitForWaitInput(page);

    const playerHp = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.().state?.player?.hp ?? 0;
    });

    // Debería haber sobrevivido con exactamente 1 HP
    expect(playerHp).toBe(1);
  });

  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  let itemBatches: CertifiedTestBatch[] = [];
  if (fs.existsSync(consolidatorPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8')) as Record<string, unknown>;
      if (content.items_consumption) {
        itemBatches = content.items_consumption as CertifiedTestBatch[];
      }
    } catch (_e) {
      // Ignore if file doesn't exist yet or is malformed
    }
  }

  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;

  let startIdx = 0;
  if (startFromCaseId) {
    const foundIdx = itemBatches.findIndex((b) => (b as unknown as { id?: string }).id === startFromCaseId.trim());
    if (foundIdx !== -1) {
      startIdx = foundIdx;
    }
  } else if (startFromIndex) {
    startIdx = Number(startFromIndex.trim()) - 1;
  }

  const filteredItemBatches = itemBatches.map((b, idx) => ({ b, idx })).filter(({ b, idx }) => {
    if (caseIdFilter) {
      return (b as unknown as { id?: string }).id === caseIdFilter.trim();
    }
    if (caseFilter) {
      return (idx + 1) === Number(caseFilter.trim());
    }
    
    if (idx < startIdx) return false;
    return true;
  });

  if (filteredItemBatches.length > 0) {
    filteredItemBatches.forEach(({ b: batch, idx: index }) => {
      test(`debería ejecutar el lote de fuzzer de items #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`, async ({ page }) => {
        test.setTimeout(360000);
        // 1. Inyectar los equipos del lote de items
        await page.evaluate(async (b) => {
          const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
          const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
          const { useGameStore } = await import('../../../src/stores/game.ts');

          const gameStore = useGameStore();
          const battleStore = useBattleStore();

          // Convertir los sets de Showdown a Pokémon locales válidos usando debugService
          const localPlayerTeam = b.playerTeam.map((set: { uid?: string; species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean }) => {
            return pokemonDebugService.generate({
              uid: set.uid,
              id: set.species,
              level: set.level || 100,
              ability: set.ability,
              moves: set.moves,
              heldItem: set.item ? set.item.toLowerCase().replace(/[^a-z0-9]/g, '') : undefined,
              nickname: set.name,
              nature: set.nature,
              ivs: set.ivs,
              evs: set.evs,
              gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
              isShiny: set.shiny || false
            });
          });

          const localEnemyTeam = b.enemyTeam.map((set: { uid?: string; species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean }) => {
            return pokemonDebugService.generate({
              uid: set.uid,
              id: set.species,
              level: set.level || 100,
              ability: set.ability,
              moves: set.moves,
              heldItem: set.item ? set.item.toLowerCase().replace(/[^a-z0-9]/g, '') : undefined,
              nickname: set.name,
              nature: set.nature,
              ivs: set.ivs,
              evs: set.evs,
              gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
              isShiny: set.shiny || false
            });
          });

          gameStore.state.team = localPlayerTeam;

          const { useMapStore } = await import('../../../src/stores/map.ts');
          const mapStore = useMapStore();
          mapStore.setGlobalWeather('clear');

          const firstEnemy = localEnemyTeam[0];
          if (!firstEnemy) throw new Error('No enemy generated for items test');

           if (window.__VITE_DEBUG__) {
             window.__VITE_DEBUG__.battleSeed = b.seed as [number, number, number, number] | undefined;
             window.__VITE_DEBUG__.mockEnemyChoices = b.enemyChoices as string[] | undefined;
             window.__VITE_DEBUG__.enemyChoiceIndex = 0;
           }

          await battleStore.startBattle(firstEnemy, {
            isTrainer: true,
            enemyTeam: localEnemyTeam,
            trainerName: 'Simulador Items E2E',
            locationId: 'route1'
          });
        }, batch);

        try {
          await confirmAndStartBattle(page);
          
          const { executeAutoBattle } = await import('../e2e_helpers.ts');
          await executeAutoBattle(
            page,
            index,
            0,
            batch.playerChoices,
            batch.cheats,
            batch.finalState
          );
        } catch (error: unknown) {
          const caseId = (batch as { id?: string }).id || `lote-items-${index + 1}`;
          const errMessage = error instanceof Error ? (error as Error).message : String(error);
          console.error(`\n❌ ERROR EN EL COMBATE DE ITEMS: ${caseId}`);
          console.error(`Detalles del lote de items:`, JSON.stringify({
            id: caseId,
            playerTeam: batch.playerTeam.map(p => `${p.species} (${p.item || 'no item'})`),
            enemyTeam: batch.enemyTeam.map(e => `${e.species} (${e.item || 'no item'})`)
          }, null, 2));
           if (process.env.CONTINUE_ON_ERROR === 'true') {
             console.warn(`[E2E-WARN] Ignorando error en lote de items ${caseId} porque CONTINUE_ON_ERROR es true.`);
             return;
           }
           throw new Error(`[Fallo en Items ${caseId}]: ${errMessage}`);
        }
      });
    });
  }
});
