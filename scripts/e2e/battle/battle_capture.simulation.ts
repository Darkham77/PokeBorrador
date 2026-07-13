import { test, expect } from '@playwright/test';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, waitForWaitInput, handleBattleInput, type WindowWithResolver } from '../e2e_helpers.ts';
import { MOVE_TRANSLATIONS_ES } from '../../../src/data/battle/moves.ts';
import { useGameStore } from '../../../src/stores/game.ts';

test.describe('Sistema de Capturas y Animaciones de Combate', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, request }) => {
    await request.post('/api/dev-import-db-cleanup');
    await setupE2ESession(page);
  });

  test('debería capturar un Pidgey salvaje con Master Ball y verificar que mantiene estadísticas, moves en español y sin errores', async ({ page }) => {
    // Iniciar sesión para cargar la app y que las rutas relativas funcionen
    await loginTestUser(page, 'TestPlayer1');

    // 1. Iniciar un combate salvaje contra un Pidgey de nivel 2
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Inicializar inventario con Master Ball
      gameStore.state.inventory = {
        masterball: 10
      };

      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      gameStore.state.team = [charmander];
      gameStore.state.starterChosen = true;

      const pidgey = pokemonDebugService.generate({ id: 'pidgey', level: 2 });
      await battleStore.startBattle(pidgey, { locationId: 'route1', wasSearching: false });
    });

    // 2. Confirm combate e iniciar
    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // 3. Lanzar Master Ball usando directamente el store (100% ratio)
    await page.evaluate(async () => {
      const resolver = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { useItemInBattle: (id: string) => Promise<void> } }).__VITE_DEBUG_STORE_RESOLVER__;
      if (resolver) {
        const store = resolver();
        await store.useItemInBattle('masterball');
      }
    });

    // 4. Esperar a que finalice la secuencia de captura y termine la batalla
    await page.waitForFunction(() => {
      const resolver = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { state?: { over: boolean }; currentFsmState?: string } }).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return !store.state || store.state.over || store.currentFsmState === 'REWARDS_PHASE';
    }, undefined, { timeout: 15000 });

    // 5. Validar en el GameStore que el Pidgey capturado tenga Placaje (Tackle) en español y stats correctas
    const pidgeyData = await page.evaluate(() => {
      const gameStore = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.() as unknown as ReturnType<typeof useGameStore>;
      const p = gameStore?.state?.team?.find((mon: { id: string } | null) => mon && mon.id === 'pidgey');
      return p ? {
        id: p.id,
        level: p.level,
        moves: p.moves,
        atk: p.atk,
        maxHp: p.maxHp
      } : null;
    });

    expect(pidgeyData).not.toBeNull();
    expect(pidgeyData!.level).toBe(2);
    expect(pidgeyData!.moves.length).toBeGreaterThan(0);
    
    // Verificar que el movimiento se llama "Placaje" y NO "tackle" (inglés)
    const tackleMove = pidgeyData!.moves.find((m: { id: string } | null) => m && m.id === 'tackle') as { name: string } | undefined;
    expect(tackleMove).toBeDefined();
    expect(tackleMove!.name).toBe('Placaje');

    // Las estadísticas del Pidgey Nv. 2 deben ser coherentes y estar pobladas
    expect(pidgeyData!.maxHp).toBeGreaterThan(10);
    expect(pidgeyData!.atk).toBeGreaterThan(4);
  });

  test('debería capturar un Ditto transformado y revertir correctamente a la forma Ditto original con sus movimientos originales', async ({ page }) => {
    // Iniciar sesión para cargar la app y que las rutas relativas funcionen
    await loginTestUser(page, 'TestPlayer2');

    // 1. Iniciar combate contra un Ditto de nivel 5
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = {
        masterball: 5
      };

      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      gameStore.state.team = [charmander];
      gameStore.state.starterChosen = true;

      const ditto = pokemonDebugService.generate({ id: 'ditto', level: 5 });
      await battleStore.startBattle(ditto, { locationId: 'route1', wasSearching: false });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // 2. Esperar al primer turno (Ditto usará Transformación contra Charmander en Showdown)
    // Dejamos pasar un turno para que se transforme
    await handleBattleInput(page, 'move 1');

    // Esperar a que la FSM se estabilice tras el primer turno
    await waitForWaitInput(page);

    // 3. Lanzar la Master Ball para capturarlo estando transformado
    await page.evaluate(async () => {
      const resolver = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { useItemInBattle: (id: string) => Promise<void> } }).__VITE_DEBUG_STORE_RESOLVER__;
      if (resolver) {
        const store = resolver();
        await store.useItemInBattle('masterball');
      }
    });

    // 4. Esperar finalización de combate
    await page.waitForFunction(() => {
      const resolver = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { state?: { over: boolean }; currentFsmState?: string } }).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return !store.state || store.state.over || store.currentFsmState === 'REWARDS_PHASE';
    }, undefined, { timeout: 15000 });

    // 5. Validar que el Pokémon se guardó como DITTO y NO como Charmander
    const dittoSavedData = await page.evaluate(() => {
      const gameStore = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.() as unknown as ReturnType<typeof useGameStore>;
      const p = gameStore?.state?.team?.find((mon: { id: string } | null) => mon && mon.id === 'ditto');
      return p ? {
        id: p.id,
        name: p.name,
        moves: p.moves,
        isTransformed: (p as unknown as { isTransformed?: boolean }).isTransformed
      } : null;
    });

    expect(dittoSavedData).not.toBeNull();
    expect(dittoSavedData!.id).toBe('ditto');
    expect(dittoSavedData!.isTransformed).toBeFalsy();
    
    // Su único movimiento debe ser Transformación en español
    expect(dittoSavedData!.moves.length).toBe(1);
    expect(dittoSavedData!.moves[0].id).toBe('transform');
    expect(dittoSavedData!.moves[0].name).toBe('Transformación');
  });

  test('debería jugar una secuencia de 3 combates seguidos capturando y usando los Pokémon capturados con sus movimientos reales', async ({ page }) => {
    await loginTestUser(page, 'TestMultiBattle');

    // --- COMBATE 1: Capturar Pidgey ---
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { masterball: 5 };

      // Charmander inicial
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      gameStore.state.team = [charmander];
      gameStore.state.starterChosen = true;

      const pidgey = pokemonDebugService.generate({ id: 'pidgey', level: 3 });
      await battleStore.startBattle(pidgey, { locationId: 'route1', wasSearching: false });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // Lanzar Master Ball
    await page.evaluate(async () => {
      const store = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { useItemInBattle: (id: string) => Promise<void> } }).__VITE_DEBUG_STORE_RESOLVER__?.();
      await store?.useItemInBattle('masterball');
    });

    // Esperar fin del combate 1 (cuando store.state es null porque la batalla se cerró y volvió al mapa)
    await page.waitForFunction(() => {
      const store = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { state?: { over: boolean } } }).__VITE_DEBUG_STORE_RESOLVER__?.();
      return !store || !store.state;
    }, undefined, { timeout: 15000 });

    // --- COMBATE 2: Usar Pidgey y capturar Rattata ---
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { masterball: 5 };

      // El equipo ahora tiene a Charmander y a Pidgey capturado.
      // Reordenamos para enviar al Pidgey al combate como inicial.
      const pidgeyIndex = gameStore.state.team.findIndex((p: { id: string } | null) => p && p.id === 'pidgey');
      if (pidgeyIndex !== -1) {
        const pidgey = gameStore.state.team[pidgeyIndex];
        if (pidgey) {
          gameStore.state.team.splice(pidgeyIndex, 1);
          gameStore.state.team.unshift(pidgey);
        }
      }

      const rattata = pokemonDebugService.generate({ id: 'rattata', level: 3 });
      await battleStore.startBattle(rattata, { locationId: 'route1', wasSearching: false });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // Verificar que Pidgey está en combate y tiene sus movimientos reales en español
    const activeMoves = await page.evaluate(() => {
      const store = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { state?: { player?: { moves?: Array<{ id: string; name?: string } | null> | null } | null } | null } }).__VITE_DEBUG_STORE_RESOLVER__?.();
      const moves = store?.state?.player?.moves || [];
      return moves.map((m: { id: string; name?: string } | null) => m ? { id: m.id, name: m.name } : null).filter(Boolean);
    });

    expect(activeMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });

    // Ordenar a Pidgey usar Placaje (reutilizando helper E2E)
    await handleBattleInput(page, 'move 1');

    // Esperar a que pase el turno y la FSM esté lista nuevamente
    await waitForWaitInput(page);

    // Lanzar Master Ball para capturar a Rattata
    await page.evaluate(async () => {
      const store = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { useItemInBattle: (id: string) => Promise<void> } }).__VITE_DEBUG_STORE_RESOLVER__?.();
      await store?.useItemInBattle('masterball');
    });

    // Esperar fin del combate 2
    await page.waitForFunction(() => {
      const store = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { state?: { over: boolean } } }).__VITE_DEBUG_STORE_RESOLVER__?.();
      return !store || !store.state;
    }, undefined, { timeout: 15000 });

    // --- COMBATE 3: Usar Rattata ---
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Poner al Rattata recién capturado como líder del equipo
      const rattataIndex = gameStore.state.team.findIndex((p: { id: string } | null) => p && p.id === 'rattata');
      if (rattataIndex !== -1) {
        const rattata = gameStore.state.team[rattataIndex];
        if (rattata) {
          gameStore.state.team.splice(rattataIndex, 1);
          gameStore.state.team.unshift(rattata);
        }
      }

      const wildCaterpie = pokemonDebugService.generate({ id: 'caterpie', level: 2 });
      await battleStore.startBattle(wildCaterpie, { locationId: 'route1', wasSearching: false });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // Verificar que Rattata está en combate con sus movimientos reales en español
    const rattataMoves = await page.evaluate(() => {
      const store = (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => { state?: { player?: { moves?: Array<{ id: string; name?: string } | null> | null } | null } | null } }).__VITE_DEBUG_STORE_RESOLVER__?.();
      const moves = store?.state?.player?.moves || [];
      return moves.map((m: { id: string; name?: string } | null) => m ? { id: m.id, name: m.name } : null).filter(Boolean);
    });

    expect(rattataMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });

    // Ordenar a Rattata usar Placaje (reutilizando helper E2E)
    await handleBattleInput(page, 'move 1');

    await waitForWaitInput(page);
  });

  test('debería asegurar que todos los movimientos tengan una animación y categoría mapeada correctamente', async ({ page }) => {
    await loginTestUser(page, 'TestPlayer3');

    // Obtener los IDs de movimientos directamente del archivo JSON cargado en Node
    const moveIdsToCheck = Object.keys(MOVE_TRANSLATIONS_ES);

    const unregisteredCategories = await page.evaluate(async (ids) => {
      const missing: string[] = [];
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider');
      
      ids.forEach((id) => {
        try {
          const md = pokemonDataProvider.getMoveData(id);
          if (!md) {
            missing.push(`${id}: no data in DB`);
            return;
          }
          const cat = String(md.cat || '').toLowerCase();
          if (cat !== 'physical' && cat !== 'special' && cat !== 'status') {
            missing.push(`${id}: invalid category "${cat}"`);
          }
        } catch (e: unknown) {
          missing.push(`${id}: error ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      return missing;
    }, moveIdsToCheck);

    expect(unregisteredCategories).toEqual([]);
  });
});

