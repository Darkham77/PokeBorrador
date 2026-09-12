import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';

const INITIAL_PLAYER_MONEY = 1000;
const INITIAL_EEVEE_VIGOR = 100;
const EXPECTED_MISSION_CLASS_XP = 50;
const EXPECTED_POST_DEPLOY_MONEY = 5000;
const EXPECTED_POST_DEPLOY_COINS = 100;
const EXPECTED_MIN_LEVEL = 21;
const EXPECTED_MIN_EEVEE_IVS = 60;
const EXPECTED_BUG_COUNT = 3;
const EXPECTED_NETBALL_COUNT = 3;
const EXPECTED_BUG_STREAK = 2;
const EXPECTED_BREEDER_REMAINING_COINS = 200;
const EXPECTED_EVERSTONES = 1;

class ClassDeploymentsSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupRocketScenario(): Promise<string> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const TRAINER_LEVEL = 10;
      const STARTING_MONEY = 1000;
      const PIKACHU_LEVEL = 20;
      const EKANS_LEVEL = 15;

      const gameStore = useGameStore();
      gameStore.state.starterChosen = true;
      gameStore.state.playerClass = 'rocket';
      gameStore.state.classLevel = 1;
      gameStore.state.trainerLevel = TRAINER_LEVEL;
      gameStore.state.money = STARTING_MONEY;
      gameStore.state.classXP = 0;
      gameStore.state.inventory = { nugget: 0 };
      gameStore.state.classData.activeMission = null;
      gameStore.state.classData.criminality = 0;

      const activePikachu = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: PIKACHU_LEVEL });
      gameStore.state.team = [activePikachu];

      const sacrificeEkans = pokemonDebugService.generate({ id: requirePokemonSpeciesId('ekans'), level: EKANS_LEVEL });
      sacrificeEkans.nickname = 'SACRIFICE_EKANS';
      gameStore.state.box = [sacrificeEkans];

      await gameStore.saveGame();
      return sacrificeEkans.uid;
    });
  }

  public async setupCazabichosScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const TRAINER_LEVEL = 10;
      const STARTING_MONEY = 10000;
      const BADGES_COUNT = 8;
      const STREAK_COUNT = 2;
      const PIKACHU_LEVEL = 20;

      const gameStore = useGameStore();
      gameStore.state.starterChosen = true;
      gameStore.state.playerClass = 'cazabichos';
      gameStore.state.classLevel = 1;
      gameStore.state.trainerLevel = TRAINER_LEVEL;
      gameStore.state.money = STARTING_MONEY;
      gameStore.state.badges = BADGES_COUNT;
      gameStore.state.classXP = 0;
      gameStore.state.inventory = { netball: 0 };
      gameStore.state.classData.activeMission = null;
      gameStore.state.classData.captureStreak = STREAK_COUNT;
      gameStore.state.classData.longestStreak = STREAK_COUNT;

      const activePikachu = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: PIKACHU_LEVEL });
      gameStore.state.team = [activePikachu];
      gameStore.state.box = [];

      await gameStore.saveGame();
    });
  }

  public async setupEntrenadorScenario(): Promise<string> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const TRAINER_LEVEL = 10;
      const STARTING_MONEY = 10000;
      const BATTLE_COINS = 50;
      const CHARIZARD_LEVEL = 50;
      const PIKACHU_LEVEL = 20;

      const gameStore = useGameStore();
      gameStore.state.starterChosen = true;
      gameStore.state.playerClass = 'entrenador';
      gameStore.state.classLevel = 1;
      gameStore.state.trainerLevel = TRAINER_LEVEL;
      gameStore.state.money = STARTING_MONEY;
      gameStore.state.battleCoins = BATTLE_COINS;
      gameStore.state.classXP = 0;
      gameStore.state.classData.activeMission = null;

      const activeCharizard = pokemonDebugService.generate({ id: requirePokemonSpeciesId('charizard'), level: CHARIZARD_LEVEL });
      gameStore.state.team = [activeCharizard];

      const trainingPikachu = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: PIKACHU_LEVEL });
      trainingPikachu.nickname = 'TRAINING_PIKACHU';
      trainingPikachu.exp = 0;
      gameStore.state.box = [trainingPikachu];

      await gameStore.saveGame();
      return trainingPikachu.uid;
    });
  }

  public async setupCriadorScenario(): Promise<string> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const TRAINER_LEVEL = 10;
      const STARTING_MONEY = 10000;
      const BREEDER_COINS = 500;
      const CHARIZARD_LEVEL = 50;
      const EEVEE_LEVEL = 20;
      const BASE_IV = 10;
      const VIGOR_MAX = 100;

      const gameStore = useGameStore();
      gameStore.state.starterChosen = true;
      gameStore.state.playerClass = 'criador';
      gameStore.state.classLevel = 1;
      gameStore.state.trainerLevel = TRAINER_LEVEL;
      gameStore.state.money = STARTING_MONEY;
      gameStore.state.battleCoins = BREEDER_COINS;
      gameStore.state.classXP = 0;
      gameStore.state.inventory = { everstone: 0 };
      gameStore.state.classData.activeMission = null;

      const activeCharizard = pokemonDebugService.generate({ id: requirePokemonSpeciesId('charizard'), level: CHARIZARD_LEVEL });
      gameStore.state.team = [activeCharizard];

      const breedingEevee = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('eevee'),
        level: EEVEE_LEVEL,
        ivs: { hp: BASE_IV, atk: BASE_IV, def: BASE_IV, spa: BASE_IV, spd: BASE_IV, spe: BASE_IV }
      });
      breedingEevee.nickname = 'BREEDING_EEVEE';
      breedingEevee.vigor = VIGOR_MAX;
      breedingEevee.maxVigor = VIGOR_MAX;
      gameStore.state.box = [breedingEevee];

      await gameStore.saveGame();
      return breedingEevee.uid;
    });
  }

  public async fastForwardActiveMission(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const FAST_FORWARD_OFFSET_MS = 2000;
      const gameStore = useGameStore();
      const classData = gameStore.state.classData as { activeMission?: { endsAt: number } | null } | undefined;
      if (classData?.activeMission) {
        classData.activeMission.endsAt = Temporal.Now.instant().epochMilliseconds - FAST_FORWARD_OFFSET_MS;
      }
    });
  }
}

test.describe('Class Deployments E2E Simulation (All 4 Classes)', () => {
  test('1. Rocket: Sacrifices poison pokemon from box, starts 6h mission, collects bounty and nugget in-situ', async ({ page }) => {
    const sim = new ClassDeploymentsSimulation(page, 'RocketDeployUser');
    await sim.setup();

    const ekansUid = await sim.setupRocketScenario();
    await sim.openModal('EventMissions');

    const missionCard = page.locator('#mission-card-class-mission_6h');
    await expect(missionCard).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const deliverBtn = page.locator('#deliver-btn-class-mission_6h');
    await deliverBtn.click();

    const ekansOption = page.locator(`#pokemon-select-${ekansUid}`);
    await expect(ekansOption).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await ekansOption.click();

    // Verify mission card displays active progress
    const activeProgress = missionCard.locator('.mission-active-progress');
    await expect(activeProgress).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // Fast-forward mission completion
    await sim.fastForwardActiveMission();

    await expect(deliverBtn).toHaveText('COBRAR BOTÍN', { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await deliverBtn.click();

    // Verify in-situ collection completed
    await expect(activeProgress).toHaveCount(0, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const gameState = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore().state;
      const hasEkans = (store.box || []).some(p => p && p.nickname === 'SACRIFICE_EKANS');
      return {
        hasEkans,
        money: store.money,
        criminality: store.classData?.criminality || 0,
        nuggetQty: store.inventory?.nugget || 0,
        classXP: store.classXP
      };
    });

    expect(gameState.hasEkans).toBe(false);
    expect(gameState.money).toBeGreaterThan(INITIAL_PLAYER_MONEY);
    expect(gameState.criminality).toBeGreaterThan(0);
    expect(gameState.nuggetQty).toBeGreaterThanOrEqual(1);
    expect(gameState.classXP).toBe(EXPECTED_MISSION_CLASS_XP);
  });

  test('2. Cazabichos: Deploys bug expedition directly, collects bug pokemon and net balls in-situ', async ({ page }) => {
    const sim = new ClassDeploymentsSimulation(page, 'CazabichosDeployUser');
    await sim.setup();

    await sim.setupCazabichosScenario();
    await sim.openModal('EventMissions');

    const missionCard = page.locator('#mission-card-class-mission_6h');
    await expect(missionCard).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // Cazabichos starts immediately without selecting a Pokémon
    const deliverBtn = page.locator('#deliver-btn-class-mission_6h');
    await deliverBtn.click();

    const activeProgress = missionCard.locator('.mission-active-progress');
    await expect(activeProgress).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await sim.fastForwardActiveMission();

    await expect(deliverBtn).toHaveText('COBRAR BOTÍN', { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await deliverBtn.click();

    await expect(activeProgress).toHaveCount(0, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const gameState = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore().state;
      return {
        boxCount: (store.box || []).length,
        boxSpecies: (store.box || []).map(p => ({ id: p?.id, uid: p?.uid })),
        teamCount: (store.team || []).length,
        teamSpecies: (store.team || []).map(p => ({ id: p?.id, uid: p?.uid })),
        netballs: store.inventory?.netball || 0,
        streak: store.classData?.captureStreak || 0,
        classXP: store.classXP
      };
    });

    expect(gameState.boxCount).toBe(EXPECTED_BUG_COUNT);
    expect(gameState.netballs).toBe(EXPECTED_NETBALL_COUNT);
    expect(gameState.streak).toBe(EXPECTED_BUG_STREAK);
    expect(gameState.classXP).toBe(EXPECTED_MISSION_CLASS_XP);
  });

  test('3. Entrenador: Deploys sparring mission, pays cost, levels up pokemon and earns Battle Coins in-situ', async ({ page }) => {
    const sim = new ClassDeploymentsSimulation(page, 'TrainerDeployUser');
    await sim.setup();

    const pikaUid = await sim.setupEntrenadorScenario();
    await sim.openModal('EventMissions');

    const missionCard = page.locator('#mission-card-class-mission_6h');
    await expect(missionCard).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const deliverBtn = page.locator('#deliver-btn-class-mission_6h');
    await deliverBtn.click();

    const pikaOption = page.locator(`#pokemon-select-${pikaUid}`);
    await expect(pikaOption).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await pikaOption.click();

    const activeProgress = missionCard.locator('.mission-active-progress');
    await expect(activeProgress).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await sim.fastForwardActiveMission();

    await expect(deliverBtn).toHaveText('COBRAR BOTÍN', { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await deliverBtn.click();

    await expect(activeProgress).toHaveCount(0, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const gameState = await page.evaluate(async (uid) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore().state;
      const pika = (store.box || []).find(p => p && p.uid === uid);
      return {
        pikaLevel: pika?.level || 0,
        money: store.money,
        battleCoins: store.battleCoins,
        classXP: store.classXP
      };
    }, pikaUid);

    expect(gameState.money).toBe(EXPECTED_POST_DEPLOY_MONEY);
    expect(gameState.battleCoins).toBe(EXPECTED_POST_DEPLOY_COINS);
    expect(gameState.pikaLevel).toBeGreaterThanOrEqual(EXPECTED_MIN_LEVEL);
    expect(gameState.classXP).toBe(EXPECTED_MISSION_CLASS_XP);
  });

  test('4. Criador: Deploys genetic incubation, consumes vigor, enhances IVs, and earns breeding items in-situ', async ({ page }) => {
    const sim = new ClassDeploymentsSimulation(page, 'BreederDeployUser');
    await sim.setup();

    const eeveeUid = await sim.setupCriadorScenario();
    await sim.openModal('EventMissions');

    const missionCard = page.locator('#mission-card-class-mission_6h');
    await expect(missionCard).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const deliverBtn = page.locator('#deliver-btn-class-mission_6h');
    await deliverBtn.click();

    const eeveeOption = page.locator(`#pokemon-select-${eeveeUid}`);
    await expect(eeveeOption).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await eeveeOption.click();

    const activeProgress = missionCard.locator('.mission-active-progress');
    await expect(activeProgress).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await sim.fastForwardActiveMission();

    await expect(deliverBtn).toHaveText('COBRAR BOTÍN', { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await deliverBtn.click();

    await expect(activeProgress).toHaveCount(0, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const gameState = await page.evaluate(async (uid) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore().state;
      const eevee = (store.box || []).find(p => p && p.uid === uid);
      const totalIvs = eevee?.ivs ? Object.values(eevee.ivs).reduce((acc, val) => acc + (val || 0), 0) : 0;
      return {
        eeveeVigor: eevee?.vigor ?? 100,
        totalIvs,
        everstones: store.inventory?.everstone || 0,
        battleCoins: store.battleCoins,
        classXP: store.classXP
      };
    }, eeveeUid);

    expect(gameState.battleCoins).toBe(EXPECTED_BREEDER_REMAINING_COINS);
    expect(gameState.eeveeVigor).toBeLessThan(INITIAL_EEVEE_VIGOR);
    expect(gameState.totalIvs).toBeGreaterThan(EXPECTED_MIN_EEVEE_IVS);
    expect(gameState.everstones).toBe(EXPECTED_EVERSTONES);
    expect(gameState.classXP).toBe(EXPECTED_MISSION_CLASS_XP);
  });

  test('5. F5 Refresh Persistence: Active deployment and countdown timer survive page reload (page.reload)', async ({ page }) => {
    const sim = new ClassDeploymentsSimulation(page, 'F5DeployUser');
    await sim.setup();

    const ekansUid = await sim.setupRocketScenario();
    await sim.openModal('EventMissions');

    const modalMissionCard = page.locator('.base-modal-root #mission-card-class-mission_6h');
    await expect(modalMissionCard).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const deliverBtn = modalMissionCard.locator('#deliver-btn-class-mission_6h');
    await deliverBtn.click();

    const ekansOption = page.locator(`#pokemon-select-${ekansUid}`);
    await expect(ekansOption).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await ekansOption.click();

    // 1. Verify active deployment is visible before reload
    const activeProgress = modalMissionCard.locator('.mission-active-progress');
    await expect(activeProgress).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 2. Explicitly persist to database to ensure Tier-1/Tier-2 commit
    await sim.saveGameAndAwaitExport();

    // 3. Perform full browser reload (F5 equivalent) and wait for store sync
    await sim.reloadAndSync();

    // 4. Verify home widget immediately displays active progress & countdown timer post-reload
    const homeActiveProgress = page.locator('#home-widget-expanded-missions .mission-active-progress');
    await expect(homeActiveProgress).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 5. Re-open missions modal after reload and verify card also shows active progress
    await sim.openModal('EventMissions');

    const modalMissionCardAfterReload = page.locator('.base-modal-root #mission-card-class-mission_6h');
    await expect(modalMissionCardAfterReload).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const activeProgressAfterReload = modalMissionCardAfterReload.locator('.mission-active-progress');
    await expect(activeProgressAfterReload).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 6. Fast-forward completion and verify claiming still works post-reload
    await sim.fastForwardActiveMission();

    const deliverBtnAfterReload = modalMissionCardAfterReload.locator('#deliver-btn-class-mission_6h');
    await expect(deliverBtnAfterReload).toHaveText('COBRAR BOTÍN', { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await deliverBtnAfterReload.click();

    // 7. Verify collection reset
    await expect(activeProgressAfterReload).toHaveCount(0, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  });
});
