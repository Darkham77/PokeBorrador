/**
 * scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts
 *
 * Comprehensive E2E Simulation for Pokemon Friendship Lifecycle & UI Parity:
 * 1. Team seals visual rendering across all 4 positive tiers (Sprout, Comrade, Radiant Prism, Best Friends).
 * 2. Real-time seal promotion upon gaining friendship (Sprout 75 -> Comrade 100).
 * 3. Faint penalty (-1) and degradation into Distrust tier (Sprout 50 -> Distrust 49).
 * 4. Evolution readiness check for friendship evolutions (Golbat >= 160).
 * 5. Full page reload (F5) persistence verification: asserts 100% data fidelity after database save and reload.
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

const FRIENDSHIP_SPROUT_USER_VALUE = 75;
const FRIENDSHIP_COMRADE_VALUE = 100;
const FRIENDSHIP_RADIANT_PRISM_VALUE = 160;
const FRIENDSHIP_BEST_FRIENDS_VALUE = 220;
const FRIENDSHIP_FAINT_TEST_VALUE = 50;

class PokemonFriendshipSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupFriendshipTestTeam(): Promise<{ success: boolean; teamUids: string[] }> {
    return await this.page.evaluate(async ({ sproutVal, comradeVal, radiantVal, bestVal, faintVal }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const gameStore = useGameStore();

      // 1. Gengar: Sprout (75) - User's exact scenario
      const p1 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('gengar'), level: 61 });
      p1.uid = 'sim-gengar-75';
      p1.friendship = sproutVal;

      // 2. Pikachu: Comrade (100)
      const p2 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 25 });
      p2.uid = 'sim-pikachu-100';
      p2.friendship = comradeVal;

      // 3. Golbat: Radiant Prism (160) - Ready to evolve
      const p3 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('golbat'), level: 35 });
      p3.uid = 'sim-golbat-160';
      p3.friendship = radiantVal;

      // 4. Snorlax: Best Friends (220) - Miracle combat perks
      const p4 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('snorlax'), level: 50 });
      p4.uid = 'sim-snorlax-220';
      p4.friendship = bestVal;

      // 5. Caterpie: Faint test baseline (50)
      const p5 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: 10 });
      p5.uid = 'sim-caterpie-50';
      p5.friendship = faintVal;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [p1, p2, p3, p4, p5];
      gameStore.state.box = [];

      await gameStore.save(false, true, true);

      return {
        success: true,
        teamUids: [p1.uid, p2.uid, p3.uid, p4.uid, p5.uid]
      };
    }, {
      sproutVal: FRIENDSHIP_SPROUT_USER_VALUE,
      comradeVal: FRIENDSHIP_COMRADE_VALUE,
      radiantVal: FRIENDSHIP_RADIANT_PRISM_VALUE,
      bestVal: FRIENDSHIP_BEST_FRIENDS_VALUE,
      faintVal: FRIENDSHIP_FAINT_TEST_VALUE
    });
  }

  public async applyFriendshipDeltaToPokemon(uid: string, delta: number): Promise<{ oldF: number; newF: number; tier: string }> {
    return await this.page.evaluate(async ({ monUid, deltaAmount }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { applyFriendshipDelta, resolveFriendshipSealTier } = await import('../../../src/logic/pokemon/friendshipLogic.ts');
      const gameStore = useGameStore();

      const mon = gameStore.state.team.find(p => p.uid === monUid);
      if (!mon) throw new Error(`Pokemon with uid ${monUid} not found in team`);

      const result = applyFriendshipDelta(mon, deltaAmount);
      await gameStore.save(false, true, true);

      return {
        oldF: result.oldFriendship,
        newF: result.newFriendship,
        tier: resolveFriendshipSealTier(result.newFriendship)
      };
    }, { monUid: uid, deltaAmount: delta });
  }

  public async triggerWalkingActivityWithSteps(uid: string, initialSteps: number, activity: 'battle' | 'gym' | 'capture'): Promise<{ newFriendship: number; remainingSteps: number }> {
    return await this.page.evaluate(async ({ monUid, steps, act }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const gameStore = useGameStore();
      const breedingStore = useBreedingStore();

      const mon = gameStore.state.team.find(p => p.uid === monUid);
      if (!mon) throw new Error(`Pokemon ${monUid} not found`);
      mon.friendshipSteps = steps;

      const origRandom = Math.random;
      try {
        Math.random = () => 0.1;
        breedingStore.reduceHatchTimers(act);
      } finally {
        Math.random = origRandom;
      }

      await gameStore.save(false, true, true);

      return {
        newFriendship: mon.friendship ?? 70,
        remainingSteps: mon.friendshipSteps ?? 0,
      };
    }, { monUid: uid, steps: initialSteps, act: activity });
  }

  public async getTeamFriendshipSnapshot(): Promise<{ uid: string; friendship: number; friendshipSteps: number; sealTier: string; isEvoReady: boolean }[]> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { resolveFriendshipSealTier, isReadyForFriendshipEvolution } = await import('../../../src/logic/pokemon/friendshipLogic.ts');
      const gameStore = useGameStore();

      return gameStore.state.team.map(p => ({
        uid: p.uid,
        friendship: p.friendship ?? 70,
        friendshipSteps: p.friendshipSteps ?? 0,
        sealTier: resolveFriendshipSealTier(p.friendship),
        isEvoReady: isReadyForFriendshipEvolution(p)
      }));
    });
  }
}

test.describe('Pokemon Friendship Lifecycle, Seals & Persistence Simulation', () => {
  test('verifies friendship seals, promotions, faint drops, and reload persistence', async ({ page }) => {
    const sim = new PokemonFriendshipSimulation(page, 'FriendshipMaster');

    await sim.setup();
    await waitForStoreReady(page);

    // 1. Setup multi-tier team
    const setupResult = await sim.setupFriendshipTestTeam();
    expect(setupResult.success).toBe(true);

    // 2. Assert initial team state and UI seal visibility
    const snapshot1 = await sim.getTeamFriendshipSnapshot();
    expect(snapshot1.length).toBe(5);

    // Gengar: 75 (Sprout)
    expect(snapshot1[0]!.uid).toBe('sim-gengar-75');
    expect(snapshot1[0]!.friendship).toBe(75);
    expect(snapshot1[0]!.sealTier).toBe('sprout');
    expect(snapshot1[0]!.isEvoReady).toBe(false);

    // Pikachu: 100 (Comrade)
    expect(snapshot1[1]!.uid).toBe('sim-pikachu-100');
    expect(snapshot1[1]!.friendship).toBe(100);
    expect(snapshot1[1]!.sealTier).toBe('comrade');

    // Golbat: 160 (Radiant Prism, ready to evolve!)
    expect(snapshot1[2]!.uid).toBe('sim-golbat-160');
    expect(snapshot1[2]!.friendship).toBe(160);
    expect(snapshot1[2]!.sealTier).toBe('radiant_prism');
    expect(snapshot1[2]!.isEvoReady).toBe(true);

    // Snorlax: 220 (Best Friends)
    expect(snapshot1[3]!.uid).toBe('sim-snorlax-220');
    expect(snapshot1[3]!.friendship).toBe(220);
    expect(snapshot1[3]!.sealTier).toBe('best_friends');

    // Open Team Management Modal to render the team cards and their friendship badges
    await page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      useUIStore().toggleTeamManagement();
    });
    await page.locator('.tm-section-container').waitFor({ state: 'visible' });

    // Verify DOM seal badge elements exist
    await expect(page.locator('#friendship-seal-sprout').first()).toBeVisible();
    await expect(page.locator('#friendship-seal-comrade').first()).toBeVisible();
    await expect(page.locator('#friendship-seal-radiant_prism').first()).toBeVisible();
    await expect(page.locator('#friendship-seal-best_friends').first()).toBeVisible();

    // 3. Promote Gengar from 75 to 100 (Sprout -> Comrade)
    const promoteResult = await sim.applyFriendshipDeltaToPokemon('sim-gengar-75', 25);
    expect(promoteResult.oldF).toBe(75);
    expect(promoteResult.newF).toBe(100);
    expect(promoteResult.tier).toBe('comrade');

    // 4. Apply faint penalty to Caterpie (50 -> 49, dropping into Distrust)
    const faintResult = await sim.applyFriendshipDeltaToPokemon('sim-caterpie-50', -1);
    expect(faintResult.oldF).toBe(50);
    expect(faintResult.newF).toBe(49);
    expect(faintResult.tier).toBe('distrust');

    // 5. Test Full Persistence Across Page Reload (F5)
    await page.reload();
    await waitForStoreReady(page);

    const snapshotAfterReload = await sim.getTeamFriendshipSnapshot();
    expect(snapshotAfterReload.length).toBe(5);

    // Gengar retained 100 and Comrade tier
    const reloadedGengar = snapshotAfterReload.find(p => p.uid === 'sim-gengar-75')!;
    expect(reloadedGengar.friendship).toBe(100);
    expect(reloadedGengar.sealTier).toBe('comrade');

    // Golbat retained 160 and evolution readiness
    const reloadedGolbat = snapshotAfterReload.find(p => p.uid === 'sim-golbat-160')!;
    expect(reloadedGolbat.friendship).toBe(160);
    expect(reloadedGolbat.sealTier).toBe('radiant_prism');
    expect(reloadedGolbat.isEvoReady).toBe(true);

    // Snorlax retained 220 and Best Friends tier
    const reloadedSnorlax = snapshotAfterReload.find(p => p.uid === 'sim-snorlax-220')!;
    expect(reloadedSnorlax.friendship).toBe(220);
    expect(reloadedSnorlax.sealTier).toBe('best_friends');

    // Caterpie retained 49 and Distrust tier
    const reloadedCaterpie = snapshotAfterReload.find(p => p.uid === 'sim-caterpie-50')!;
    expect(reloadedCaterpie.friendship).toBe(49);
    expect(reloadedCaterpie.sealTier).toBe('distrust');

    // Re-open team modal after reload to render rehydrated cards
    await page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      useUIStore().toggleTeamManagement();
    });
    await page.locator('.tm-section-container').waitFor({ state: 'visible' });

    // Verify DOM after reload still displays the seals
    await expect(page.locator('#friendship-seal-distrust').first()).toBeVisible();
    await expect(page.locator('#friendship-seal-comrade').first()).toBeVisible();
    await expect(page.locator('#friendship-seal-radiant_prism').first()).toBeVisible();
    await expect(page.locator('#friendship-seal-best_friends').first()).toBeVisible();

    // 6. Test Walking Step Friendship & Toast Notification on Companion
    const walkResult = await sim.triggerWalkingActivityWithSteps('sim-gengar-75', 126, 'battle');
    // 126 + 2 = 128 -> cycle completed, +1 friendship (100 -> 101)
    expect(walkResult.newFriendship).toBe(101);
    expect(walkResult.remainingSteps).toBe(0);

    // Toast notification visible in DOM with heart icon and Gengar's name
    const toast = page.locator('#notification-stack .toast-item').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Gengar');

    // Reload again to assert per-Pokemon step persistence across reload
    await page.reload();
    await waitForStoreReady(page);
    const snapshotWalkReload = await sim.getTeamFriendshipSnapshot();
    const gengarAfterWalk = snapshotWalkReload.find(p => p.uid === 'sim-gengar-75')!;
    expect(gengarAfterWalk.friendship).toBe(101);
    expect(gengarAfterWalk.friendshipSteps).toBe(0);

    sim.finish('verifies friendship seals, promotions, faint drops, walking steps toast, and reload persistence', 'passed');
  });
});
