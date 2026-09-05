import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  type WindowWithResolver
} from '../e2e_helpers.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';

interface TeamMemberRewardSnapshot {
  id: string;
  hp: number;
  fainted?: boolean;
  exp: number;
  evs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  heldItem?: string | null;
}

class PartyRewardsSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupPartyBattleScenario(): Promise<void> {
    await this.setupWildBattle(
      {
        id: 'bulbasaur',
        level: 5,
        hp: 1 // 1 HP to guarantee 1-hit KO
      },
      {
        locationId: 'route1',
        playerTeam: [
          {
            id: 'charmander',
            level: 10,
            moves: ['ember'],
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          },
          {
            id: 'squirtle',
            level: 10,
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          },
          {
            id: 'pikachu',
            level: 10,
            heldItem: 'expshare',
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          },
          {
            id: 'pidgey',
            level: 10,
            hp: 0,
            fainted: true,
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          },
          {
            id: 'machop',
            level: 10,
            heldItem: 'powerbracer',
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          }
        ]
      }
    );
  }

  public async setupCapturePartyScenario(): Promise<void> {
    await this.setupWildBattle(
      {
        id: 'caterpie',
        level: 3
      },
      {
        locationId: 'route1',
        inventory: [{ id: 'masterball', quantity: 5 }],
        playerTeam: [
          {
            id: 'charmander',
            level: 10,
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          },
          {
            id: 'squirtle',
            level: 10,
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          },
          {
            id: 'pidgey',
            level: 10,
            hp: 0,
            fainted: true,
            exp: 0,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          }
        ]
      }
    );
  }

  public async getTeamSnapshot(): Promise<TeamMemberRewardSnapshot[]> {
    return await this.page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      const team = (store?.state?.team || []) as Array<{
        id?: string;
        hp?: number;
        fainted?: boolean;
        exp?: number;
        evs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
        heldItem?: string | null;
      }>;
      return team.map((p) => ({
        id: p.id || '',
        hp: p.hp ?? 0,
        fainted: Boolean(p.fainted),
        exp: p.exp ?? 0,
        evs: {
          hp: p.evs?.hp ?? 0,
          atk: p.evs?.atk ?? 0,
          def: p.evs?.def ?? 0,
          spa: p.evs?.spa ?? 0,
          spd: p.evs?.spd ?? 0,
          spe: p.evs?.spe ?? 0,
        },
        heldItem: p.heldItem ?? null
      }));
    });
  }
}

test.describe('Battle Party Rewards & EV Distribution Simulation (Gen VI–IX Parity)', () => {
  test.beforeEach(async () => {
    test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
  });

  test('should distribute 100% undivided EVs and shared Exp to living party members upon defeating foe, strictly excluding fainted members', async ({ page }) => {
    const sim = new PartyRewardsSimWrapper(page, 'PartyRewardsCombatUser');
    await sim.setup();

    await armBattleReadyForInput(page);
    await sim.setupPartyBattleScenario();
    await awaitBattleReadyForInput(page);

    // Attack Bulbasaur with Ember to win in 1 turn
    await armBattleFlowCompletion(page);
    const moveBtn = page.locator('#move-btn-0');
    await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await moveBtn.click();
    await awaitBattleFlowCompletion(page);

    const team = await sim.getTeamSnapshot();
    expect(team.length).toBe(5);

    const activeMon = team[0]!;
    const benchNoItem = team[1]!;
    const benchExpShare = team[2]!;
    const benchFainted = team[3]!;
    const benchPowerItem = team[4]!;

    // 1. Active Combatant (Charmander): 100% Exp, 100% EV (Bulbasaur gives 1 SpA)
    expect(activeMon.id).toBe('charmander');
    expect(activeMon.evs.spa).toBe(1);
    expect(activeMon.evs.atk).toBe(0);
    const activeExp = activeMon.exp;
    expect(activeExp).toBeGreaterThan(0);

    // 2. Living Bench without item (Squirtle): 50% Exp, 100% full undivided EV (1 SpA)
    expect(benchNoItem.id).toBe('squirtle');
    expect(benchNoItem.evs.spa).toBe(1);
    expect(benchNoItem.evs.atk).toBe(0);
    expect(benchNoItem.exp).toBe(Math.floor(activeExp * 0.5));

    // 3. Living Bench holding expshare (Pikachu): 100% Exp boosted, 100% full undivided EV (1 SpA)
    expect(benchExpShare.id).toBe('pikachu');
    expect(benchExpShare.evs.spa).toBe(1);
    expect(benchExpShare.evs.atk).toBe(0);
    expect(benchExpShare.exp).toBe(activeExp);

    // 4. Fainted Member (Pidgey, hp = 0): strictly 0 Exp, 0 EVs
    expect(benchFainted.id).toBe('pidgey');
    expect(benchFainted.evs.spa).toBe(0);
    expect(benchFainted.evs.atk).toBe(0);
    expect(benchFainted.exp).toBe(0);

    // 5. Living Bench with powerbracer (Machop): 100% base EV (1 SpA) + 8 Atk from Power Bracer
    expect(benchPowerItem.id).toBe('machop');
    expect(benchPowerItem.evs.spa).toBe(1);
    expect(benchPowerItem.evs.atk).toBe(8);
    expect(benchPowerItem.exp).toBe(Math.floor(activeExp * 0.5));

    sim.finish('Defeat Party Rewards E2E Verified');
  });

  test('should distribute EVs and Exp upon capturing a wild Pokemon, while the newly captured Pokemon receives none from its own capture', async ({ page }) => {
    const sim = new PartyRewardsSimWrapper(page, 'PartyRewardsCaptureUser');
    await sim.setup();

    await armBattleReadyForInput(page);
    await sim.setupCapturePartyScenario();
    await awaitBattleReadyForInput(page);

    // Capture Caterpie with Master Ball
    await sim.throwBall('masterball', { expectCapture: true });

    const team = await sim.getTeamSnapshot();
    expect(team.length).toBe(4); // 3 original + 1 captured Caterpie added to team

    const activeMon = team[0]!;
    const benchMon = team[1]!;
    const faintedMon = team[2]!;
    const capturedMon = team[3]!;

    // Active Charmander: Earned Caterpie's 1 HP EV and Exp
    expect(activeMon.id).toBe('charmander');
    expect(activeMon.evs.hp).toBe(1);
    const activeExp = activeMon.exp;
    expect(activeExp).toBeGreaterThan(0);

    // Benched Squirtle: Earned Caterpie's 1 HP EV and 50% Exp
    expect(benchMon.id).toBe('squirtle');
    expect(benchMon.evs.hp).toBe(1);
    expect(benchMon.exp).toBe(Math.floor(activeExp * 0.5));

    // Fainted Pidgey: 0 EVs, 0 Exp
    expect(faintedMon.id).toBe('pidgey');
    expect(faintedMon.evs.hp).toBe(0);
    expect(faintedMon.exp).toBe(0);

    // Captured Caterpie: Newly captured Pokemon NEVER earns Exp or EVs from its own capture
    expect(capturedMon.id).toBe('caterpie');
    expect(capturedMon.evs.hp).toBe(0);
    expect(capturedMon.exp).toBe(0);

    sim.finish('Capture Party Rewards E2E Verified');
  });
});
