// fallow-ignore-file security-sink
import { test, expect, type Page, type Browser } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

interface ContestMagikarpIvs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

const TOTAL_SEEDED_HISTORICAL_TOURNAMENTS = 25;
const MAX_GUI_VISIBLE_PAST_EVENTS = 20;

class MagikarpContestSimulationWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string, sqliteKey?: string) {
    super(page, username, undefined, sqliteKey);
  }

  public static async seedEventConfig(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const { queryLocal, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      const now = Temporal.Now.instant();
      const startAt = now.subtract({ hours: 1 }).toString();
      const endAt = now.add({ hours: 1 }).toString();

      const eventConfig = {
        species: 'magikarp',
        metric: 'total_ivs',
        hasCompetition: true,
        requireCaughtDuringEvent: true,
        sortBy: 'highest',
        prizes: {
          first: { money: 50000, battle_coins: 100, items: { masterball: 1 } },
          second: { money: 25000, battle_coins: 50 },
          third: { money: 10000, battle_coins: 25 }
        }
      };

      await queryLocal(`
        INSERT OR REPLACE INTO events_config (id, name, icon, type, active, manual, start_at, end_at, config, description)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?)
      `, [
        'hora_magikarp',
        'La Hora del Magikarp',
        '🐟',
        'competition',
        startAt,
        endAt,
        JSON.stringify(eventConfig),
        '¡Concurso del Magikarp con mejores IVs!'
      ]);
      await persistSQLite();
    });
  }

  public static async seedHistoricalTournaments(page: Page, count: number): Promise<void> {
    await page.evaluate(async (totalCount: number) => {
      const { queryLocal, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      for (let i = 1; i <= totalCount; i++) {
        const pad = String(i).padStart(2, '0');
        const eventId = `hora_magikarp_hist_${pad}`;
        const dayStr = String(Math.min(28, i)).padStart(2, '0');
        const hourStr = String(i % 24).padStart(2, '0');
        const endedAt = `2026-08-${dayStr}T${hourStr}:00:00Z`;
        const winners = [
          {
            rank: 'first',
            player_id: `winner_${pad}_1`,
            player_name: `Campeon_Torneo_${pad}`,
            score: 150 + i,
            entry_data: { nickname: `Karp_T${pad}_Gold`, name: 'Magikarp', total_ivs: 150 + i }
          },
          {
            rank: 'second',
            player_id: `winner_${pad}_2`,
            player_name: `Segundo_Torneo_${pad}`,
            score: 130 + i,
            entry_data: { nickname: `Karp_T${pad}_Silver`, name: 'Magikarp', total_ivs: 130 + i }
          }
        ];

        await queryLocal(`
          INSERT OR REPLACE INTO competition_results (id, event_id, winners, ended_at)
          VALUES (?, ?, ?, ?)
        `, [
          `result_${eventId}`,
          'hora_magikarp',
          JSON.stringify(winners),
          endedAt
        ]);
      }
      await persistSQLite();
    }, count);
  }

  public async setupContestScenario(magikarpIvs: ContestMagikarpIvs): Promise<{ validMonUid: string; outdatedMonUid: string }> {
    return await this.page.evaluate(async ({ ivs }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const eventStore = useEventStore();

      // Configure starter, valid Magikarp (captured now), and outdated Magikarp (captured 30 days ago)
      const nowMs = Temporal.Now.instant().epochMilliseconds;
      const starter = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 20 });
      const magikarp = pokemonDebugService.generate({ id: requirePokemonSpeciesId('magikarp'), level: 15 });
      magikarp.ivs = { ...ivs };
      magikarp.nickname = `Magikarp_${(ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe)}`;
      magikarp.obtainedAt = nowMs;

      const outdatedMagikarp = pokemonDebugService.generate({ id: requirePokemonSpeciesId('magikarp'), level: 10 });
      outdatedMagikarp.nickname = 'Magikarp_Old_Outdated';
      outdatedMagikarp.obtainedAt = nowMs - 86400000 * 30; // 30 days ago

      gameStore.state.starterChosen = true;
      gameStore.state.team = [starter, magikarp, outdatedMagikarp];
      gameStore.state.box = [];
      gameStore.state.inventory = {};
      gameStore.state.money = 1000;
      gameStore.state.battleCoins = 0;

      await gameStore.saveGame();
      await eventStore.fetchEvents();
      return { validMonUid: magikarp.uid, outdatedMonUid: outdatedMagikarp.uid };
    }, { ivs: magikarpIvs });
  }

  public async enrollMagikarp(magikarpUid: string): Promise<void> {
    await this.page.evaluate(async (uid: string) => {
      const { initSQLite, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      await initSQLite({ forceReload: true });
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const eventStore = useEventStore();
      await eventStore.submitCompetitionEntry('hora_magikarp', uid);
      await persistSQLite();
    }, magikarpUid);
  }

  public async triggerAutomatedAwarding(): Promise<void> {
    await this.page.evaluate(async () => {
      const { initSQLite, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      await initSQLite({ forceReload: true });
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      if (!gameStore.db) throw new Error('[Magikarp Simulation] Game database is not ready');
      await gameStore.db.rpc('fn_award_event_automated', { target_event_id: 'hora_magikarp' });
      await persistSQLite();
    });
  }

  public async syncEventsAndAwards(): Promise<{
    pendingCount: number;
    awards: Array<{ id: string; prize: string; received_at: string | null }>;
    pastEvents: Array<{
      event_id: string;
      winners: Array<{
        rank: string;
        player_id: string;
        player_name: string;
        score: number;
        entry_data: { nickname?: string; name?: string; total_ivs?: number };
      }>;
    }>;
  }> {
    return await this.page.evaluate(async () => {
      const { initSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      await initSQLite({ forceReload: true });
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const eventStore = useEventStore();
      await eventStore.fetchEvents();

      const plainAwards = JSON.parse(JSON.stringify(eventStore.pendingAwards)) as Array<{ id: string; prize: string; received_at: string | null }>;
      const plainPast = JSON.parse(JSON.stringify(eventStore.pastEvents)) as Array<{
        event_id: string;
        winners: Array<{
          rank: string;
          player_id: string;
          player_name: string;
          score: number;
          entry_data: { nickname?: string; name?: string; total_ivs?: number };
        }>;
      }>;
      return {
        pendingCount: eventStore.pendingAwards.length,
        awards: plainAwards,
        pastEvents: plainPast
      };
    });
  }
}

test.describe('4-Player Shared DB Magikarp Contest E2E Simulation', () => {
  test('simula 4 jugadores en BD compartida, premia top 3 por IVs, excluye al 4to y valida reclamo de premios', async ({ browser }: { browser: Browser }) => {
    const sharedSqliteKey = `magikarp_contest_sim_${Date.now()}`;

    // 1. Crear 4 contextos independientes conectados a la misma BD
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    const context4 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();
    const page4 = await context4.newPage();

    for (const p of [page1, page2, page3, page4]) {
      await p.addInitScript(() => {
        (window as Window & { __GTS_SIMULATION__?: boolean }).__GTS_SIMULATION__ = true;
      });
    }

    const p1 = new MagikarpContestSimulationWrapper(page1, 'ContestPlayer_1', sharedSqliteKey);
    const p2 = new MagikarpContestSimulationWrapper(page2, 'ContestPlayer_2', sharedSqliteKey);
    const p3 = new MagikarpContestSimulationWrapper(page3, 'ContestPlayer_3', sharedSqliteKey);
    const p4 = new MagikarpContestSimulationWrapper(page4, 'ContestPlayer_4', sharedSqliteKey);

    // 2. Setup e inscripción secuencial de jugadores en la BD compartida
    await p1.setup();
    await waitForStoreReady(page1);
    await MagikarpContestSimulationWrapper.seedEventConfig(page1);
    const p1Setup = await p1.setupContestScenario({ hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 }); // 180 IVs (1ro)

    // Verificación visual de UI en Page 1:
    // a. Abrir modal de eventos
    await page1.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const modalStore = useModalStore();
      const eventStore = useEventStore();
      await eventStore.fetchEvents();
      modalStore.open('WorldEvents');
    });

    // b. Verificar que la tarjeta del evento muestre el badge de restricción de capturas
    const restrictionTag = page1.locator('.catch-window-tag').first();
    await expect(restrictionTag).toBeVisible();
    await expect(restrictionTag).toContainText('SOLO CAPTURAS DEL EVENTO');

    // c. Pulsar PARTICIPAR para abrir el modal de selección
    await page1.locator('[id^="event-participate-btn-hora_magikarp"]').first().click();

    // d. Verificar que la lista de selección EXCLUYE al Magikarp viejo fuera de franja horaria y solo lista al capturado en el evento
    await page1.waitForSelector('.ps-vertical-list');
    const pokeItems = page1.locator('.list-item');
    await expect(pokeItems).toHaveCount(1);
    await expect(page1.locator('#pokemon-select-' + p1Setup.validMonUid)).toBeVisible();
    await expect(page1.locator('#pokemon-select-' + p1Setup.outdatedMonUid)).toHaveCount(0);

    // e. Seleccionar e inscribir al Magikarp válido de 180 IVs
    await page1.locator('#pokemon-select-' + p1Setup.validMonUid).click();
    await page1.waitForFunction(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      return !useModalStore().isOpen('PokemonSelection');
    });

    await p2.setup();
    await waitForStoreReady(page2);
    const p2Setup = await p2.setupContestScenario({ hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 }); // 150 IVs (2do)
    await p2.enrollMagikarp(p2Setup.validMonUid);

    await p3.setup();
    await waitForStoreReady(page3);
    const p3Setup = await p3.setupContestScenario({ hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 }); // 120 IVs (3ro)
    await p3.enrollMagikarp(p3Setup.validMonUid);

    await p4.setup();
    await waitForStoreReady(page4);
    const p4Setup = await p4.setupContestScenario({ hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }); // 60 IVs (4to - Excluido)
    await p4.enrollMagikarp(p4Setup.validMonUid);

    // 3. Finalización del concurso y adjudicación automática de premios
    await p1.triggerAutomatedAwarding();

    // 5. Sincronización y verificación de podio (P1 = 1ro, P2 = 2do, P3 = 3ro, P4 = sin premio)
    const p1Result = await p1.syncEventsAndAwards();
    expect(p1Result.pendingCount).toBe(1);
    expect(p1Result.awards[0]?.prize).toContain('"money":50000');
    expect(p1Result.awards[0]?.prize).toContain('"masterball":1');

    // Validar podio y estadísticas de los ganadores en el historial de eventos
    expect(p1Result.pastEvents.length).toBeGreaterThanOrEqual(1);
    const contestWinners = p1Result.pastEvents[0]?.winners || [];
    expect(contestWinners.length).toBe(3);

    // 1º Puesto: P1 con 180 IVs y Magikarp_180
    expect(contestWinners[0]?.rank).toBe('first');
    expect(contestWinners[0]?.player_name).toBe('ContestPlayer_1');
    expect(contestWinners[0]?.score).toBe(180);
    expect(contestWinners[0]?.entry_data?.nickname).toBe('Magikarp_180');

    // 2º Puesto: P2 con 150 IVs y Magikarp_150
    expect(contestWinners[1]?.rank).toBe('second');
    expect(contestWinners[1]?.player_name).toBe('ContestPlayer_2');
    expect(contestWinners[1]?.score).toBe(150);
    expect(contestWinners[1]?.entry_data?.nickname).toBe('Magikarp_150');

    // 3º Puesto: P3 con 120 IVs y Magikarp_120
    expect(contestWinners[2]?.rank).toBe('third');
    expect(contestWinners[2]?.player_name).toBe('ContestPlayer_3');
    expect(contestWinners[2]?.score).toBe(120);
    expect(contestWinners[2]?.entry_data?.nickname).toBe('Magikarp_120');

    // 4º Puesto (P4): Excluido del podio
    expect(contestWinners.some(w => w.player_name === 'ContestPlayer_4')).toBe(false);

    const p2Result = await p2.syncEventsAndAwards();
    expect(p2Result.pendingCount).toBe(1);
    expect(p2Result.awards[0]?.prize).toContain('"money":25000');

    const p3Result = await p3.syncEventsAndAwards();
    expect(p3Result.pendingCount).toBe(1);
    expect(p3Result.awards[0]?.prize).toContain('"money":10000');

    const p4Result = await p4.syncEventsAndAwards();
    expect(p4Result.pendingCount).toBe(0);

    // 6. Reclamo de premios en la UI mediante botones identificados por ID
    const claimResultP1 = await page1.evaluate(async () => {
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const eventStore = useEventStore();
      const gameStore = useGameStore();

      const award = eventStore.pendingAwards[0];
      if (!award) return { success: false, initialMoney: 0, finalMoney: 0, items: {} };

      const initialMoney = gameStore.state.money;
      await eventStore.claimAward(award.id);
      return {
        success: true,
        initialMoney,
        finalMoney: gameStore.state.money,
        items: gameStore.state.inventory || {}
      };
    });

    expect(claimResultP1.success).toBe(true);
    expect(claimResultP1.finalMoney).toBe(claimResultP1.initialMoney + 50000);
    expect(claimResultP1.items.masterball).toBe(1);

    // Reclamar para P2
    const claimResultP2 = await page2.evaluate(async () => {
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const eventStore = useEventStore();
      const gameStore = useGameStore();

      const award = eventStore.pendingAwards[0];
      if (!award) return { success: false, initialMoney: 0, finalMoney: 0 };

      const initialMoney = gameStore.state.money;
      await eventStore.claimAward(award.id);
      return {
        success: true,
        initialMoney,
        finalMoney: gameStore.state.money
      };
    });

    expect(claimResultP2.success).toBe(true);
    expect(claimResultP2.finalMoney).toBe(claimResultP2.initialMoney + 25000);

    // Cleanup
    await context1.close();
    await context2.close();
    await context3.close();
    await context4.close();

    p1.finish('4-Player Shared DB Magikarp Contest Simulation');
  });

  test('simula 25 torneos de Magikarp y verifica que la GUI y el Store limiten a los 20 más recientes', async ({ page }: { page: Page }) => {
    const simSqliteKey = `magikarp_25_tournaments_sim_${Date.now()}`;
    await page.addInitScript(() => {
      (window as Window & { __GTS_SIMULATION__?: boolean }).__GTS_SIMULATION__ = true;
    });

    const p = new MagikarpContestSimulationWrapper(page, 'ContestHistoryViewer', simSqliteKey);
    await p.setup();
    await waitForStoreReady(page);
    await MagikarpContestSimulationWrapper.seedEventConfig(page);

    // 1. Sembrar 25 torneos históricos en SQLite
    await MagikarpContestSimulationWrapper.seedHistoricalTournaments(page, TOTAL_SEEDED_HISTORICAL_TOURNAMENTS);

    // 2. Abrir modal de eventos en la GUI mediante store
    await page.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const modalStore = useModalStore();
      const eventStore = useEventStore();
      await eventStore.fetchEvents();
      modalStore.open('WorldEvents');
    });

    // 3. Esperar y verificar que la GUI renderice exactamente 20 tarjetas (.past-event-card)
    const cardsLocator = page.locator('.past-event-card');
    await expect(cardsLocator).toHaveCount(MAX_GUI_VISIBLE_PAST_EVENTS);

    // 4. Verificar en el store que pastEvents contenga exactamente 20 elementos ordenados por fecha descendente
    const storePastEvents = await page.evaluate(async () => {
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const eventStore = useEventStore();
      return eventStore.pastEvents.map(pe => ({
        id: pe.id,
        ended_at: pe.ended_at,
        winner_1: pe.winners[0]?.player_name
      }));
    });

    expect(storePastEvents.length).toBe(MAX_GUI_VISIBLE_PAST_EVENTS);
    // El primer elemento debe ser el torneo #25 (más reciente)
    expect(storePastEvents[0]?.winner_1).toBe('Campeon_Torneo_25');
    // El elemento #20 debe ser el torneo #06 (los torneos 01 a 05 quedaron fuera del límite de 20)
    expect(storePastEvents[MAX_GUI_VISIBLE_PAST_EVENTS - 1]?.winner_1).toBe('Campeon_Torneo_06');

    p.finish('25 Magikarp Tournaments History Limit Simulation');
  });
});
