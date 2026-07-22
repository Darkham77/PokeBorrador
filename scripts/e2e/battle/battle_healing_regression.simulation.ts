// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, type WindowWithResolver } from '../e2e_helpers.ts';

class HealingSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupHpScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { potion: 2, superpotion: 2 };

      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.hp = 5;

      const charmander = debugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 10;

      gameStore.state.team = [bulbasaur, charmander];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      const rattata = debugService.generate({ id: 'rattata', level: 5 });
      (window as WindowWithResolver).__VITE_DEBUG__ = { ...(window as WindowWithResolver).__VITE_DEBUG__, battleSeed: [1, 2, 3, 4] };
      await battleStore.startBattle(rattata, { locationId: 'route1' });
    });
  }

  public async setupStatusScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { antidote: 2, burnheal: 2 };

      const squirtle = debugService.generate({ id: 'squirtle', level: 5 });
      squirtle.status = 'psn';

      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.status = 'brn';

      gameStore.state.team = [squirtle, bulbasaur];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      const rattata = debugService.generate({ id: 'rattata', level: 5 });
      await battleStore.startBattle(rattata, { locationId: 'route1' });
    });
  }

  public async setupReviveScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { revive: 2 };

      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      // Keep Bulbasaur HP high so it cannot faint from a single Rattata lv5 hit,
      // ensuring the post-revive switch is always voluntary (not forced by a faint).
      bulbasaur.hp = bulbasaur.maxHp;
      const charmander = debugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0;

      gameStore.state.team = [bulbasaur, charmander];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      const rattata = debugService.generate({ id: 'rattata', level: 5 });
      // Pin seed for determinism (same pattern as the other two scenarios).
      const win = window as { __VITE_DEBUG__?: { battleSeed?: number[] } };
      win.__VITE_DEBUG__ = win.__VITE_DEBUG__ ?? {};
      win.__VITE_DEBUG__.battleSeed = [1, 2, 3, 4];
      await battleStore.startBattle(rattata, { locationId: 'route1' });
    });
  }
}

test.describe('Regresión de Curación en Combate (Playwright)', () => {
  test('debería curar HP del activo y de la banca sin revertirse tras el ataque enemigo', async ({ page }) => {
    const sim = new HealingSimWrapper(page, 'HealingUser_Hp');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupHpScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    // Curar activo (Bulbasaur) con Poción
    const stateBefore = await sim.getBattleStoreState();
    expect(stateBefore?.playerHp).toBe(5);
    const bulbasaurUid = stateBefore?.playerTeam.find(p => p.name === 'Bulbasaur')?.uid || '';

    await sim.forceEnemyChoice('move tackle');
    await sim.useItemOnPokemon('potion', bulbasaurUid);

    const stateAfter = await sim.getBattleStoreState();
    expect(stateAfter?.playerHp).toBeGreaterThan(0);

    // Curar banca (Charmander) con Súper Poción
    const charmanderBefore = stateAfter?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderBefore?.hp).toBe(10);

    await sim.forceEnemyChoice('move tackle');
    await sim.useItemOnPokemon('superpotion', charmanderBefore?.uid || '');

    const stateAfterBench = await sim.getBattleStoreState();
    const charmanderAfter = stateAfterBench?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderAfter?.hp).toBeGreaterThan(10);
    expect(stateAfterBench?.playerHp).toBeGreaterThan(0);
  });

  test('debería curar estados alterados del activo y de la banca', async ({ page }) => {
    const sim = new HealingSimWrapper(page, 'HealingUser_Status');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupStatusScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    const stateBefore = await sim.getBattleStoreState();
    expect(stateBefore?.playerStatus).toBe('psn');
    const squirtleUid = stateBefore?.playerTeam.find(p => p.name === 'Squirtle')?.uid || '';

    // Curar activo (Squirtle)
    await sim.forceEnemyChoice('move tackle');
    await sim.useItemOnPokemon('antidote', squirtleUid);
    const stateAfter = await sim.getBattleStoreState();
    expect(stateAfter?.playerStatus).toBeNull();

    // Curar banca (Bulbasaur)
    const bulbasaurBefore = stateAfter?.playerTeam.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurBefore?.status).toBe('brn');

    await sim.useItemOnPokemon('burnheal', bulbasaurBefore?.uid || '');
    const stateAfterBench = await sim.getBattleStoreState();
    const bulbasaurAfter = stateAfterBench?.playerTeam.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurAfter?.status).toBeNull();
  });

  test('debería revivir a un Pokémon debilitado en la banca y permitir cambiarlo a batalla', async ({ page }) => {
    const sim = new HealingSimWrapper(page, 'HealingUser_Revive');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupReviveScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    const stateBefore = await sim.getBattleStoreState();
    const charmanderBefore = stateBefore?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderBefore?.hp).toBe(0);

    // Revivir
    await sim.useItemOnPokemon('revive', charmanderBefore?.uid || '');
    const stateAfterRevive = await sim.getBattleStoreState();
    const charmanderAfter = stateAfterRevive?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderAfter?.hp).toBeGreaterThan(0);

    await sim.forceEnemyChoice('move tailwhip');
    await sim.voluntarySwitch(charmanderAfter?.uid || '');

    // Wait until the active player's UID actually updates to Charmander's UID
    await page.waitForFunction((uid) => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.()?.state?.player?.uid === uid;
    }, charmanderAfter?.uid, { timeout: 5000 });

    const stateAfterSwitch = await sim.getBattleStoreState();
    expect(stateAfterSwitch?.activePlayerUid).toBe(charmanderAfter?.uid);
  });
});
