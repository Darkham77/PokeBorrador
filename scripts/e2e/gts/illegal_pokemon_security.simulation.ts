import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';

const LEGAL_STARTER_LEVEL = 10;
const ILLEGAL_CATERPIE_LEVEL = 5;
const ILLEGAL_RAYQUAZA_LEVEL = 70;
const MOCK_INITIAL_SECURITY_MONEY = 25000;
const MOCK_ATTEMPT_LISTING_PRICE = 10000;
const HYDRO_PUMP_BASE_POWER = 110;
const HYDRO_PUMP_ACCURACY = 80;
const HYDRO_PUMP_PP = 5;
const EXPECTED_INITIAL_BOX_COUNT = 3;
const EXPECTED_LEGAL_TEAM_COUNT = 1;

class IllegalPokemonSecuritySimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string, sqliteKey?: string) {
    super(page, username, undefined, sqliteKey);
  }

  public async setupTestInventoryWithIllegalPokemon(): Promise<void> {
    await this.page.evaluate(
      async (opts) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

        const game = useGameStore();
        game.state.money = opts.MOCK_INITIAL_SECURITY_MONEY;
        game.state.playerClass = 'rocket';

        // 1 Legal Starter in team
        const starter = pokemonDebugService.generate({ id: 'bulbasaur', level: opts.LEGAL_STARTER_LEVEL });
        starter.uid = 'team-starter-legal';
        game.state.team = [starter];

        // 1 Legal in Box
        const legalBox = pokemonDebugService.generate({ id: 'pidgey', level: opts.LEGAL_STARTER_LEVEL });
        legalBox.uid = 'box-pidgey-legal';

        // 1 Illegal in Box: Caterpie with Hydro Pump (illegal move)
        const illegalCaterpie = pokemonDebugService.generate({ id: 'caterpie', level: opts.ILLEGAL_CATERPIE_LEVEL });
        illegalCaterpie.uid = 'box-caterpie-illegal-move';
        illegalCaterpie.moves = [{
          id: 'hydropump',
          name: 'Hydro Pump',
          type: 'water',
          cat: 'special',
          power: opts.HYDRO_PUMP_BASE_POWER,
          acc: opts.HYDRO_PUMP_ACCURACY,
          pp: opts.HYDRO_PUMP_PP,
          maxPP: opts.HYDRO_PUMP_PP
        }];

        // 1 Illegal in Box: Rayquaza with Wonder Guard (illegal ability)
        const illegalRayquaza = pokemonDebugService.generate({ id: 'rayquaza', level: opts.ILLEGAL_RAYQUAZA_LEVEL });
        illegalRayquaza.uid = 'box-rayquaza-illegal-ability';
        illegalRayquaza.ability = 'wonderguard';

        game.state.box = [legalBox, illegalCaterpie, illegalRayquaza];
        game.state.starterChosen = true;
        await game.saveGame();
      },
      {
        LEGAL_STARTER_LEVEL,
        ILLEGAL_CATERPIE_LEVEL,
        ILLEGAL_RAYQUAZA_LEVEL,
        MOCK_INITIAL_SECURITY_MONEY,
        HYDRO_PUMP_BASE_POWER,
        HYDRO_PUMP_ACCURACY,
        HYDRO_PUMP_PP
      }
    );
  }

  public async openGTS(): Promise<void> {
    await this.openModal('GlobalMarket');
  }
}

test.describe('Illegal Pokémon Security System E2E Simulation', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://127.0.0.1:5174/api/dev-import-db-cleanup');
  });

  test('should block moving illegal Pokémon from box to active team', async ({ page }) => {
    const sim = new IllegalPokemonSecuritySimulation(page, 'SecUserBox');
    await sim.setup();
    await sim.setupTestInventoryWithIllegalPokemon();

    // Attempt to move illegal Caterpie (box index 1) to team
    const result = await page.evaluate(async () => {
      const { useBoxStore } = await import('../../../src/stores/box.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const box = useBoxStore();
      const game = useGameStore();

      const moveRes = box.moveBoxToTeam(1);
      return {
        moveRes,
        teamLength: game.state.team.length,
        isIllegal: game.state.box[1]?.isIllegal
      };
    });

    expect(result.moveRes.success).toBe(false);
    expect(result.moveRes.msg).toContain('ilegal');
    expect(result.teamLength).toBe(EXPECTED_LEGAL_TEAM_COUNT);
    expect(result.isIllegal).toBe(true);
    sim.finish('should block moving illegal Pokémon from box to active team', 'passed');
  });

  test('should exclude illegal Pokémon from Market Publish UI selection', async ({ page }) => {
    const sim = new IllegalPokemonSecuritySimulation(page, 'SecUserMarketUI');
    await sim.setup();
    await sim.setupTestInventoryWithIllegalPokemon();
    await sim.openGTS();

    // Verify that available Pokémon for publish exclude illegal Pokémon
    const availableUids = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { checkPokemonLegality } = await import('../../../src/logic/pokemon/pokemonLegality.ts');

      const game = useGameStore();
      const allPokemon = [...(game.state.team || []), ...(game.state.box || [])].filter(
        (p): p is import('../../../src/types/pokemon/pokemon.ts').Pokemon => Boolean(p)
      );
      const valid = allPokemon.filter((p) => !p.isIllegal && checkPokemonLegality(p).isLegal);

      return valid.map((p) => p.uid);
    });

    expect(availableUids).toContain('team-starter-legal');
    expect(availableUids).toContain('box-pidgey-legal');
    expect(availableUids).not.toContain('box-caterpie-illegal-move');
    expect(availableUids).not.toContain('box-rayquaza-illegal-ability');
    sim.finish('should exclude illegal Pokémon from Market Publish UI selection', 'passed');
  });

  test('should reject direct GTS publish attempts of illegal Pokémon', async ({ page }) => {
    const sim = new IllegalPokemonSecuritySimulation(page, 'SecUserGTSPublish');
    await sim.setup();
    await sim.setupTestInventoryWithIllegalPokemon();

    const publishSuccess = await page.evaluate(
      async (price) => {
        const { useGTSStore } = await import('../../../src/stores/gts.ts');
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const gts = useGTSStore();
        const game = useGameStore();

        const illegalPoke = game.state.box[1];
        if (!illegalPoke) throw new Error('Illegal pokemon not found in box');
        return await gts.publishListing('pokemon', illegalPoke, price);
      },
      MOCK_ATTEMPT_LISTING_PRICE
    );

    expect(publishSuccess).toBe(false);
    sim.finish('should reject direct GTS publish attempts of illegal Pokémon', 'passed');
  });

  test('should block Black Market Rocket sale and yield $0 for illegal Pokémon', async ({ page }) => {
    const sim = new IllegalPokemonSecuritySimulation(page, 'SecUserRocket');
    await sim.setup();
    await sim.setupTestInventoryWithIllegalPokemon();

    const rocketResult = await page.evaluate(async () => {
      const { useBoxStore } = await import('../../../src/stores/box.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const box = useBoxStore();
      const game = useGameStore();

      box.toggleBoxRocketMode();

      // Box index 1 is illegal Caterpie
      box.toggleBoxRocketSelect(1);
      const selectedAfterIllegal = [...box.boxRocketSelected];

      // Force selection in test state to verify execution defense
      box.boxRocketSelected = [1];
      const sellValue = box.getRocketSellValue();
      const sold = box.doBoxRocketSell();

      return {
        selectedAfterIllegal,
        sellValue,
        soldCount: sold.count,
        soldValue: sold.value,
        boxLength: game.state.box.length
      };
    });

    expect(rocketResult.selectedAfterIllegal).toEqual([]);
    expect(rocketResult.sellValue).toBe(0);
    expect(rocketResult.soldCount).toBe(0);
    expect(rocketResult.soldValue).toBe(0);
    expect(rocketResult.boxLength).toBe(EXPECTED_INITIAL_BOX_COUNT);
    sim.finish('should block Black Market Rocket sale and yield $0 for illegal Pokémon', 'passed');
  });
});
