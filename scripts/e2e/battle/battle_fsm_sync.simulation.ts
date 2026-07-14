import { test, expect } from '@playwright/test';
import { generateTestBatches } from '../fuzzer/generators/fuzzer_team_generator.ts';
import fs from 'node:fs';
import path from 'node:path';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, executeAutoBattle, waitForWaitInput, type CertifiedTestBatch } from '../e2e_helpers.ts';
import type { WindowWithResolver } from '../e2e_helpers.ts';


test.describe('Battle FSM & GSAP Synchronization - Stress Simulation', () => {


  // Cargar lotes desde certified_fuzzer_cases.json o usar generador como fallback
  let allBatches: CertifiedTestBatch[] = [];
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (fs.existsSync(consolidatorPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8')) as { battle?: CertifiedTestBatch[] };
      if (content.battle) {
        allBatches = content.battle;
      }
    } catch (_e) {
      // Ignore if file is not generated or malformed
    }
  }
  if (allBatches.length === 0) {
    allBatches = generateTestBatches(6) as CertifiedTestBatch[];
  }

  // Permitir filtrar lotes usando la variable de entorno TEST_BATCH, TEST_CASE o TEST_CASE_ID (ej: TEST_CASE_ID=case-a8f9c1b3)
  const batchFilter = process.env.TEST_BATCH;
  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;
  const resumeProgress = process.env.RESUME_PROGRESS === 'true' || process.env.RESUME === 'true';

  let startIdx = 0;
  if (startFromCaseId) {
    const foundIdx = allBatches.findIndex((b) => b.id === startFromCaseId.trim());
    if (foundIdx !== -1) {
      startIdx = foundIdx;
    }
  } else if (startFromIndex) {
    startIdx = Number(startFromIndex.trim()) - 1;
  }

  const progressDir = path.resolve(process.cwd(), 'scratch/e2e_progress');

  const batches = allBatches.map((b: CertifiedTestBatch, idx: number) => ({ b, idx })).filter(({ b, idx }: { b: CertifiedTestBatch, idx: number }) => {
    if (resumeProgress) {
      const batchFile = path.join(progressDir, `lote-${idx + 1}.json`);
      if (fs.existsSync(batchFile)) {
        try {
          const progressData = JSON.parse(fs.readFileSync(batchFile, 'utf8')) as { isFailed?: boolean };
          if (!progressData.isFailed) {
            return false; // Saltar lote ya completado con éxito
          }
        } catch (err) {
          console.debug(`[E2E] Failed to parse progress file:`, err);
        }
      }
    }

    if (caseIdFilter) {
      const allowedIds = caseIdFilter.split(',').map(id => id.trim());
      return b.id && allowedIds.includes(b.id);
    }
    if (caseFilter) {
      return (idx + 1) === Number(caseFilter.trim());
    }
    
    if (idx < startIdx) return false;

    if (!batchFilter) return true;
    const cleanFilter = batchFilter.trim();
    if (cleanFilter.includes('-')) {
      const [start, end] = cleanFilter.split('-').map(Number);
      return (idx + 1) >= (start ?? 1) && (idx + 1) <= (end ?? allBatches.length);
    }
    const idxs = cleanFilter.split(',').map(Number);
    return idxs.includes(idx + 1);
  });
  const totalBatches = batches.length;
  const startTimesMap: { [key: number]: number } = {};

  function reportProgress(batchIndex: number, isFailed: boolean) {
    if (!fs.existsSync(progressDir)) {
      try {
        fs.mkdirSync(progressDir, { recursive: true });
      } catch (err) {
        console.debug(`[E2E] Failed to create progress directory:`, err);
      }
    }

    const startTime = startTimesMap[batchIndex];
    const elapsed = startTime 
      ? Number(Temporal.Now.instant().epochMilliseconds) - startTime 
      : 0;

    // Escribir archivo individual de lote para evitar colisiones en paralelo
    const batchFile = path.join(progressDir, `lote-${batchIndex + 1}.json`);
    try {
      fs.writeFileSync(batchFile, JSON.stringify({
        batchIndex: batchIndex + 1,
        isFailed,
        duration: elapsed,
        timestamp: Temporal.Now.zonedDateTimeISO().toString()
      }, null, 2), 'utf8');
    } catch (e) {
      console.error(`[E2E] Error writing batch progress file:`, e);
    }

    // Leer de manera atómica todos los archivos individuales para calcular progreso real consolidado
    let completedCount = 0;
    let failedCount = 0;
    const durations: number[] = [];
    const activeBatchIndices = new Set(batches.map(x => x.idx + 1));

    try {
      const files = fs.readdirSync(progressDir).filter(f => f.startsWith('lote-') && f.endsWith('.json'));
      
      files.forEach(f => {
        const match = f.match(/^lote-(\d+)\.json$/);
        if (match && match[1]) {
          const index = Number(match[1]);
          if (activeBatchIndices.has(index)) {
            completedCount++;
            try {
              const data = JSON.parse(fs.readFileSync(path.join(progressDir, f), 'utf8')) as { isFailed?: boolean, duration?: number };
              if (data.isFailed) failedCount++;
              if (data.duration) durations.push(data.duration);
            } catch (err) {
              console.debug(`[E2E] Failed to parse consolidated progress file:`, err);
            }
          }
        }
      });
    } catch (e) {
      console.error(`[E2E] Error reading progress directory:`, e);
    }

    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;

    const remainingCount = totalBatches - completedCount;
    const estTimeRemainingMs = remainingCount * avgDuration;

    const estMin = Math.floor(estTimeRemainingMs / 60000);
    const estSec = Math.floor((estTimeRemainingMs % 60000) / 1000);
    const estTimeRemainingStr = remainingCount > 0 
      ? `${estMin}m ${estSec}s` 
      : '0s';
    const percent = Math.round((completedCount / totalBatches) * 100);

    console.log(`\n======================================================`);
    console.log(`📊 [PROGRESS REPORT] Lote #${batchIndex + 1} finalizado.`);
    console.log(`✅ Pasados: ${completedCount - failedCount} | ❌ Fallados: ${failedCount} | ⏳ Faltan: ${remainingCount} / ${totalBatches}`);
    console.log(`📈 Progreso: ${percent}% | ⏰ Tiempo restante estimado: ${estTimeRemainingStr}`);
    console.log(`======================================================\n`);

    try {
      const progressPath = path.resolve(process.cwd(), 'scratch/e2e_progress.json');
      fs.writeFileSync(progressPath, JSON.stringify({
        completed: completedCount,
        total: totalBatches,
        failed: failedCount,
        percent,
        estRemaining: estTimeRemainingStr,
        lastCompletedBatch: batchIndex + 1,
        timestamp: Temporal.Now.zonedDateTimeISO().toString()
      }, null, 2), 'utf8');
    } catch (e) {
      console.error(`[E2E] Error writing progress file:`, e);
    }
  }

  if (caseIdFilter || caseFilter || batchFilter) {
    console.log(`\n======================================================`);
    console.log(`⚙️  FILTRANDO SIMULACIÓN: Ejecutando casos: [${batches.map(x => (x.b as { id?: string }).id || x.idx + 1).join(', ')}]`);
    console.log(`======================================================\n`);
  }

  test.beforeAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    if (fs.existsSync(failuresDir)) {
      try {
        fs.rmSync(failuresDir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`[E2E-PRE-CHECK] Warning clearing failuresDir (locked files):`, e);
      }
    }

    if (!resumeProgress) {
      if (fs.existsSync(progressDir)) {
        try {
          fs.rmSync(progressDir, { recursive: true, force: true });
        } catch (e) {
          console.warn(`[E2E-PRE-CHECK] Warning clearing progressDir:`, e);
        }
      }
      const progressPath = path.resolve(process.cwd(), 'scratch/e2e_progress.json');
      if (fs.existsSync(progressPath)) {
        try {
          fs.unlinkSync(progressPath);
        } catch (e) {
          console.warn(`[E2E-PRE-CHECK] Warning clearing consolidated progress file:`, e);
        }
      }
    }
  });

  let currentTestLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    test.setTimeout(360000);
    currentTestLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (
        text.includes('BRIDGE') ||
        text.includes('E2E') ||
        text.toLowerCase().includes('error') ||
        text.includes('Showdown') ||
        text.includes('FSM') ||
        text.includes('BattleStore') ||
        text.includes('BattleTurn') ||
        text.includes('SYNC') ||
        text.includes('ORCHESTRATOR') ||
        text.includes('DEBUG')
      ) {
        currentTestLogs.push(`[BROWSER] ${text}`);
      }
    });
    // Configurar tiempo de espera de cada test a 120 segundos para evitar timeouts bajo alta concurrencia
    test.setTimeout(120000);

    // 1. Inyectar configuraciones de E2E y mockear permisos
    await setupE2ESession(page);

    // 2. Iniciar sesión con un usuario dedicado para pruebas locales
    const testUser = `TEST_USER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginTestUser(page, testUser);
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    if (currentTestLogs.length > 0) {
      console.log(`\n=================== BROWSER LOGS FOR: ${testInfo.title} ===================`);
      console.log(currentTestLogs.join('\n'));
      console.log(`========================================================================\n`);
    }
  });

  // Generar dinámicamente un caso de prueba de Playwright para cada lote de simulación.
  batches.forEach(({ b: batch, idx: index }: { b: CertifiedTestBatch, idx: number }) => {
    test(`debería simular el lote #${index + 1} (${batch.movesToTest?.length ?? 0} movimientos, ${batch.abilitiesToTest?.length ?? 0} habilidades) sin bloqueos de FSM`, async ({ page }) => {
      startTimesMap[index] = Number(Temporal.Now.instant().epochMilliseconds);
      test.setTimeout(900000);
      // 1. Construir e inyectar el equipo del jugador y del enemigo en la sesión del navegador
      await page.evaluate(async (b) => {
        // Sobrescribir Math.random con una función determinista basada en semilla (LCG)
        let seed = 12345;
        Math.random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };

        // Inyectar el seed de Showdown y las decisiones del enemigo P2 para reproducibilidad exacta
        const debugObj = (window as WindowWithResolver).__VITE_DEBUG__ || {};
        (window as WindowWithResolver).__VITE_DEBUG__ = debugObj;
        debugObj.battleSeed = b.seed ?? undefined;
        debugObj.isE2eSimulation = true;
        const enemyChoices = b.enemyChoices ?? b.history?.map((h: { p1Choice: string; p2Choice: string }) => h.p2Choice) ?? [];
        debugObj.enemyChoices = [...enemyChoices];
        debugObj.cheats = b.cheats ?? [];

        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { testResetShowdownWorker } = await import('../../../src/logic/battle/showdownWorkerClient.ts');
        
        // Matar worker previo y limpiar estados colgados de la prueba anterior
        testResetShowdownWorker();
        
        const battleStore = useBattleStore();
        const gameStore = useGameStore();

        battleStore.state = null;
        battleStore.fsm.currentSubState = 'WAIT_INPUT';
        battleStore.fsm.currentState = 'INITIALIZING';
        gameStore.state.team = [];
        
        // Generar equipo local para el jugador usando la API de depuración
        const localPlayerTeam = b.playerTeam.map((set: { species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean; uid?: string }, idx: number) => {
          return pokemonDebugService.generate({
            id: set.species.toLowerCase(),
            level: set.level || 100,
            ability: set.ability,
            moves: set.moves,
            heldItem: set.item,
            nickname: `${set.name}-${idx + 1}`,
            nature: set.nature,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...set.ivs },
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
            gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
            isShiny: set.shiny || false,
            uid: set.uid
          });
        });

        // Generar equipo local para el enemigo (NPC)
        const localEnemyTeam = b.enemyTeam.map((set: { species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean; uid?: string }, idx: number) => {
          return pokemonDebugService.generate({
            id: set.species.toLowerCase(),
            level: set.level || 100,
            ability: set.ability,
            moves: set.moves,
            heldItem: set.item,
            nickname: `${set.name}-${idx + 1}`,
            nature: set.nature,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...set.ivs },
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
            gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
            isShiny: set.shiny || false,
            uid: set.uid
          });
        });

        // Sobrescribir el equipo del jugador en el GameStore
        gameStore.state.team = localPlayerTeam;

        // Forzar el clima a despejado ('clear') en el MapStore para coincidir 1:1 con el fuzzer
        const { useMapStore } = await import('../../../src/stores/map.ts');
        const mapStore = useMapStore();
        mapStore.setGlobalWeather('clear');

        // Inyectar un inventario completo de prueba para asegurar disponibilidad de objetos
        gameStore.state.inventory = {
          potion: 99,
          superpotion: 99,
          hyperpotion: 99,
          maxpotion: 99,
          revive: 99,
          revivemax: 99
        };

        // Inyectar la semilla del lote de simulación para garantizar determinismo absoluto usando el manager unificado
        const { injectDebugSeed } = await import('../../../src/logic/battle/battleSeedManager.ts');
        if (b.seed) {
          injectDebugSeed(b.seed as [number, number, number, number]);
        }

        // Iniciar la batalla como combate de entrenador usando el primer enemigo y la plantilla completa
        const firstEnemy = localEnemyTeam[0];
        if (!firstEnemy) throw new Error('No enemy generated for E2E test');

        await battleStore.startBattle(firstEnemy, {
          isTrainer: true,
          enemyTeam: localEnemyTeam,
          trainerName: 'Simulador E2E',
          locationId: 'route1'
        });

        const bState = battleStore.state as { p1SlotOrder?: string[]; p2SlotOrder?: string[] } | null;
        if (bState) {
          bState.p1SlotOrder = localPlayerTeam.map(p => p.uid);
          bState.p2SlotOrder = localEnemyTeam.map(p => p.uid);
        }
      }, batch);

      try {
        // 2. Confirmar combate e iniciar
        await confirmAndStartBattle(page);

        // 3. Ejecutar auto-batalla y validaciones deterministas
        await executeAutoBattle(
          page, 
          index + 1, 
          0, 
          batch.playerChoices ?? batch.history?.map((h: { p1Choice: string; p2Choice: string }) => h.p1Choice),
          batch.cheats,
          batch.finalState
        );
        reportProgress(index, false);
      } catch (error: unknown) {
        const caseId = batch.id || `lote-${index + 1}`;
        const errMessage = error instanceof Error ? (error as Error).message : String(error);
        console.error(`\n❌ ERROR EN EL COMBATE: ${caseId}`);
        console.error(`Detalles del lote:`, JSON.stringify({
          id: caseId,
          playerTeam: batch.playerTeam.map(p => `${p.species} (${p.item || 'no item'})`),
          enemyTeam: batch.enemyTeam.map(e => `${e.species} (${e.item || 'no item'})`)
        }, null, 2));

        // Registrar el error en scratch/e2e_failures/
        const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
        if (!fs.existsSync(failuresDir)) {
          fs.mkdirSync(failuresDir, { recursive: true });
        }
        const failureData = {
          caseId,
          error: errMessage,
          playerTeam: batch.playerTeam.map(p => `${p.species} (${p.item || 'no item'})`),
          enemyTeam: batch.enemyTeam.map(e => `${e.species} (${e.item || 'no item'})`),
          timestamp: Temporal.Now.zonedDateTimeISO().toString(),
          reproduce: {
            seed: batch.seed,
            playerChoices: batch.playerChoices,
            enemyChoices: batch.enemyChoices,
            cheats: batch.cheats,
            fullPlayerTeam: batch.playerTeam,
            fullEnemyTeam: batch.enemyTeam
          }
        };
        fs.writeFileSync(
          path.join(failuresDir, `${caseId}.json`),
          JSON.stringify(failureData, null, 2),
          'utf8'
        );

        reportProgress(index, true);

        if (process.env.CONTINUE_ON_ERROR === 'true') {
          console.warn(`[E2E-WARN] Ignorando error en combate ${caseId} porque CONTINUE_ON_ERROR es true.`);
          return;
        }
        throw new Error(`[Fallo en Combate ${caseId}]: ${errMessage}`);
      }
    });
  });

  // --- TEST ADICIONAL: Consumo de Pociones en Combate ---
  test('debería consumir una Poción en combate y mantener la sincronía del turno y FSM', async ({ page }) => {
    // 1. Iniciar un combate de prueba contra Pikachu a través de VITE_DEBUG e inicializar inventario
    await page.evaluate(async () => {
      const { useGameStore: getGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore: getBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService: debugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = getGameStore();
      const battleStore = getBattleStore();

      // Inicializar inventario con Pociones
      gameStore.state.inventory = {
        potion: 3
      };
      // Generar equipo local con Bulbasaur dañado (10 HP de 20)
      const bulbasaur = debugService.generate({ id: 'bulbasaur', level: 5 });
      bulbasaur.hp = 10;
      gameStore.state.team = [bulbasaur];
      gameStore.state.starterChosen = true;
      await gameStore.saveGame();

      const pikachu = debugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio
    await waitForWaitInput(page);

    const potionCard = page.locator('.quick-item-card:not(.is-disabled)').first();
    await potionCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear la Poción (debería abrir el modal de selección de Pokémon)
    await potionCard.click();

    // Esperar al modal de selección de Pokémon y clickear en Bulbasaur para aplicarle la poción
    const targetBtn = page.locator('.list-item:has(.name:has-text("Bulbasaur")), button:has-text("Bulbasaur")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await waitForWaitInput(page);

    // 6. Verificar que la cantidad de pociones bajó a 2 en el GameStore
    const itemsCount = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.inventory?.potion ?? 0;
    });
    expect(itemsCount).toBe(2);

    // 6.5 Verificar que la vida de Bulbasaur en el Store realmente aumentó (debe ser mayor a 10, validando que el simulador no ignoró el objeto)
    const finalHp = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.state?.player?.hp ?? 0;
    });
    expect(finalHp).toBeGreaterThan(10);

    // 7. Continuar el combate de forma automática hasta que finalice por completo (evitando cortes tempranos que oculten bugs en turnos futuros)
    await executeAutoBattle(page, 999, 1);
  });

  // --- TEST ADICIONAL: Lanzamiento de Pokéball y Captura ---
  test('debería lanzar una Pokéball e intentar capturar al Pokémon enemigo salvaje', async ({ page }) => {
    // 1. Iniciar un combate salvaje contra un Caterpie de nivel 1
    await page.evaluate(async () => {
      const { useBattleStore: battleLoader } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore: gameLoader } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService: pkmnDebugger } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = gameLoader();
      const battleStore = battleLoader();

      // Inicializar inventario con Pokéballs
      gameStore.state.inventory = {
        masterball: 10
      };

      const bulbasaur = pkmnDebugger.generate({ id: 'bulbasaur', level: 5 });
      gameStore.state.team = [bulbasaur];

      const caterpie = pkmnDebugger.generate({ id: 'caterpie', level: 1 });
      await battleStore.startBattle(caterpie, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que termine la introducción y la pokéball esté activa
    const pokeballCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Master Ball"]), .quick-item-card:not(.is-disabled):has(img[alt*="ball"])').first();
    await pokeballCard.waitFor({ state: 'visible', timeout: 15000 });

    // 4. Lanzar Pokéball
    await pokeballCard.click();

    // 5. Esperar a que finalice la secuencia de captura y termine la batalla
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return !store.state || store.state.over;
    }, undefined, { timeout: 10000 });

    // 6. Validar que la batalla cerró
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });
    expect(isOver).toBe(true);
  });

  // --- TEST ADICIONAL: Revivir Pokémon en la Banca ---
  test('debería consumir un Revivir en un Pokémon de la banca debilitado y jugar el combate hasta el final', async ({ page }) => {
    // 1. Iniciar un combate de prueba contra Pikachu a través de VITE_DEBUG e inicializar inventario y equipo
    await page.evaluate(async () => {
      const { useBattleStore: storeBattle } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore: storeGame } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService: serviceDebug } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = storeGame();
      const battleStore = storeBattle();

      // Inicializar inventario con Revivir
      gameStore.state.inventory = {
        revive: 1
      };

      // Generar equipo local con Bulbasaur (activo) y Charmander debilitado (0 HP)
      const bulbasaur = serviceDebug.generate({ id: 'bulbasaur', level: 5 });
      const charmander = serviceDebug.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0; // Debilitado
      gameStore.state.team = [bulbasaur, charmander];

      const pikachu = serviceDebug.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio y el botón de Revivir esté activo
    const reviveCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Revivir"]), .quick-item-card:not(.is-disabled):has(img[alt*="Rev"])').first();
    await reviveCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear el Revivir (debería abrir el modal de selección de Pokémon)
    await reviveCard.click();

    // Esperar al modal de selección de Pokémon y clickear en Charmander (que está debilitado)
    const targetBtn = page.locator('.list-item:has(.name:has-text("Charmander")), button:has-text("Charmander")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentSubState === 'WAIT_INPUT' || (store.state && store.state.player && store.state.player.hp === 0);
    }, undefined, { timeout: 10000 });

    // 6. Verificar que Charmander en la banca ya no está debilitado (su HP es mayor a 0)
    const charmanderHp = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.team[1]?.hp ?? 0;
    });
    expect(charmanderHp).toBeGreaterThan(0);

    // 7. Continuar el combate de forma automática hasta que finalice por completo para verificar que no ocurra ningún bloqueo post-revivir
    await executeAutoBattle(page, 998);
  });

  test.afterAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    const reportPath = path.resolve(process.cwd(), 'scripts/e2e/results/e2e_simulation_failures.json');
    try {
      if (fs.existsSync(failuresDir)) {
        const files = fs.readdirSync(failuresDir);
        const failures = files
          .filter((f: string) => f.endsWith('.json'))
          .map((f: string) => {
            try {
              return JSON.parse(fs.readFileSync(path.join(failuresDir, f), 'utf8')) as unknown;
            } catch (_e) {
              return null;
            }
          })
          .filter((x: unknown): x is unknown => x !== null);

        if (failures.length > 0) {
          fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2), 'utf8');
          console.log(`\n📝 Se ha generado el reporte consolidado de errores E2E en: ${reportPath}`);
        } else {
          fs.writeFileSync(reportPath, '[]', 'utf8');
          console.log('\n✅ Todos los combates pasaron sin errores. Reportes vaciados.');
        }
      } else {
        fs.writeFileSync(reportPath, '[]', 'utf8');
        console.log('\n✅ No hay errores que consolidar. Reportes vaciados.');
      }
    } catch (e) {
      console.warn('⚠️ No se pudo escribir el reporte consolidado de errores en afterAll:', e);
    }
  });
});
