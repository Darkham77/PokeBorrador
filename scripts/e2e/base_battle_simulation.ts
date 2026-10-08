import type { Page } from '@playwright/test';
import { BaseE2ESimulation, type SimulationOptions } from './base_simulation.ts';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  SIMULATION_GSAP_TIME_SCALE
} from './simulation_config.ts';
import {
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  confirmAndStartBattle,
  executeAutoBattle,
  executeNativeAutoBattle,
  clickResilient,
  type CertifiedTestBatch
} from './e2e_helpers.ts';
import type { BattleReadyForInputDetail } from '../../src/types/battle/battleEvents.ts';
import type { ItemId } from '../../src/data/inventory/items.ts';
import type { WeatherId } from '../../src/logic/weather/weatherRegistry.ts';
import {
  type DebugPokemonSpec,
  type BattleScenarioOptions,
  setSimulationMapWeather,
  seedSimulationInventory,
  setupBattleScenarioHelper,
  resetSimulationToCleanState,
  setupFuzzerScenarioHelper
} from './helpers/battleScenarioSetupHelper.ts';
import {
  type BattleStoreSnapshot,
  getPlayerHpHelper,
  getPlayerHpInfoHelper,
  getBattleStoreStateHelper,
  isHealthyBenchUidHelper,
  getHealthyBenchUidHelper,
  useItemOnPokemonHelper,
  voluntarySwitchHelper,
  selectMoveHelper,
  throwBallHelper
} from './helpers/battleActionExecutionHelper.ts';
import { replayCertifiedBattleRunner } from './helpers/battleReplayExecutionHelper.ts';

export type { DebugPokemonSpec, BattleScenarioOptions, BattleStoreSnapshot };

export abstract class BaseBattleSimulation extends BaseE2ESimulation {
  private lastBattleReady: BattleReadyForInputDetail | null = null;

  constructor(
    page: Page,
    username: string,
    logBufferOrOptions?: string[] | SimulationOptions,
    sqliteKey?: string,
    options?: SimulationOptions
  ) {
    super(page, username, logBufferOrOptions, sqliteKey, options);
  }

  public override async setup(): Promise<void> {
    await super.setup();
    await this.speedUpAnimations(SIMULATION_GSAP_TIME_SCALE);
    await this.disableAutoMode();
    await this.enableE2EWorkerFlag();
  }

  public async getPlayerHp(): Promise<number> {
    return await getPlayerHpHelper(this.page);
  }

  public async getPlayerHpInfo(): Promise<{ hp: number; maxHp: number }> {
    return await getPlayerHpInfoHelper(this.page);
  }

  public async setMapWeather(weather: WeatherId = 'clear'): Promise<void> {
    await setSimulationMapWeather(this.page, weather);
  }

  public async seedInventory(items: Partial<Record<ItemId, number>> | Array<{ id: ItemId; quantity: number }>): Promise<void> {
    await seedSimulationInventory(this.page, items);
  }

  public async setupBattleScenario(options: BattleScenarioOptions): Promise<void> {
    await setupBattleScenarioHelper(this.page, options);
  }

  public async setupWildBattle(enemy: DebugPokemonSpec, options?: Omit<BattleScenarioOptions, 'enemy' | 'isTrainer'>): Promise<void> {
    await this.setupBattleScenario({ ...options, enemy, isTrainer: false });
  }

  public async setupTrainerBattle(enemyTeam: DebugPokemonSpec[], options?: Omit<BattleScenarioOptions, 'enemyTeam' | 'isTrainer'>): Promise<void> {
    await this.setupBattleScenario({ ...options, enemyTeam, isTrainer: true });
  }

  public async navigateToRoute1(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useUIStore } = await import('../../src/stores/ui.ts');
      useUIStore().activeTab = 'map';
    });
    const mapCard = this.page.locator('#map-card-route1');
    await mapCard.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(mapCard, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  public async speedUpAnimations(scale = SIMULATION_GSAP_TIME_SCALE): Promise<void> {
    await this.page.evaluate((s) => {
      const winWithGsap = window as Window & { gsap?: { globalTimeline: { timeScale: (n: number) => void } } };
      if (winWithGsap.gsap) {
        winWithGsap.gsap.globalTimeline.timeScale(s);
      }
    }, scale);
  }

  public async useItemOnPokemon(itemId: ItemId, pokemonUid: string): Promise<BattleReadyForInputDetail> {
    this.lastBattleReady = await useItemOnPokemonHelper(this.page, itemId, pokemonUid);
    return this.lastBattleReady;
  }

  public async voluntarySwitch(pokemonUid: string): Promise<BattleReadyForInputDetail> {
    this.lastBattleReady = await voluntarySwitchHelper(this.page, pokemonUid, this.lastBattleReady);
    return this.lastBattleReady;
  }

  public async getBattleStoreState(): Promise<BattleStoreSnapshot | null> {
    return await getBattleStoreStateHelper(this.page);
  }

  public async enableE2EWorkerFlag(): Promise<void> {
    await this.page.evaluate(() => {
      window.__VITE_DEBUG__ = window.__VITE_DEBUG__ || {};
      window.__VITE_DEBUG__.isDeterministicSimulation = true;
    });
  }

  public async startBattle(): Promise<void> {
    await confirmAndStartBattle(this.page);
  }

  public async isHealthyBenchUid(uid?: string): Promise<boolean> {
    return await isHealthyBenchUidHelper(this.page, uid);
  }

  public async getHealthyBenchUid(): Promise<string | undefined> {
    return await getHealthyBenchUidHelper(this.page);
  }

  public async selectMove(moveIndex = 0): Promise<BattleReadyForInputDetail> {
    this.lastBattleReady = await selectMoveHelper(this.page, moveIndex, this.lastBattleReady);
    return this.lastBattleReady;
  }

  public async replayCertifiedBattle(batch: CertifiedTestBatch): Promise<void> {
    this.lastBattleReady = await replayCertifiedBattleRunner({
      page: this.page,
      batch,
      driver: this.driver,
      username: this.username,
      logBuffer: this.logBuffer,
      lastBattleReady: this.lastBattleReady,
      speedUpAnimations: (scale: number) => this.speedUpAnimations(scale)
    });
  }

  public async resetToCleanState(): Promise<void> {
    await resetSimulationToCleanState(
      this.page,
      this.driver,
      this.username,
      (query, params) => this.queryTestDb(query, params)
    );
    this.lastBattleReady = null;
  }

  public async setupFuzzerScenario(b: CertifiedTestBatch): Promise<void> {
    await this.resetToCleanState();
    await setupFuzzerScenarioHelper(this.page, b);
  }

  public async playBattle(finalState?: CertifiedTestBatch['finalState']): Promise<void> {
    if (finalState) {
      await executeAutoBattle(this.page, finalState);
      return;
    }
    await executeNativeAutoBattle(this.page);
  }

  public async closeBattleModal(): Promise<void> {
    await armBattleFlowCompletion(this.page);
    const exitBattleButton = this.page.locator('#exit-battle-btn');
    await exitBattleButton.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(exitBattleButton);
  }

  public async disableAutoMode(): Promise<void> {
    await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useGameStore?: () => { state?: { autoBattle?: boolean; autoSearch?: boolean } } } | undefined;
      const gameStore = debug?.useGameStore?.();
      if (gameStore?.state) {
        gameStore.state.autoBattle = false;
        gameStore.state.autoSearch = false;
      }
    });
  }

  public async forceFleeDebugger(): Promise<void> {
    await armBattleFlowCompletion(this.page);
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      if (store.isBattleActive) {
        if (store.state) {
          store.state.playerFled = true;
        }
        await store.endBattle(false, true);
        await store.completeBattleFlow('map');
      }
    });
    await this.awaitReturnToMap();
  }

  public async awaitReturnToMap(): Promise<void> {
    await awaitBattleFlowCompletion(this.page);
  }

  public async throwBall(
    ballId: string,
    options: { expectCapture?: boolean; timeout?: number; awaitFlowCompletion?: boolean } = {}
  ): Promise<void> {
    await throwBallHelper(this.page, ballId, options);
  }
}
