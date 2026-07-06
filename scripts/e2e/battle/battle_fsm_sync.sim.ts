import { test, expect, Page } from '@playwright/test';
import { generateTestBatches, type TestBatch } from '../fuzzer/generators/fuzzer_team_generator.ts';
import fs from 'node:fs';
import path from 'node:path';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, handleBattleInput } from '../e2e_helpers.ts';
import type { WindowWithResolver } from '../e2e_helpers.ts';



// Helper: Esperar a que la máquina de estados retorne a WAIT_INPUT o SWITCH_MENU (el turno anterior y sus animaciones terminaron)
async function waitForWaitInput(page: Page, turnCount: number, batchIndex: number, expectedSimulatorTurn: number, lastSubState: string) {
  try {
    let resolved = false;
    while (!resolved) {
      await page.waitForFunction(({ expectedTurn, lastSub, isFirst }) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        const isReady = (store.currentFsmState === 'ACTIVE_BATTLE' && 
                        (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
                        !store.state || store.state.over;
        
        console.log(`[E2E-FSM-Wait] turnCount: ${expectedTurn}, lastSub: "${lastSub}", isFirst: ${isFirst}, currentSubState: "${store.currentSubState}", isReady: ${isReady}`);
        
        return isReady;
      }, { expectedTurn: expectedSimulatorTurn, lastSub: lastSubState, isFirst: turnCount === 0 }, { timeout: 45000 });

      // Esperar 30ms para asegurar que no caímos en un microtask gap donde el turnCount subió pero la FSM aún no transitó a EXEC_TURN/APPLY_MOVE
      await page.waitForTimeout(30);

      // Re-verificar si seguimos en un estado listo para input (WAIT_INPUT o SWITCH_MENU o batalla terminada)
      const stillReady = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        return (store.currentFsmState === 'ACTIVE_BATTLE' && 
                (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
                !store.state || store.state.over;
      });

      if (stillReady) {
        resolved = true;
      } else {
        console.log(`[E2E] Falsa alarma detectada (microtask gap). Re-esperando FSM...`);
      }
    }
  } catch (_e) {
    await page.screenshot({ path: `scratch/lock-batch-${batchIndex}-turn-${turnCount}.png` });
    throw new Error(`Bloqueo detectado: La FSM de combate se quedó trabada en el turno ${turnCount}. Captura guardada en scratch/.`);
  }
}



// Helper: Verificación de paridad 1:1 entre Store (Showdown) y DOM (Interfaz Gráfica)
// Lee store y DOM simultáneamente en el mismo polling loop para evitar snapshots desactualizados.
async function verifyHpParity(page: Page) {
  // Verificar paridad: espera hasta que el DOM refleje exactamente lo que el store tiene EN ESE MOMENTO
  try {
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      const playerHp = store.state?.player?.hp ?? 0;
      const playerMaxHp = store.state?.player?.maxHp ?? 1;
      const enemyHp = store.state?.enemy?.hp ?? 0;
      const enemyMaxHp = store.state?.enemy?.maxHp ?? 1;

      if (playerHp > 0) {
        const el = document.querySelector('.player-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${playerHp}/${playerMaxHp}`)) return false;
      }
      if (enemyHp > 0) {
        const el = document.querySelector('.enemy-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${enemyHp}/${enemyMaxHp}`)) return false;
      }
      return true;
    }, undefined, { timeout: 15000 });
  } catch (err) {
    const diagnosis = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      const storePlayer = `${store.state?.player?.hp}/${store.state?.player?.maxHp}`;
      const storeEnemy  = `${store.state?.enemy?.hp}/${store.state?.enemy?.maxHp}`;
      const domPlayer   = document.querySelector('.player-card .hp-values')?.textContent ?? 'null';
      const domEnemy    = document.querySelector('.enemy-card .hp-values')?.textContent ?? 'null';
      return { storePlayer, storeEnemy, domPlayer, domEnemy };
    });
    console.error(`[E2E ERROR] HP Mismatch — Store player: ${diagnosis.storePlayer}, DOM player: "${diagnosis.domPlayer}" | Store enemy: ${diagnosis.storeEnemy}, DOM enemy: "${diagnosis.domEnemy}"`);
    throw err;
  }
}



type FinalState = {
  p1: Array<{ name: string; hp: number; maxHp: number; fainted: boolean }>;
  p2: Array<{ name: string; hp: number; maxHp: number; fainted: boolean }>;
};

// Helper: Bucle de ejecución automática de turnos
async function executeAutoBattle(page: Page, batchIndex: number, startingTurn = 0, playerChoices?: string[], cheats?: Array<{ turn: number, side: 'p1' | 'p2', type: 'heal' }>, finalState?: FinalState) {
  let p1ChoiceIdx = startingTurn;
  const maxIterations = 300;
  let iterations = 0;
  let lastSimulatorTurn = 0;
  let lastSubState = '';
  const pendingCheats = cheats ? [...cheats] : [];

  while (iterations < maxIterations) {
    iterations++;

    // 1. Verificar si la batalla ya concluyó en el store
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    }).catch(() => true);

    if (isOver) {
      break;
    }

    if (playerChoices && p1ChoiceIdx >= playerChoices.length) {
      // Se reprodujeron todas las elecciones pregrabadas del fuzzer
      break;
    }

    // 2. Esperar a que la FSM esté lista en WAIT_INPUT o SWITCH_MENU
    await waitForWaitInput(page, p1ChoiceIdx, batchIndex, lastSimulatorTurn, lastSubState);

    // Re-verificar estado de finalización
    const isOverAfterWait = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    }).catch(() => true);

    if (isOverAfterWait) {
      break;
    }

    // 3. Verificar paridad DOM/Store (solo en WAIT_INPUT, ya que en SWITCH_MENU las tarjetas del HUD no están visibles)
    const subState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.currentSubState;
    }).catch(() => 'WAIT_INPUT');
    if (subState === 'WAIT_INPUT') {
      await verifyHpParity(page);
    }



    // 5. Obtener información de la petición del jugador
    const reqStatus = await page.evaluate(() => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return { hasChoice: false, turn: 0, subState: '' };
      const store = resolver();
      const req = store.state?.playerRequest;
      return {
        hasChoice: !!req && !req.wait,
        turn: store.state?.turnCount ?? 1,
        subState: store.currentSubState || ''
      };
    });

    lastSimulatorTurn = reqStatus.turn;
    lastSubState = reqStatus.subState;

    // Loguear el estado del equipo y la elección antes de aplicar
    await page.evaluate((idx) => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (resolver) {
        const store = resolver();
        const pinia = store._p;
        const gameStore = pinia?._s?.get('game');
        const teamInfo = gameStore?.state?.team?.map((p, tIdx: number) => 
          `[${tIdx}] ${p?.name} HP:${p?.hp}/${p?.maxHp} UID:${p?.uid}`
        ).join(' | ');
        console.log(`[E2E-TEAM-STATE] ChoiceIndex: ${idx} | FSM: ${store.currentSubState} | ActivePlayer: ${store.state?.player?.name} (UID:${store.state?.player?.uid}) | Team: ${teamInfo}`);
      }
    }, p1ChoiceIdx);

    // 6. Si el jugador tiene una elección activa, procesarla
    if (reqStatus.hasChoice) {
      const currentChoice = playerChoices ? playerChoices[p1ChoiceIdx] : undefined;
      
      // Caso especial: si fuzzer previó choices pero está vacía para este índice de elección
      if (playerChoices && p1ChoiceIdx < playerChoices.length && (currentChoice === '' || currentChoice === undefined)) {
        console.log(`[E2E] Fuzzer choice at index ${p1ChoiceIdx} is empty (P1 has no choice in fuzzer). Skipping.`);
        p1ChoiceIdx++;
        await page.waitForTimeout(50);
        continue;
      }

      // Validar si la elección del jugador es válida en el simulador
      const isPlayerChoiceValid = await page.evaluate((choiceStr) => {
        try {
          if (!choiceStr) return true;
          const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return true;
          const store = resolver();
          const playerRequest = store.state?.playerRequest;
          if (!playerRequest) return true;

          if (choiceStr.startsWith('switch ')) {
            const switchSlot = parseInt(choiceStr.split(' ')[1] || '2', 10);
            const targetPoke = playerRequest.side?.pokemon?.[switchSlot - 1];
            if (!targetPoke) return false;
            const isFainted = targetPoke.condition?.includes('fnt') || targetPoke.hp === 0;
            const isActive = !!targetPoke.active;
            if (isFainted || isActive) {
              console.log(`[E2E-VALIDATION] Player choice "${choiceStr}" is invalid (fainted/active). Skipping.`);
              return false;
            }
          } else if (choiceStr.startsWith('move ')) {
            const moveIdx = parseInt(choiceStr.split(' ')[1] || '1', 10) - 1;
            const reqMove = playerRequest.active?.[0]?.moves?.[moveIdx];
            if (reqMove && reqMove.disabled) {
              console.log(`[E2E-VALIDATION] Player choice "${choiceStr}" is invalid (disabled move). Skipping.`);
              return false;
            }
          }
          return true;
        } catch (_e) {
          return true;
        }
      }, currentChoice);

      if (!isPlayerChoiceValid) {
        console.log(`[E2E] Choice "${currentChoice}" at index ${p1ChoiceIdx} is invalid for P1. Skipping in E2E to match fuzzer.`);
        p1ChoiceIdx++;
        await page.evaluate(() => {
          if (window.__VITE_DEBUG__) {
            window.__VITE_DEBUG__.enemyChoiceIndex = (window.__VITE_DEBUG__.enemyChoiceIndex ?? 0) + 1;
          }
        });
        continue;
      }

      const inputPerformed = await handleBattleInput(page, currentChoice);
      if (inputPerformed) {
        // Solo avanzar el índice de elección de P1 si la acción se ejecutó con éxito
        p1ChoiceIdx++;
        
        // Esperar a que la FSM salga de los estados de input para no leer el estado viejo en la próxima iteración.
        await page.waitForFunction(({ prevTurn, prevSub }) => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return false;
          const store = resolver();
          const turnChanged = (store.state?.turnCount ?? 1) > prevTurn;
          const subChanged = store.currentSubState !== prevSub;
          const leftInput = store.currentSubState !== 'WAIT_INPUT' && store.currentSubState !== 'SWITCH_MENU';
          return leftInput || turnChanged || subChanged || !!store.state?.over;
        }, { prevTurn: lastSimulatorTurn, prevSub: lastSubState }, { timeout: 15000 }).catch(() => {});
      } else {
        await page.waitForTimeout(50);
      }
    } else {
      // Si P1 no tiene elección activa (está en WAIT), esperar a que progrese el turno del oponente/FSM
      console.log(`[E2E] P1 has no choice (wait state). Waiting for FSM progression...`);
      await page.waitForFunction(({ prevTurn, prevSub }) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        const turnChanged = (store.state?.turnCount ?? 1) > prevTurn;
        const subChanged = store.currentSubState !== prevSub;
        const leftInput = store.currentSubState !== 'WAIT_INPUT' && store.currentSubState !== 'SWITCH_MENU';
        return leftInput || turnChanged || subChanged || !!store.state?.over;
      }, { prevTurn: lastSimulatorTurn, prevSub: lastSubState }, { timeout: 15000 }).catch(() => {});
    }
  }

  // Validar paridad del estado final de TODO el equipo contra el snapshot de Showdown
  const parity = await page.evaluate(async (snapshotState) => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const store = useBattleStore();
    if (!store.state || !snapshotState) return { mismatches: [] as string[] };

    const mismatches: string[] = [];

    // Equipo jugador: comparar por nombre/apodo para evitar desalineaciones por reordenamiento de slot inicial
    const gameStore = useGameStore();
    const playerTeam = gameStore.state.team;
    console.log(`[E2E-PARITY-DEBUG] playerTeam in gameStore:`, JSON.stringify(playerTeam.map(p => p ? { name: p.name, hp: p.hp, uid: p.uid } : null)));
    console.log(`[E2E-PARITY-DEBUG] expected p1 team:`, JSON.stringify(snapshotState.p1));
    snapshotState.p1.forEach((expected, i) => {
      const actual = playerTeam.find(p => p && (
        p.name.toLowerCase() === expected.name.toLowerCase() ||
        p.nickname?.toLowerCase()?.startsWith(expected.name.toLowerCase())
      ));
      if (!actual) { mismatches.push(`P1[${i}] ${expected.name}: no encontrado en el equipo del juego`); return; }
      if (Math.abs(actual.hp - expected.hp) > 1) {
        mismatches.push(`P1[${i}] ${expected.name}: game HP=${actual.hp} vs showdown HP=${expected.hp}`);
      }
      const gameFainted = actual.hp <= 0;
      if (gameFainted !== expected.fainted) {
        mismatches.push(`P1[${i}] ${expected.name}: game fainted=${gameFainted} vs showdown fainted=${expected.fainted}`);
      }
    });

    // Equipo enemigo: comparar contra battleStore.state.enemyTeam por nombre/apodo
    const enemyTeam: Array<{ hp: number; name: string; nickname?: string; uid?: string }> = (store.state as unknown as Record<string, unknown>).enemyTeam as any ?? [];
    console.log(`[E2E-PARITY-DEBUG] enemyTeam in gameStore:`, JSON.stringify(enemyTeam.map(p => p ? { name: p.name, hp: p.hp, uid: p.uid } : null)));
    console.log(`[E2E-PARITY-DEBUG] expected p2 team:`, JSON.stringify(snapshotState.p2));
    snapshotState.p2.forEach((expected, i) => {
      const actual = enemyTeam.find(p => p && (
        p.name.toLowerCase() === expected.name.toLowerCase() ||
        p.nickname?.toLowerCase()?.startsWith(expected.name.toLowerCase())
      ));
      if (!actual) { mismatches.push(`P2[${i}] ${expected.name}: no encontrado en el equipo enemigo`); return; }
      if (Math.abs(actual.hp - expected.hp) > 1) {
        mismatches.push(`P2[${i}] ${expected.name}: game HP=${actual.hp} vs showdown HP=${expected.hp}`);
      }
      const gameFainted = actual.hp <= 0;
      if (gameFainted !== expected.fainted) {
        mismatches.push(`P2[${i}] ${expected.name}: game fainted=${gameFainted} vs showdown fainted=${expected.fainted}`);
      }
    });

    return { mismatches };
  }, finalState ?? null);

  if (parity.mismatches.length > 0) {
    throw new Error(
      `[Paridad FSM] El estado final del juego diverge del simulador Showdown:\n` +
      parity.mismatches.map(m => `  - ${m}`).join('\n')
    );
  }
}

test.describe('Battle FSM & GSAP Synchronization - Full Coverage', () => {


  // Cargar lotes desde certified_fuzzer_cases.json o usar generador como fallback
  let allBatches: TestBatch[] = [];
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (fs.existsSync(consolidatorPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8'));
      if (content.battle) {
        allBatches = content.battle;
      }
    } catch (_e) {
      // Ignore if file is not generated or malformed
    }
  }
  if (allBatches.length === 0) {
    allBatches = generateTestBatches(6);
  }

  // Permitir filtrar lotes usando la variable de entorno TEST_BATCH, TEST_CASE o TEST_CASE_ID (ej: TEST_CASE_ID=case-a8f9c1b3)
  const batchFilter = process.env.TEST_BATCH;
  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;

  let startIdx = 0;
  if (startFromCaseId) {
    const foundIdx = allBatches.findIndex((b) => (b as unknown as { id?: string }).id === startFromCaseId.trim());
    if (foundIdx !== -1) {
      startIdx = foundIdx;
    }
  } else if (startFromIndex) {
    startIdx = Number(startFromIndex.trim()) - 1;
  }

  const batches = allBatches.map((b: TestBatch, idx: number) => ({ b, idx })).filter(({ b, idx }: { b: TestBatch & { id?: string }, idx: number }) => {
    if (caseIdFilter) {
      return b.id === caseIdFilter.trim();
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

  if (caseIdFilter || caseFilter || batchFilter) {
    console.log(`\n======================================================`);
    console.log(`⚙️  FILTRANDO SIMULACIÓN: Ejecutando casos: [${batches.map(x => (x.b as { id?: string }).id || x.idx + 1).join(', ')}]`);
    console.log(`======================================================\n`);
  }

  test.beforeAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    if (fs.existsSync(failuresDir)) {
      fs.rmSync(failuresDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(360000);
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
        console.log(`[BROWSER] ${text}`);
      }
    });
    // Configurar tiempo de espera de cada test a 120 segundos para evitar timeouts bajo alta concurrencia
    test.setTimeout(120000);

    // 1. Inyectar configuraciones de E2E y mockear permisos
    await setupE2ESession(page);

    // 2. Iniciar sesión con un usuario dedicado para pruebas locales
    const testUser = `TEST_USER_${Date.now()}`;
    await loginTestUser(page, testUser);
  });

  // Generar dinámicamente un caso de prueba de Playwright para cada lote de simulación.
  batches.forEach(({ b: batch, idx: index }: { b: TestBatch, idx: number }) => {
    test(`debería simular el lote #${index + 1} (${batch.movesToTest?.length ?? 0} movimientos, ${batch.abilitiesToTest?.length ?? 0} habilidades) sin bloqueos de FSM`, async ({ page }) => {
      test.setTimeout(360000);
      // 1. Construir e inyectar el equipo del jugador y del enemigo en la sesión del navegador
      await page.evaluate(async (b) => {
        // Sobrescribir Math.random con una función determinista basada en semilla (LCG)
        let seed = 12345;
        Math.random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };

        // Inyectar el seed de Showdown y las decisiones del enemigo P2 para reproducibilidad exacta
        window.__VITE_DEBUG__ = window.__VITE_DEBUG__ || {};
        window.__VITE_DEBUG__.battleSeed = b.seed ?? undefined;
        const enemyChoices = b.enemyChoices ?? (b as any).history?.map((h: any) => h.p2Choice) ?? [];
        window.__VITE_DEBUG__.enemyChoicesQueue = [...enemyChoices];
        window.__VITE_DEBUG__.mockEnemyChoices = [...enemyChoices];
        window.__VITE_DEBUG__.enemyChoiceIndex = 0;
        window.__VITE_DEBUG__.cheats = b.cheats ?? [];

        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore } = await import('../../../src/stores/game.ts');
        
        const battleStore = useBattleStore();
        const gameStore = useGameStore();
        
        // Generar equipo local para el jugador usando la API de depuración
        const localPlayerTeam = b.playerTeam.map((set: { species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean }, idx: number) => {
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
            isShiny: set.shiny || false
          });
        });

        // Generar equipo local para el enemigo (NPC)
        const localEnemyTeam = b.enemyTeam.map((set: { species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean }, idx: number) => {
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
            isShiny: set.shiny || false
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

        // Iniciar la batalla como combate de entrenador usando el primer enemigo y la plantilla completa
        const firstEnemy = localEnemyTeam[0];
        if (!firstEnemy) throw new Error('No enemy generated for E2E test');

        await battleStore.startBattle(firstEnemy, {
          isTrainer: true,
          enemyTeam: localEnemyTeam,
          trainerName: 'Simulador E2E',
          locationId: 'route1'
        });

        if (battleStore.state) {
          battleStore.state.p1SlotOrder = localPlayerTeam.map(p => p.uid);
          battleStore.state.p2SlotOrder = localEnemyTeam.map(p => p.uid);
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
          ((batch as any).playerChoices ?? (batch as any).history?.map((h: any) => h.p1Choice)) as string[] | undefined,
          (batch as unknown as Record<string, unknown>).cheats as Array<{ turn: number, side: 'p1' | 'p2', type: 'heal' }> | undefined,
          (batch as unknown as Record<string, unknown>).finalState as FinalState | undefined
        );
      } catch (error: unknown) {
        const caseId = (batch as { id?: string }).id || `lote-${index + 1}`;
        const errMessage = error instanceof Error ? error.message : String(error);
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
          timestamp: new Date().toISOString(),
          reproduce: {
            seed: (batch as any).seed,
            playerChoices: (batch as any).playerChoices,
            enemyChoices: (batch as any).enemyChoices,
            cheats: (batch as any).cheats,
            fullPlayerTeam: batch.playerTeam,
            fullEnemyTeam: batch.enemyTeam
          }
        };
        fs.writeFileSync(
          path.join(failuresDir, `${caseId}.json`),
          JSON.stringify(failureData, null, 2),
          'utf8'
        );

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
      await gameStore.saveGame();

      const pikachu = debugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });

    // 2. Confirmar combate e iniciar
    await confirmAndStartBattle(page);

    // 3. Esperar a que la UI de batalla termine las animaciones de inicio y el botón de la poción esté activo
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (resolver) {
          const store = resolver();
          const cardEl = document.querySelector('.quick-item-card');
          const classes = cardEl ? cardEl.className : 'null';
          console.log(`[E2E-POLL] #${i} SubState: "${store.currentSubState}", isIntro: ${store.isIntroAnimating}, isProc: ${store.isProcessing}, hasPlayer: ${!!store.state?.player}, cardClasses: "${classes}"`);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    });

    const potionCard = page.locator('.quick-item-card:not(.is-disabled)').first();
    await potionCard.waitFor({ state: 'visible', timeout: 10000 });

    // 4. Clickear la Poción (debería abrir el modal de selección de Pokémon)
    await potionCard.click();

    // Esperar al modal de selección de Pokémon y clickear en Bulbasaur para aplicarle la poción
    const targetBtn = page.locator('.list-item:has(.name:has-text("Bulbasaur")), button:has-text("Bulbasaur")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();

    // 5. Esperar a que la FSM procese el turno del uso del objeto + el ataque enemigo y vuelva a WAIT_INPUT
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentSubState === 'WAIT_INPUT' || (store.state && store.state.player && store.state.player.hp === 0);
    }, undefined, { timeout: 10000 });

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
    if (fs.existsSync(failuresDir)) {
      const files = fs.readdirSync(failuresDir);
      const failures = files
        .filter((f: string) => f.endsWith('.json'))
        .map((f: string) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(failuresDir, f), 'utf8'));
          } catch (_e) {
            return null;
          }
        })
        .filter((x: any) => x !== null);

      const reportPath = path.resolve(process.cwd(), 'scripts/e2e/results/e2e_simulation_failures.json');

      if (failures.length > 0) {
        fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2), 'utf8');
        console.log(`\n📝 Se ha generado el reporte consolidado de errores E2E en: ${reportPath}`);
      } else {
        fs.writeFileSync(reportPath, '[]', 'utf8');
        console.log('\n✅ Todos los combates pasaron sin errores. Reportes vaciados.');
      }
    } else {
      const reportPath = path.resolve(process.cwd(), 'scripts/e2e/results/e2e_simulation_failures.json');
      fs.writeFileSync(reportPath, '[]', 'utf8');
      console.log('\n✅ No hay errores que consolidar. Reportes vaciados.');
    }
  });
});
