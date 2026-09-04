/**
 * scripts/e2e/events/magikarp_contest_multiusers.simulation.ts
 *
 * E2E Simulation: Multi-User Magikarp Fishing Tournament Podium & Awarding
 * Validates:
 * 1. Deterministic canonical tournament window (Tuesday Week 1: Magikarp & Gyarados).
 * 2. GUI enrollment of P1 (180 IVs Magikarp) via PokemonSelectionModal, confirming exclusion of out-of-window catches.
 * 3. Multi-user competitive field (P2 with 150 IVs, P3 with 120 IVs, P4 with 60 IVs).
 * 4. Advancing time past tournament conclusion and executing server procedure fn_award_event_automated.
 * 5. Deterministic podium ranking: P1 = 1st, P2 = 2nd, P3 = 3rd, P4 = excluded.
 * 6. GUI claiming of 1st place award and verification of Pokemon onEvent release.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 5s action timeouts, zero timers)
 * - /game-simulation (dual DB execution, fail-fast determinism)
 * - /domain-type-first (canonical models, typed seeds)
 * - /ponytail (concise, minimal, single-responsibility)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

export class MagikarpContestMultiuserSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string = 'ContestChampion') {
    super(page, username);
  }

  /**
   * Sets up P1 with a valid 180 IVs Magikarp caught during event window
   * and an outdated Magikarp caught outside the window.
   */
  public async setupContestScenario(): Promise<{ validMonUid: string; outdatedMonUid: string }> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { getServerTime } = await import('../../../src/logic/utils/timeUtils.ts');

      const gameStore = useGameStore();
      const currentSimTime = getServerTime();

      gameStore.state.money = 10000;
      gameStore.state.battleCoins = 50;
      gameStore.state.starterChosen = true;

      // 1. Valid Magikarp with 180 IVs (caught during event window)
      const validMagikarp = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('magikarp'),
        level: 20
      });
      validMagikarp.uid = 'sim-karp-p1-gold';
      validMagikarp.name = 'Magikarp';
      validMagikarp.nickname = 'Magikarp_180';
      validMagikarp.ivs = { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 }; // 180 IVs
      validMagikarp.obtainedAt = currentSimTime;

      // 2. Outdated Magikarp (caught 30 days before event)
      const oldMagikarp = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('magikarp'),
        level: 15
      });
      oldMagikarp.uid = 'sim-karp-p1-old';
      oldMagikarp.name = 'Magikarp (Old)';
      oldMagikarp.nickname = 'Magikarp_Old';
      oldMagikarp.obtainedAt = 1000; // Past

      gameStore.state.team = [validMagikarp, oldMagikarp];
      gameStore.state.box = [];

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }

      return { validMonUid: validMagikarp.uid, outdatedMonUid: oldMagikarp.uid };
    });
  }

  /**
   * Seeds competitor entries in competition_entries table for P2, P3, and P4
   */
  public async seedCompetitorEntries(): Promise<void> {
    const comp2Data = JSON.stringify({
      species: 'magikarp',
      name: 'Magikarp',
      nickname: 'Magikarp_150',
      total_ivs: 150,
      ivs: { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 },
      obtained_at: 1785870000000
    });

    const comp3Data = JSON.stringify({
      species: 'magikarp',
      name: 'Magikarp',
      nickname: 'Magikarp_120',
      total_ivs: 120,
      ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
      obtained_at: 1785870000000
    });

    const comp4Data = JSON.stringify({
      species: 'magikarp',
      name: 'Magikarp',
      nickname: 'Magikarp_60',
      total_ivs: 60,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      obtained_at: 1785870000000
    });

    if (this.driver === 'postgres') {
      await this.queryTestDb(`
        INSERT INTO auth.users (id, email, created_at) VALUES 
        ('b0000000-0000-0000-0000-000000000002', 'p2@test.local', NOW()),
        ('b0000000-0000-0000-0000-000000000003', 'p3@test.local', NOW()),
        ('b0000000-0000-0000-0000-000000000004', 'p4@test.local', NOW())
        ON CONFLICT (id) DO NOTHING;
      `);

      await this.queryTestDb(`
        INSERT INTO competition_entries (id, event_id, category_id, player_id, player_name, player_email, data, submitted_at)
        VALUES 
        ('a0000000-0000-0000-0000-000000000002', 'torneo_pesca', 'ivs', 'b0000000-0000-0000-0000-000000000002', 'ContestPlayer_2', 'p2@test.local', $1, NOW()),
        ('a0000000-0000-0000-0000-000000000003', 'torneo_pesca', 'ivs', 'b0000000-0000-0000-0000-000000000003', 'ContestPlayer_3', 'p3@test.local', $2, NOW()),
        ('a0000000-0000-0000-0000-000000000004', 'torneo_pesca', 'ivs', 'b0000000-0000-0000-0000-000000000004', 'ContestPlayer_4', 'p4@test.local', $3, NOW())
        ON CONFLICT (event_id, category_id, player_id) DO NOTHING;
      `, [comp2Data, comp3Data, comp4Data]);
    } else {
      await this.page.evaluate(async ({ c2, c3, c4 }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const gameStore = useGameStore();
        if (!gameStore.db) throw new Error('[Magikarp Simulation] Game DB is not ready');

        await gameStore.db.from('competition_entries').insert({
          id: 'a0000000-0000-0000-0000-000000000002',
          event_id: 'torneo_pesca',
          category_id: 'ivs',
          player_id: 'b0000000-0000-0000-0000-000000000002',
          player_name: 'ContestPlayer_2',
          player_email: 'p2@test.local',
          pokemon_uid: 'sim-karp-p2',
          submitted_at: '2026-08-04T19:10:00Z',
          data: c2
        });

        await gameStore.db.from('competition_entries').insert({
          id: 'a0000000-0000-0000-0000-000000000003',
          event_id: 'torneo_pesca',
          category_id: 'ivs',
          player_id: 'b0000000-0000-0000-0000-000000000003',
          player_name: 'ContestPlayer_3',
          player_email: 'p3@test.local',
          pokemon_uid: 'sim-karp-p3',
          submitted_at: '2026-08-04T19:15:00Z',
          data: c3
        });

        await gameStore.db.from('competition_entries').insert({
          id: 'a0000000-0000-0000-0000-000000000004',
          event_id: 'torneo_pesca',
          category_id: 'ivs',
          player_id: 'b0000000-0000-0000-0000-000000000004',
          player_name: 'ContestPlayer_4',
          player_email: 'p4@test.local',
          pokemon_uid: 'sim-karp-p4',
          submitted_at: '2026-08-04T19:20:00Z',
          data: c4
        });

        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }, { c2: comp2Data, c3: comp3Data, c4: comp4Data });
    }
  }
}

test.describe('Magikarp Tournament Multi-User Podium & GUI Awarding E2E Simulation', () => {
  test('ranks 4 players deterministically by IVs, awards top 3, excludes 4th, and verifies GUI claim', async ({ page }) => {
    const sim = new MagikarpContestMultiuserSimulation(page, 'ContestChampion');
    await sim.setup();

    try {
      // 1. Fail-fast canonical validation
      await sim.assertCanonicalEventExists('torneo_pesca');

      // 2. Deterministic time anchor: Tuesday Week 1 (August 4, 2026, 19:00 GMT-3)
      await sim.setMockGameTime('2026-08-04T19:00:00');

      // 3. Setup P1 with 180 IVs Magikarp and outdated Magikarp
      const p1Setup = await sim.setupContestScenario();

      // 4. Open World Events via HUD
      await sim.openWorldEventsViaHud();

      // 5. Locate torneo_pesca card and click global IVs category chip
      const ivsChip = page.locator('#comp-slot-chip-torneo_pesca-ivs');
      await expect(ivsChip).toBeVisible({ timeout: 5000 });
      await ivsChip.click();

      // 6. Verify selection modal excludes outdated Magikarp and presents valid Magikarp
      const modal = page.locator('.selection-container');
      await expect(modal).toBeVisible({ timeout: 5000 });

      const validKarpCard = page.locator('#pokemon-select-' + p1Setup.validMonUid);
      const oldKarpCard = page.locator('#pokemon-select-' + p1Setup.outdatedMonUid);

      await expect(validKarpCard).toBeVisible({ timeout: 5000 });
      await expect(oldKarpCard).toHaveCount(0);

      // Select valid 180 IVs Magikarp
      await validKarpCard.click();
      await expect(modal).toHaveCount(0, { timeout: 5000 });
      await expect(ivsChip).toHaveClass(/enrolled/, { timeout: 5000 });

      // Close modal before server awarding
      await sim.closeWorldEventsModal();

      // 7. Seed 3 competitor entries in database (P2: 150 IVs, P3: 120 IVs, P4: 60 IVs)
      await sim.seedCompetitorEntries();

      // 8. Advance time past tournament conclusion: Wednesday August 5, 2026, 01:00 GMT-3
      await sim.setMockGameTime('2026-08-05T01:00:00');

      // 9. Trigger server automated awarding procedure
      await sim.triggerEventAwarding('torneo_pesca');

      // 10. Re-open World Events modal via HUD to verify GUI podium & award
      await sim.openWorldEventsViaHud();

      // Banner shows 1st place award for P1
      const awardItems = page.locator('.event-pending-awards-banner .award-item');
      await expect(awardItems).toHaveCount(1, { timeout: 5000 });

      // 11. Verify competition results in store / database
      const winners = await page.evaluate(async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const res = await useGameStore().db.from('competition_results').select('*').eq('event_id', 'torneo_pesca');
        const rows = (res.data || []) as Array<{ winners?: unknown }>;
        if (rows.length === 0) return [];
        const latestResult = rows[0];
        const rawWinners = latestResult?.winners;
        const parsedWinners = typeof rawWinners === 'string' ? JSON.parse(rawWinners) : rawWinners;
        return (parsedWinners || []) as Array<{ rank: string; player_name: string; score: number }>;
      });

      // Assert Top 3 podium integrity
      const firstPlace = winners.find(w => w.rank === 'first' && w.player_name === 'ContestChampion');
      const secondPlace = winners.find(w => w.rank === 'second' && w.player_name === 'ContestPlayer_2');
      const thirdPlace = winners.find(w => w.rank === 'third' && w.player_name === 'ContestPlayer_3');
      const fourthPlace = winners.find(w => w.player_name === 'ContestPlayer_4');

      expect(firstPlace).toBeDefined();
      expect(firstPlace?.score).toBe(180);
      expect(secondPlace).toBeDefined();
      expect(secondPlace?.score).toBe(150);
      expect(thirdPlace).toBeDefined();
      expect(thirdPlace?.score).toBe(120);
      expect(fourthPlace).toBeUndefined(); // P4 excluded from podium

      // 12. Claim 1st place award in GUI
      const claimBtn = page.locator('[id^="claim-pending-award-btn-"]').first();
      await expect(claimBtn).toBeVisible({ timeout: 5000 });
      await claimBtn.click();

      // Banner is now empty
      await expect(awardItems).toHaveCount(0, { timeout: 5000 });

      // 13. Verify resource accreditation and onEvent release
      const p1Status = await page.evaluate(async (uid: string) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const st = useGameStore().state;
        const mon = useGameStore().getPokemonByUid(uid);
        return {
          money: st.money || 0,
          battleCoins: st.battleCoins || 0,
          onEvent: mon?.onEvent
        };
      }, p1Setup.validMonUid);

      expect(p1Status.money).toBe(35000); // 10000 initial + 25000 1st place prize
      expect(p1Status.battleCoins).toBe(200); // 50 initial + 150 1st place prize
      expect(p1Status.onEvent).toBe(false); // Released from tournament on claim

      sim.finish('Magikarp Tournament Multi-User Podium & GUI Awarding E2E Simulation', 'passed');
    } catch (err) {
      sim.finish('Magikarp Tournament Multi-User Podium & GUI Awarding E2E Simulation', 'failed');
      throw err;
    } finally {
      await sim.resetMockGameTime();
    }
  });
});
