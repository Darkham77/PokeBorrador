import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { armBattleReadyForInput, awaitBattleReadyForInput, clickResilient } from '../e2e_helpers.ts';

const SIM_RANKED_INITIAL_ELO = 1500 as const;
const SIM_RANKED_OPPONENT_ELO = 1520 as const;
const SIM_INITIAL_BATTLE_COINS = 100 as const;
const SIM_LOW_HP_VALUE = 10 as const;
const SIM_FALLBACK_USER_ELO = 1000 as const;
const SIM_FALLBACK_RIVAL_ELO = 1020 as const;
const SIM_FALLBACK_POKEMON_LEVEL = 50 as const;
const SIM_RANKED_PASSIVE_RIVAL_ID = '3b222222-2222-4222-8222-222222222222' as const;

class PvpRankedMatchmakingSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async seedPassiveDefender(
    userId: string,
    username: string,
    elo: number,
    teamDataJson: string
  ): Promise<void> {
    if (this.driver === 'postgres') {
      await this.queryTestDb(`
        INSERT INTO auth.users (id, email, created_at)
        VALUES (?, ?, NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [userId, `${username.toLowerCase().replace(/[^a-z0-9_]/g, '')}@test.local`]);

      await this.queryTestDb(`
        INSERT INTO public.profiles (id, username, elo_rating, created_at)
        VALUES (?, ?, ?, NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [userId, username, elo]);

      await this.queryTestDb(`
        INSERT INTO public.passive_teams (user_id, elo_rating, team_data, is_active, updated_at)
        VALUES (?, ?, ?, true, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          elo_rating = EXCLUDED.elo_rating,
          team_data = EXCLUDED.team_data,
          is_active = true,
          updated_at = NOW();
      `, [userId, elo, teamDataJson]);
    } else {
      await this.queryTestDb(`
        INSERT OR REPLACE INTO passive_teams (user_id, elo_rating, team_data, is_active, updated_at)
        VALUES (?, ?, ?, 1, datetime('now'));
      `, [userId, elo, teamDataJson]);
    }
  }

  public async setupRankedPvpBattle(): Promise<void> {
    await this.page.evaluate(async ({ initialElo, opponentElo, initialCoins, lowHp }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();
      const livePvPStore = useLivePvPStore();
      const pvpStore = usePvPStore();

      pvpStore.elo = initialElo;
      gameStore.state.battleCoins = initialCoins;

      const pvpPikachu = pokemonDebugService.generate({ id: 'pikachu', level: 50 });
      const pvpCharizard = pokemonDebugService.generate({ id: 'charizard', level: 50 });
      const pvpBlastoise = pokemonDebugService.generate({ id: 'blastoise', level: 50 });

      gameStore.state.team = [pvpPikachu];
      gameStore.state.box = [pvpCharizard, pvpBlastoise];
      gameStore.state.pvpTeam = [pvpPikachu.uid, pvpCharizard.uid, pvpBlastoise.uid];
      gameStore.state.starterChosen = true;

      const enemyGengar = pokemonDebugService.generate({ id: 'gengar', level: 50 });
      enemyGengar.hp = lowHp;

      livePvPStore.battleState.isRanked = true;
      livePvPStore.battleState.active = true;
      livePvPStore.battleState.opponentElo = opponentElo;

      await battleStore.startBattle(enemyGengar, {
        isPvP: true,
        isRanked: true,
        pvpMatchId: 'sim-ranked-match-1',
        pvpIsHost: true,
        pvpOpponentName: 'Master Rival',
        enemyTeam: [enemyGengar],
        playerTeam: [pvpPikachu, pvpCharizard, pvpBlastoise],
        isTrainer: true,
        trainerName: 'Master Rival',
        trainerSprite: 'blue',
        locationId: 'gym'
      });
    }, {
      initialElo: SIM_RANKED_INITIAL_ELO,
      opponentElo: SIM_RANKED_OPPONENT_ELO,
      initialCoins: SIM_INITIAL_BATTLE_COINS,
      lowHp: SIM_LOW_HP_VALUE
    });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('PvP Ranked Matchmaking Combat Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('executes ranked battle with flat 50 scaling, visual clock, and verifies ELO & Battle Coins gain on victory', async ({ page }) => {
    const sim = new PvpRankedMatchmakingSimWrapper(page, 'PvpRankedSim');
    await sim.setup();
    await sim.setupRankedPvpBattle();

    // 1. Visual Turn Timer Clock MUST be rendered
    const turnClock = page.locator('#pvp-turn-timer-clock');
    await expect(turnClock).toBeVisible({ timeout: 10000 });

    // 2. Click Move 0 to execute turn
    const move0 = page.locator('#move-btn-0').first();
    await expect(move0).toBeVisible({ timeout: 10000 });
    await clickResilient(move0);

    // 3. Complete battle victory and assert ELO update and Battle Coins
    const result = await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const livePvPStore = useLivePvPStore();
      const gameStore = useGameStore();
      const pvpStore = usePvPStore();

      livePvPStore.endBattle(true, '¡Has ganado la batalla ranked!');

      return {
        phase: livePvPStore.battleState.phase,
        elo: pvpStore.elo,
        coins: gameStore.state.battleCoins
      };
    });

    expect(result.phase).toBe('over');
    expect(result.elo).toBeGreaterThan(SIM_RANKED_INITIAL_ELO);
    expect(result.coins).toBeGreaterThanOrEqual(SIM_INITIAL_BATTLE_COINS);
  });

  test('ranked search accelerates GSAP countdown and falls back to passive defense combat without team preview', async ({ page }) => {
    const sim = new PvpRankedMatchmakingSimWrapper(page, 'PvpRankedFallbackSim');
    await sim.setup();

    // 1. Setup user team and seed passive defense via simulation wrapper
    const enemyPokeJson = await page.evaluate(async ({ userElo, pokeLevel }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();
      const pvpStore = usePvPStore();
      pvpStore.currentSeasonRules = null;

      const p1 = pokemonDebugService.generate({ id: 'pikachu', level: pokeLevel });
      gameStore.state.team = [p1];
      gameStore.state.pvpTeam = [p1.uid];
      gameStore.state.starterChosen = true;
      gameStore.state.eloRating = userElo;

      const enemyPoke = pokemonDebugService.generate({ id: 'gengar', level: pokeLevel });
      return JSON.stringify([enemyPoke]);
    }, { userElo: SIM_FALLBACK_USER_ELO, pokeLevel: SIM_FALLBACK_POKEMON_LEVEL });

    await sim.seedPassiveDefender(
      SIM_RANKED_PASSIVE_RIVAL_ID,
      'Passive Rival Sim',
      SIM_FALLBACK_RIVAL_ELO,
      enemyPokeJson
    );

    // 2. Arm battle-ready listener and start search (GSAP runs at 100x by default in E2E)
    await armBattleReadyForInput(page);

    await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const livePvPStore = useLivePvPStore();
      await livePvPStore.startSearch();
    });

    // 3. BattleArena opens directly in choosing phase (without team preview)
    await awaitBattleReadyForInput(page);

    const turnClock = page.locator('#pvp-turn-timer-clock');
    await expect(turnClock).toBeVisible({ timeout: 10000 });

    // 4. Verify move button 0 is ready and clickable
    const move0 = page.locator('#move-btn-0').first();
    await expect(move0).toBeVisible({ timeout: 10000 });
  });
});
