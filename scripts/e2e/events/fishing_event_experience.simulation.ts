import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  waitForStoreReady
} from '../e2e_helpers.ts';

interface WindowWithCapturedLogs extends Window {
  __CAPTURED_COMBAT_LOGS__?: string[];
}

const DEFAULT_ATTACK_POWER = 90;
const DEFAULT_ATTACK_PP = 15;
const OVERPOWERED_STAT_VALUE = 300;
const DEFAULT_WILD_ENEMY_LEVEL = 20;

class FishingEventSimulation extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
    this.page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  }

  public async setupFishingEventScenario(): Promise<void> {
    await this.page.evaluate(async ({ power, pp, statValue }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const eventStore = useEventStore();
      const mapStore = useMapStore();

      // Configure Pikachu with high level and strong stats for immediate knockout
      const pika = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 50 });
      pika.name = 'Pikachu';
      pika.nickname = 'Pikachu';
      pika.moves = [{ id: 'thunderbolt', name: 'Thunderbolt', type: 'electric', cat: 'special', power, acc: 100, pp, maxPP: pp }];
      pika.atk = statValue;
      pika.spa = statValue;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [pika];
      gameStore.state.box = [];
      gameStore.state.inventory = {};

      mapStore.currentMap = 'route22';

      // Set mock events: Dia de Pesca (fishingMult: 2) & Doble Exp (expMult: 2)
      eventStore.allEvents = [
        {
          id: 'dia_pesca',
          name: 'Día de Pesca',
          icon: '🎣',
          type: 'boost',
          active: true,
          manual: true,
          config: { fishingMult: 2 },
          description: '¡Doble probabilidad de pesca!'
        },
        {
          id: 'doble_exp',
          name: 'Doble EXP',
          icon: '⭐',
          type: 'boost',
          active: true,
          manual: true,
          config: { expMult: 2 },
          description: '¡El doble de experiencia en combates!'
        }
      ];
      eventStore.activeEvents = [...eventStore.allEvents];

      await gameStore.saveGame();
    }, { power: DEFAULT_ATTACK_POWER, pp: DEFAULT_ATTACK_PP, statValue: OVERPOWERED_STAT_VALUE });

    const mapaBtn = this.page.locator('#nav-map-btn').filter({ visible: true }).first();
    await mapaBtn.waitFor({ state: 'visible', timeout: 15000 });
  }

  public async startWildBattleAgainst(enemySpecies: string, level = DEFAULT_WILD_ENEMY_LEVEL): Promise<void> {
    await this.page.evaluate(async ({ species, lvl }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const enemy = pokemonDebugService.generate({ id: requirePokemonSpeciesId(species), level: lvl });
      enemy.hp = 1;
      enemy.maxHp = 50;

      await useBattleStore().startBattle(enemy, { locationId: 'route22', isTrainer: false });
    }, { species: enemySpecies, lvl: level });
  }

  public async hookBattleLogs(): Promise<void> {
    await this.page.evaluate(() => {
      const win = window as WindowWithCapturedLogs;
      win.__CAPTURED_COMBAT_LOGS__ = [];
      window.addEventListener('battle-log-added', (e: Event) => {
        const detail = (e as CustomEvent<{ msg: string }>).detail;
        if (detail?.msg) {
          win.__CAPTURED_COMBAT_LOGS__?.push(detail.msg);
        }
      });
    });
  }

  public async getCombatLogMessages(): Promise<string[]> {
    return await this.page.evaluate(async () => {
      const win = window as WindowWithCapturedLogs;
      const captured = win.__CAPTURED_COMBAT_LOGS__ || [];
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const current = (useBattleStore().battleLogs || []).map(l => l.msg);
      return Array.from(new Set([...captured, ...current]));
    });
  }

  public async verifyFishingOddsWithBonus(): Promise<{ normalWeight: number; eventWeight: number; hasEventRatio: boolean }> {
    return await this.page.evaluate(async () => {
      const { calculateEncounterTypeWeights } = await import('../../../src/logic/encounters/encounterHelpers.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      type MapLocation = import('../../../src/types/pokemon/encounters.ts').MapLocation;

      const testLocation: MapLocation = {
        id: 'route22',
        name: 'Ruta 22',
        icon: 'map_r22',
        badges: 0,
        desc: 'Zona de pesca',
        wild: {
          morning: [requirePokemonSpeciesId('rattata')],
          day: [requirePokemonSpeciesId('rattata')],
          dusk: [requirePokemonSpeciesId('rattata')],
          night: [requirePokemonSpeciesId('rattata')]
        },
        rates: { morning: [100], day: [100], dusk: [100], night: [100] },
        lv: [10, 20],
        fishing: {
          pool: [requirePokemonSpeciesId('magikarp')],
          rates: [100],
          lv: [10, 20]
        }
      };

      const baseWeights = calculateEncounterTypeWeights(testLocation, 'clear', { faction: null, fishingRodType: 'standard', fishingRodSecs: 0 }, { eventFishingBonus: 1 });
      const boostedWeights = calculateEncounterTypeWeights(testLocation, 'clear', { faction: null, fishingRodType: 'standard', fishingRodSecs: 0 }, { eventFishingBonus: 2 });

      return {
        normalWeight: baseWeights.fishingWeight,
        eventWeight: boostedWeights.fishingWeight,
        hasEventRatio: boostedWeights.fishingWeight === baseWeights.fishingWeight * 2
      };
    });
  }
}

test.describe('Fishing & EXP Event Special Scenarios Simulation', () => {
  test('debería aplicar el multiplicador de EXP de evento, reflejarlo en los logs de combate como (+XX EXP evento) y duplicar las probabilidades de pesca', async ({ page }) => {
    const sim = new FishingEventSimulation(page, 'FisherTrainer');

    // 1. Setup session & UI
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Setup escenario con evento de pesca y doble exp activo
    await sim.setupFishingEventScenario();
    await sim.hookBattleLogs();

    // 3. Verificar probabilidades de minijuegos / encuentros de pesca con el bonus
    const fishingOdds = await sim.verifyFishingOddsWithBonus();
    expect(fishingOdds.hasEventRatio).toBe(true);
    expect(fishingOdds.eventWeight).toBe(fishingOdds.normalWeight * 2);

    // 4. Iniciar combate salvaje con un Magikarp
    await armBattleReadyForInput(page);
    await sim.startWildBattleAgainst('magikarp', DEFAULT_WILD_ENEMY_LEVEL);
    await awaitBattleReadyForInput(page);

    // 5. Ejecutar ataque y finalizar combate interactuando por ID
    await armBattleFlowCompletion(page);
    const moveBtn = page.locator('#move-btn-0');
    await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await moveBtn.click();
    await awaitBattleFlowCompletion(page);

    // 6. Validar que en los logs de combate la experiencia indique el desglose del evento
    await expect.poll(async () => {
      const logs = await sim.getCombatLogMessages();
      return logs.some(l => l.includes('EXP') && l.includes('ganó') && l.includes('EXP evento'));
    }, { timeout: 15000 }).toBe(true);

    const logs = await sim.getCombatLogMessages();
    const expLog = logs.find(l => l.includes('EXP') && l.includes('ganó'));
    expect(expLog).toBeDefined();
    expect(expLog).toMatch(/\(\+\d+\s+EXP evento\)/);

    sim.finish('Fishing & Event Experience Simulation');
  });
});
