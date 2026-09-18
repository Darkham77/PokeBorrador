/**
 * scripts/e2e/battle/battle_post_sequence_modals.simulation.ts
 *
 * E2E Simulation: Post-Battle Sequential Modals (Move Learning -> Evolution -> Event Auto-Enroll).
 * Validates in real browser:
 * 1. MoveLearning and Evolution execute in strict priority queue order without modal stacking deadlock.
 * 2. Cancelling move learning gracefully hands off to the next queued task (Evolution).
 * 3. Learning multiple moves sequentially opens each modal sequentially without deadlock.
 * 4. Triple cascade: MoveLearning -> Evolution -> EventAutoEnroll executes seamlessly.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 10s action timeouts, zero artificial timers)
 * - /game-simulation (dual DB execution, fail-fast determinism, in-file parallelism)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';
import { clickResilient } from '../e2e_helpers.ts';

class PostBattleSequenceSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username, { enableEvents: true });
  }

  public async setupTestScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const starter = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('charmander'),
        level: 15
      });
      gameStore.state.team = [starter];
      gameStore.state.starterChosen = true;

      const eventStore = useEventStore();
      eventStore.simEventsEnabled = true;
      const mockEvent = {
        id: 'post_seq_comp_test',
        name: 'Concurso Post-Secuencia',
        description: 'Test competition for post-battle sequence',
        active: true,
        type: 'competition' as const,
        icon: '🏆',
        config: JSON.stringify({
          subCompetitions: [{ id: 'heavyweight', name: 'Más Pesado', metric: 'weight', order: 'max' }]
        }),
        rules: {
          categories: [{ id: 'heavyweight', title: 'Más Pesado', metric: 'weight' as const, order: 'max' as const }]
        }
      };
      eventStore.allEvents = [mockEvent];
      eventStore.activeEvents = [mockEvent];
    });
  }
}

test.describe('Post-Battle Sequential Modal Coordinator E2E Simulation', () => {
  test.beforeEach(async () => {
    test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
  });

  test('executes MoveLearning followed by Evolution in strict priority queue order', async ({ page }) => {
    const sim = new PostBattleSequenceSimWrapper(page, 'SeqMoveEvoUser');
    await sim.setup();
    await sim.setupTestScenario();

    // Trigger coordinator sequence in page context
    await page.evaluate(async () => {
      const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { requirePokemonMoveId } = await import('../../../src/data/battle/moves.ts');
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const pokemon = gameStore.state.team[0]!;
      const md = pokemonDataProvider.getMoveData(requirePokemonMoveId('dragonrage'));
      const newMove = { ...md, maxPP: md.pp };

      postBattleCoordinator.clear();
      postBattleCoordinator.enqueueMoveLearning([{ pokemon, move: newMove }]);
      postBattleCoordinator.enqueueEvolution(pokemon, requirePokemonSpeciesId('charmeleon'));

      // Launch sequence asynchronously
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const battleStore = useBattleStore();
      void postBattleCoordinator.runSequence(battleStore.getContext());
    });

    // 1. First: MoveLearningModal MUST appear (Priority 100)
    const moveModal = page.locator('#move-learning-modal');
    await expect(moveModal).toBeVisible({ timeout: 10000 });

    // Evolution modal MUST NOT be visible yet
    const evoModal = page.locator('#evolution-modal');
    await expect(evoModal).not.toBeVisible();

    // 2. Select slot 0 to replace move
    const slot0Btn = page.locator('#move-btn-0');
    await expect(slot0Btn).toBeVisible();
    await clickResilient(slot0Btn);

    // 3. Move modal closes
    await expect(moveModal).not.toBeVisible({ timeout: 10000 });

    // 4. Immediately: Evolution modal MUST appear (Priority 80)
    await expect(evoModal).toBeVisible({ timeout: 10000 });

    // 5. Confirm evolution once ready
    const evoConfirmBtn = page.locator('#btn-evolution-confirm');
    await expect(evoConfirmBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(evoConfirmBtn);

    // 6. Evolution modal closes
    await expect(evoModal).not.toBeVisible({ timeout: 10000 });

    // 7. Verify coordinator is idle and Pokemon evolved
    await expect.poll(async () => {
      return await page.evaluate(async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
        const p = useGameStore().state.team[0];
        return p?.id === 'charmeleon' && !postBattleCoordinator.isBusy();
      });
    }, { timeout: 10000 }).toBe(true);

    sim.finish('MoveLearning -> Evolution E2E Verified');
  });

  test('cancelling move learning cleanly advances to evolution without deadlock', async ({ page }) => {
    const sim = new PostBattleSequenceSimWrapper(page, 'SeqCancelMoveEvoUser');
    await sim.setup();
    await sim.setupTestScenario();

    await page.evaluate(async () => {
      const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { requirePokemonMoveId } = await import('../../../src/data/battle/moves.ts');
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const pokemon = gameStore.state.team[0]!;
      const md = pokemonDataProvider.getMoveData(requirePokemonMoveId('dragonbreath'));
      const newMove = { ...md, maxPP: md.pp };

      postBattleCoordinator.clear();
      postBattleCoordinator.enqueueMoveLearning([{ pokemon, move: newMove }]);
      postBattleCoordinator.enqueueEvolution(pokemon, requirePokemonSpeciesId('charmeleon'));

      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const battleStore = useBattleStore();
      void postBattleCoordinator.runSequence(battleStore.getContext());
    });

    // 1. Move learning opens
    const moveModal = page.locator('#move-learning-modal');
    await expect(moveModal).toBeVisible({ timeout: 10000 });

    // 2. Click Cancel button
    const cancelBtn = page.locator('#btn-move-learn-cancel');
    await expect(cancelBtn).toBeVisible();
    await clickResilient(cancelBtn);

    // 3. Move modal closes
    await expect(moveModal).not.toBeVisible({ timeout: 10000 });

    // 4. Evolution modal appears next
    const evoModal = page.locator('#evolution-modal');
    await expect(evoModal).toBeVisible({ timeout: 10000 });

    // 5. Confirm evolution
    const evoConfirmBtn = page.locator('#btn-evolution-confirm');
    await expect(evoConfirmBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(evoConfirmBtn);
    await expect(evoModal).not.toBeVisible({ timeout: 10000 });

    await expect.poll(async () => {
      return await page.evaluate(async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
        const p = useGameStore().state.team[0];
        return p?.id === 'charmeleon' && !postBattleCoordinator.isBusy();
      });
    }, { timeout: 10000 }).toBe(true);

    sim.finish('Cancel Move -> Evolution E2E Verified');
  });

  test('handles sequential double move learning without duplicate modal lock', async ({ page }) => {
    const sim = new PostBattleSequenceSimWrapper(page, 'SeqDoubleMoveUser');
    await sim.setup();
    await sim.setupTestScenario();

    await page.evaluate(async () => {
      const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { requirePokemonMoveId } = await import('../../../src/data/battle/moves.ts');
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider.ts');

      const gameStore = useGameStore();
      const pokemon = gameStore.state.team[0]!;
      const md1 = pokemonDataProvider.getMoveData(requirePokemonMoveId('flamethrower'));
      const move1 = { ...md1, maxPP: md1.pp };
      const md2 = pokemonDataProvider.getMoveData(requirePokemonMoveId('fireblast'));
      const move2 = { ...md2, maxPP: md2.pp };

      postBattleCoordinator.clear();
      postBattleCoordinator.enqueueMoveLearning([
        { pokemon, move: move1 },
        { pokemon, move: move2 }
      ]);

      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const battleStore = useBattleStore();
      void postBattleCoordinator.runSequence(battleStore.getContext());
    });

    const moveModal = page.locator('#move-learning-modal');
    await expect(moveModal).toBeVisible({ timeout: 10000 });

    // Resolve move 1 by replacing slot 0
    const slot0Btn = page.locator('#move-btn-0');
    await expect(slot0Btn).toBeVisible();
    await clickResilient(slot0Btn);

    // Modal re-hydrates or remains open for move 2
    // Resolve move 2 by clicking cancel
    const cancelBtn = page.locator('#btn-move-learn-cancel');
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(cancelBtn);

    await expect(moveModal).not.toBeVisible({ timeout: 10000 });

    await expect.poll(async () => {
      return await page.evaluate(async () => {
        const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
        return !postBattleCoordinator.isBusy();
      });
    }, { timeout: 10000 }).toBe(true);

    sim.finish('Double Move Learning E2E Verified');
  });

  test('triple cascade: MoveLearning -> Evolution -> EventAutoEnroll executes in exact priority order', async ({ page }) => {
    const sim = new PostBattleSequenceSimWrapper(page, 'SeqTripleCascadeUser');
    await sim.setup();
    await sim.setupTestScenario();

    await page.evaluate(async () => {
      const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { requirePokemonMoveId } = await import('../../../src/data/battle/moves.ts');
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const pokemon = gameStore.state.team[0]!;
      const md = pokemonDataProvider.getMoveData(requirePokemonMoveId('dragonrage'));
      const newMove = { ...md, maxPP: md.pp };

      const snorlax = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('snorlax'),
        level: 5
      });
      snorlax.weight = 460;
      snorlax.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

      postBattleCoordinator.clear();
      // Enqueue in arbitrary order to verify coordinator sorts by priority (100 -> 80 -> 60)
      postBattleCoordinator.enqueueEventAutoEnroll(snorlax);
      postBattleCoordinator.enqueueEvolution(pokemon, requirePokemonSpeciesId('charmeleon'));
      postBattleCoordinator.enqueueMoveLearning([{ pokemon, move: newMove }]);

      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const battleStore = useBattleStore();
      void postBattleCoordinator.runSequence(battleStore.getContext());
    });

    // 1. Priority 100: Move Learning Modal
    const moveModal = page.locator('#move-learning-modal');
    await expect(moveModal).toBeVisible({ timeout: 10000 });
    const slot0Btn = page.locator('#move-btn-0');
    await clickResilient(slot0Btn);
    await expect(moveModal).not.toBeVisible({ timeout: 10000 });

    // 2. Priority 80: Evolution Modal
    const evoModal = page.locator('#evolution-modal');
    await expect(evoModal).toBeVisible({ timeout: 10000 });
    const evoConfirmBtn = page.locator('#btn-evolution-confirm');
    await expect(evoConfirmBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(evoConfirmBtn);
    await expect(evoModal).not.toBeVisible({ timeout: 10000 });

    // 3. Priority 60: Event Auto-Enroll Modal
    const enrollModal = page.locator('#event-auto-enroll-modal');
    await expect(enrollModal).toBeVisible({ timeout: 10000 });
    const enrollConfirmBtn = page.locator('#btn-enroll-confirm');
    await expect(enrollConfirmBtn).toBeVisible();
    await clickResilient(enrollConfirmBtn);
    await expect(enrollModal).not.toBeVisible({ timeout: 10000 });

    // 4. Coordinator completed
    await expect.poll(async () => {
      return await page.evaluate(async () => {
        const { postBattleCoordinator } = await import('../../../src/logic/battle/postBattleSequenceCoordinator.ts');
        return !postBattleCoordinator.isBusy();
      });
    }, { timeout: 10000 }).toBe(true);

    sim.finish('Triple Cascade Sequence E2E Verified');
  });
});
