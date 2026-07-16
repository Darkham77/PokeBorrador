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


  public async useItemOnPokemon(itemId: string, name: string): Promise<void> {
    const card = this.page.locator(`.quick-item-card[data-item-id="${itemId}"]:not(.is-disabled)`).first();
    await card.waitFor({ state: 'visible', timeout: 5000 });
    await card.click();

    const targetBtn = this.page.locator(`.list-item:has(.name:has-text("${name}")), button:has-text("${name}")`).first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();
    await waitForWaitInput(this.page);
  }

  public async voluntarySwitch(pokemonName: string, pokemonUid?: string): Promise<void> {
    // Wait until the CAMBIAR button is enabled (not disabled by isProcessing / animations).
    const cambiarBtn = this.page.locator('button.switch-btn:not([disabled])');
    await cambiarBtn.waitFor({ state: 'visible', timeout: 10000 });
    await cambiarBtn.click();

    // Wait for the PokemonSelectionModal to open (any list-item becomes visible).
    // Then target the specific Pokémon: prefer data-pokemon-uid (exact) over text matching
    // (text can be affected by CSS transforms, special chars, font rendering, etc.).
    await this.page.locator('.list-item').first().waitFor({ state: 'visible', timeout: 10000 });
    const selector = pokemonUid
      ? `.list-item[data-pokemon-uid="${pokemonUid}"]`
      : `.list-item:has(.name:has-text("${pokemonName}"))`;
    const targetBtn = this.page.locator(selector).first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();
    await waitForWaitInput(this.page);
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

    await sim.forceEnemyChoice('move tackle');
    await sim.useItemOnPokemon('potion', 'Bulbasaur');

    const stateAfter = await sim.getBattleStoreState();
    expect(stateAfter?.playerHp).toBeGreaterThan(5);

    // Curar banca (Charmander) con Súper Poción
    const charmanderBefore = stateAfter?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderBefore?.hp).toBe(10);

    await sim.forceEnemyChoice('move tackle');
    await sim.useItemOnPokemon('superpotion', 'Charmander');

    const stateAfterBench = await sim.getBattleStoreState();
    const charmanderAfter = stateAfterBench?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderAfter?.hp).toBeGreaterThan(10);
    expect(stateAfterBench?.playerHp).toBeGreaterThan(5);
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

    // Curar activo (Squirtle)
    await sim.useItemOnPokemon('antidote', 'Squirtle');
    const stateAfter = await sim.getBattleStoreState();
    expect(stateAfter?.playerStatus).toBeNull();

    // Curar banca (Bulbasaur)
    const bulbasaurBefore = stateAfter?.playerTeam.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurBefore?.status).toBe('brn');

    await sim.useItemOnPokemon('burnheal', 'Bulbasaur');
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
    await sim.useItemOnPokemon('revive', 'Charmander');
    const stateAfterRevive = await sim.getBattleStoreState();
    const charmanderAfter = stateAfterRevive?.playerTeam.find(p => p.name === 'Charmander');
    expect(charmanderAfter?.hp).toBeGreaterThan(0);

    // Cambiar al Charmander revivido usando el modal PokemonSelection.
    // Usamos el UID del estado post-revivir para una selección exacta (data-pokemon-uid),
    // evitando problemas de text matching con fuentes pixeladas / caracteres especiales.
    // Forzamos Tail Whip (sin daño) para que Charmander no caiga en el mismo turno del switch.
    await sim.forceEnemyChoice('move tailwhip');
    await sim.voluntarySwitch('Charmander', charmanderAfter?.uid);

    const stateAfterSwitch = await sim.getBattleStoreState();
    expect(stateAfterSwitch?.activePlayerUid).toBe(charmanderAfter?.uid);
  });
});
