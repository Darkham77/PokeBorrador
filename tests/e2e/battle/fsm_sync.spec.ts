import { test, expect, Page } from '@playwright/test';
import { generateTestBatches, type TestBatch } from '../../../scripts/battle-tester/team-generator.ts';
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



// Helper: Bucle de ejecución automática de turnos
async function executeAutoBattle(page: Page, batchIndex: number, startingTurn = 0, playerChoices?: string[], cheats?: Array<{ turn: number, side: 'p1' | 'p2', type: 'heal' }>) {
  let turnCount = startingTurn;
  const maxTurns = 150;
  let lastSimulatorTurn = 0;
  let lastSubState = '';

  while (turnCount < maxTurns) {
    // Verificar si la batalla ya concluyó en el store
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });

    if (isOver) {
      break;
    }

    if (playerChoices && turnCount >= playerChoices.length) {
      console.log(`[E2E] Se agotaron las elecciones del fuzzer (${turnCount}/${playerChoices.length}). Esperando fin de batalla...`);
      const over = await page.evaluate(async () => {
        try {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return false;
          const store = resolver();
          return !!store.state?.over;
        } catch (_e) {
          return true; // Asumir sobre si el store no es accesible
        }
      });
      if (over) break;
      await page.waitForTimeout(500);
      continue;
    }

    await waitForWaitInput(page, turnCount, batchIndex, lastSimulatorTurn, lastSubState);

    // Re-verificar estado de finalización
    const isOverAfterWait = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });

    if (isOverAfterWait) {
      break;
    }

    // Verificar paridad DOM/Store
    await verifyHpParity(page);

    // Aplicar trampas registradas para el turno actual
    const currentCheats = cheats?.filter(c => c.turn === turnCount + 1) || [];
    for (const cheat of currentCheats) {
      console.log(`[E2E] Applying cheat at turn ${turnCount + 1}: heal ${cheat.side}`);
      await page.evaluate((ch) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (resolver) {
          const store = resolver();
          const pkm = ch.side === 'p1' ? store.state?.player : store.state?.enemy;
          if (pkm) {
            pkm.hp = pkm.maxHp;
            if (pkm.status === 'fnt') pkm.status = '';
          }
          // Curar también en el equipo del gameStore para que se envíe correctamente al worker
          const pinia = store._p;
          const gameStore = pinia?._s?.get('game');
          if (ch.side === 'p1' && gameStore?.state?.team && pkm) {
            const match = gameStore.state.team.find((p) => p && p.uid === pkm.uid);
            if (match) {
              match.hp = match.maxHp;
              if (match.status === 'fnt') match.status = '';
            }
          } else if (ch.side === 'p2' && store.state?.enemyTeam && pkm) {
            const match = store.state.enemyTeam.find((p) => p && p.uid === pkm.uid);
            if (match) {
              match.hp = match.maxHp;
              if (match.status === 'fnt') match.status = '';
            }
          }
        }
      }, cheat);
    }

    // Loguear el estado del equipo y la elección antes de aplicar
    await page.evaluate((tc) => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (resolver) {
        const store = resolver();
        const pinia = store._p;
        const gameStore = pinia?._s?.get('game');
        const teamInfo = gameStore?.state?.team?.map((p, idx: number) => 
          `[${idx}] ${p?.name} HP:${p?.hp}/${p?.maxHp} UID:${p?.uid}`
        ).join(' | ');
        console.log(`[E2E-TEAM-STATE] Turn: ${tc} | FSM: ${store.currentSubState} | ActivePlayer: ${store.state?.player?.name} (UID:${store.state?.player?.uid}) | Team: ${teamInfo}`);
      }
    }, turnCount);

    // Guardar el turnCount actual antes de ejecutar la acción
    const stateInfo = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        turn: store.state?.turnCount ?? 1,
        subState: store.currentSubState
      };
    });
    lastSimulatorTurn = stateInfo.turn;
    lastSubState = stateInfo.subState || '';

    // Procesar acción del turno deterministamente si fuzzer proveyó choices
    const currentChoice = playerChoices && playerChoices[turnCount];
    const inputPerformed = await handleBattleInput(page, currentChoice);

    if (inputPerformed) {
      // Esperar a que la FSM salga de los estados de input para no leer el estado viejo en la próxima iteración.
      // Si la resolución del turno fue instantánea, el turno o el subState habrán cambiado.
      await page.waitForFunction(({ prevTurn, prevSub }) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        const turnChanged = (store.state?.turnCount ?? 1) > prevTurn;
        const subChanged = store.currentSubState !== prevSub;
        const leftInput = store.currentSubState !== 'WAIT_INPUT' && store.currentSubState !== 'SWITCH_MENU';
        return leftInput || turnChanged || subChanged || !!store.state?.over;
      }, { prevTurn: stateInfo.turn, prevSub: stateInfo.subState }, { timeout: 10000 }).catch(() => {});
      turnCount++;
    } else {
      // Si no se hizo clic (ej. estaba procesando, recarga de fondo, bolsa abierta), reintentar en el mismo turno
      await page.waitForTimeout(20);
    }
  }

  // Validar que el combate finalizó correctamente sin errores críticos
  const battleOverSuccess = await page.evaluate(async () => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const store = useBattleStore();
    return !store.state || store.state.over;
  });
  expect(battleOverSuccess).toBe(true);
}

test.describe('Battle FSM & GSAP Synchronization - Full Coverage', () => {


  // Cargar lotes desde certified_fuzzer_cases.json o usar generador como fallback
  let allBatches: TestBatch[] = [];
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/battle-tester/results/certified_fuzzer_cases.json');
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
        text.includes('SYNC')
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

        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore } = await import('../../../src/stores/game.ts');
        
        const battleStore = useBattleStore();
        const gameStore = useGameStore();
        
        // Generar equipo local para el jugador usando la API de depuración
        const localPlayerTeam = b.playerTeam.map((set: { species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number> }, idx: number) => {
          return pokemonDebugService.generate({
            id: set.species.toLowerCase(),
            level: set.level || 100,
            ability: set.ability,
            moves: set.moves,
            heldItem: set.item,
            nickname: `${set.name}-${idx + 1}`,
            nature: set.nature,
            ivs: set.ivs,
            evs: set.evs
          });
        });

        // Generar equipo local para el enemigo (NPC)
        const localEnemyTeam = b.enemyTeam.map((set: { species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number> }, idx: number) => {
          return pokemonDebugService.generate({
            id: set.species.toLowerCase(),
            level: set.level || 100,
            ability: set.ability,
            moves: set.moves,
            heldItem: set.item,
            nickname: `${set.name}-${idx + 1}`,
            nature: set.nature,
            ivs: set.ivs,
            evs: set.evs
          });
        });

        // Sobrescribir el equipo del jugador en el GameStore
        gameStore.state.team = localPlayerTeam;

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
      }, batch);

      try {
        // 2. Confirmar combate e iniciar
        await confirmAndStartBattle(page);

        // 3. Ejecutar auto-batalla y validaciones deterministas
        await executeAutoBattle(
          page, 
          index + 1, 
          0, 
          (batch as unknown as Record<string, unknown>).playerChoices as string[] | undefined,
          (batch as unknown as Record<string, unknown>).cheats as Array<{ turn: number, side: 'p1' | 'p2', type: 'heal' }> | undefined
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
});
