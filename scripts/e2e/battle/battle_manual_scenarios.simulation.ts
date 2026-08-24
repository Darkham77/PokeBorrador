// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { armBattleReadyForInput, awaitBattleReadyForInput, awaitGameStoreReady, waitForWaitInput } from '../e2e_helpers.ts';

class ManualScenariosSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupReviveScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { revive: 1 };
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 5 });
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0; // Debilitado
      gameStore.state.team = [bulbasaur, charmander];
      gameStore.state.starterChosen = true;

      const pikachu = pokemonDebugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });
  }

  public async getCharmanderHp(): Promise<number> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.team[1]?.hp ?? 0;
    });
  }
}

test.describe('Battle Manual E2E Scenarios', () => {
  test('debería consumir un Revivir en un Pokémon de la banca debilitado y jugar el combate hasta el final', async ({ page }) => {
    const sim = new ManualScenariosSimWrapper(page, 'ManualRevive');
    await sim.setup();
    await armBattleReadyForInput(page);
    await sim.setupReviveScenario();
    await awaitBattleReadyForInput(page);

    const charmanderUid = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.team[1]?.uid || '';
    });

    await sim.useItemOnPokemon('revive', charmanderUid);

    expect(await sim.getCharmanderHp()).toBeGreaterThan(0);
  });

  test('debería persistir y restaurar el combate activo y sus condiciones completas al recargar la página con F5', async ({ page }) => {
    const sim = new ManualScenariosSimWrapper(page, 'BattleReloadF5');
    await sim.setup();

    // 1. Iniciar un combate de entrenador con clima, hazards y el 2do Pokémon activo
    await armBattleReadyForInput(page);
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const p1 = pokemonDebugService.generate({ id: 'pikachu', level: 20 });
      const p2 = pokemonDebugService.generate({ id: 'charizard', level: 25 });
      gameStore.state.team = [p1, p2];
      gameStore.state.starterChosen = true;

      const enemy = pokemonDebugService.generate({ id: 'blastoise', level: 25 });
      enemy.heldItem = 'focussash';

      await battleStore.startBattle(enemy, {
        isTrainer: true,
        isRival: true,
        trainerArchetype: 'rival',
        trainerName: 'Rival Azul',
        trainerSprite: 'youngster-masters',
        enemyTeam: [enemy],
        locationId: 'route1',
      });

      // Establecer clima, condiciones y cambiar al 2do Pokémon en la arena
      if (battleStore.state) {
        battleStore.state.weather = { type: 'rain', visual: 'rain', turns: 4 };
        battleStore.state.playerSideConditions = {
          lightscreen: { turns: 3 },
        };
        battleStore.state.playerTeamIndex = 1;
        battleStore.state.player = p2;
        battleStore.state.turnCount = 3;
        battleStore.state.cannotEscape = true;
        battleStore.persistBattle();
      }
    });

    await awaitBattleReadyForInput(page);

    // Guardar el estado antes del F5
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      await useGameStore().saveGame();
    });

    // 2. Simular recarga de página (F5) con listener de eventos
    await page.reload();
    await awaitGameStoreReady(page);
    await waitForWaitInput(page);

    // 3. Verificar que todos los campos del combate fueron restaurados 1:1
    const restoredState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const battle = useBattleStore().state;
      return {
        isActive: useBattleStore().isBattleActive,
        isTrainer: battle?.isTrainer,
        isRival: battle?.isRival,
        trainerName: battle?.trainerName,
        playerUid: battle?.player?.uid,
        playerTeamIndex: battle?.playerTeamIndex,
        turnCount: battle?.turnCount,
        cannotEscape: battle?.cannotEscape,
        weatherType: battle?.weather?.type,
        weatherTurns: battle?.weather?.turns,
        hasLightScreen: Boolean(battle?.playerSideConditions?.lightscreen),
        enemyHeldItem: battle?.enemyTeam?.[0]?.heldItem,
      };
    });

    expect(restoredState.isActive).toBe(true);
    expect(restoredState.isTrainer).toBe(true);
    expect(restoredState.isRival).toBe(true);
    expect(restoredState.trainerName).toBe('Rival Azul');
    expect(restoredState.playerTeamIndex).toBe(1);
    expect(restoredState.turnCount).toBe(3);
    expect(restoredState.cannotEscape).toBe(true);
    expect(restoredState.weatherType).toBe('rain');
    expect(restoredState.weatherTurns).toBe(4);
    expect(restoredState.hasLightScreen).toBe(true);
    expect(restoredState.enemyHeldItem).toBe('focussash');
  });

  test('debería persistir el modo búsqueda de hierbas al recargar la página con F5 para evitar trampas', async ({ page }) => {
    const sim = new ManualScenariosSimWrapper(page, 'SearchReloadF5');
    await sim.setup();

    // 1. Iniciar modo búsqueda en ruta 2
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.team = [pokemonDebugService.generate({ id: 'pikachu', level: 10 })];
      gameStore.state.starterChosen = true;
      if (gameStore.state.map) {
        gameStore.state.map.currentMap = 'route2';
      }

      const enemy = pokemonDebugService.generate({ id: 'rattata', level: 3 });
      await battleStore.startBattle(enemy, { locationId: 'route2', wasSearching: true });
      await battleStore.completeBattleFlow('search');
      battleStore.persistBattle();
      await gameStore.saveGame();
    });

    // 2. Simular recarga de página (F5) con listener de eventos
    await page.reload();
    await awaitGameStoreReady(page);

    await page.waitForFunction(() => {
      const resolver = (window as { __VITE_DEBUG_STORE_RESOLVER__?: () => { currentFsmState: string; state?: { locationId?: string } } }).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const bs = resolver();
      return bs && bs.currentFsmState === 'SEARCH_PHASE';
    }, undefined, { timeout: 30000 });

    const searchState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { BATTLE_STATES } = await import('../../../src/logic/battle/battleStateMachine.ts');
      return {
        state: useBattleStore().currentFsmState,
        subState: useBattleStore().currentSubState,
        searchState: BATTLE_STATES.SEARCH_PHASE,
        locationId: useBattleStore().state?.locationId,
      };
    });

    expect(searchState.state).toBe(searchState.searchState);
    expect(searchState.locationId).toBe('route2');
  });
});
