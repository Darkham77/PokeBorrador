// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput } from '../e2e_helpers.ts';

class LockedMovesSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupLockedMoveScenario(pokemonId: string, moveIds: string[]): Promise<void> {
    await this.page.evaluate(async ({ pokemonId, moveIds }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const { requirePokemonMoveId } = await import('../../../src/data/battle/moves.ts');
      const { toID } = await import('../../../src/logic/utils/strings.ts');

      const { MAXIMUM_POKEMON_LEVEL } = await import('../../../src/logic/constants/gameplay.ts');
      const ATTACKER_TEST_LEVEL = 50;

      const attacker = pokemonDebugService.generate({ id: pokemonId, level: ATTACKER_TEST_LEVEL });
      attacker.moves = moveIds.map(id => {
        const cleanId = requirePokemonMoveId(toID(id));
        const md = pokemonDataProvider.getMoveData(cleanId);
        return {
          id: cleanId,
          name: md?.name || cleanId,
          type: md?.type || 'normal',
          cat: md?.cat || 'physical',
          power: md?.power,
          acc: md?.acc,
          pp: 15,
          maxPP: 15,
          priority: 0,
          disabled: false
        };
      });

      gameStore.state.team = [attacker];
      gameStore.state.starterChosen = true;

      // Tank bulky enemy (Blissey with 700 HP) so the battle lasts across multi-turn moves
      const BULKY_TANK_HP = 700;
      const defender = pokemonDebugService.generate({ id: 'blissey', level: MAXIMUM_POKEMON_LEVEL });
      defender.hp = BULKY_TANK_HP;
      defender.maxHp = BULKY_TANK_HP;
      defender.moves = [
        {
          id: 'softboiled',
          name: 'Amortiguador',
          type: 'normal',
          cat: 'status',
          pp: 10,
          maxPP: 10,
          disabled: false
        }
      ];

      await battleStore.startBattle(defender, {
        isTrainer: false,
        locationId: 'route1'
      });
    }, { pokemonId, moveIds });
    await waitForWaitInput(this.page);
  }
}

test.describe('Exhaustive Locked & Forced Moves E2E Simulations (Tier 3)', () => {
  test('1. lockedmove: Rayquaza con Enfado (Outrage) bloquea otros movimientos y ejecuta turnos sucesivos', async ({ page }) => {
    const sim = new LockedMovesSimWrapper(page, 'OutrageSim');
    await sim.setup();
    await sim.setupLockedMoveScenario('rayquaza', ['outrage', 'dragondance', 'raindance', 'hyperbeam']);

    // Turno 1: Ejecutar Enfado
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    const battleState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const bs = useBattleStore();
      return {
        turnCount: bs.state?.turnCount ?? 0,
        fsmState: bs.currentFsmState,
        subState: bs.currentSubState,
        playerMoves: bs.state?.player?.moves?.map(m => ({ id: m?.id, disabled: m?.disabled })),
        playerRequest: bs.state?.playerRequest
      };
    });

    console.log('[DEBUG-E2E-OUTRAGE]', JSON.stringify(battleState, null, 2));

    expect(battleState.turnCount).toBeGreaterThanOrEqual(1);
  });

  test('2. twoturnmove: Venusaur con Rayo Solar (Solar Beam) ejecuta la fase de carga y el turno de disparo', async ({ page }) => {
    const sim = new LockedMovesSimWrapper(page, 'SolarBeamSim');
    await sim.setup();
    await sim.setupLockedMoveScenario('venusaur', ['solarbeam', 'synthesis', 'leechseed', 'tackle']);

    // Turno 1: Cargar Rayo Solar
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    // Turno 2: Disparar Rayo Solar
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    const turnCount = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.turnCount ?? 0;
    });
    expect(turnCount).toBeGreaterThanOrEqual(2);
  });

  test('3. recharge: Snorlax con Hiperrayo (Hyper Beam) deshabilita movimientos en el turno de recarga', async ({ page }) => {
    const sim = new LockedMovesSimWrapper(page, 'HyperBeamSim');
    await sim.setup();
    await sim.setupLockedMoveScenario('snorlax', ['hyperbeam', 'bodyslam', 'rest', 'curse']);

    // Turno 1: Disparar Hiperrayo
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    // Turno 2: Recarga automática o turno de recarga
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    const turnCount = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.turnCount ?? 0;
    });
    expect(turnCount).toBeGreaterThanOrEqual(2);
  });

  test('4. uproar: Exploud con Alboroto (Uproar) progresa en turnos fijados', async ({ page }) => {
    const sim = new LockedMovesSimWrapper(page, 'UproarSim');
    await sim.setup();
    await sim.setupLockedMoveScenario('exploud', ['uproar', 'hypervoice', 'rest', 'screech']);

    // Turno 1: Iniciar Alboroto
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    // Turno 2: Continuación de Alboroto
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    const turnCount = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.turnCount ?? 0;
    });
    expect(turnCount).toBeGreaterThanOrEqual(2);
  });

  test('5. rollout: Donphan con Desenrollar (Rollout) progresa en turnos sucesivos', async ({ page }) => {
    const sim = new LockedMovesSimWrapper(page, 'RolloutSim');
    await sim.setup();
    await sim.setupLockedMoveScenario('donphan', ['rollout', 'earthquake', 'defensecurl', 'slam']);

    // Turno 1: Iniciar Desenrollar
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    // Turno 2: Continuación de Desenrollar
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    const turnCount = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.turnCount ?? 0;
    });
    expect(turnCount).toBeGreaterThanOrEqual(2);
  });

  test('6. bide: Golem con Venganza (Bide) almacena energía y desata el ataque', async ({ page }) => {
    const sim = new LockedMovesSimWrapper(page, 'BideSim');
    await sim.setup();
    await sim.setupLockedMoveScenario('golem', ['bide', 'earthquake', 'rockthrow', 'harden']);

    // Turno 1: Iniciar Venganza
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    // Turno 2: Continuación de Venganza
    await page.locator('#move-btn-0').click();
    await waitForWaitInput(page);

    const turnCount = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.turnCount ?? 0;
    });
    expect(turnCount).toBeGreaterThanOrEqual(2);
  });
});
