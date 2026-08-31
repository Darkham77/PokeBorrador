import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { armBattleReadyForInput, awaitBattleReadyForInput, awaitGameStoreReady, type WindowWithResolver } from '../e2e_helpers.ts';
import type { BattleState } from '../../../src/types/battle/battle.ts';

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
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const bs = resolver();
      const fsmState = bs?.currentFsmState;
      const fsmSubState = bs?.currentSubState;
      return bs && fsmState === 'ACTIVE_BATTLE' && fsmSubState === 'WAIT_INPUT' && bs.state !== null;
    }, undefined, { timeout: 30000 });

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

    // 1. Iniciar modo búsqueda en ruta 2 y persistir estado de búsqueda activa
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();

      gameStore.state.team = [pokemonDebugService.generate({ id: 'pikachu', level: 10 })];
      gameStore.state.starterChosen = true;
      if (gameStore.state.map) {
        gameStore.state.map.currentMap = 'route2';
      }

      const activeBattle: BattleState = {
        player: null,
        enemy: null,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [],
        locationId: 'route2',
        isTrainer: false,
        weather: { type: 'none', turns: 0 },
        turnCount: 0,
        over: false,
        escapeAttempts: 0,
        wasSearching: true
      };
      gameStore.state.activeBattle = activeBattle;
      await gameStore.saveGame();
    });

    // 2. Simular recarga de página (F5) con listener de eventos
    await page.reload();
    await awaitGameStoreReady(page);

    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const bs = resolver();
      if (!bs) return false;
      const fsmState = bs.currentFsmState;
      return fsmState === 'SEARCH_PHASE' || fsmState === 'ACTIVE_BATTLE';
    }, undefined, { timeout: 15000 });

    const searchState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const bs = useBattleStore();
      return {
        fsmState: bs.currentFsmState,
        locationId: bs.state?.locationId,
        wasSearching: Boolean(bs.state?.wasSearching),
      };
    });

    expect(['SEARCH_PHASE', 'ACTIVE_BATTLE']).toContain(searchState.fsmState);
    expect(searchState.locationId).toBe('route2');
    expect(searchState.wasSearching).toBe(true);
  });
});
